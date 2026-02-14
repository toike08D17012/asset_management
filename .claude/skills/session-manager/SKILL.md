---
name: session-manager
description: セッション開始時にコンテキスト復元、終了時に状態保存。TodoWrite統合でタスク追跡。
license: MIT
version: 1.1.0
triggers:
  - セッション開始
  - セッション終了
  - /session
  - マルチステップタスク
---

# Session Manager

> **要約**: セッション間の継続性を提供。開始時に過去コンテキストを復元、終了時に状態を永続化。

## 🔄 トリガーと即時アクション

### セッション開始時

**WHEN** 新しいセッションが開始される  
**DO** 以下を順に実行:

1. `~/.musubix/sessions/` から過去7日間のファイルを検索
2. 直近セッションの「Notes for Next Session」を読む
3. ユーザーに引き継ぎ内容を通知

```bash
find ~/.musubix/sessions/ -name "*.md" -mtime -7 2>/dev/null | head -5
```

**出力フォーマット**:
```
📋 前回セッションからの引き継ぎ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 日時: [YYYY-MM-DD HH:MM]
📝 未完了: [タスクリスト]
💡 メモ: [重要コンテキスト]
📂 推奨ファイル: [パスリスト]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
続きから再開しますか？
```

---

### セッション終了時

**WHEN** セッション終了/長時間中断  
**DO** 状態を `~/.musubix/sessions/YYYY-MM-DD-HH-MM.md` に保存

**保存フォーマット**:
```markdown
# Session: [日付]
**Project:** [名前] | **Started:** [HH:MM] | **Updated:** [HH:MM]

## Completed
- [x] 完了タスク

## In Progress
- [ ] 進行中タスク

## Notes for Next Session
- 重要コンテキスト

## Context to Load
- `path/to/file`
```

---

### コンテキスト圧縮前

**WHEN** コンテキスト圧縮がトリガーされる  
**DO** 圧縮前に重要な状態をセッションファイルに追記

**保存項目**: 現在のタスク状態、重要な変数/設定、次のアクション

---

## ✅ TodoWrite統合

**WHEN** マルチステップタスク（3ステップ以上）を開始  
**DO** TodoWriteツールで進捗を追跡

### ベストプラクティス

| やること | 理由 |
|---------|------|
| タスク開始時にリスト作成 | 実行順序を明示 |
| 完了ごとにチェック | 進捗を可視化 |
| 欠落ステップを検出 | 抜け漏れ防止 |
| 終了時に未完了を記録 | 次回引き継ぎ |

**例**:
```
□ 1. 要件定義の確認
□ 2. 設計ドキュメント作成
☑ 3. 実装（完了）
□ 4. テスト作成
□ 5. レビュー依頼
```

---

## 📁 ストレージ

| パス | 内容 |
|------|------|
| `~/.musubix/sessions/` | セッションファイル（30日保持） |
| `~/.musubix/sessions/YYYY-MM-DD-HH-MM.md` | 個別セッション |

---

## トレーサビリティ

- REQ-SM-001: SessionStart Hook
- REQ-SM-002: SessionEnd Hook  
- REQ-SM-003: Pre-Compact State Saving
- REQ-SM-004: TodoWrite統合
