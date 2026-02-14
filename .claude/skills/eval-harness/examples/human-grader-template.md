# Human Grader Templates

## Standard Human Grader Template

```markdown
[HUMAN GRADE: <feature-name>]

Reviewer: @<username>
Date: YYYY-MM-DD
Review Type: <Initial|Re-review|Final>

---

## Checklist

### Functional Requirements
  - [ ] 仕様を満たしている
  - [ ] 全ての機能が正常に動作する
  - [ ] エッジケースが考慮されている
  - [ ] エラーハンドリングが適切

### Code Quality
  - [ ] コードが読みやすい
  - [ ] 命名規則が一貫している
  - [ ] 重複コードがない（DRY原則）
  - [ ] 適切な抽象化レベル

### Compatibility
  - [ ] 既存API互換性が維持されている
  - [ ] 後方互換性が確保されている
  - [ ] 破壊的変更がある場合は文書化されている

### Security
  - [ ] セキュリティ上の懸念がない
  - [ ] 入力バリデーションが適切
  - [ ] 機密データの取り扱いが安全
  - [ ] 認証・認可が正しく実装されている

### Performance
  - [ ] パフォーマンス要件を満たす
  - [ ] N+1クエリがない
  - [ ] 適切なキャッシュ戦略
  - [ ] メモリリークの懸念がない

### Testing
  - [ ] テストカバレッジが十分（80%以上）
  - [ ] ユニットテストが存在する
  - [ ] 統合テストが存在する
  - [ ] エッジケースのテストがある

### Documentation
  - [ ] コードコメントが適切
  - [ ] APIドキュメントが更新されている
  - [ ] READMEが更新されている（必要な場合）

---

## Scores (1-5)

| Category        | Score | Notes                    |
|-----------------|-------|--------------------------|
| Functionality   |   /5  |                          |
| Code Quality    |   /5  |                          |
| Maintainability |   /5  |                          |
| Documentation   |   /5  |                          |

**Total: XX/20**

---

## Detailed Feedback

### Strengths
1. 
2. 
3. 

### Areas for Improvement
1. 
2. 
3. 

### Critical Issues (if any)
- 

---

## Verdict

**Decision: <PASS|FAIL|NEEDS_REVISION>**

### If NEEDS_REVISION, required changes:
1. 
2. 

### Follow-up Actions:
- [ ] 
- [ ] 

---

**Signature:** [Reviewer Name]  
**Date:** YYYY-MM-DD
```

---

## Specialized Templates

### Security Review Template

```markdown
[HUMAN GRADE: <feature-name> - Security Review]

Reviewer: @<security-reviewer>
Date: YYYY-MM-DD
Review Type: Security Audit

---

## Security Checklist

### Authentication
  - [ ] 認証メカニズムが適切
  - [ ] セッション管理が安全
  - [ ] パスワードポリシーが適切
  - [ ] MFAの考慮

### Authorization
  - [ ] アクセス制御が正しく実装
  - [ ] 権限昇格の脆弱性なし
  - [ ] リソースベースの認可

### Data Protection
  - [ ] 機密データの暗号化
  - [ ] PII/PHIの適切な取り扱い
  - [ ] データの最小化原則

### Input Validation
  - [ ] 全入力のバリデーション
  - [ ] SQLインジェクション対策
  - [ ] XSS対策
  - [ ] CSRF対策

### API Security
  - [ ] レート制限
  - [ ] 適切なエラーメッセージ
  - [ ] ログの適切な出力

---

## Risk Assessment

| Vulnerability Type | Risk Level | Status |
|-------------------|------------|--------|
| Injection         | Low/Med/High | ✅/⚠️/❌ |
| Broken Auth       | Low/Med/High | ✅/⚠️/❌ |
| XSS               | Low/Med/High | ✅/⚠️/❌ |
| CSRF              | Low/Med/High | ✅/⚠️/❌ |
| Broken Access     | Low/Med/High | ✅/⚠️/❌ |

---

## Findings

### Critical (Must Fix)
1. 

### High (Should Fix)
1. 

### Medium (Consider Fixing)
1. 

### Low (Nice to Fix)
1. 

---

**Security Verdict: <APPROVED|REJECTED|CONDITIONAL>**
```

---

### Architecture Review Template

```markdown
[HUMAN GRADE: <feature-name> - Architecture Review]

Reviewer: @<architect>
Date: YYYY-MM-DD
Review Type: Architecture Decision

---

## Architecture Checklist

### Design Principles
  - [ ] Single Responsibility Principle
  - [ ] Open/Closed Principle
  - [ ] Liskov Substitution Principle
  - [ ] Interface Segregation Principle
  - [ ] Dependency Inversion Principle

### Patterns
  - [ ] 適切なデザインパターンの使用
  - [ ] アンチパターンの回避
  - [ ] 過度な複雑さの回避

### Scalability
  - [ ] 水平スケーラビリティの考慮
  - [ ] ボトルネックの特定と対策
  - [ ] 負荷分散の戦略

### Maintainability
  - [ ] モジュール性
  - [ ] テスタビリティ
  - [ ] 変更容易性

---

## Architecture Decision Record

### Context
<決定の背景>

### Decision
<選択したアプローチ>

### Consequences
<この決定の結果・影響>

### Alternatives Considered
1. <代替案1>: <却下理由>
2. <代替案2>: <却下理由>

---

**Architecture Verdict: <APPROVED|NEEDS_REVISION|REJECTED>**
```

---

### UX Review Template

```markdown
[HUMAN GRADE: <feature-name> - UX Review]

Reviewer: @<ux-designer>
Date: YYYY-MM-DD
Review Type: User Experience

---

## UX Checklist

### Usability
  - [ ] 直感的なUI
  - [ ] 一貫したデザイン言語
  - [ ] 適切なフィードバック
  - [ ] エラー回復が容易

### Accessibility
  - [ ] キーボードナビゲーション
  - [ ] スクリーンリーダー対応
  - [ ] 色覚多様性への配慮
  - [ ] 適切なコントラスト比

### Performance Perception
  - [ ] ローディング状態の表示
  - [ ] スケルトンUI
  - [ ] 楽観的更新
  - [ ] 適切なアニメーション

---

## Heuristic Evaluation

| Heuristic                    | Score (1-5) |
|------------------------------|-------------|
| Visibility of System Status  |     /5      |
| Match with Real World        |     /5      |
| User Control & Freedom       |     /5      |
| Consistency & Standards      |     /5      |
| Error Prevention             |     /5      |
| Recognition over Recall      |     /5      |
| Flexibility & Efficiency     |     /5      |
| Aesthetic & Minimal Design   |     /5      |
| Help Users with Errors       |     /5      |
| Help & Documentation         |     /5      |

**Total: XX/50**

---

**UX Verdict: <APPROVED|NEEDS_IMPROVEMENT|REJECTED>**
```

---

## Usage Guidelines

### When to Use Human Grader

1. **主観的判断が必要な場合**
   - UI/UXの品質評価
   - コードの読みやすさ
   - 設計の妥当性

2. **ドメイン専門知識が必要な場合**
   - ビジネスロジックの正確性
   - 法規制への準拠
   - 業界標準への適合

3. **自動化が困難な場合**
   - クロスブラウザ互換性
   - アクセシビリティ
   - パフォーマンス体感

### Best Practices

- 複数のレビュアーによる評価を推奨
- チェックリストは事前に合意して一貫性を保つ
- 主観的判断には必ず理由を明記
- NEEDS_REVISIONの場合は具体的な改善点を列挙
- フォローアップアクションを明確に定義
