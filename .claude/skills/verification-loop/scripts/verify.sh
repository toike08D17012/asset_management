#!/usr/bin/env bash
# verify.sh - 6フェーズ検証スクリプト
# Usage: ./verify.sh [quick|full]
#
# トレーサビリティ: REQ-VL-001, DES-VL-001

set -e

MODE="${1:-full}"
REPORT_FILE=".reports/verification-$(date +%Y%m%d-%H%M%S).md"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 結果を格納する配列
declare -A RESULTS
declare -A DETAILS

# ヘルパー関数
log_phase() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

log_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

log_skip() {
    echo -e "${YELLOW}⏭️  SKIP${NC}: $1"
}

# Phase 1: Build
phase_build() {
    log_phase "1. Build"
    
    if [ "$MODE" = "quick" ]; then
        log_skip "Quick mode - skipping build"
        RESULTS[build]="SKIP"
        return 0
    fi
    
    if npm run build 2>&1; then
        log_pass "Build succeeded"
        RESULTS[build]="PASS"
        return 0
    else
        log_fail "Build failed"
        RESULTS[build]="FAIL"
        return 1
    fi
}

# Phase 2: Type Check
phase_types() {
    log_phase "2. Type Check"
    
    local output
    output=$(npx tsc --noEmit 2>&1) || true
    local error_count
    error_count=$(echo "$output" | grep -c "error TS" || echo "0")
    
    if [ "$error_count" -eq 0 ]; then
        log_pass "No type errors"
        RESULTS[types]="PASS"
        DETAILS[types]="0 errors"
        return 0
    else
        log_fail "$error_count type error(s)"
        RESULTS[types]="FAIL"
        DETAILS[types]="$error_count errors"
        echo "$output" | head -20
        return 1
    fi
}

# Phase 3: Lint
phase_lint() {
    log_phase "3. Lint"
    
    if [ "$MODE" = "quick" ]; then
        log_skip "Quick mode - skipping lint"
        RESULTS[lint]="SKIP"
        return 0
    fi
    
    local output
    output=$(npm run lint 2>&1) || true
    local error_count
    error_count=$(echo "$output" | grep -c "error" || echo "0")
    local warn_count
    warn_count=$(echo "$output" | grep -c "warning" || echo "0")
    
    if [ "$error_count" -eq 0 ]; then
        if [ "$warn_count" -gt 0 ]; then
            log_warn "$warn_count warning(s)"
            RESULTS[lint]="PASS"
            DETAILS[lint]="$warn_count warnings"
        else
            log_pass "No lint errors or warnings"
            RESULTS[lint]="PASS"
            DETAILS[lint]="clean"
        fi
        return 0
    else
        log_fail "$error_count error(s), $warn_count warning(s)"
        RESULTS[lint]="FAIL"
        DETAILS[lint]="$error_count errors, $warn_count warnings"
        echo "$output" | head -20
        return 1
    fi
}

# Phase 4: Tests
phase_tests() {
    log_phase "4. Tests"
    
    local test_cmd="npm run test"
    
    if [ "$MODE" = "quick" ]; then
        # Quick mode: 変更に関連するテストのみ
        test_cmd="npm run test:unit -- --changed"
    fi
    
    local output
    if output=$($test_cmd 2>&1); then
        local passed
        passed=$(echo "$output" | grep -oP '\d+ passed' | head -1 || echo "? passed")
        log_pass "Tests $passed"
        RESULTS[tests]="PASS"
        DETAILS[tests]="$passed"
        return 0
    else
        log_fail "Some tests failed"
        RESULTS[tests]="FAIL"
        DETAILS[tests]="failed"
        echo "$output" | tail -30
        return 1
    fi
}

