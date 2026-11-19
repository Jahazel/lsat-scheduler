#!/usr/bin/env bash

set -euo pipefail

# shellcheck source=scripts/stage7-wizard-lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/stage7-wizard-lib.sh"

# ──────────────────────────────────────────────────────────────────────────
# STAGES: issue 982, the Stage 7 drills. The run sheet is docs/security/issue-982-stage7-drill-evidence.md.

RESTORE=docs/runbooks/restore.md
CHECKER=docs/security/backup-checker.md
VERCEL_COPY_PROJECT=drillmap-copy
MONTH_START="date_trunc('month', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'"
TABLE_COUNTS="SELECT table_name, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', table_name), false, true, '')))[1]::text AS n
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"

start_run 982 "$@"

ask_branch_id() {
  while true; do
    ask "$1" "$2" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    if [[ "${!1}" =~ ^br-[a-z0-9-]{1,57}$ ]]; then write_env "$1" "${!1}" > /dev/null; return 0; fi
    warn "That is not a Neon branch ID (br-…). Copy it from the branch's page."
  done
}


run_cron() {
  if have_cli vercel && vercel crons run /api/cron/daily-cleanup --scope "$VERCEL_SCOPE" --project "$VERCEL_COPY_PROJECT" > /dev/null 2>&1; then
    say "The Vercel CLI started the daily job on the copy. Waiting 20 seconds for it to finish."
    sleep 20
    return 0
  fi
  open_url "https://vercel.com/dashboard"
  step "COPY project > Settings > Cron Jobs. On /api/cron/daily-cleanup, press Run."
  pause "When the job has run, press Enter"
}

redeploy_copy() {
  step "COPY project > Deployments. On the current Production deployment, open the … menu > Redeploy."
  step "When it is Ready, promote it, so $COPY_HOST serves it."
  ask_id "$1" "New copy deployment ID (dpl_…):"
  record "$CURRENT_STEP deploy" "copy now on ${!1}"
}

checker_report() { run_line '\{"ok":(true|false),"status":"[a-z-]+".*\}'; }

run_checker() {
  local workflow=backup-checker-copy.yml
  [[ "$2" == production ]] && workflow=backup-checker.yml
  if ! dispatch "$workflow"; then record "$1" "$2 checker: run not found"; return 1; fi
  record "$1" "$2 checker run $LAST_RUN_ID: $(checker_report). Jobs: $(run_jobs)"
}

set_checker_branch() {
  gh variable set BACKUP_BRANCH_ID --env backup-checker-copy --repo "$REPO" --body "$1" > /dev/null
  say "backup-checker-copy now checks branch $1."
}

copy_host_guard() {
  node -e 'const l=require(process.argv[1]);const h=new URL(process.env.PROBE_URL.replace(/^postgres(ql)?:/,"http:")).hostname;process.exit(l.includes(h)?0:1)' \
    "$REPO_ROOT/scripts/copyDatabaseHosts.json"
}

probe_postgres() {
  if ! PROBE_URL="$1" copy_host_guard 2>/dev/null; then printf 'not tried: the host is not a copy host'; return 0; fi
  (cd "$REPO_ROOT" && PROBE_URL="$1" node -e '
const { Client } = require("pg");
const client = new Client({ connectionString: process.env.PROBE_URL, connectionTimeoutMillis: 10000 });
client.connect().then(() => client.query("select 1")).then(() => console.log("accepted"))
  .catch((error) => console.log(`refused (${error.code ?? error.name})`)).finally(() => client.end().catch(() => {}));' 2>/dev/null) || printf 'probe failed'
}

probe_google() {
  local answer
  answer=$(printf '%s' "$1" | curl -sS --max-time 20 https://oauth2.googleapis.com/token \
    --data-urlencode "client_id=$GOOGLE_CLIENT_ID" --data-urlencode 'client_secret@-' \
    --data-urlencode 'code=drill-982-not-a-code' --data-urlencode "redirect_uri=$COPY/api/auth/callback/google" \
    --data-urlencode 'grant_type=authorization_code' | sed -n 's/.*"error": *"\([a-z_]*\)".*/\1/p' | head -n1 || true)
  case "$answer" in
    invalid_grant) printf 'accepted (invalid_grant: Google took the secret and refused only the made-up code)' ;;
    invalid_client|unauthorized_client) printf 'refused (%s)' "$answer" ;;
    *) printf 'unclear (%s)' "${answer:-no answer}" ;;
  esac
}

http_probe() {
  local code
  code=$(printf '%s\n' "$1" | curl -sS --max-time 20 -o "$RUN_DIR/probe.body" -w '%{http_code}' -H @- "${@:2}" || printf '000')
  printf '%s %s' "$code" "$(sed -n 's/.*"\(name\|type\)": *"\([a-z_]*\)".*/\2/p' "$RUN_DIR/probe.body" 2>/dev/null | head -n1)"
  rm -f "$RUN_DIR/probe.body"
}

judge_http() { if [[ "$1" == 200* ]]; then printf 'accepted (HTTP %s)' "$1"; else printf 'refused (HTTP %s)' "$1"; fi; }
probe_anthropic() { judge_http "$(http_probe "x-api-key: $1" -H 'anthropic-version: 2023-06-01' https://api.anthropic.com/v1/models)"; }
probe_neon() { judge_http "$(http_probe "Authorization: Bearer $1" 'https://console.neon.tech/api/v2/projects?limit=1')"; }
probe_cron() { judge_http "$(http_probe "Authorization: Bearer $1" "$COPY/api/cron/daily-cleanup")"; }
probe_stripe() { judge_http "$(http_probe "Authorization: Bearer $1" https://api.stripe.com/v1/balance)"; }

