#!/usr/bin/env bash
# local-verify.sh: CI chạy cục bộ, không dùng GitHub-hosted runner (zero-cost route C).
#
# Dùng:  scripts/ci/local-verify.sh [--path DIR] [--out DIR] [--lane auto|ops|store] [--no-install] [--skip-e2e] [--skip-build]
#
# Làm gì:
#   1. Ghi SHA, nhánh, số tệp chưa commit, phiên bản Node/npm, thời điểm UTC.
#   2. Kiểm tra cấu hình: package.json gốc có phải JSON hợp lệ, thư mục đầu ra Pages, chính sách workflow,
#      mẫu bí mật trong tệp được theo dõi, tệp .env được theo dõi.
#   3. Chạy bộ kiểm thử của từng "dòng" có mặt trong cây: ops (npm run verify) và store (tsc, unit, e2e, audit, build).
#   4. In bảng kết quả và ghi JSON vào <out>/<sha>/local-verify.json. Thoát 1 nếu có bước FAIL; WARN không làm hỏng.
#
# Không làm gì: không gọi dịch vụ ngoài trừ registry npm (npm ci, npm audit), không đọc biến bí mật, không sửa tệp
# được theo dõi, không đẩy gì lên GitHub, không đặt commit status (việc đó cần Owner duyệt).
# Chính sách workflow chỉ là kiểm tra heuristic bằng grep, không thay cho đọc workflow.
set -u

ROOT="$(pwd)"; OUT=""; LANE="auto"; INSTALL=1; E2E=1; BUILD=1
while [ $# -gt 0 ]; do
  case "$1" in
    --path) ROOT="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --lane) LANE="$2"; shift 2 ;;
    --no-install) INSTALL=0; shift ;;
    --skip-e2e) E2E=0; shift ;;
    --skip-build) BUILD=0; shift ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "tùy chọn không hợp lệ: $1" >&2; exit 2 ;;
  esac
done

cd "$ROOT" || { echo "không vào được $ROOT" >&2; exit 2; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "$ROOT không phải cây làm việc Git" >&2; exit 2; }

FULL="$(git rev-parse HEAD)"; SHA="${FULL:0:12}"
BRANCH="$(git branch --show-current)"; [ -z "$BRANCH" ] && BRANCH="(detached)"
DIRTY_BEFORE="$(git status --porcelain | wc -l | tr -d ' ')"
START="$(date -u +%FT%TZ)"
OUT="${OUT:-${TMPDIR:-/tmp}/local-verify}/$SHA"; mkdir -p "$OUT/logs"
STEPS="$OUT/steps.tsv"; : > "$STEPS"

echo "local-verify  sha=$SHA  branch=$BRANCH  dirty=$DIRTY_BEFORE  node=$(node -v 2>/dev/null)  npm=$(npm -v 2>/dev/null)  start=$START"
echo "out=$OUT"
echo

record() { # name status exit seconds note
  printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$STEPS"
  printf '  %-30s %-5s exit=%-3s %4ss  %s\n' "$1" "$2" "$3" "$4" "$5"
}

tap_summary() { # logfile -> "tests=N pass=N fail=N" cộng dồn mọi bộ test trong log
  awk '/^# tests /{t+=$3} /^# pass /{p+=$3} /^# fail /{f+=$3} END{ if (t) printf "tests=%d pass=%d fail=%d", t, p, f }' "$1"
}

run() { # name cmd...   (chạy trong ROOT, ghi log, ghi kết quả)
  local name="$1"; shift
  local t0 t1 rc note
  t0=$(date +%s); "$@" > "$OUT/logs/$name.log" 2>&1; rc=$?; t1=$(date +%s)
  note="$(tap_summary "$OUT/logs/$name.log")"
  if [ $rc -eq 0 ]; then record "$name" PASS $rc $((t1 - t0)) "${note:-ok}"
  else record "$name" FAIL $rc $((t1 - t0)) "${note:+$note; }xem logs/$name.log"; fi
  return $rc
}

echo "== cấu hình"

# 1. package.json gốc phải là JSON hợp lệ (npm, Vercel và Cloudflare Pages đều đọc nó)
ROOT_PKG_OK=0
if [ -f package.json ]; then
  msg="$(node -e 'const s=require("fs").readFileSync("package.json","utf8");try{JSON.parse(s);console.log("ok")}catch(e){console.log("INVALID: "+e.message)}' 2>&1)"
  if [ "$msg" = "ok" ]; then ROOT_PKG_OK=1; record root-package-json PASS 0 0 "JSON hợp lệ"
  else record root-package-json FAIL 1 0 "$msg"; fi
else
  record root-package-json SKIP 0 0 "không có package.json gốc"
fi