# Phase 5: Security
phase_security() {
    log_phase "5. Security"
    
    if [ "$MODE" = "quick" ]; then
        log_skip "Quick mode - skipping security scan"
        RESULTS[security]="SKIP"
        return 0
    fi
    
    local output
    output=$(npm audit --json 2>&1) || true
    
    local critical
    critical=$(echo "$output" | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    local high
    high=$(echo "$output" | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    
    if [ "$critical" -eq 0 ] && [ "$high" -eq 0 ]; then
        log_pass "No critical or high vulnerabilities"
        RESULTS[security]="PASS"
        DETAILS[security]="0 critical, 0 high"
        return 0
    else
        log_fail "$critical critical, $high high vulnerabilities"
        RESULTS[security]="FAIL"
        DETAILS[security]="$critical critical, $high high"
        return 1
    fi
}

# Phase 6: Diff
phase_diff() {
    log_phase "6. Diff Review"
    
    local stats
    stats=$(git diff --stat HEAD~1..HEAD 2>/dev/null || git diff --stat)
    
    local files_changed
    files_changed=$(echo "$stats" | tail -1 | grep -oP '\d+ file' | grep -oP '\d+' || echo "0")
    local insertions
    insertions=$(echo "$stats" | tail -1 | grep -oP '\d+ insertion' | grep -oP '\d+' || echo "0")
    local deletions
    deletions=$(echo "$stats" | tail -1 | grep -oP '\d+ deletion' | grep -oP '\d+' || echo "0")
    
    echo "$stats"
    
    RESULTS[diff]="INFO"
    DETAILS[diff]="$files_changed files, +$insertions -$deletions"
    
    return 0
}

# レポート生成
generate_report() {
    mkdir -p .reports
    
    local overall="READY"
    for phase in build types lint tests security; do
        if [ "${RESULTS[$phase]}" = "FAIL" ]; then
            overall="NOT READY"
            break
        fi
    done
    
    cat << EOF > "$REPORT_FILE"
# Verification Report

**Date**: $(date +%Y-%m-%d\ %H:%M:%S)
**Mode**: $MODE

## Results

| Phase | Status | Details |
|-------|--------|---------|
| Build | ${RESULTS[build]:-N/A} | ${DETAILS[build]:-} |
| Types | ${RESULTS[types]:-N/A} | ${DETAILS[types]:-} |
| Lint | ${RESULTS[lint]:-N/A} | ${DETAILS[lint]:-} |
| Tests | ${RESULTS[tests]:-N/A} | ${DETAILS[tests]:-} |
| Security | ${RESULTS[security]:-N/A} | ${DETAILS[security]:-} |
| Diff | ${RESULTS[diff]:-N/A} | ${DETAILS[diff]:-} |

## Overall

**Status**: $overall

EOF

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                   VERIFICATION REPORT                       ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║                                                             ║"
    printf "║  Build:     [%-4s] %-40s ║\n" "${RESULTS[build]}" ""
    printf "║  Types:     [%-4s] %-40s ║\n" "${RESULTS[types]}" "(${DETAILS[types]:-})"
    printf "║  Lint:      [%-4s] %-40s ║\n" "${RESULTS[lint]}" "(${DETAILS[lint]:-})"
    printf "║  Tests:     [%-4s] %-40s ║\n" "${RESULTS[tests]}" "(${DETAILS[tests]:-})"
    printf "║  Security:  [%-4s] %-40s ║\n" "${RESULTS[security]}" "(${DETAILS[security]:-})"
    printf "║  Diff:      [%-4s] %-40s ║\n" "${RESULTS[diff]}" "(${DETAILS[diff]:-})"
    echo "║                                                             ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    printf "║  Overall:   [%-9s]  for PR                             ║\n" "$overall"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Report saved to: $REPORT_FILE"
}

# メイン処理
main() {
    echo "Starting verification ($MODE mode)..."
    echo ""
    
    local failed=0
    
    # Phase 1: Build
    phase_build || failed=1
    
    # ビルド失敗時は後続フェーズをスキップ
    if [ "${RESULTS[build]}" = "FAIL" ]; then
        RESULTS[types]="SKIP"
        RESULTS[lint]="SKIP"
        RESULTS[tests]="SKIP"
        RESULTS[security]="SKIP"
        RESULTS[diff]="SKIP"
    else
        # Phase 2: Type Check
        phase_types || failed=1
        
        # 型エラー時は後続をスキップ
        if [ "${RESULTS[types]}" = "FAIL" ]; then
            RESULTS[lint]="SKIP"
            RESULTS[tests]="SKIP"
            RESULTS[security]="SKIP"
        else
            # Phase 3-5
            phase_lint || failed=1
            phase_tests || failed=1
            phase_security || failed=1
        fi
        
        # Phase 6: Diff (常に実行)
        phase_diff
    fi
    
    # レポート生成
    generate_report
    
    exit $failed
}

main "$@"
