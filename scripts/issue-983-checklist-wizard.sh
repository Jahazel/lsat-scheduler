#!/usr/bin/env bash

set -euo pipefail

# shellcheck source=scripts/stage7-wizard-lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/stage7-wizard-lib.sh"

EVIDENCE=docs/security/issue-983-stage7-full-run-evidence.md
RELEASE=docs/runbooks/release-migrations.md
MOVE=docs/runbooks/controlled-neon-move.md
RESTORE=docs/runbooks/restore.md
GRANT_SQL=sql/production-grant-check.sql
REAL="https://$REAL_DOMAIN"
WAIT_FOR_ISSUES=(695 972 980 984 985 986 987)
STUDENT_PAGES=(/dashboard /dashboard/upload /progress /settings /account)
ADMIN_PAGES=(/admin /admin/lab /api/students)
PUBLIC_PAGES=(/ /login /signup /legal/privacy /legal/ai-disclosure)
SECURITY_HEADERS=(
  "x-frame-options: DENY"
  "x-content-type-options: nosniff"
  "referrer-policy: strict-origin-when-cross-origin"
  "strict-transport-security: max-age=63072000"
  "permissions-policy: camera=(), microphone=(), geolocation=()"
)
CSP_PARTS=("'strict-dynamic'" "object-src 'none'" "base-uri 'self'" "form-action 'self'" "frame-ancestors 'none'")

start_run 983 "$@"

plain() { sed -E 's/\[([^]]*)\]\([^)]*\)/\1/g'; }
gate_field() { awk -F' \\| ' -v row="| $1" '$1 == row { print $(1 + '"$2"'); exit }' "$REPO_ROOT/$GATE" | plain; }
stage2_steps_in_evidence() { grep -E '^\| 2\.[0-9]+ \| [A-J][0-9]+ \| ' "$REPO_ROOT/$EVIDENCE" || true; }
stage2_field_in_evidence() { stage2_steps_in_evidence | awk -F' \\| ' -v step="| $1" '$1 == step { print $'"$2"'; exit }' | sed 's/ |$//' | plain; }

ask_verdict() {
  local answer="" ticket=""
  while true; do
    read -e -r -p "  $BOLD$1: pass or fail?$RESET " answer || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    case "$answer" in
      pass) record "$1 verdict" "pass"; return 0 ;;
      fail) break ;;
      *) warn "Type pass or fail." ;;
    esac
  done
  while true; do
    read -e -r -p "  ${BOLD}Number of the ticket for this failure:$RESET " ticket || exit 1
    [[ "$ticket" =~ ^[0-9]+$ ]] && break
    warn "Type only the issue number, such as 1010."
  done
  record "$1 verdict" "FAIL, ticket #$ticket"
  warn "A failed row stops the run. Fix it under #$ticket, then run the wizard again with --from $CURRENT_STEP."
  warn "If the fix changes anything outside docs/, it makes a new candidate: start again at step 1.1."
  exit 1
}

ask_commit() {
  local sha
  while true; do
    ask "$1" "$2" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    sha=$(git -C "$REPO_ROOT" rev-parse --verify --quiet "${!1}^{commit}" || true)
    if [[ -n "$sha" ]] && git -C "$REPO_ROOT" merge-base --is-ancestor "$sha" origin/main; then
      write_env "$1" "$sha" > /dev/null
      return 0
    fi
    warn "That commit is not on origin/main in this checkout. Run git fetch origin, then type the candidate's SHA."
  done
}

commits_after() {
  local commit files
  for commit in $(git -C "$REPO_ROOT" rev-list --reverse --first-parent "$1..origin/main"); do
    files=$(git -C "$REPO_ROOT" diff --name-only "$commit^" "$commit" | grep -v '^docs/' | tr '\n' ' ' || true)
    if [[ -z "$files" ]]; then printf '%s docs-only; ' "${commit:0:7}"; else printf '%s NOT docs-only (%s); ' "${commit:0:7}" "${files% }"; fi
  done
}

judge_commits() {
  local list="$2"
  record "$1" "${list:-none}"
  if [[ "$list" == *"NOT docs-only"* ]]; then warn "A commit after the candidate changes more than docs/. That makes a new candidate."; fi
}

