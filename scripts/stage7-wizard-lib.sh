# shellcheck shell=bash
# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear wipes the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1 && tput clear 2>/dev/null; then return 0; fi
  printf '\033[2J\033[3J\033[H'
}

# banner "Title" shows the opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" clears the screen, then announces a stage and shows progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." prints a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." is a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL opens it in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else false; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

# pause "msg" waits for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" is a y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY: current value of KEY in ENV_FILE, if any, with write_env's single
# quotes or a plain dotenv double-quoted value undone.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line value sq="'\\''"; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  value="${line#*=}"
  if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; value="${value//"$sq"/\'}"
  elif [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
    [[ "$value" == *[\\\$\"]* ]] && return 1   # escapes, $ or ": can't decode safely; ask again
  fi
  printf '%s' "$value"
}

# ask KEY "Prompt" reads a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret), edited
# with Readline. Fails at EOF with no input.
ask() {
  local key="$1" prompt="$2" current input s=$'\001' e=$'\002' p rc=0
  current=$(_existing "$key" || true)
  # Readline needs the colour codes wrapped in \001..\002 to place the cursor.
  p="  $s$BOLD$e$prompt$s$RESET$e "
  [[ -n "$current" ]] && p+="$s$DIM${e}[Enter keeps current]$s$RESET$e "
  read -e -r -p "$p" input || rc=1
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" is like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input rc=0
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || rc=1
  printf '\n'
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE upserts KEY='VALUE' into ENV_FILE (replaces any existing
# line) and sets $KEY. Idempotent. Creates ENV_FILE at mode 0600; writes through
# a symlink and keeps an existing file's mode.
write_env() {
  local key="$1" value="$2" tmp sq="'\\''"
  [[ -e "$ENV_FILE" ]] || (umask 077 && : > "$ENV_FILE")
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf "%s='%s'\n" "$key" "${value//\'/$sq}" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  printf -v "$key" '%s' "$value"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE sets a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

# set_var NAME VALUE sets a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

# finish clears, then shows a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

REPO=Jahazel/lsat-scheduler
REPO_ROOT=$(git rev-parse --show-toplevel)
PT_SCREENSHOT="$REPO_ROOT/src/lib/practiceTestFixtures/pt158-s1.png"
GUIDE=docs/runbooks/emergency.md
GATE=docs/security/release-gate.md
REAL_DOMAIN=drillmap.xyz
VERCEL_SCOPE=jahazels-projects
SCANNING_OFF_TEXT="Scanning is off right now. Enter your analytics by hand."

dry() { [[ "$DRY_RUN" == yes ]]; }

load_values() {
  local line key
  [[ -f "$ENV_FILE" ]] || return 0
  while IFS= read -r line; do
    key="${line%%=*}"
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] && printf -v "$key" '%s' "$(_existing "$key" || true)"
  done < "$ENV_FILE"
}

start_run() {
  local issue="$1"
  shift
  DRY_RUN=no
  FROM=1
  while (( $# )); do
    case "$1" in
      --dry-run) DRY_RUN=yes ;;
      --from) FROM="${2:?--from needs a stage or step number, such as 3 or 3.4}"; shift ;;
      *) printf 'Usage: %s [--dry-run] [--from N | --from N.M]\n' "$0" >&2; exit 2 ;;
    esac
    shift
  done
  umask 077
  if dry; then
    RUN_DIR=$(mktemp -d)
    RESULTS_KEPT="$RUN_DIR/kept-results.md"
  else
    RUN_DIR="$HOME/.drillmap-issue-$issue-run"
    RESULTS_KEPT="$HOME/drillmap-issue-$issue-results.md"
    mkdir -p "$RUN_DIR"
  fi
  chmod 700 "$RUN_DIR"
  ENV_FILE="$RUN_DIR/values.env"
  RESULTS="$RUN_DIR/results.md"
  load_values
  if [[ -z "${COPY_HOST:-}" ]]; then write_env COPY_HOST drillmap-copy.vercel.app > /dev/null; fi
  COPY="https://$COPY_HOST"
  SITE="$COPY"
}

have_cli() { command -v "$1" > /dev/null 2>&1; }

record() {
  [[ -f "$RESULTS" ]] || printf '| Step | Result |\n| --- | --- |\n' > "$RESULTS"
  printf '| %s | %s |\n' "$1" "${2//|//}" >> "$RESULTS"
  printf '  %s✓ recorded%s %s: %s\n' "$GREEN" "$RESET" "$1" "$2"
}

looks_private() { [[ "$1" == *@* || "$1" == *eyJ* || "$1" == *://* || "$1" =~ (sk-ant|sk_test|sk_live|rk_live|whsec_|(^|[^A-Za-z])re_[A-Za-z0-9]{8}|npg_|napi_) ]]; }

ask_result() {
  local answer=""
  while true; do
    read -e -r -p "  $BOLD$2$RESET " answer || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    if looks_private "$answer"; then warn "That answer holds an @, a key, or a link. Describe it without the value."; continue; fi
    if [[ -z "$answer" || "$answer" == "$2"* || "$answer" == Expected* ]]; then warn "Type the result you saw, not the question."; continue; fi
    record "$1" "$answer"
    return 0
  done
}

clear_clipboard() { printf '' | pbcopy 2>/dev/null || true; }

show_sql() {
  printf '\n'
  printf '%s\n' "$1" | sed 's/^/      /'
  printf '\n'
  if printf '%s' "$1" | pbcopy 2>/dev/null; then note "Copied to the clipboard. Paste it in Neon's SQL Editor on the ${2:-current branch of the COPY project}, as the Neon owner."; fi
}

PASTED=""
paste_result() {
  local text
  while true; do
    pause "In Neon, copy the result rows (select them, then Cmd-C). Then press Enter"
    text=$(pbpaste | tr '\t\r\n' ' ;;' | tr -s ' ')
    clear_clipboard
    if [[ -z "${text// /}" ]]; then warn "The clipboard is empty. Copy the result again."; continue; fi
    if [[ "$text" =~ ^[[:space:]]*(SELECT|INSERT|UPDATE|DELETE|WITH)[[:space:]] ]]; then warn "The clipboard still holds the SQL. Select the result rows and try again."; continue; fi
    if looks_private "$text"; then warn "The result holds an @, a key, or a connection string. Copy only the rows the SQL shows."; continue; fi
    PASTED="$text"
    record "$1" "$text"
    return 0
  done
}

ask_id() {
  while true; do
    ask "$1" "$2" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    printf -v "$1" '%s' "${!1#dpl_}"
    if [[ "${!1}" =~ ^[A-Za-z0-9]{10,}$ ]]; then printf -v "$1" 'dpl_%s' "${!1}"; write_env "$1" "${!1}" > /dev/null; return 0; fi
    warn "That is not a deployment ID. Copy only the part after the last / in the deployment's Vercel address."
  done
}

ask_email() {
  local value
  while true; do
    ask "$1" "$2" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    value=$(printf '%s' "${!1}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
    if [[ "$value" =~ ^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$ ]]; then write_env "$1" "$value" > /dev/null; return 0; fi
    warn "That is not a plain email (letters, digits, dots, dashes; no + sign). Try again."
  done
}

ask_uuid() {
  while true; do
    ask "$1" "$2" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    if [[ "${!1}" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then write_env "$1" "${!1}" > /dev/null; return 0; fi
    warn "That is not an ID like 1b2c3d4e-…. Copy the id column's value."
  done
}

addr() { printf '%s+t%s-%s@%s' "${BASE_EMAIL%@*}" "$RUN_TAG" "$1" "${BASE_EMAIL#*@}"; }
prefix() { printf '%s+t%s-' "${BASE_EMAIL%@*}" "$RUN_TAG"; }
new_password() { printf 'Drill-%s-%s' "$1" "$(openssl rand -hex 6)"; }
password_of() { local key; key="P_$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"; printf '%s' "${!key}"; }
say_value() { printf '  %s%s%s: %s%s%s\n' "$DIM" "$1" "$RESET" "$BOLD" "$2" "$RESET"; }
student() { say_value "$1" "$(addr "$1")   $(password_of "$1")"; }
now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

cite() {
  local heading
  heading=$(grep -m1 -iE "^#{2,4} .*($2)" "$REPO_ROOT/$1" 2>/dev/null | sed -E 's/^#+ //' || true)
  if [[ -n "$heading" ]]; then note "Guide: $1 › $heading"
  else warn "Guide: $1 has no section for $3 yet (issue 979). Stop until the guide has it."; fi
}

cite_restore() {
  local title
  title=$(grep -m1 -E "^$1\. \*\*" "$REPO_ROOT/$RESTORE" 2>/dev/null | sed -E 's/^[0-9]+\. \*\*([^*]+)\*\*.*/\1/' || true)
  if [[ -n "$title" ]]; then note "Guide: $RESTORE › step $1, $title"
  else warn "Guide: $RESTORE has no step $1 ($2) yet (issue 979). Stop until the runbook has it."; fi
}

begin_step() {
  CURRENT_STEP="$1"
  _clear
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' "$BOLD" "$BLUE" "${1%%.*}" "$TOTAL_STAGES" "${STAGE_TITLES[${1%%.*}]}" "$RESET"
  printf '%s  Step %s · %s%s\n\n' "$BOLD" "$1" "$2" "$RESET"
}

needs() {
  local name
  for name in "$@"; do
    [[ -n "${!name:-}" ]] || { warn "$name is not recorded yet. Run the step that records it first; the run sheet names it."; exit 1; }
  done
}

expect() { printf '  %sExpected:%s %s\n' "$GREEN" "$RESET" "$1"; }

ask_cookie() {
  local value code
  if [[ -f "$RUN_DIR/cookie-$1" ]]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: $SITE" -H "@$RUN_DIR/cookie-$1" "$SITE/account" || true)
    if [[ "$code" == 200 ]]; then note "The saved cookie for $1 still opens /account."; return 0; fi
  fi
  while true; do
    step "Signed in as $1: DevTools > Application > Cookies > $SITE > __Secure-authjs.session-token > Value. Copy it."
    ask_secret value "Session cookie for $1 (hidden):" || { warn "The input closed. Run the wizard again with --from $CURRENT_STEP."; exit 1; }
    printf 'Cookie: __Secure-authjs.session-token=%s\n' "$value" > "$RUN_DIR/cookie-$1"
    unset value
    clear_clipboard
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: $SITE" -H "@$RUN_DIR/cookie-$1" "$SITE/account" || true)
    if [[ "$code" == 200 ]]; then note "The cookie opens /account (HTTP 200)."; return 0; fi
    warn "With that cookie /account answers HTTP $code, not 200. Copy the cookie again from the signed-in tab."
  done
}

keep_cookie() { if [[ -f "$RUN_DIR/cookie-$1" ]]; then cp "$RUN_DIR/cookie-$1" "$RUN_DIR/cookie-$2"; fi; }

cookie_answer() {
  local path answers=""
  for path in /dashboard /account; do
    answers+="$path $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Origin: $SITE" -H "@$RUN_DIR/cookie-$1" "$SITE$path" | sed "s|$SITE||" || true); "
  done
  printf '%s' "${answers%; }"
}

get() {
  local headers=(-H "Origin: $SITE") out="$2"
  [[ "$1" != none ]] && headers+=(-H "@$RUN_DIR/cookie-$1")
  shift 2
  curl -sS --max-time 60 -o "$out.body" -D "$out.headers" -w '%{http_code}' "${headers[@]}" "$@" || printf '000'
}

header_of() { grep -i "^$2:" "$1.headers" 2>/dev/null | head -n1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//' || true; }
reason_in() { sed -n 's/.*"reason":"\([A-Za-z-]*\)".*/\1/p' "$1.body" 2>/dev/null | head -n1 || true; }
error_in() { sed -n 's/.*"error":"\([^"]*\)".*/\1/p' "$1.body" 2>/dev/null | head -n1 || true; }

scan() {
  local out="$RUN_DIR/scan-$2" result
  result=$(curl -sS --max-time 120 -o "$out.body" -D "$out.headers" -w '%{http_code} %{time_total}' \
    -H "Origin: $SITE" -H "@$RUN_DIR/cookie-$1" -F "image=@$PT_SCREENSHOT" "$SITE/api/practice-test/extract" || printf '000 0')
  printf 'HTTP %s after %s s, reason %s, message %s' "${result% *}" "${result#* }" "$(reason_in "$out")" "$(error_in "$out")"
}


real_deployment() {
  local id=""
  if have_cli vercel; then
    id=$(vercel inspect "$REAL_DOMAIN" --scope "$VERCEL_SCOPE" 2>&1 | grep -oE 'dpl_[A-Za-z0-9]+' | head -n1 || true)
  fi
  if [[ -n "$id" ]]; then printf -v "$1" '%s' "$id"; write_env "$1" "$id" > /dev/null; return 0; fi
  open_url "https://vercel.com/dashboard"
  step "Open the REAL site's Vercel project > Overview. Copy the ID of the Production Deployment the domain serves now."
  ask_id "$1" "$2"
}

LAST_RUN_ID=""
dispatch() {
  local workflow="$1" started run_id="" tries
  shift
  started=$(now_utc)
  gh workflow run "$workflow" --repo "$REPO" --ref main "$@" > /dev/null
  for tries in 1 2 3 4 5 6 7 8 9 10 11 12; do
    sleep 5
    run_id=$(gh run list --repo "$REPO" --workflow "$workflow" --limit 5 --json databaseId,createdAt \
      -q "[.[] | select(.createdAt >= \"$started\")] | first | .databaseId // empty")
    [[ -n "$run_id" ]] && break
  done
  if [[ -z "$run_id" ]]; then warn "No new run of $workflow after $tries tries. Open GitHub Actions and check."; LAST_RUN_ID=""; return 1; fi
  say "Watching run ${run_id}…"
  gh run watch "$run_id" --repo "$REPO" > /dev/null || true
  LAST_RUN_ID="$run_id"
}
run_jobs() { gh run view "$LAST_RUN_ID" --repo "$REPO" --json jobs -q '[.jobs[] | .name + ": " + (.conclusion // "none")] | join("; ")' 2>/dev/null || true; }
run_line() { gh run view "$LAST_RUN_ID" --repo "$REPO" --log 2>/dev/null | grep -oE "$1" | tail -n1 || true; }

STARTED=no
reached() {
  [[ "$1" == "$FROM" ]] && STARTED=yes
  [[ "$STARTED" == yes ]]
}


dry_run_common_stubs() {
  _clear() { :; }
  pause() { printf '  %s[dry run] pause: %s%s\n' "$DIM" "${1:-Press Enter to continue}" "$RESET"; }
  confirm() { printf '  %s[dry run] confirm: %s (yes)%s\n' "$DIM" "$1" "$RESET"; }
  open_url() { printf '  %s[dry run] would open%s %s\n' "$DIM" "$RESET" "$1"; }
  ask() { printf -v "$1" '%s' "dry-$1"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  ask_secret() { printf -v "$1" '%s' "dry-secret"; printf '  %s[dry run] hidden ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  ask_email() { printf -v "$1" '%s' "owner@example.com"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  ask_uuid() { printf -v "$1" '%s' "00000000-0000-0000-0000-000000000000"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  ask_id() { printf -v "$1" '%s' "dpl_DRYRUN0000"; printf '  %s[dry run] ask: %s%s\n' "$DIM" "$2" "$RESET"; }
  ask_cookie() { printf '  %s[dry run] would ask for the session cookie of %s%s\n' "$DIM" "$1" "$RESET"; }
  ask_result() { record "$1" "(dry run) $2"; }
  paste_result() { PASTED="(dry run)"; record "$1" "(dry run)"; }
  real_deployment() { printf -v "$1" '%s' "dpl_DRYRUNREAL"; printf '  %s[dry run] would read the real site deployment ID%s\n' "$DIM" "$RESET"; }
  dispatch() { LAST_RUN_ID=0; printf '  %s[dry run] would start the GitHub workflow %s %s%s\n' "$DIM" "$1" "${*:2}" "$RESET"; }
  have_cli() { return 1; }
  scan() { printf 'not sent (dry run)'; }
  local cmd
  for cmd in curl gh vercel neonctl psql npm node pbcopy pbpaste open xdg-open wslview explorer.exe sleep; do
    eval "$cmd() { printf '  %s[dry run] would run %s%s\n' \"\$DIM\" '$cmd' \"\$RESET\" >&2; }"
  done
}
