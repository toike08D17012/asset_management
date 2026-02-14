#!/bin/bash
# MUSUBIX Session Start Hook
# REQ-SM-001: SessionStart Hook
#
# Usage: source session-start.sh
#        Or run directly: ./session-start.sh

set -e

# Configuration
SESSIONS_DIR="${HOME}/.musubix/sessions"
RETENTION_DAYS=7
MAX_SESSIONS_TO_SHOW=5

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create sessions directory if it doesn't exist
mkdir -p "$SESSIONS_DIR"

echo -e "${BLUE}📋 MUSUBIX Session Manager - Session Start${NC}"
echo "================================================"
echo ""

# Find recent sessions (within RETENTION_DAYS days)
recent_sessions=$(find "$SESSIONS_DIR" -name "*.md" -mtime -"$RETENTION_DAYS" -type f 2>/dev/null | sort -r | head -"$MAX_SESSIONS_TO_SHOW")

if [ -z "$recent_sessions" ]; then
    echo -e "${YELLOW}ℹ️  過去${RETENTION_DAYS}日間のセッションは見つかりませんでした。${NC}"
    echo ""
    echo "新しいセッションを開始します。"
    exit 0
fi

echo -e "${GREEN}✅ 過去${RETENTION_DAYS}日間のセッションが見つかりました:${NC}"
echo ""

# Process each session
for session_file in $recent_sessions; do
    filename=$(basename "$session_file")
    date_part="${filename%.md}"
    
    # Extract info from session file
    echo -e "${BLUE}📄 $filename${NC}"
    
    # Extract Notes for Next Session
    notes=$(sed -n '/^## Notes for Next Session/,/^##/p' "$session_file" 2>/dev/null | grep -v "^##" | head -5)
    if [ -n "$notes" ]; then
        echo "   📝 次回向けメモ:"
        echo "$notes" | sed 's/^/      /'
    fi
    
    # Extract In Progress tasks
    in_progress=$(sed -n '/^### In Progress/,/^###/p' "$session_file" 2>/dev/null | grep "^\- \[ \]" | head -5)
    if [ -n "$in_progress" ]; then
        echo "   ⏳ 未完了タスク:"
        echo "$in_progress" | sed 's/^/      /'
    fi
    
    echo ""
done

# Get the most recent session
most_recent=$(echo "$recent_sessions" | head -1)

if [ -n "$most_recent" ]; then
    echo "================================================"
    echo -e "${YELLOW}💡 最新セッション: $(basename "$most_recent")${NC}"
    echo ""
    echo "前回のセッションから続けますか？"
    echo "  - 'yes' または 'y' で前回のコンテキストを読み込み"
    echo "  - 'no' または 'n' で新規セッション開始"
    echo ""
    
    # Extract Context to Load
    context_files=$(sed -n '/^## Context to Load/,/^##/p' "$most_recent" 2>/dev/null | grep -v "^##" | grep -v "^\`\`\`" | grep -v "^$")
    if [ -n "$context_files" ]; then
        echo "📂 読み込み推奨ファイル:"
        echo "$context_files" | sed 's/^/   /'
    fi
fi

echo ""
echo -e "${GREEN}セッション開始の準備が完了しました。${NC}"