# 2. thư mục đầu ra Pages: "." nghĩa là xuất bản cả thư mục gốc repo công khai
if [ -f wrangler.json ]; then
  msg="$(node -e 'const fs=require("fs");let j;try{j=JSON.parse(fs.readFileSync("wrangler.json","utf8"))}catch(e){console.log("NOT_JSON");process.exit(0)}console.log(j.pages_build_output_dir===undefined?"NO_PAGES_KEY":"pages_build_output_dir="+j.pages_build_output_dir)' 2>&1)"
  case "$msg" in
    "pages_build_output_dir=.") record pages-output-dir WARN 0 0 "xuất bản cả thư mục gốc (lộ mã nguồn, migration)" ;;
    pages_build_output_dir=*) record pages-output-dir PASS 0 0 "$msg" ;;
    NOT_JSON) record pages-output-dir WARN 0 0 "wrangler.json không phải JSON (cấu hình Worker dạng TOML?), Pages không đọc được" ;;
    *) record pages-output-dir SKIP 0 0 "không có khóa Pages" ;;
  esac
else
  record pages-output-dir SKIP 0 0 "không có wrangler.json"
fi

# 3. chính sách workflow (heuristic): không lịch chạy, không runner lớn, có timeout, có concurrency, quyền tối thiểu
WF_COUNT=0; WF_FAIL=0; WF_WARN=0; WF_NOTES=""
if [ -d .github/workflows ]; then
  for f in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$f" ] || continue
    WF_COUNT=$((WF_COUNT + 1))
    if grep -Eq '^[[:space:]]*schedule:' "$f"; then WF_FAIL=$((WF_FAIL + 1)); WF_NOTES="$WF_NOTES $f:schedule"; fi
    if grep -Eqi 'runs-on:.*(large|xlarge|[0-9]+-?core|gpu|metal)' "$f"; then WF_FAIL=$((WF_FAIL + 1)); WF_NOTES="$WF_NOTES $f:runner-lớn"; fi
    if grep -Eqi 'runs-on:.*(macos|windows)' "$f"; then WF_WARN=$((WF_WARN + 1)); WF_NOTES="$WF_NOTES $f:macos/windows"; fi
    grep -Eq 'timeout-minutes:' "$f" || { WF_WARN=$((WF_WARN + 1)); WF_NOTES="$WF_NOTES $f:thiếu-timeout"; }
    grep -Eq '^[[:space:]]*concurrency:' "$f" || { WF_WARN=$((WF_WARN + 1)); WF_NOTES="$WF_NOTES $f:thiếu-concurrency"; }
    grep -Eq '^permissions:' "$f" || { WF_WARN=$((WF_WARN + 1)); WF_NOTES="$WF_NOTES $f:thiếu-permissions"; }
    if grep -Eq 'pull_request_target|workflow_run' "$f"; then WF_WARN=$((WF_WARN + 1)); WF_NOTES="$WF_NOTES $f:ngữ-cảnh-đặc-quyền"; fi
  done
fi
if [ "$WF_COUNT" -eq 0 ]; then record workflow-policy PASS 0 0 "không có workflow GitHub Actions (0 phút runner)"
elif [ "$WF_FAIL" -gt 0 ]; then record workflow-policy FAIL 1 0 "$WF_COUNT workflow; vi phạm:$WF_NOTES"
elif [ "$WF_WARN" -gt 0 ]; then record workflow-policy WARN 0 0 "$WF_COUNT workflow; cảnh báo:$WF_NOTES"
else record workflow-policy PASS 0 0 "$WF_COUNT workflow đạt chính sách"; fi

# 4. mẫu bí mật trong tệp được theo dõi (chỉ in tên tệp, không in nội dung)
SECRET_RE='(sk_live_[0-9A-Za-z]{10,}|sk-ant-[0-9A-Za-z_-]{10,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}|re_[A-Za-z0-9]{20,}|SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,})'
HITS="$(git grep -lIE "$SECRET_RE" -- . ':!*package-lock.json' ':!*.lock' 2>/dev/null | head -5 | tr '\n' ' ')"
if [ -z "$HITS" ]; then record secret-patterns PASS 0 0 "không thấy mẫu khóa trong tệp được theo dõi"
else record secret-patterns FAIL 1 0 "khớp mẫu ở: $HITS"; fi

# 5. tệp .env được theo dõi (ngoài .env.example)
ENVS="$(git ls-files | grep -E '(^|/)\.env($|\.)|\.dev\.vars$|\.pem$|\.p12$' | grep -v '\.env\.example$' | head -5 | tr '\n' ' ')"
if [ -z "$ENVS" ]; then record tracked-env-files PASS 0 0 "chỉ có .env.example (nếu có)"
else record tracked-env-files WARN 0 0 "$ENVS"; fi

echo
echo "== kiểm thử"

LANES_RUN=0
want() { [ "$LANE" = "auto" ] || [ "$LANE" = "$1" ]; }

