---
name: musubix-technical-writing
description: 技術ドキュメント作成ガイド。README、ユーザーガイド、API参照に使用。
license: MIT
---

# Technical Writing Skill

高品質な技術ドキュメントを一貫した構造で作成。

## Document Types

| 種類 | 目的 | ファイル |
|------|------|---------|
| **README** | プロジェクト概要 | README.md |
| **Install Guide** | セットアップ手順 | INSTALL-GUIDE.md |
| **User Guide** | 使用方法詳細 | USER-GUIDE.md |
| **API Reference** | API完全ドキュメント | API-REFERENCE.md |
| **Changelog** | バージョン履歴 | CHANGELOG.md |

## WHEN → DO

| WHEN | DO |
|------|-----|
| 新規プロジェクト | READMEテンプレート適用 |
| 機能追加 | User GuideとAPI Reference更新 |
| リリース | Changelog更新 |
| セットアップ手順変更 | Install Guide更新 |

## README Template

```markdown
# Project Name

> One-line description

## 🎯 Features
- Feature 1
- Feature 2

## 📦 Installation
\`\`\`bash
npm install package-name
\`\`\`

## 🚀 Quick Start
\`\`\`typescript
import { MainClass } from 'package-name';
const instance = new MainClass();
\`\`\`

## 📖 Documentation
- [Installation](docs/INSTALL-GUIDE.md)
- [User Guide](docs/USER-GUIDE.md)
- [API Reference](docs/API-REFERENCE.md)
```

## API Reference Template

```markdown
### `methodName(param1, param2)`

Description.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param1` | `string` | Yes | First param |
| `param2` | `number` | No | Optional |

**Returns**: `Promise<Result>`

**Example**:
\`\`\`typescript
const result = await instance.methodName('value', 42);
\`\`\`
```

## Changelog Format

[Keep a Changelog](https://keepachangelog.com/)準拠:

```markdown
## [1.2.0] - 2026-01-15

### Added
- New feature description

### Changed
- Modified behavior

### Fixed
- Bug fix description
```

## 出力例

```
┌─────────────────────────────────────────┐
│ Documentation Generated                 │
├─────────────────────────────────────────┤
│ README.md:        Updated              │
│ INSTALL-GUIDE.md: Created              │
│ USER-GUIDE.md:    Updated              │
│ API-REFERENCE.md: Updated              │
│ CHANGELOG.md:     Updated              │
│ Total Sections:   15                   │
└─────────────────────────────────────────┘
```
