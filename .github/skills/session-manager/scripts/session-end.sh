#!/bin/bash
# MUSUBIX Session End Hook
# REQ-SM-002: SessionEnd Hook
#
# Usage: ./session-end.sh [--project PROJECT_NAME]

set -e

# Configuration
SESSIONS_DIR="${HOME}/.musubix/sessions"
MAX_FILE_SIZE=1048576  # 1MB
RETENTION_DAYS=30
MAX_FILES=100

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
PROJECT_NAME=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project) PROJECT_NAME="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Create sessions directory if it doesn't exist
mkdir -p "$SESSIONS_DIR"

# Generate filename
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M")
SESSION_FILE="${SESSIONS_DIR}/${TIMESTAMP}.md"

echo -e "${BLUE}📋 MUSUBIX Session Manager - Session End${NC}"
echo "================================================"
echo ""

# Detect project name if not provided
if [ -z "$PROJECT_NAME" ]; then
    if [ -f "package.json" ]; then
        PROJECT_NAME=$(grep -o '"name": *"[^"]*"' package.json | head -1 | cut -d'"' -f4)
    elif [ -d ".git" ]; then
        PROJECT_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null)
    fi
    PROJECT_NAME="${PROJECT_NAME:-Unknown Project}"
fi

# Get start time (approximate based on shell history or use current)
START_TIME=$(date -d "2 hours ago" +"%H:%M" 2>/dev/null || date +"%H:%M")
CURRENT_TIME=$(date +"%H:%M")
CURRENT_DATE=$(date +"%Y-%m-%d")

# Interactive prompts for session data
echo -e "${YELLOW}セッション情報を入力してください:${NC}"
echo ""

# Completed tasks
echo "✅ 完了したタスク (空行で終了):"
COMPLETED_TASKS=""
while IFS= read -r line; do
    [ -z "$line" ] && break
    COMPLETED_TASKS="${COMPLETED_TASKS}\n- [x] ${line}"
done

# In progress tasks
echo ""
echo "⏳ 進行中のタスク (空行で終了):"
IN_PROGRESS_TASKS=""
while IFS= read -r line; do
    [ -z "$line" ] && break
    IN_PROGRESS_TASKS="${IN_PROGRESS_TASKS}\n- [ ] ${line}"
done

# Notes for next session
echo ""
echo "📝 次回向けメモ (空行で終了):"
NOTES=""
while IFS= read -r line; do
    [ -z "$line" ] && break
    NOTES="${NOTES}\n- ${line}"
done

# Context files to load
echo ""
echo "📂 次回読み込むべきファイル (空行で終了):"
CONTEXT_FILES=""
while IFS= read -r line; do
    [ -z "$line" ] && break
    CONTEXT_FILES="${CONTEXT_FILES}\n${line}"
done

# Count completed tasks
COMPLETED_COUNT=$(echo -e "$COMPLETED_TASKS" | grep -c "\[x\]" 2>/dev/null || echo 0)
IN_PROGRESS_COUNT=$(echo -e "$IN_PROGRESS_TASKS" | grep -c "\[ \]" 2>/dev/null || echo 0)
NOTES_COUNT=$(echo -e "$NOTES" | grep -c "^-" 2>/dev/null || echo 0)

# Generate session file
cat > "$SESSION_FILE" << EOF
# Session: ${CURRENT_DATE}

**Date:** ${CURRENT_DATE}
**Started:** ${START_TIME}
**Last Updated:** ${CURRENT_TIME}
**Project:** ${PROJECT_NAME}

---

## Current State

### Completed
$(echo -e "$COMPLETED_TASKS" | sed '/^$/d')

### In Progress
$(echo -e "$IN_PROGRESS_TASKS" | sed '/^$/d')

### Blocked
- [ ] (なし)

---

## Notes for Next Session
$(echo -e "$NOTES" | sed '/^$/d')

---

## Context to Load

\`\`\`
$(echo -e "$CONTEXT_FILES" | sed '/^$/d')
\`\`\`

---

## Session Summary

- **タスク完了数**: ${COMPLETED_COUNT}
- **未完了タスク**: ${IN_PROGRESS_COUNT}
- **次回向けメモ**: ${NOTES_COUNT}項目
- **セッション時間**: ${START_TIME} - ${CURRENT_TIME}

EOF

# Check file size
FILE_SIZE=$(stat -f%z "$SESSION_FILE" 2>/dev/null || stat -c%s "$SESSION_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -gt "$MAX_FILE_SIZE" ]; then
    echo -e "${RED}⚠️  警告: セッションファイルが1MBを超えています${NC}"
fi

# Cleanup old sessions
echo ""
echo -e "${YELLOW}🧹 古いセッションのクリーンアップ...${NC}"
find "$SESSIONS_DIR" -name "*.md" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

# Check file count
FILE_COUNT=$(find "$SESSIONS_DIR" -name "*.md" -type f | wc -l)
if [ "$FILE_COUNT" -gt "$MAX_FILES" ]; then
    echo -e "${YELLOW}ℹ️  ファイル数が${MAX_FILES}を超えています。古いファイルを削除します。${NC}"
    find "$SESSIONS_DIR" -name "*.md" -type f -printf '%T+ %p\n' | sort | head -n "$((FILE_COUNT - MAX_FILES))" | cut -d' ' -f2- | xargs rm -f 2>/dev/null || true
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ セッションを保存しました: ${SESSION_FILE}${NC}"
echo ""
echo -e "${BLUE}サマリー:${NC}"
echo "  - 完了タスク: ${COMPLETED_COUNT}件"
echo "  - 未完了タスク: ${IN_PROGRESS_COUNT}件"
echo "  - 次回向けメモ: ${NOTES_COUNT}項目"
echo ""
echo -e "${GREEN}セッションを正常に終了しました。お疲れ様でした！${NC}"