# dòng ops: npm run verify (cần package.json gốc hợp lệ và script verify)
if want ops && [ -f package.json ]; then
  if [ "$ROOT_PKG_OK" -eq 1 ] && node -e 'process.exit((require("./package.json").scripts||{}).verify?0:1)' 2>/dev/null; then
    LANES_RUN=$((LANES_RUN + 1))
    if [ "$INSTALL" -eq 1 ]; then
      for d in workers/revenueops workers/api; do
        [ -f "$d/package-lock.json" ] && run "ops-install-$(basename "$d")" npm ci --prefix "$d" --no-audit --no-fund
      done
    fi
    run ops-verify npm run verify
    # bề mặt công khai của gói Pages: không được có mã nguồn, migration, kế hoạch
    if [ -d dist/site ]; then
      LEAK=""; for d in apps supabase engine workers tools tests operations migrations; do [ -e "dist/site/$d" ] && LEAK="$LEAK $d"; done
      [ -e dist/site/docs ] && [ "$(find dist/site/docs -type f | wc -l | tr -d ' ')" -gt 1 ] && LEAK="$LEAK docs"
      N="$(find dist/site -type f | wc -l | tr -d ' ')"
      if [ -z "$LEAK" ]; then record pages-surface PASS 0 0 "dist/site: $N tệp, không lộ thư mục nội bộ"
      else record pages-surface FAIL 1 0 "dist/site có:$LEAK"; fi
    fi
  elif [ "$LANE" = "ops" ]; then
    record ops-verify FAIL 1 0 "package.json gốc không hợp lệ hoặc không có script verify"
  fi
fi

# dòng store: tsc, unit, e2e, audit, build
if want store && [ -f apps/store/package.json ]; then
  LANES_RUN=$((LANES_RUN + 1))
  [ "$INSTALL" -eq 1 ] && run store-install bash -c 'cd apps/store && npm ci --no-audit --no-fund'
  run store-typecheck bash -c 'cd apps/store && npx tsc --noEmit'
  run store-unit bash -c 'cd apps/store && npm test'
  [ "$E2E" -eq 1 ] && run store-e2e bash -c 'cd apps/store && npm run test:e2e'
  # audit chỉ cảnh báo: lỗi build-time của postcss trong next đã được ghi nhận và chấp nhận có điều kiện
  ( cd apps/store && npm audit --omit=dev > "$OUT/logs/store-audit.log" 2>&1 ); arc=$?
  if [ $arc -eq 0 ]; then record store-audit PASS 0 0 "không có lỗ hổng ở phụ thuộc production"
  else record store-audit WARN $arc 0 "$(grep -E '[0-9]+ vulnerabilit' "$OUT/logs/store-audit.log" | tail -1)"; fi
  [ "$BUILD" -eq 1 ] && run store-build bash -c 'cd apps/store && NEXT_TELEMETRY_DISABLED=1 npx next build'
fi

if [ "$LANES_RUN" -eq 0 ]; then
  if [ "$ROOT_PKG_OK" -eq 0 ] && [ -f package.json ]; then record lanes SKIP 0 0 "không chạy được dòng nào vì package.json gốc không hợp lệ"
  else record lanes SKIP 0 0 "cây này không có dòng ops hoặc store để chạy"; fi
fi

# ghi nhận việc chạy không để lại thay đổi trong tệp được theo dõi
DIRTY_TRACKED="$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
if [ "$DIRTY_TRACKED" -eq 0 ] || [ "$DIRTY_TRACKED" -le "$DIRTY_BEFORE" ]; then record tracked-files-untouched PASS 0 0 "không sửa tệp được theo dõi"
else record tracked-files-untouched WARN 0 0 "$DIRTY_TRACKED tệp được theo dõi đã đổi sau khi chạy"; fi

END="$(date -u +%FT%TZ)"
node - "$STEPS" "$OUT/local-verify.json" "$FULL" "$BRANCH" "$DIRTY_BEFORE" "$START" "$END" "$(node -v)" "$(npm -v)" <<'NODE'
const fs = require("fs");
const [steps, out, sha, branch, dirty, start, end, nodev, npmv] = process.argv.slice(2);
const rows = fs.readFileSync(steps, "utf8").trim().split("\n").filter(Boolean).map((l) => {
  const [name, status, exit, seconds, note] = l.split("\t");
  return { name, status, exit: Number(exit), seconds: Number(seconds), note };
});
const overall = rows.some((r) => r.status === "FAIL") ? "FAIL" : rows.some((r) => r.status === "WARN") ? "PASS_WITH_WARNINGS" : "PASS";
fs.writeFileSync(out, JSON.stringify({ sha, branch, dirtyBefore: Number(dirty), node: nodev, npm: npmv, start, end, overall, steps: rows }, null, 2) + "\n");
console.log("\nkết quả: " + overall + "  (" + rows.filter((r) => r.status === "PASS").length + " PASS, " + rows.filter((r) => r.status === "WARN").length + " WARN, " + rows.filter((r) => r.status === "FAIL").length + " FAIL, " + rows.filter((r) => r.status === "SKIP").length + " SKIP)");
process.exit(overall === "FAIL" ? 1 : 0);
NODE
