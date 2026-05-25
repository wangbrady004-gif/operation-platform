#!/usr/bin/env bash
# Vendor PayTM subgraph from a local b_auto clone into this folder (or --dest).
#
#   export SRC_B_AUTO="/absolute/path/to/b_auto"
#   ./vendor_paytm_from_b_auto.sh
#
# Staging pack (drag folder into monorepo integrations/ later):
#   ./vendor_paytm_from_b_auto.sh --staging ~/Desktop/b_auto_paytm_vendor
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DRY_RUN=false
KEEP_STUB_SETTINGS=false
DEST=""
STAGING=""
POSITIONAL_SRC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --keep-stub-settings)
      KEEP_STUB_SETTINGS=true
      shift
      ;;
    --dest)
      DEST="${2:-}"
      shift 2 || exit 1
      ;;
    --staging)
      STAGING="${2:-}"
      shift 2 || exit 1
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  export SRC_B_AUTO=/path/to/b_auto
  ./vendor_paytm_from_b_auto.sh [--keep-stub-settings] [--dry-run]

  ./vendor_paytm_from_b_auto.sh [--keep-stub-settings] /path/to/b_auto

  ./vendor_paytm_from_b_auto.sh --staging ~/Desktop/b_auto_paytm_vendor [/path/to/b_auto]

  ./vendor_paytm_from_b_auto.sh --dest /path/to/integrations/b_auto_bot /path/to/b_auto

Options:
  --keep-stub-settings   Do not copy tp_settings_2_0.py (keep ops repo stub; overlay via --config-file).
  --staging DIR          Copy into DIR (mkdir -p). Same layout as integrations/b_auto_bot — drag into monorepo.
  --dest DIR             Override destination (default: directory containing this script).
  --dry-run              Print actions only.
  -h, --help             This text.

Trailing path (if given) is SRC_B_AUTO when SRC_B_AUTO env is empty.
EOF
      exit 0
      ;;
    -*)
      echo "unknown option: $1 (try --help)" >&2
      exit 1
      ;;
    *)
      POSITIONAL_SRC="$1"
      shift
      ;;
  esac
done

SRC="${SRC_B_AUTO:-$POSITIONAL_SRC}"

if [[ -z "$STAGING" ]]; then
  DEST="${DEST:-$SCRIPT_DIR}"
else
  DEST="$STAGING"
fi

if [[ -z "$SRC" ]]; then
  echo "error: set SRC_B_AUTO or pass path to b_auto root (see --help)" >&2
  exit 1
fi

SRC="$(cd "$SRC" && pwd)"
mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"

say() { printf '%s\n' "$*" >&2; }

do_cp() {
  local from="$1" to="$2"
  if $DRY_RUN; then
    printf '[dry-run] cp %q %q\n' "$from" "$to" >&2
  else
    cp "$from" "$to"
  fi
}

say "SRC_B_AUTO=$SRC"
say "DEST=$DEST"

need_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "error: missing upstream file: $f" >&2
    exit 1
  fi
}

for rel in tp_127_bank_mains/tp_127_paytm_main.py tp_127_bank_mains/tp_127_paytm_trj_main.py \
           tp_127_bank_mains/tp_127_paytm_new_main.py trustpay_curl_2_0.py tp_telegram_bot_2_0.py; do
  need_file "$SRC/$rel"
done

if ! $KEEP_STUB_SETTINGS; then
  need_file "$SRC/tp_settings_2_0.py"
fi

if [[ ! -d "$SRC/tp_127_executabes" ]]; then
  echo "error: missing directory $SRC/tp_127_executabes" >&2
  exit 1
fi

if $DRY_RUN; then
  printf '[dry-run] mkdir -p %q %q\n' "$DEST/tp_127_bank_mains" "$DEST/tp_127_executabes" >&2
else
  mkdir -p "$DEST/tp_127_bank_mains" "$DEST/tp_127_executabes"
fi

if $KEEP_STUB_SETTINGS; then
  say "Skipping tp_settings_2_0.py (keeping destination stub)."
else
  say "Copying tp_settings_2_0.py (scrub secrets before git push)."
  do_cp "$SRC/tp_settings_2_0.py" "$DEST/"
fi

do_cp "$SRC/trustpay_curl_2_0.py" "$DEST/"
do_cp "$SRC/tp_telegram_bot_2_0.py" "$DEST/"
do_cp "$SRC/tp_127_bank_mains/tp_127_paytm_main.py" "$DEST/tp_127_bank_mains/"
do_cp "$SRC/tp_127_bank_mains/tp_127_paytm_trj_main.py" "$DEST/tp_127_bank_mains/"
do_cp "$SRC/tp_127_bank_mains/tp_127_paytm_new_main.py" "$DEST/tp_127_bank_mains/"

count=0
while IFS= read -r -d '' fp; do
  bn="$(basename "$fp")"
  if $DRY_RUN; then
    printf '[dry-run] cp %q %q\n' "$fp" "$DEST/tp_127_executabes/$bn" >&2
  else
    cp "$fp" "$DEST/tp_127_executabes/"
  fi
  count=$((count + 1))
done < <(find "$SRC/tp_127_executabes" -maxdepth 1 -type f -name 'TP_PAYTM*.py' -print0 || true)

if [[ "$count" -eq 0 ]]; then
  echo "warning: no TP_PAYTM*.py files under $SRC/tp_127_executabes" >&2
else
  say "Copied $count TP_PAYTM*.py runner(s)."
fi

say "Done. OPS shim tp_127_executabes/run_paytm_bot.py is not overwritten."
if [[ "$DEST" != "$SCRIPT_DIR" ]]; then
  say "Merge: copy contents of $DEST into your repo’s integrations/b_auto_bot/"
fi