probe_resend() {
  local answer
  answer=$(http_probe "Authorization: Bearer $1" https://api.resend.com/domains)
  # A sending-only key is valid but may not list domains, so Resend names it restricted.
  if [[ "$answer" == 200* || "$answer" == *restricted_api_key* ]]; then printf 'accepted (HTTP %s)' "$answer"; else printf 'refused (HTTP %s)' "$answer"; fi
}

probe_webhook() {
  (cd "$REPO_ROOT" && OLD_WEBHOOK_SECRET="$1" node -e '
const { createHmac } = require("crypto");
const body = JSON.stringify({ id: "evt_drill_982", type: "customer.subscription.updated" });
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac("sha256", process.env.OLD_WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex");
fetch(process.argv[1] + "/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` }, body })
  .then((response) => console.log(response.status === 400 ? "refused (HTTP 400)" : `accepted (HTTP ${response.status})`), () => console.log("no answer"));' "$COPY" 2>/dev/null) || printf 'probe failed'
}

OLD_VALUE=""
rotate_start() {
  begin_step "$1" "$2"
  cite "$GUIDE" "$3" "$2"
  OLD_VALUE=""
  if [[ -n "$4" ]]; then
    say "Before you rotate, enter the old value, so the wizard can prove the provider refuses it after."
    note "$6 Press Enter alone if you do not have it; then the guide's console proof counts."
    ask_secret OLD_VALUE "Old value (hidden):" || OLD_VALUE=""
    clear_clipboard
    if [[ -n "$OLD_VALUE" && "$5" == yes ]]; then
      say_value "The old value now" "$("$4" "$OLD_VALUE")"
      note "It must say accepted. If not, the value you typed is not the one in use."
    fi
  fi
  step "Rotate it on the COPY as the guide says: the provider first, then the copy's setting, then a redeploy."
  warn "A redeploy with the new value does not revoke the old one. Revoke or expire it at the provider too."
  pause "When the copy runs with the new value and the old one is revoked, press Enter"
}

rotate_refusal() {
  if [[ -n "$OLD_VALUE" && -n "$2" ]]; then
    record "$1 old value" "$("$2" "$OLD_VALUE") (expected refused)"
  else
    ask_result "$1 old value" "No old value to try. What did the guide's refusal proof show (for example, the key is listed as revoked)?"
  fi
  OLD_VALUE=""
}

s_values() {
  CURRENT_STEP=0
  [[ -n "${BASE_EMAIL:-}" ]] || ask_email BASE_EMAIL "Your inbox for the test students (no + sign):"
  [[ -n "${RUN_TAG:-}" ]] || write_env RUN_TAG "$(date -u +%m%d%H%M)" > /dev/null
  [[ -n "${RUN_STARTED:-}" ]] || write_env RUN_STARTED "$(now_utc)" > /dev/null
  local who key
  for who in r f w k n d m; do
    key="P_$(printf '%s' "$who" | tr '[:lower:]' '[:upper:]')"
    [[ -n "${!key:-}" ]] || write_env "$key" "$(new_password "$who")" > /dev/null
  done
  while [[ -z "${CANDIDATE:-}" ]]; do
    ask CANDIDATE "Release candidate commit (full SHA, as the owner picked it):" || exit 1
    if [[ "$CANDIDATE" =~ ^[0-9a-f]{40}$ ]] && git -C "$REPO_ROOT" cat-file -e "$CANDIDATE^{commit}" 2>/dev/null; then write_env CANDIDATE "$CANDIDATE" > /dev/null
    else warn "That is not a full commit SHA in this checkout. Fetch main, then try again."; CANDIDATE=""; fi
  done
}

s_rot_setup() {
  begin_step 1.1 "Version, test students, and the free-week fixture"
  cite "$GUIDE" "Rotate the Stripe credentials" "the rotation drill"
  say "Students sign up with a password at plus addresses of $BASE_EMAIL. Emails, passwords, and cookies stay in $RUN_DIR (mode 700)."
  warn "Never type an email, password, key, cookie, or link at a result prompt. Results get posted on the issue."
  open_url "https://vercel.com/dashboard"
  step "COPY project: check that Production serves commit $(printf '%.7s' "$CANDIDATE"), the release candidate."
  ask_id DEPLOYMENT "Copy Production deployment ID (dpl_…):"
  real_deployment REAL_BEFORE "Real site live Production deployment ID:"
  record "1.1a version" "candidate $(printf '%.7s' "$CANDIDATE"), copy $DEPLOYMENT, real site $REAL_BEFORE, run t$RUN_TAG from $RUN_STARTED"
  say "Sign up each student at $COPY/signup and click the verify link in the inbox. Pay with test card 4242 4242 4242 4242."
  student r
  student f
  step "R: finish onboarding with 'Type your analytics' and choose a plan. Checkout shows a free week. Pay."
  step "F: the same. Then Account > Delete Account. F's email is now on the used free week list."
  step "Sign R in again. Sign the Admin in with Google in a private window."
  pause "When R is on This week and the Admin is on /admin, press Enter"
  ask_cookie r
  ask_cookie admin
  show_sql "SELECT count(*) FILTER (WHERE email LIKE '$(prefix)%') AS test_accounts,
  (SELECT count(*) FROM billing_records b JOIN accounts a ON a.id = b.account_id WHERE a.email = '$(addr r)') AS r_plans,
  (SELECT count(*) FROM used_free_weeks) AS used_free_week_rows
FROM accounts;"
  expect "1 test Account (R), 1 plan for R, and at least 2 used free week rows (R and F)."
  paste_result "1.1b students"
  write_env DRILL_STARTED "$(now_utc)" > /dev/null
  pause
}

s_rot_database() {
  rotate_start 1.2 "App database password (DATABASE_URL)" "database password|app role|DATABASE_URL" probe_postgres yes \
    "The copy app role's connection string, from the password manager."
  step "Open $COPY/login. Sign R in with the password."
  ask_cookie r
  local out="$RUN_DIR/db" code
  code=$(get r "$out" "$COPY/progress")
  record "1.2 works" "/progress as R: HTTP $code (expected 200)"
  rotate_refusal 1.2 probe_postgres
  expect "Old connection string refused with 28P01. R's pages load."
  pause
}

s_rot_migration() {
  rotate_start 1.3 "Migration role password (MIGRATION_DATABASE_URL, migrations-copy)" "migration role" probe_postgres yes \
    "The copy migration role's connection string, from the password manager."
  say "The wizard starts Release migrations with Stop after the copy, so production is not touched."
  if confirm "Start Release migrations on main with copy_only=true?"; then
    if dispatch release-migrations.yml -f copy_only=true; then
      record "1.3 works" "run $LAST_RUN_ID: $(run_line 'Target: copy\..*'). Jobs: $(run_jobs)"
    else record "1.3 works" "run not found"; fi
  else record "1.3 works" "Not run"; fi
  rotate_refusal 1.3 probe_postgres
  expect "'Target: copy.', the copy job succeeds, the production job is skipped. Old connection string refused with 28P01."
  pause
}

s_rot_google() {
  [[ -n "${GOOGLE_CLIENT_ID:-}" ]] || { ask GOOGLE_CLIENT_ID "The copy's Google client ID (ends .apps.googleusercontent.com; not secret):"; write_env GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID" > /dev/null; }
  rotate_start 1.4 "Google client secret (AUTH_GOOGLE_SECRET)" "Google" probe_google yes \
    "The copy's old Google client secret, from the password manager or the Google Cloud console."
  step "Private window: sign the Admin out, then in again with Google."
  ask_cookie admin
  local out="$RUN_DIR/google" code
  code=$(get admin "$out" "$COPY/admin")
  record "1.4 works" "Google sign-in, then /admin HTTP $code (expected 200)"
  rotate_refusal 1.4 probe_google
  expect "Google sign-in works. Google answers the old secret with invalid_client."
  pause
}

s_rot_anthropic() {
  rotate_start 1.5 "Anthropic key (ANTHROPIC_API_KEY)" "Anthropic key" probe_anthropic yes \
    "The copy workspace's old key, if you saved it."
  ask_cookie r
  record "1.5 works" "practice-test scan as R: $(scan r anthropic-rotated)"
  rotate_refusal 1.5 probe_anthropic
  expect "The scan answers HTTP 200 with a reading. The old key gets HTTP 401."
  pause
}

s_rot_resend() {
  rotate_start 1.6 "Resend key (RESEND_API_KEY)" "Resend" probe_resend yes "The copy's old Resend key, if you saved it."
  step "Signed out, open $COPY/forgot-password and ask for a reset link for R ($(addr r))."
  ask_result "1.6 works" "Did the reset email arrive, from the DrillMap address? (Do not use the link.)"
  rotate_refusal 1.6 probe_resend
  expect "The email arrives. Resend refuses the old key."
  pause
}

s_rot_stripe_key() {
  rotate_start 1.7 "Stripe secret key (STRIPE_SECRET_KEY)" "Stripe secret key" probe_stripe yes \
    "The sandbox's current secret key (Developers > API keys > Reveal). Also replace it in .env.local after."
  step "Sign R in. Account > manage the plan. Stripe's Customer Portal must open."
  ask_result "1.7 works" "Did the Customer Portal open with R's plan?"
  rotate_refusal 1.7 probe_stripe
  expect "The Customer Portal opens. Stripe answers the old key with HTTP 401."
  pause
}

s_rot_stripe_webhook() {
  rotate_start 1.8 "Stripe message secret (STRIPE_WEBHOOK_SECRET)" "message secret" probe_webhook no \
    "The copy endpoint's current signing secret (Developers > Webhooks > the endpoint > Reveal)."
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$COPY/api/stripe/webhook" || printf 000)
  record "1.8 no signature" "HTTP $code (expected 400)"
  note "Step 1.11 pays with a new student. Stripe must deliver its messages with HTTP 200 then."
  rotate_refusal 1.8 probe_webhook
  expect "No signature and the old secret both get HTTP 400."
  pause
}

s_rot_neon_key() {
  rotate_start 1.9 "Backup checker's Neon key (NEON_API_KEY, backup-checker-copy)" "Neon key|checker" probe_neon yes \
    "The copy checker's old Neon key, if you saved it."
  say "The wizard runs Backup checker copy with the new key."
  run_checker "1.9 works" copy || true
  rotate_refusal 1.9 probe_neon
  expect "The checker reports \"fresh\". Neon answers the old key with HTTP 401."
  pause
}

s_rot_cron() {
  rotate_start 1.10 "Cron secret (CRON_SECRET)" "cron" probe_cron no "The copy's old cron secret, if you saved it."
  run_cron
  step "COPY project > Logs: the last /api/cron/daily-cleanup request."
  ask_result "1.10 works" "What status did the daily job's request get?"
  rotate_refusal 1.10 probe_cron
  expect "The daily job answers 200. The old secret gets HTTP 401."
  pause
}

s_rot_auth_secret() {
  begin_step 1.11 "AUTH_SECRET, then the full walk"
  needs DRILL_STARTED
  cite "$GUIDE" "AUTH_SECRET" "AUTH_SECRET"
  say "A new AUTH_SECRET signs every student out. Email hashes use EMAIL_HASH_SECRET, so they stay the same."
  ask_cookie r
  keep_cookie r r-old
  say_value "R's saved cookie now" "$(cookie_answer r-old)"
  if dry; then note "[dry run] would make a new AUTH_SECRET and copy it to the clipboard"
  else openssl rand -base64 32 | tr -d '\n' | pbcopy; fi
  say "A new AUTH_SECRET is in the clipboard. The wizard never shows it."
  step "Save it in the password manager as the copy's AUTH_SECRET, with today's date."
  step "COPY project > Settings > Environment Variables: replace AUTH_SECRET on Production, marked Sensitive. Leave EMAIL_HASH_SECRET as it is."
  redeploy_copy DEPLOYMENT_AUTH
  clear_clipboard
  if confirm "Is the new AUTH_SECRET saved in the password manager?"; then record "1.11a saved" "new copy AUTH_SECRET saved in the password manager, $(now_utc)"
  else record "1.11a saved" "NOT saved: save it before stage 3"; fi
  record "1.11b old cookie" "$(cookie_answer r-old) (expected a redirect to /login for each)"
  rm -f "$RUN_DIR/cookie-r-old"
  say "Now walk the site once with every new value."
  student w
  step "Sign up W, open the verify email, finish onboarding with 'Type your analytics', and pay with 4242 4242 4242 4242."
  step "Stripe sandbox > Developers > Webhooks > the copy's endpoint: the messages after the rotation."
  step "Sign R in with the password. Open This week, the weekly upload with a screenshot, and Progress."
  step "Private window: sign the Admin in with Google and open /admin."
  ask_result "1.11c walk" "Sign-in, onboarding, weekly upload, payment, and email: did each work? Were the Stripe messages delivered with 200?"
  student f
  step "Sign up F again with the same email. Finish onboarding to the plan step and choose a plan. Read the Checkout page. Do not pay."
  ask_result "1.11d J11" "Did Checkout offer F a free week?"
  warn "If it offered a free week, J11 fails after the AUTH_SECRET rotation. That is a defect: stop and file a ticket (#978 says it blocks the candidate)."
  write_env DRILL_ENDED "$(now_utc)" > /dev/null
  record "1.11e dates" "rotation drill $DRILL_STARTED to $DRILL_ENDED"
  expect "The old cookie goes to /login. Everything works. Checkout offers F no free week."
  pause
}

s_emergency_pause() {
  begin_step 2.1 "Pause the copy's Vercel project"
  cite "$GUIDE" "Pause" "pausing the Vercel project"
  step "Pause the COPY project as the guide says."
  pause "When it is paused, press Enter"
  local out="$RUN_DIR/paused" code
  code=$(get none "$out" "$COPY/login")
  record "2.1a paused" "/login HTTP $code, x-vercel-error '$(header_of "$out" x-vercel-error)'"
  step "Open $COPY in a browser."
  ask_result "2.1b student sees" "What does a student see while it is paused?"
  step "Resume the COPY project as the guide says."
  pause "When it is back, press Enter"
  code=$(get none "$out" "$COPY/login")
  record "2.1c resumed" "/login HTTP $code (expected 200)"
  expect "Paused: no DrillMap page, a Vercel page instead. Resumed: /login answers 200."
  pause
}

s_emergency_scanning() {
  begin_step 2.2 "Turn scanning off and on"
  cite "$GUIDE" "Turn scanning off" "the scanning switch"
  ask_cookie r
  show_sql "UPDATE scan_settings SET scanning_off = true;
SELECT scanning_off FROM scan_settings;"
  paste_result "2.2a off"
  record "2.2b scan while off" "$(scan r off)"
  step "As R, open the weekly upload and choose a screenshot."
  ask_result "2.2c student sees" "What did the upload page show?"
  show_sql "UPDATE scan_settings SET scanning_off = false;
SELECT scanning_off FROM scan_settings;"
  paste_result "2.2d on"
  record "2.2e scan while on" "$(scan r on)"
  expect "Off: HTTP 429, reason scanning-off, '$SCANNING_OFF_TEXT'. On: HTTP 200."
  pause
}

s_emergency_limit() {
  begin_step 2.3 "Change and restore the monthly limit"
  cite "$GUIDE" "monthly limit" "the monthly limit"
  ask_cookie r
  show_sql "SELECT monthly_limit_usd FROM scan_settings;"
  paste_result "2.3a limit before"
  [[ -n "${LIMIT_BEFORE:-}" ]] || write_env LIMIT_BEFORE "$(printf '%s' "$PASTED" | grep -oE '[0-9]+(\.[0-9]+)?' | tail -n1)" > /dev/null
  show_sql "UPDATE scan_settings SET monthly_limit_usd = 0;
SELECT monthly_limit_usd FROM scan_settings;"
  paste_result "2.3b limit 0"
  record "2.3c scan at limit 0" "$(scan r limit)"
  note "The copy's limit alert check may email you now. Pause that check again in Healthchecks.io."
  show_sql "UPDATE scan_settings SET monthly_limit_usd = ${LIMIT_BEFORE:-10};
SELECT monthly_limit_usd FROM scan_settings;"
  paste_result "2.3d limit restored"
  expect "At 0: HTTP 429, reason scanning-off. Restored to ${LIMIT_BEFORE:-10}."
  pause
}

s_emergency_anthropic() {
  begin_step 2.4 "Revoke and replace the Anthropic key"
  cite "$GUIDE" "Revoke the Anthropic key" "revoking the Anthropic key"
  ask_cookie r
  step "Anthropic Console > the copy's workspace > API keys: revoke the copy's key. Do not redeploy yet."
  pause "When it is revoked, press Enter"
  record "2.4a scan after revoke" "$(scan r revoked)"
  step "As R, try the weekly upload with a screenshot."
  ask_result "2.4b student sees" "What did the upload page show?"
  step "Create a new key in the copy's workspace. Replace ANTHROPIC_API_KEY on copy Production, marked Sensitive."
  redeploy_copy DEPLOYMENT_ANTHROPIC
  clear_clipboard
  record "2.4c scan with new key" "$(scan r replaced)"
  expect "Revoked: the scan fails with a planned message and no reading. New key: HTTP 200."
  pause
}

s_emergency_sessions() {
  begin_step 2.5 "Sign out every session"
  cite "$GUIDE" "[Ss]ign out" "signing out every session"
  ask_cookie r
  ask_cookie admin
  say "Sessions are signed cookies. Each Account's session_version must match the cookie's, so raising every version signs everyone out."
  show_sql "UPDATE accounts SET session_version = session_version + 1;
SELECT count(*) AS accounts FROM accounts;"
  paste_result "2.5a all versions raised"
  record "2.5b old cookies" "R: $(cookie_answer r). Admin: $(cookie_answer admin)"
  step "Reload R's tab and the Admin's tab."
  ask_result "2.5c student sees" "What did each tab show?"
  rm -f "$RUN_DIR/cookie-r" "$RUN_DIR/cookie-admin"
  record "2.5d date" "emergency steps done $(now_utc)"
  expect "Every saved cookie goes to /login. Both tabs land on Login."
  pause
}

restored_sql() {
  show_sql "$2" "RESTORED branch (choose it in the SQL Editor's branch menu)"
  paste_result "$1"
}

hosts_add() {
  [[ -f "$RUN_DIR/copyDatabaseHosts.json" ]] || cp "$REPO_ROOT/scripts/copyDatabaseHosts.json" "$RUN_DIR/copyDatabaseHosts.json"
  node -e 'const f=process.argv[1],h=process.argv[2],l=require(f);for(const x of [h,h.replace(/^(ep-[^.]+)/,"$1-pooler")])if(!l.includes(x))l.push(x);require("fs").writeFileSync(f,JSON.stringify(l,null,2)+"\n")' \
    "$REPO_ROOT/scripts/copyDatabaseHosts.json" "$RESTORED_HOST"
}
hosts_back() {
  if [[ -f "$RUN_DIR/copyDatabaseHosts.json" ]]; then
    cp "$RUN_DIR/copyDatabaseHosts.json" "$REPO_ROOT/scripts/copyDatabaseHosts.json"
    rm -f "$RUN_DIR/copyDatabaseHosts.json"
  fi
}

ask_owner_url() {
  if [[ -n "$3" ]] && have_cli neonctl; then
    printf -v "$1" '%s' "$(neonctl connection-string "$3" --project-id "$COPY_PROJECT_ID" --database-name neondb --role-name neondb_owner --ssl verify-full 2>/dev/null || true)"
  fi
  if [[ -z "${!1:-}" ]]; then
    step "Copy the $2 branch's owner connection string (Connect dialog, sslmode=verify-full)."
    ask_secret "$1" "$2 branch connection string (hidden):" || exit 1
    clear_clipboard
  fi
}

ask_neon_key() {
  if [[ -z "${NEON_KEY:-}" ]]; then
    open_url "https://console.neon.tech/app/settings/api-keys"
    step "Create a personal API key named issue-982-age-check. Step 4.8 revokes it."
    ask_secret NEON_KEY "Neon API key (hidden):" || exit 1
    clear_clipboard
  fi
}

age_check() {
  (cd "$REPO_ROOT" && BACKUP_PROJECT_ID="$COPY_PROJECT_ID" BACKUP_BRANCH_ID="$1" NEON_API_KEY="$NEON_KEY" npm run -s check-backup-ages 2>&1 || true) | tr '\n' ' ' | cut -c1-400
}

s_restore_accounts() {
  begin_step 3.1 "Test Accounts with and without plans"
  cite_restore 1 "restore into a new branch"
  student k
  student n
  student d
  student m
  step "K and D: finish onboarding with 'Type your analytics' and pay with 4242 4242 4242 4242 (free week)."
  step "N and M: finish onboarding and stop at the plan step."
  pause "When all four are done, press Enter"
  show_sql "SELECT a.id FROM accounts a WHERE a.email = '$(addr m)';"
  ask_uuid M_ACCOUNT_ID "M's Account ID (kept in the run folder only):"
  show_sql "SELECT count(*) AS accounts, count(b.account_id) AS plans FROM accounts a LEFT JOIN billing_records b ON b.account_id = a.id
WHERE a.email IN ('$(addr k)', '$(addr n)', '$(addr d)', '$(addr m)');"
  expect "4 accounts, 2 plans."
  paste_result "3.1 test Accounts"
  pause
}

s_restore_point() {
  begin_step 3.2 "Record the restore point and the source counts"
  cite_restore 6 "the table counts"
  [[ -n "${RESTORE_POINT:-}" ]] || write_env RESTORE_POINT "$(now_utc)" > /dev/null
  say_value "Restore point (UTC)" "$RESTORE_POINT"
  say "Run the counts at once, so they show the source at that moment."
  show_sql "$TABLE_COUNTS"
  paste_result "3.2 counts at the restore point"
  write_env COUNTS_AT_POINT "$PASTED" > /dev/null
  expect "One row for each table. Nothing else writes to the copy now."
  pause
}

s_restore_deletions() {
  begin_step 3.3 "Delete D and M after the restore point"
  needs M_ACCOUNT_ID
  cite "$RESTORE" "Why the order matters" "the deletions after a backup"
  say "D is deleted by Account ID. M's deletion list row gets a new random ID, so the replay can only match M by email hash."
  step "Sign in as D: Account > Delete Account. Then sign in as M and do the same."
  pause "When both are deleted, press Enter"
  show_sql "UPDATE deletion_list SET account_id = gen_random_uuid() WHERE account_id = '$M_ACCOUNT_ID';
SELECT count(*) FILTER (WHERE email IN ('$(addr d)', '$(addr m)')) AS d_m_left,
  (SELECT count(*) FROM deletion_list WHERE account_id = '$M_ACCOUNT_ID') AS m_id_rows FROM accounts;"
  expect "UPDATE 1, then 0 and 0."
  paste_result "3.3 deletions"
  pause
}

s_restore_branch() {
  begin_step 3.4 "Restore into a new branch"
  needs RESTORE_POINT
  cite_restore 1 "restore into a new branch"
  [[ -n "${RESTORE_STARTED_EPOCH:-}" ]] || { write_env RESTORE_STARTED_EPOCH "$(date -u +%s)" > /dev/null; write_env RESTORE_STARTED "$(now_utc)" > /dev/null; }
  say_value "Clock started" "$RESTORE_STARTED"
  open_url "https://console.neon.tech"
  step "COPY project > Backup & Restore. Restore $RESTORE_POINT UTC into a NEW branch. Do not replace the current branch."
  ask COPY_PROJECT_ID "Copy's Neon project ID:" && write_env COPY_PROJECT_ID "$COPY_PROJECT_ID" > /dev/null
  ask_branch_id FORMER_BRANCH_ID "The copy's CURRENT branch ID (br-…), the one the site uses now:"
  ask_branch_id RESTORED_BRANCH_ID "The restored branch's ID (br-…):"
  ask RESTORED_HOST "Restored branch host (ep-…neon.tech, no pooler):" && write_env RESTORED_HOST "$RESTORED_HOST" > /dev/null
  record "3.4 restore" "restored $RESTORE_POINT into a new branch, started $RESTORE_STARTED, done $(now_utc)"
  expect "A new branch from the restore point. The current branch is untouched, and the copy still uses it."
  pause
}

s_restore_counts() {
  begin_step 3.5 "Age check and counts on the restored branch"
  needs COUNTS_AT_POINT COPY_PROJECT_ID FORMER_BRANCH_ID RESTORED_BRANCH_ID
  cite_restore 2 "the age check"
  ask_neon_key
  record "3.5a age check" "$(age_check "$FORMER_BRANCH_ID") (expected: the restored branch not named)"
  cite_restore 3 "migrations on the restored branch"
  restored_sql "3.5b journal" "SELECT count(*) AS journal_rows FROM drillmap_migrations.applied;"
  note "Expected $(git -C "$REPO_ROOT" ls-tree --name-only "$CANDIDATE" migrations/ | grep -c '\.sql$') journal rows: the candidate's migration files."
  restored_sql "3.5c counts before the replay" "$TABLE_COUNTS"
  if [[ "$PASTED" == "$COUNTS_AT_POINT" ]]; then record "3.5d compare" "every table count matches the restore point"
  else ask_result "3.5d compare" "The wizard cannot match the two count lists exactly. Compare 3.2 with 3.5c: which tables differ, and by how much?"; fi
  expect "Every table count equals step 3.2."
  pause
}

s_restore_replay() {
  begin_step 3.6 "Replay the deletions with the saved EMAIL_HASH_SECRET"
  needs COPY_PROJECT_ID FORMER_BRANCH_ID RESTORED_BRANCH_ID RESTORED_HOST
  cite_restore 4 "the replay"
  ask_owner_url RESTORED_URL RESTORED "$RESTORED_BRANCH_ID"
  local current_url="" email_hash_secret first second
  ask_owner_url current_url CURRENT "$FORMER_BRANCH_ID"
  step "Copy the copy's EMAIL_HASH_SECRET from the password manager."
  ask_secret email_hash_secret "Copy's EMAIL_HASH_SECRET (hidden):" || exit 1
  clear_clipboard
  hosts_add
  first=$(cd "$REPO_ROOT" && DATABASE_URL="$RESTORED_URL" DELETION_LIST_URL="$current_url" EMAIL_HASH_SECRET="$email_hash_secret" npm run -s replay-deletions 2>&1 | tail -n1 || true)
  second=$(cd "$REPO_ROOT" && DATABASE_URL="$RESTORED_URL" DELETION_LIST_URL="$current_url" EMAIL_HASH_SECRET="$email_hash_secret" npm run -s replay-deletions 2>&1 | tail -n1 || true)
  unset current_url email_hash_secret
  record "3.6a replay" "first: $first second: $second"
  restored_sql "3.6b D and M gone" "SELECT count(*) FILTER (WHERE email = '$(addr d)') AS d, count(*) FILTER (WHERE email = '$(addr m)') AS m_by_hash,
  count(*) FILTER (WHERE email IN ('$(addr k)', '$(addr n)')) AS k_n FROM accounts;"
  expect "The first run deletes at least 2 Accounts, the second 0. Then 0, 0, 2: M went only by email hash."
  pause
}

s_restore_resync() {
  begin_step 3.7 "Billing resync"
  needs COPY_PROJECT_ID RESTORED_BRANCH_ID RESTORED_HOST
  cite_restore 5 "the billing resync"
  ask_owner_url RESTORED_URL RESTORED "$RESTORED_BRANCH_ID"
  local stripe_key email_hash_secret first second
  step "Copy the sandbox secret key (Stripe sandbox > Developers > API keys), then the copy's EMAIL_HASH_SECRET from the password manager."
  ask_secret stripe_key "Sandbox secret key (hidden):" || exit 1
  ask_secret email_hash_secret "Copy's EMAIL_HASH_SECRET (hidden):" || exit 1
  clear_clipboard
  hosts_add
  if [[ "$stripe_key" != sk_test_* && "$DRY_RUN" == no ]]; then warn "That is not a test key. The copy uses only test keys."; unset stripe_key email_hash_secret; exit 1; fi
  first=$(cd "$REPO_ROOT" && DATABASE_URL="$RESTORED_URL" STRIPE_SECRET_KEY="$stripe_key" EMAIL_HASH_SECRET="$email_hash_secret" npm run -s resync-billing 2>&1 | tail -n1 || true)
  second=$(cd "$REPO_ROOT" && DATABASE_URL="$RESTORED_URL" STRIPE_SECRET_KEY="$stripe_key" EMAIL_HASH_SECRET="$email_hash_secret" npm run -s resync-billing 2>&1 | tail -n1 || true)
  unset stripe_key email_hash_secret
  hosts_back
  record "3.7a resync" "first: $first second: $second"
  restored_sql "3.7b plans" "SELECT CASE a.email WHEN '$(addr k)' THEN 'K' WHEN '$(addr n)' THEN 'N' END AS who, b.plan, b.stripe_status
FROM accounts a LEFT JOIN billing_records b ON b.account_id = a.id WHERE a.email IN ('$(addr k)', '$(addr n)') ORDER BY 1;"
  step "Stripe sandbox > Subscriptions: compare K's status with the row above. Check D has no active subscription."
  ask_result "3.7c Stripe matches" "Does K's status match Stripe? Is D's plan gone?"
  restored_sql "3.7d counts after" "$TABLE_COUNTS"
  expect "Both runs print the same counts and 'Billing records Stripe does not list: 0.' K matches Stripe, N has no plan, D's plan does not come back."
  pause
}

s_restore_switch() {
  begin_step 3.8 "Switch the copy to the restored branch"
  needs RESTORED_BRANCH_ID RESTORED_HOST
  cite_restore 7 "switching the site to the restored branch"
  open_url "https://console.neon.tech"
  step "Copy the restored branch's connection string for the APP role (drillmap_app, sslmode=verify-full)."
  step "COPY project > Settings > Environment Variables: replace DATABASE_URL on Production with it, marked Sensitive."
  redeploy_copy DEPLOYMENT_RESTORED
  clear_clipboard
  cite_restore 8 "protecting the restored branch"
  set_checker_branch "$RESTORED_BRANCH_ID"
  run_checker "3.8a checker" copy || true
  say "The copy's MIGRATION_DATABASE_URL (migrations-copy) must point at the restored branch too, and"
  say "scripts/copyDatabaseHosts.json must list $RESTORED_HOST before the next copy release, or the release refuses it."
  step "Replace MIGRATION_DATABASE_URL in the migrations-copy environment with the restored branch's migration role string."
  record "3.8b hosts" "copy now on $RESTORED_HOST; scripts/copyDatabaseHosts.json needs it before the next copy release"
  expect "The copy runs on the restored branch, and the checker reports \"fresh\" for it."
  pause
}

s_restore_walk() {
  begin_step 3.9 "Walk the restored copy and stop the clock"
  needs RESTORE_STARTED RESTORE_STARTED_EPOCH
  cite_restore 7 "checking the site after the switch"
  step "Sign in as K with the password: This week, Progress, Study settings, Account. Sign in as N: the plan step."
  step "Try to sign in as D and as M. Then sign up D again with the same email and reach Checkout. Do not pay."
  step "Private window: sign the Admin in with Google. Open /admin; K and N are listed, D and M are not."
  ask_result "3.9a walk" "Did K and N work? Were D and M refused? Did Checkout offer D a free week?"
  local ended
  ended=$(date -u +%s)
  record "3.9b time" "restore started $RESTORE_STARTED, site working $(now_utc): $(( (ended - RESTORE_STARTED_EPOCH) / 60 )) minutes (limit 48 hours)"
  expect "K's pages work, D and M cannot sign in, Checkout offers D no free week, the time is under 48 hours."
  pause
}

s_restore_cleanup() {
  begin_step 3.10 "Delete unused branches and run the age check"
  needs COPY_PROJECT_ID RESTORED_BRANCH_ID
  cite_restore 9 "removing expired copies"
  step "Neon console, COPY project: with your approval of each, delete every unused restore or _old_ branch."
  note "Keep the former branch until step 4.6: its backups are the stale-backup fixture. Step 4.6 deletes it."
  pause "When they are deleted, press Enter"
  ask_neon_key
  record "3.10 age check" "$(age_check "$RESTORED_BRANCH_ID") (expected within-30-days)"
  expect "No branch named except the former branch, which step 4.6 deletes. Only the restored and the former branch are left."
  unset RESTORED_URL
  pause
}

real_fail_signal() {
  local url="" answer
  step "Healthchecks.io > $2 > copy its ping URL."
  while true; do
    ask_secret url "$2 ping URL (hidden):" || exit 1
    clear_clipboard
    if [[ "$url" == https://hc-ping.com/* ]] || dry; then break; fi
    warn "That is not a Healthchecks.io ping URL (https://hc-ping.com/…). Copy it again."
  done
  if dry; then record "$1" "not sent (dry run)"; return 0; fi
  answer=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' -X POST "$url/fail" || true)
  unset url
  record "$1" "one fail signal sent, Healthchecks.io answered HTTP ${answer:-000} (expected 200)"
}

s_alert_anthropic() {
  begin_step 4.1 "Anthropic spend alerts at \$5 and \$8"
  cite "$GATE" "Owner and alerts" "the required alerts"
  step "Anthropic Console > the copy's workspace: set its spend notification just above this month's spend, as the alert setup (#981) records."
  ask_cookie r
  record "4.1a scan" "$(scan r anthropic-alert)"
  ask_result "4.1b email" "Did the Anthropic spend email arrive? At what UTC time?"
  step "Set the copy's notification back. Read the real organization's notifications at \$5 and \$8."
  ask_result "4.1c settings" "Copy restored? Real site's notifications at \$5 and \$8, with the owner's email?"
  expect "The email arrives. The copy's notification is back. The real site has notifications at \$5 and \$8."
  pause
}

s_alert_spend_warning() {
  begin_step 4.2 "App spend at 80% of the limit"
  cite "$GUIDE" "Spend alerts" "spend alerts"
  ask_cookie r
  show_sql "UPDATE scan_spending SET warning_sent_at = NULL, limit_alert_sent_at = NULL WHERE month_start = $MONTH_START;
UPDATE scan_settings SET monthly_limit_usd = ceil((coalesce((SELECT total_usd FROM scan_spending WHERE month_start = $MONTH_START), 0) + 0.03) * 100) / 100;
SELECT s.monthly_limit_usd, coalesce(m.total_usd, 0) AS total,
  coalesce(m.total_usd, 0) + 0.03 BETWEEN s.monthly_limit_usd * 0.8 AND s.monthly_limit_usd AS next_scan_warns
FROM scan_settings s LEFT JOIN scan_spending m ON m.month_start = $MONTH_START;"
  expect "next_scan_warns true."
  paste_result "4.2a limit lowered"
  record "4.2b scan" "$(scan r warning)"
  show_sql "SELECT warning_sent_at IS NOT NULL AS warning_sent FROM scan_spending WHERE month_start = $MONTH_START;"
  paste_result "4.2c warning sent"
  ask_result "4.2d copy email" "Did the copy's 80% check email you (DOWN)? At what UTC time? Pause the check again."
  say "The real site's check: the wizard sends it one fail signal. It does not touch the real site."
  real_fail_signal "4.2e real check" "the REAL site's 80% check"
  ask_result "4.2f real email" "Did the real 80% check email you? Is SCAN_SPEND_WARNING_PING_URL set on real Production? Pause the check again."
  expect "Scan HTTP 200, warning_sent true, both emails arrive, both checks paused again."
  pause
}

s_alert_limit() {
  begin_step 4.3 "App extraction limit reached"
  cite "$GUIDE" "Spend alerts" "spend alerts"
  ask_cookie r
  show_sql "UPDATE scan_settings SET monthly_limit_usd = floor(coalesce((SELECT total_usd FROM scan_spending WHERE month_start = $MONTH_START), 0) * 100) / 100;
SELECT limit_alert_sent_at IS NULL AS not_sent_yet FROM scan_spending WHERE month_start = $MONTH_START;"
  paste_result "4.3a limit at the total"
  record "4.3b scan" "$(scan r limit-alert)"
  show_sql "SELECT limit_alert_sent_at IS NOT NULL AS limit_alert_sent FROM scan_spending WHERE month_start = $MONTH_START;
UPDATE scan_settings SET monthly_limit_usd = ${LIMIT_BEFORE:-10};
SELECT monthly_limit_usd FROM scan_settings;"
  paste_result "4.3c alert sent, limit restored"
  ask_result "4.3d copy email" "Did the copy's limit check email you (DOWN)? At what UTC time? Pause the check again."
  real_fail_signal "4.3e real check" "the REAL site's limit check"
  ask_result "4.3f real email" "Did the real limit check email you? Is SCAN_LIMIT_REACHED_PING_URL set on real Production? Pause the check again."
  expect "Scan HTTP 429 '$SCANNING_OFF_TEXT', limit_alert_sent true, limit back to ${LIMIT_BEFORE:-10}, both emails arrive."
  pause
}

s_alert_neon() {
  begin_step 4.4 "Database problems (Neon)"
  cite "$GATE" "Owner and alerts" "the required alerts"
  step "Trigger the Neon alert on the COPY project as the alert setup (#981) records. Never on the real project."
  ask_result "4.4a trigger" "Which alert method and safe trigger did you use?"
  ask_result "4.4b email" "Did the Neon alert email arrive? At what UTC time?"
  ask_result "4.4c settings" "Copy back to normal? Is the same alert on for the real project, to the owner's email?"
  expect "The email arrives. The real project has the same alert."
  pause
}

s_alert_uptime() {
  begin_step 4.5 "Site is down (uptime check)"
  cite "$GATE" "Owner and alerts" "the required alerts"
  say "The real site's uptime check watches a missing page for a few minutes. It only reads the real site."
  step "In the uptime service, change the real site's check address to https://$REAL_DOMAIN/drill-982-missing."
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$REAL_DOMAIN/drill-982-missing" || printf 000)
  record "4.5a missing page" "HTTP $code (expected 404)"
  ask_result "4.5b down email" "Did the DOWN email arrive? At what UTC time?"
  step "Change the check address back to https://$REAL_DOMAIN/."
  ask_result "4.5c up email" "Did the UP email arrive? Is the check back on the home page?"
  expect "DOWN and UP emails arrive. The check watches the home page again."
  pause
}

s_alert_stale() {
  begin_step 4.6 "Backup failed: stale backup"
  needs COPY_PROJECT_ID FORMER_BRANCH_ID RESTORED_BRANCH_ID RESTORE_STARTED_EPOCH
  cite "$CHECKER" "Copy proof" "the stale backup proof"
  say "The copy checker looks at the former branch for one run. Its newest real backup is older than 24 hours."
  note "No backup is changed. The limit stays 24 hours."
  local hours=$(( ($(date -u +%s) - RESTORE_STARTED_EPOCH) / 3600 ))
  if (( hours < 24 )); then warn "The restore started $hours hours ago. The former branch's newest backup may be under 24 hours old. Wait, then run --from 4.6."; fi
  set_checker_branch "$FORMER_BRANCH_ID"
  run_checker "4.6a stale" copy || true
  ask_result "4.6b email" "Did the copy backup check email you (DOWN)? At what UTC time?"
  set_checker_branch "$RESTORED_BRANCH_ID"
  run_checker "4.6c recovery" copy || true
  ask_result "4.6d up email" "Did the UP email arrive?"
  if ! confirm "Did run 4.6a report \"stale\" and send the DOWN email?"; then
    warn "Keep the former branch: it is the only stale-backup fixture. Run --from 4.6 again later."
    pause "Press Ctrl-C to stop"; exit 1
  fi
  step "Neon console, COPY project: with your approval, delete the former branch now."
  pause "When it is deleted, press Enter"
  ask_neon_key
  record "4.6e age check" "$(age_check "$RESTORED_BRANCH_ID") (expected within-30-days)"
  run_checker "4.6f production" production || true
  ask_result "4.6g real settings" "Production checker: same schedule, grace, and email? Its run above reported fresh?"
  expect "\"status\":\"stale\" then \"fresh\". DOWN and UP emails. The former branch is gone and the age check says within-30-days. Production reports fresh with the same settings."
  pause
}

s_alert_retention() {
  begin_step 4.7 "Backup failed: a backup over 30 days"
  cite "$CHECKER" "Owner retention cleanup" "the 30-day alert"
  say "The wizard runs both live checkers. Each reads only. Any real backup over 30 days fires the retention alert."
  run_checker "4.7a production" production || true
  run_checker "4.7b copy" copy || true
  note "A report with \"retention-overdue\" and a non-empty expired list fired the alert."
  ask_result "4.7c email" "Which checker reported retention-overdue, and did its retention check email you? If neither, type 'no backup over 30 days'."
  step "If one fired: follow the guide's owner retention cleanup, with your approval of each backup. Then run that checker again."
  ask_result "4.7d after" "After the cleanup, did the checker report fresh and the retention check send UP? (Or 'not needed'.)"
  expect "retention-overdue with the retention check DOWN and the freshness check UP, then fresh. If no real backup is over 30 days, the alert cannot fire without a false age: record it for the owner."
  pause
}

s_cleanup() {
  begin_step 4.8 "Clean up"
  needs REAL_BEFORE
  cite "$GUIDE" "Spend alerts" "pausing the spend checks"
  show_sql "DELETE FROM accounts WHERE email LIKE '$(prefix)%';
SELECT count(*) AS test_accounts_left FROM accounts WHERE email LIKE '$(prefix)%';
SELECT scanning_off, monthly_limit_usd FROM scan_settings;"
  expect "Then 0, false, ${LIMIT_BEFORE:-10}."
  paste_result "4.8a test Accounts and settings"
  step "Stripe sandbox (\"DrillMap sandbox\") > Subscriptions: cancel every subscription of this run's test students."
  step "Healthchecks.io: both copy spend checks and both real spend checks are paused."
  step "Neon console: revoke the issue-982-age-check API key."
  ask_result "4.8b providers" "Subscriptions cancelled, checks paused, the Neon key revoked?"
  real_deployment REAL_AFTER "Real site live Production deployment ID now:"
  record "4.8c real site" "$REAL_AFTER (before: $REAL_BEFORE)"
  record "4.8d end" "$(now_utc)"
  hosts_back
  cp "$RESULTS" "$RESULTS_KEPT"
  rm -rf "$RUN_DIR"
}

STAGE_TITLES=([1]="Rotation drill (H5, J7, J11)" [2]="Emergency steps (I4)" [3]="Restore practice (I2, F4, J13)" [4]="Alert triggers (I1, I3)")
TOTAL_STAGES=4
STEP_IDS="1.1 1.2 1.3 1.4 1.5 1.6 1.7 1.8 1.9 1.10 1.11 2.1 2.2 2.3 2.4 2.5 3.1 3.2 3.3 3.4 3.5 3.6 3.7 3.8 3.9 3.10 4.1 4.2 4.3 4.4 4.5 4.6 4.7 4.8"
dry_run_stubs() {
  dry_run_common_stubs
  ask_branch_id() { printf -v "$1" '%s' "br-dry-run"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  set_checker_branch() { printf '  %s[dry run] would set BACKUP_BRANCH_ID of backup-checker-copy to %s%s\n' "$DIM" "$1" "$RESET"; }
  hosts_add() { printf '  %s[dry run] would add the restored host to scripts/copyDatabaseHosts.json for this run%s\n' "$DIM" "$RESET"; }
  hosts_back() { :; }
  local probe
  for probe in probe_postgres probe_google probe_anthropic probe_neon probe_cron probe_stripe probe_resend probe_webhook age_check; do
    eval "$probe() { printf 'not tried (dry run)'; }"
  done
}

run_wizard() {
  if dry; then
    dry_run_stubs
    BASE_EMAIL=owner@example.com RUN_TAG=dry RUN_STARTED=$(now_utc)
    CANDIDATE=$(git -C "$REPO_ROOT" rev-parse HEAD)
    DRILL_STARTED=$RUN_STARTED REAL_BEFORE=dpl_DRYRUNREAL M_ACCOUNT_ID=00000000-0000-0000-0000-000000000000
    RESTORE_POINT=$RUN_STARTED COUNTS_AT_POINT="(dry run)" COPY_PROJECT_ID=dry-project RESTORE_STARTED=$RUN_STARTED
    RESTORE_STARTED_EPOCH=$(date -u +%s) FORMER_BRANCH_ID=br-dry-former RESTORED_BRANCH_ID=br-dry-restored RESTORED_HOST=ep-dry-run.neon.tech
  fi
  [[ "$FROM" == *.* ]] || FROM="$FROM.1"
  if [[ "$FROM" == 1.1 ]]; then banner "DrillMap Stage 7 drills (issue 982)"; fi
  s_values
  trap hosts_back EXIT
  if ! [[ " $STEP_IDS " == *" $FROM "* ]]; then warn "No step $FROM. Steps run from 1.1 to 4.8."; exit 2; fi
  reached 1.1 && s_rot_setup
  reached 1.2 && s_rot_database
  reached 1.3 && s_rot_migration
  reached 1.4 && s_rot_google
  reached 1.5 && s_rot_anthropic
  reached 1.6 && s_rot_resend
  reached 1.7 && s_rot_stripe_key
  reached 1.8 && s_rot_stripe_webhook
  reached 1.9 && s_rot_neon_key
  reached 1.10 && s_rot_cron
  reached 1.11 && s_rot_auth_secret
  reached 2.1 && s_emergency_pause
  reached 2.2 && s_emergency_scanning
  reached 2.3 && s_emergency_limit
  reached 2.4 && s_emergency_anthropic
  reached 2.5 && s_emergency_sessions
  reached 3.1 && s_restore_accounts
  reached 3.2 && s_restore_point
  reached 3.3 && s_restore_deletions
  reached 3.4 && s_restore_branch
  reached 3.5 && s_restore_counts
  reached 3.6 && s_restore_replay
  reached 3.7 && s_restore_resync
  reached 3.8 && s_restore_switch
  reached 3.9 && s_restore_walk
  reached 3.10 && s_restore_cleanup
  reached 4.1 && s_alert_anthropic
  reached 4.2 && s_alert_spend_warning
  reached 4.3 && s_alert_limit
  reached 4.4 && s_alert_neon
  reached 4.5 && s_alert_uptime
  reached 4.6 && s_alert_stale
  reached 4.7 && s_alert_retention
  reached 4.8 && s_cleanup
  finish
  if dry; then rm -rf "$RUN_DIR"; say "Dry run done. No provider was called, and nothing was kept."; return 0; fi
  if [[ -f "$RESULTS_KEPT" ]]; then
    say "Results: $RESULTS_KEPT"
    say "Give that file to the agent. It holds no email, password, key, cookie, link, or Account ID."
  fi
}

run_wizard; exit
