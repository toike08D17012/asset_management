---
name: musubix-sdd-workflow
description: MUSUBIX SDD開発ワークフローガイド。10憲法条項に従った開発プロセスに使用。
license: MIT
---

# SDD Workflow Skill

10憲法条項に基づくSDD (Specification-Driven Development) ワークフロー。

## Prerequisites

1. `steering/`を確認
2. `steering/rules/constitution.md`の10条項を確認
3. `storage/specs/`の既存specを確認

## 5 Phases

| Phase | 内容 | 成果物 |
|-------|------|--------|
| **1** | 要件定義 | REQ-* (EARS形式) |
| **2** | 設計 | DES-* (C4モデル) |
| **3** | タスク分解 | TSK-* (≤4時間) |
| **4** | 実装 | Code + Tests (TDD) |
| **5** | 完了 | CHANGELOG, Docs |

## Phase Flow

```
Phase 1 → Review → Phase 2 → Review → Phase 3 → Review → Phase 4 → Phase 5
   ↑___________↓     ↑___________↓     ↑___________↓
     修正ループ         修正ループ         修正ループ
```

**⛔ 禁止**: Phase 2 → Phase 4 の直接遷移（必ずPhase 3を経由）

## WHEN → DO

| WHEN | DO |
|------|-----|
| 機能開発開始 | Phase 1から順に実行 |
| レビューで問題発見 | 修正して再レビュー |
| Phase 3完了前に実装要求 | 「Phase 3が必要」と回答 |
| 実装フェーズ | TDD (Red→Green→Blue) |

## Article X: Implementation Prerequisites

**絶対ルール**: 要件・設計・タスクが承認されていない限り、実装禁止。

```
⛔ 禁止: Phase 2 → Phase 4
✅ 必須: Phase 1 → 2 → 3 → 4
```

## CLI

```bash
# Requirements
npx musubix requirements analyze <file>
npx musubix requirements validate <file>

# Design
npx musubix design generate <file>
npx musubix design traceability

# Code
npx musubix codegen generate <file>
npx musubix codegen status <spec>

# Scaffold
npx musubix scaffold domain-model <name>
npx musubix scaffold domain-model <name> -v "Price,Email"
npx musubix scaffold domain-model <name> -s "Order,Task"
```

## Traceability Chain

```
REQ-* → DES-* → TSK-* → Code → Tests
```

## 出力例

```
┌─────────────────────────────────────────┐
│ Workflow Status                         │
├─────────────────────────────────────────┤
│ Phase 1: ✅ Requirements (3 REQs)       │
│ Phase 2: ✅ Design (1 DES)              │
│ Phase 3: ✅ Tasks (5 TSKs)              │
│ Phase 4: 🔄 Implementation (2/5 done)   │
│ Phase 5: ⏸️ Pending                     │
│ Traceability: 100%                      │
└─────────────────────────────────────────┘
```