latest_run() {
  gh run list --repo "$REPO" --workflow "$1" --commit "$CANDIDATE" --event "$2" --limit 1 \
    --json databaseId,conclusion -q '.[0] | "\(.databaseId) \(.conclusion)"' 2>/dev/null || true
}

fetch_page() {
  local out="$RUN_DIR/h${2//\//_}-$1"
  printf '  %s HTTP %s\n' "$2" "$(get "$1" "$out" "$SITE$2")" >&2
  printf '%s' "$out"
}

cache_problems() {
  local who="$1" path out cache problems=()
  shift
  for path in "$@"; do
    out=$(fetch_page "$who" "$path")
    cache=$(header_of "$out" cache-control)
    [[ "$cache" == *private* && "$cache" == *no-store* ]] || problems+=("$path Cache-Control '$cache'")
  done
  if (( ${#problems[@]} )); then printf '%s; ' "${problems[@]}"; else printf 'none'; fi
}

security_problems() {
  local who="$1" path out line part csp problems=()
  shift
  for path in "$@"; do
    out=$(fetch_page "$who" "$path")
    for line in "${SECURITY_HEADERS[@]}"; do
      grep -qiF "$line" "$out.headers" 2>/dev/null || problems+=("$path no '$line'")
    done
    csp=$(header_of "$out" content-security-policy)
    if [[ -z "$csp" ]]; then problems+=("$path no enforced CSP")
    else for part in "${CSP_PARTS[@]}"; do [[ "$csp" == *"$part"* ]] || problems+=("$path CSP lacks $part"); done
    fi
  done
  if (( ${#problems[@]} )); then printf '%s; ' "${problems[@]}"; else printf 'none'; fi
}

nonce_of() { header_of "$1" content-security-policy | grep -oE "nonce-[A-Za-z0-9+/=]+" | head -n1 || true; }

s_candidate() {
  begin_step 1.1 "Release candidate"
  cite "$EVIDENCE" "Words in this file" "the release candidate"
  say "The candidate is the commit the owner picked in #984. Every check below runs on it."
  ask_commit CANDIDATE "Release candidate commit SHA:"
  local issue state open=()
  for issue in "${WAIT_FOR_ISSUES[@]}"; do
    state=$(gh issue view "$issue" --repo "$REPO" --json state -q .state 2>/dev/null || printf 'unknown')
    [[ "$state" == CLOSED ]] || open+=("#$issue $state")
  done
  record "1.1 candidate" "$CANDIDATE"
  judge_commits "1.1 commits after" "$(commits_after "$CANDIDATE")"
  if (( ${#open[@]} )); then record "1.1 open issues" "${open[*]}"; warn "The full run waits for these issues. Stop unless the owner decided otherwise."
  else record "1.1 open issues" "none"; fi
  expect "The candidate is on main. Every commit after it is docs-only. Every listed issue is closed."
  ask_verdict 1.1
}

s_runs() {
  begin_step 1.2 "The candidate's GitHub runs"
  cite "$RELEASE" "After every merge" "the copy job"
  needs CANDIDATE
  local checks migrations
  checks=$(latest_run checks.yml push)
  migrations=$(latest_run release-migrations.yml push)
  write_env CHECKS_RUN "${checks:-none}" > /dev/null
  record "1.2 Checks run" "${checks:-no run found}"
  LAST_RUN_ID="${migrations%% *}"
  record "1.2 Release migrations" "${migrations:-no run found}. $(run_line 'Target: copy\.[^"]*')"
  expect "Both runs succeeded on the candidate's push. The copy job says Target: copy."
  ask_verdict 1.2
}

s_version() {
  begin_step 1.3 "Copy version and test addresses"
  cite "$EVIDENCE" "Words in this file" "the students"
  say "The test students sign up with a password at plus addresses of one inbox you own (Gmail takes them)."
  warn "Never type an email, password, cookie, or link at a result prompt. Results get posted on the issue."
  ask_email BASE_EMAIL "Your inbox (no + sign):"
  [[ -n "${RUN_TAG:-}" ]] || write_env RUN_TAG "$(date -u +%m%d%H%M)" > /dev/null
  local who key
  for who in a b ra rb; do
    key="P_$(printf '%s' "$who" | tr '[:lower:]' '[:upper:]')"
    [[ -n "${!key:-}" ]] || write_env "$key" "$(new_password "$who")" > /dev/null
  done
  [[ -n "${RUN_STARTED:-}" ]] || write_env RUN_STARTED "$(now_utc)" > /dev/null
  student a
  student b
  step "Sign up A and B at $COPY/signup with these emails and passwords, and click each verify link. The Admin signs in with Google."
  note "Stage 2 uses A, B, and the Admin. Make any other copy test student with this run's address, so step 5.1 finds it."
  pause "When A and B are on onboarding and the Admin is on /admin, press Enter"
  open_url "https://vercel.com/dashboard"
  step "COPY project > Deployments: open the Production deployment that $COPY_HOST serves. Check its commit is ${CANDIDATE:0:7}."
  ask_id COPY_DEPLOYMENT "Copy Production deployment ID (dpl_…):"
  real_deployment REAL_BEFORE "Real site live Production deployment ID now:"
  record "1.3 version" "run t$RUN_TAG started $RUN_STARTED. Copy $COPY_DEPLOYMENT. Real site before: $REAL_BEFORE"
  expect "The copy serves the candidate. A and B reach onboarding."
  ask_verdict 1.3
}

s_row() {
  local id="$1" row kind
  row=$(stage2_field_in_evidence "$id" 2)
  kind=$(gate_field "$row" 2)
  begin_step "$id" "$row ($kind)"
  note "Guide: $GATE › $row"
  say "$(gate_field "$row" 1)" | fold -s -w 110 | sed '2,$s/^/  /'
  printf '\n'
  step "$(stage2_field_in_evidence "$id" 3)"
  expect "$(stage2_field_in_evidence "$id" 4)"
  if [[ "$kind" == *Auto* ]]; then record "$id $row auto" "Checks run ${CHECKS_RUN:-not recorded} on ${CANDIDATE:-the candidate}"; fi
  if [[ "$kind" == *Copy* ]]; then
    note "A result from another version does not count. Run it on ${CANDIDATE:0:7}."
    ask_result "$id $row copy" "$row on the copy: what did you see, and where is the evidence (step, run, or section)?"
  fi
  if [[ "$kind" == *Settings* ]]; then
    ask_result "$id $row settings" "$row settings: the date of its Settings record row, and its result?"
  fi
  ask_verdict "$id"
}

s_approval() {
  begin_step 3.1 "The owner's approval"
  cite "$MOVE" "Release gate and manual domain assignment" "the release approval"
  needs CANDIDATE
  open_url "https://vercel.com/dashboard"
  step "REAL project > Deployments: find the build of ${CANDIDATE:0:7}. Do not promote it yet."
  ask_id REAL_CANDIDATE "Real project's deployment ID of the candidate (dpl_…):"
  step "Write your approval of commit ${CANDIDATE:0:7} and deployment $REAL_CANDIDATE on #989."
  ask_result "3.1 approval" "Where and when is the written approval (issue number and date, no link)?"
  expect "The approval names the same commit and deployment."
  ask_verdict 3.1
}

s_restore_point() {
  begin_step 3.2 "Production backup and restore point"
  cite "$RESTORE" "Steps" "the restore point"
  open_url "https://console.neon.tech"
  step "PRODUCTION project > Backup & Restore: read the newest snapshot's age and the history window."
  write_env RESTORE_POINT "$(now_utc)" > /dev/null
  say_value "Restore point" "$RESTORE_POINT"
  ask_result "3.2 backup" "Newest production snapshot age, and the history window?"
  expect "The newest snapshot is under 24 hours old. The restore point is inside the history window."
  ask_verdict 3.2
}

s_release_run() {
  begin_step 3.3 "Release migrations"
  cite "$RELEASE" "Release order" "the release order"
  say "The wizard starts Release migrations on main. Its production job waits for your approval."
  step "When the production job waits: open the run in GitHub Actions > Review deployments > Approve."
  if confirm "Start Release migrations on main now?" && dispatch release-migrations.yml; then
    record "3.3 run" "run $LAST_RUN_ID. Jobs: $(run_jobs)"
    record "3.3 copy" "$(run_line 'Target: copy\.[^"]*')"
    record "3.3 production" "$(run_line 'Target: production\.[^"]*')"
  else
    record "3.3 run" "not started or not found"
  fi
  expect "Copy: Target: copy. with New migrations: 0. Production: Target: production. and the same journal count as the copy."
  ask_verdict 3.3
}

s_grant_check() {
  begin_step 3.4 "Production grant check"
  cite "$RELEASE" "Manual fallback" "the app role grants"
  say "This SQL only reads. It asks Postgres what the app login may do on the accounts table."
  show_sql "$(cat "$REPO_ROOT/$GRANT_SQL")" "main branch of the PRODUCTION project"
  paste_result "3.4 grants"
  record "3.4 count" "$(grep -ow true <<< "$PASTED" | wc -l | tr -d ' ') refused, $(grep -ow false <<< "$PASTED" | wc -l | tr -d ' ') not refused"
  expect "7 rows, each refused true: the app login cannot give the Admin role or change the disabled time or Google ID."
  ask_verdict 3.4
}

s_assign() {
  begin_step 3.5 "Assign the real domain"
  cite "$MOVE" "Release gate and manual domain assignment" "the domain assignment"
  needs REAL_CANDIDATE
  open_url "https://vercel.com/dashboard"
  step "REAL project > Deployments > $REAL_CANDIDATE > … > Promote. Then open $REAL and check the site loads."
  pause "When the domain serves the candidate, press Enter"
  real_deployment REAL_AFTER "Real site live Production deployment ID now:"
  record "3.5 domain" "$REAL_AFTER (expected $REAL_CANDIDATE)"
  step "Both Admins sign in on $REAL with Google and open /admin."
  ask_result "3.5 admins" "Did both Admins reach the Admin pages?"
  expect "The real domain serves the deployment from step 3.1. Both Admins reach the Admin pages."
  ask_verdict 3.5
}

s_live_accounts() {
  begin_step 4.1 "Test students on the real site"
  cite "$EVIDENCE" "What the wizard may touch" "the real-site limits"
  SITE="$REAL"
  say "Normal Chrome window for RA, a private window for RB, and a third profile for the Admin."
  student ra
  student rb
  step "Sign up RA and RB at $REAL/signup with these emails and passwords. Click each verify link in your inbox."
  step "RA and RB sign in. The Admin signs in with Google."
  pause "When RA and RB are on onboarding and the Admin is on /admin, press Enter"
  ask_cookie ra
  ask_cookie rb
  ask_cookie admin
  ask_result "4.1 accounts" "Did both verify links work, and did RA and RB reach onboarding?"
  expect "Both verify links work. RA and RB reach onboarding."
  ask_verdict 4.1
}

s_e2() {
  begin_step 4.2 "E2: session cookies and links"
  cite "$GATE" "E. Browser" "E2"
  step "In RA's window: DevTools > Application > Cookies > $REAL > __Secure-authjs.session-token. Read Secure, HttpOnly, and SameSite."
  ask_result "4.2a cookie" "Secure, HttpOnly, SameSite values?"
  step "RB: sign out, open Forgot password, ask for a reset, use the emailed link, set a new password, and sign in with it."
  ask_result "4.2b links" "Did the reset link work and the new password sign in? (The verify links and Google sign-in were step 4.1.)"
  expect "Secure, HttpOnly, SameSite Lax. The verify link, the reset link, and Google sign-in work."
  ask_verdict 4.2
}

s_e3() {
  begin_step 4.3 "E3: private caching"
  cite "$GATE" "E. Browser" "E3"
  SITE="$REAL"
  local out code
  ask_cookie ra
  ask_cookie admin
  record "4.3a student pages" "problems: $(cache_problems ra "${STUDENT_PAGES[@]}")"
  record "4.3b admin pages" "problems: $(cache_problems admin "${ADMIN_PAGES[@]}")"
  out="$RUN_DIR/rsc"
  code=$(get ra "$out" -H "RSC: 1" "$SITE/progress")
  record "4.3c RSC request" "/progress with RSC: 1, HTTP $code, Cache-Control: $(header_of "$out" cache-control)"
  out="$RUN_DIR/redirect"
  code=$(get none "$out" "$SITE/dashboard")
  record "4.3d redirect" "/dashboard signed out, HTTP $code, Cache-Control: $(header_of "$out" cache-control)"
  step "RA's window: DevTools > Network. Open Study settings, change the goal, and save. Click the POST to /settings (it has a Next-Action header)."
  ask_result "4.3e Server Action" "Cache-Control of the Server Action reply (Response Headers)?"
  expect "Every reply that reads a session sends private and no-store, the Server Action reply too (#972). Problems: none."
  ask_verdict 4.3
}

s_e4() {
  begin_step 4.4 "E4: security headers and CSP"
  cite "$GATE" "E. Browser" "E4"
  SITE="$REAL"
  local n1 n2
  ask_cookie ra
  ask_cookie admin
  record "4.4a student pages" "problems: $(security_problems ra "${STUDENT_PAGES[@]}")"
  record "4.4b admin pages" "problems: $(security_problems admin "${ADMIN_PAGES[@]}")"
  record "4.4c public pages" "problems: $(security_problems none "${PUBLIC_PAGES[@]}")"
  get none "$RUN_DIR/n1" "$SITE/login" > /dev/null
  get none "$RUN_DIR/n2" "$SITE/login" > /dev/null
  n1=$(nonce_of "$RUN_DIR/n1"); n2=$(nonce_of "$RUN_DIR/n2")
  if [[ -n "$n1" && "$n1" != "$n2" ]]; then record "4.4d nonce" "two loads of /login got different nonces"; else record "4.4d nonce" "FAIL: the nonces were '$n1' and '$n2'"; fi
  say "Walk the pages with DevTools > Console filtered to 'Content Security Policy'. An error says 'Refused to …'."
  step "Admin: sign out and in with Google; Admin, one student's page, the test lab."
  step "RA: sign out and in with the password; onboarding up to the plan step, with a screenshot preview."
  ask_result "4.4e walk" "How many CSP errors, on which pages? Did every page work?"
  expect "Every header and CSP part (problems: none), two different nonces, no CSP error."
  ask_verdict 4.4
}

s_a5() {
  begin_step 4.5 "A5: nothing left after sign-out"
  cite "$GATE" "A. Student data" "A5"
  SITE="$REAL"
  local path answers="" out
  step "RA's normal window: open This week, Progress, Study settings, and Account, then log out from the Account menu."
  step "Press Back five times, then reload. Then type each of the four addresses."
  ask_result "4.5a RA signed out" "Did any page show RA's name, email, or data? Where did each land?"
  step "Sign RB in on the same window. Press Back until the address stops changing, then reload."
  ask_result "4.5b RB signed in" "Did any page show RA's data? Did /account show RB?"
  for path in "${STUDENT_PAGES[@]}"; do
    out="$RUN_DIR/a5${path//\//_}"
    answers+="$path $(get none "$out" "$SITE$path") cache $(header_of "$out" x-vercel-cache); "
  done
  record "4.5c no cookie" "${answers%; }"
  get rb "$RUN_DIR/a5-rb" "$SITE/account" > /dev/null
  if grep -qF "$(addr ra)" "$RUN_DIR/a5-rb.body" 2>/dev/null; then record "4.5d RB's account" "FAIL: holds RA's email"; else record "4.5d RB's account" "no trace of RA's email"; fi
  expect "No page shows RA's data, from the browser or the CDN. Signed out, every page goes to Login, and none is a cache HIT."
  ask_verdict 4.5
}

s_j16() {
  begin_step 4.6 "J16: Checkout and the Customer Portal"
  cite "$GATE" "J. Payments" "J16"
  warn "This is live Stripe. The free week charges nothing; step 4.10 cancels the subscription before any charge."
  step "RA's window, Console filtered to 'Content Security Policy': finish onboarding with 'Type your analytics' and choose a plan."
  step "On Stripe Checkout, start the free week with your card. Check the return lands on $REAL."
  step "Account > Manage plan: the Customer Portal opens. Come back to DrillMap."
  ask_result "4.6 J16" "Did Checkout and the Portal open with no CSP error, and did each return land on $REAL_DOMAIN?"
  expect "Checkout and the Portal open from DrillMap with no CSP error. Each return lands on $REAL_DOMAIN."
  ask_verdict 4.6
}

s_c5() {
  begin_step 4.7 "C5: the scanning switch on the real site"
  cite "$GUIDE" "Turn scanning off" "the scanning switch"
  SITE="$REAL"
  ask_cookie ra
  show_sql "UPDATE scan_settings SET scanning_off = true;
SELECT scanning_off, (SELECT coalesce(sum(total_usd), 0) FROM scan_spending) AS spent FROM scan_settings;" "main branch of the PRODUCTION project"
  paste_result "4.7a off"
  record "4.7b scan" "$(scan ra c5)"
  step "RA: open the weekly upload. Read the message, then type the analytics by hand and approve them."
  ask_result "4.7c page" "What did the page say, and did the hand entry work?"
  show_sql "UPDATE scan_settings SET scanning_off = false;
SELECT scanning_off, (SELECT coalesce(sum(total_usd), 0) FROM scan_spending) AS spent FROM scan_settings;" "main branch of the PRODUCTION project"
  paste_result "4.7d on"
  expect "HTTP 429, reason scanning-off, '$SCANNING_OFF_TEXT'. The spend is the same before and after. Scanning is on again."
  ask_verdict 4.7
}

s_j8() {
  begin_step 4.8 "J8: real prices"
  cite "$GUIDE" "price-check key" "the price check"
  local price_key weekly_price monthly_price result
  say "Enter the real site's values at hidden prompts. They stay in this process only."
  ask_secret price_key "Real site's restricted price key (rk_live_…, hidden):" || price_key=""
  ask_secret weekly_price "STRIPE_PRICE_WEEKLY of the real site (hidden):" || weekly_price=""
  ask_secret monthly_price "STRIPE_PRICE_MONTHLY of the real site (hidden):" || monthly_price=""
  clear_clipboard
  result=$(cd "$REPO_ROOT" && STRIPE_SECRET_KEY="$price_key" STRIPE_PRICE_WEEKLY="$weekly_price" STRIPE_PRICE_MONTHLY="$monthly_price" \
    npm run --silent check-stripe-prices 2>&1 | grep -oE '\{"ok":(true|false)[^}]*\}' | tail -n1 || true)
  unset price_key weekly_price monthly_price
  record "4.8 prices" "${result:-no result line}"
  expect '{"ok":true,"status":"match","mode":"live"}'
  ask_verdict 4.8
}

s_cron() {
  begin_step 4.9 "The first daily cleanup on the real site"
  cite "$GATE" "F. Deletion" "the daily cleanup"
  open_url "https://vercel.com/dashboard"
  step "REAL project > Logs, last 24 hours, search 'cleanup'. Find GET /api/cron/daily-cleanup after 09:00 UTC on the day after the release."
  note "If the release was today, stop here and run the wizard again tomorrow with --from 4.9."
  ask_result "4.9 cron" "Time (UTC) and status of the daily cleanup line?"
  expect "GET /api/cron/daily-cleanup answered 200. Close #937 with the time."
  ask_verdict 4.9
}

s_live_cleanup() {
  begin_step 4.10 "Clean up the real site"
  cite "$EVIDENCE" "What the wizard may touch" "the real-site cleanup"
  step "RA, then RB: Account > Delete Account. Deleting RA's Account cancels its Stripe subscription first."
  show_sql "SELECT count(*) AS test_accounts_left FROM accounts WHERE email LIKE '$(prefix)r%';
SELECT count(*) AS test_signups_left FROM pending_signups WHERE email LIKE '$(prefix)r%';
SELECT scanning_off FROM scan_settings;" "main branch of the PRODUCTION project"
  note "If a count is not 0, sign in as that student and delete again. Do not delete by SQL on production: it skips Stripe."
  paste_result "4.10a accounts"
  open_url "https://dashboard.stripe.com/subscriptions"
  step "Stripe, live mode > Subscriptions: RA's subscription is cancelled, and its invoice shows nothing paid or due."
  ask_result "4.10b Stripe" "Is RA's subscription cancelled with nothing charged?"
  real_deployment REAL_END "Real site live Production deployment ID now:"
  record "4.10c real site" "$REAL_END (released: ${REAL_CANDIDATE:-not recorded})"
  expect "0, 0, false. Nothing charged. The real site still serves the candidate."
  ask_verdict 4.10
}

s_copy_cleanup() {
  begin_step 5.1 "Clean up the copy"
  cite "$EVIDENCE" "Owner run sheet" "the copy cleanup"
  show_sql "DELETE FROM accounts WHERE email LIKE '$(prefix)%';
SELECT count(*) AS test_accounts_left FROM accounts WHERE email LIKE '$(prefix)%';"
  paste_result "5.1a copy accounts"
  step "If the Google test user of steps 2.5 to 2.8 still has an Account on the copy, delete it from its Account page."
  step "Stripe sandbox > Subscriptions: cancel every subscription of this run's copy students. A SQL delete does not reach Stripe."
  ask_result "5.1b sandbox" "Are this run's sandbox subscriptions cancelled?"
  expect "0 test Accounts on the copy. No open sandbox subscription of this run."
  ask_verdict 5.1
}

s_docs_only() {
  begin_step 5.2 "Commits after the candidate"
  cite "$EVIDENCE" "Words in this file" "docs-only commits"
  needs CANDIDATE
  judge_commits "5.2 commits after" "$(commits_after "$CANDIDATE")"
  expect "Every commit after the candidate is docs-only. The readiness record lists each one."
  ask_verdict 5.2
}

s_readiness() {
  begin_step 5.3 "Readiness record"
  cite "$EVIDENCE" "Readiness record" "the readiness record"
  say "Fill the readiness record in $EVIDENCE from $RESULTS_KEPT, in #990."
  say "The go decision is a separate written comment by the owner that names the same version."
  record "5.3 end" "$(now_utc)"
  cp "$RESULTS" "$RESULTS_KEPT"
  rm -rf "$RUN_DIR"
}

STAGE_TITLES=([1]="Candidate" [2]="Full run on the copy" [3]="Release" [4]="Live checks on the real site" [5]="Cleanup and readiness")
TOTAL_STAGES=5
SHEET_IDS=$(stage2_steps_in_evidence | awk -F' \\| ' '{ sub(/^\| /, "", $1); print $1 }' | tr '\n' ' ')
STEP_IDS="1.1 1.2 1.3 ${SHEET_IDS}3.1 3.2 3.3 3.4 3.5 4.1 4.2 4.3 4.4 4.5 4.6 4.7 4.8 4.9 4.10 5.1 5.2 5.3"

dry_run_stubs() {
  dry_run_common_stubs
  ask_verdict() { record "$1 verdict" "(dry run) pass"; }
  ask_commit() { printf -v "$1" '%s' "$(git -C "$REPO_ROOT" rev-parse HEAD)"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  commits_after() { printf '(dry run)'; }
  latest_run() { printf '0 dry-run'; }
}

run_wizard() {
  if dry; then
    dry_run_stubs
    BASE_EMAIL=owner@example.com RUN_TAG=dry RUN_STARTED=$(now_utc)
    CANDIDATE=$(git -C "$REPO_ROOT" rev-parse HEAD) REAL_CANDIDATE=dpl_DRYRUNCAND
  fi
  [[ "$FROM" == *.* ]] || FROM="$FROM.1"
  if ! [[ " $STEP_IDS " == *" $FROM "* ]]; then warn "No step $FROM. Steps run from 1.1 to 5.3."; exit 2; fi
  if [[ "$FROM" == 1.1 ]]; then banner "DrillMap Stage 7 full checklist and live checks (issue 983)"; fi
  local id
  reached 1.1 && s_candidate
  reached 1.2 && s_runs
  reached 1.3 && s_version
  for id in $SHEET_IDS; do reached "$id" && s_row "$id"; done
  reached 3.1 && s_approval
  reached 3.2 && s_restore_point
  reached 3.3 && s_release_run
  reached 3.4 && s_grant_check
  reached 3.5 && s_assign
  reached 4.1 && s_live_accounts
  reached 4.2 && s_e2
  reached 4.3 && s_e3
  reached 4.4 && s_e4
  reached 4.5 && s_a5
  reached 4.6 && s_j16
  reached 4.7 && s_c5
  reached 4.8 && s_j8
  reached 4.9 && s_cron
  reached 4.10 && s_live_cleanup
  reached 5.1 && s_copy_cleanup
  reached 5.2 && s_docs_only
  reached 5.3 && s_readiness
  finish
  if dry; then rm -rf "$RUN_DIR"; say "Dry run done. No provider was called, and nothing was kept."; return 0; fi
  say "Results: $RESULTS_KEPT"
}

run_wizard
