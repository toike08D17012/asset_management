# ADR-0003: Encryption Key Management Strategy

## Status
Accepted

## Context
ブラウザベースのWEBアプリケーションで、証券会社の認証情報を暗号化して保存する必要がある（REQ-008, REQ-031, REQ-032, REQ-037）。以下の制約・要件がある:

- マスターキーをハードコードしてはならない（REQ-031）
- マスターキーを安全に生成・保存する必要がある（REQ-032）
- ブラウザストレージ（localStorage/IndexedDB）のデータを暗号化する必要がある（REQ-037）
- ユーザーの利便性を損なわない（毎回キー入力は避ける）
- セキュリティと利便性のバランスが必要

## Decision
**階層的キー管理戦略**を採用する。

### アーキテクチャ

```
User Passphrase (ユーザー入力、初回のみ)
    ↓ PBKDF2 (10万回イテレーション)
Master Key (sessionStorage、セッション中のみ)
    ↓ AES-256-GCM
Data Encryption Keys (DEK) (IndexedDB、暗号化済み)
    ↓ AES-256-GCM
Actual Data (credentials, holdings) (IndexedDB、暗号化済み)
```

### 実装仕様

#### 1. 初回セットアップ
```typescript
interface EncryptionSetup {
  // ユーザーがパスフレーズを設定
  setupMasterKey(passphrase: string): Promise<Result<void, Error>>;
  
  // パスフレーズ → Master Key 導出
  deriveMasterKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey>;
}
```

- ユーザーが強力なパスフレーズを設定（8文字以上、英数字記号混在推奨）
- PBKDF2で Master Key を導出（Salt: ランダム生成、IndexedDBに平文保存）
- Master Key は sessionStorage に保存（ページクローズで消失）

#### 2. データ暗号化キー（DEK）管理
```typescript
interface DataEncryptionKeyManager {
  // DEK生成（初回のみ）
  generateDEK(): Promise<Result<CryptoKey, Error>>;
  
  // DEKをMaster Keyで暗号化してIndexedDBに保存
  storeDEK(dek: CryptoKey, masterKey: CryptoKey): Promise<Result<void, Error>>;
  
  // IndexedDBから暗号化されたDEKを取得してMaster Keyで復号
  retrieveDEK(masterKey: CryptoKey): Promise<Result<CryptoKey, Error>>;
}
```

#### 3. 認証情報暗号化
```typescript
interface IEncryptionService {
  // 認証情報をDEKで暗号化
  encrypt(plainText: string, dek: CryptoKey): Promise<Result<string, Error>>;
  
  // 暗号化された認証情報をDEKで復号
  decrypt(cipherText: string, dek: CryptoKey): Promise<Result<string, Error>>;
  
  // Master Key回転（セキュリティ強化）
  rotateMasterKey(
    oldPassphrase: string,
    newPassphrase: string
  ): Promise<Result<void, Error>>;
}
```

### セッションフロー

#### 初回起動
1. ユーザーがパスフレーズ設定
2. Salt生成 → IndexedDBに保存
3. Master Key導出 → sessionStorageに保存
4. DEK生成 → Master Keyで暗号化 → IndexedDBに保存

#### 2回目以降の起動
1. ユーザーがパスフレーズ入力
2. IndexedDBからSalt取得
3. Master Key導出 → sessionStorageに保存
4. IndexedDBから暗号化されたDEKを取得 → Master Keyで復号

#### セッション中
- Master Key は sessionStorage に保持（メモリ内）
- データ読み書き時は DEK を使用（Master Keyで復号して取得）

### セキュリティ対策

| 項目 | 対策 |
|------|------|
| Master Key保護 | sessionStorage（メモリのみ、永続化なし） |
| パスフレーズ推測攻撃 | PBKDF2 10万回イテレーション + Salt |
| DEK漏洩リスク | Master Keyで暗号化、平文保存なし |
| ブラウザDevTools | sessionStorageは見えるが、セッション終了で消失 |
| XSS攻撃 | Content Security Policy (CSP) 必須 |
| パスフレーズ忘れ | 復旧不可（データ再入力必要）→ユーザーに警告 |

## Consequences

### Positive
- **REQ-031準拠**: ハードコードなし
- **REQ-032準拠**: 安全なマスターキー生成
- **REQ-037準拠**: ブラウザストレージ暗号化
- **利便性**: セッション中はパスフレーズ再入力不要
- **セキュリティ**: 階層的暗号化で多層防御

### Negative
- **初回設定コスト**: ユーザーがパスフレーズ設定・記憶する必要
- **パスフレーズ忘れリスク**: データ復旧不可（トレードオフ）
- **ブラウザ制約**: sessionStorage/IndexedDB依存

### Risks & Mitigations

| リスク | 軽減策 |
|--------|--------|
| パスフレーズ忘れ | 強力な警告UI + パスフレーズ強度チェック |
| XSS攻撃 | CSP設定 + 定期的なセキュリティ監査 |
| ブラウザキャッシュクリア | 定期的なバックアップ推奨（REQ-035） |

## Alternatives Considered

### 1. サーバーサイド暗号化
- **却下理由**: WEBアプリのみで完結させる要件（REQ-001）
- サーバー管理コスト・複雑性増加

### 2. localStorage + 平文保存
- **却下理由**: REQ-008違反（暗号化必須）

### 3. Web Crypto API + IndexedDB（DEKなし）
- **却下理由**: Master Key漏洩時の影響が大きい（全データ復号可能）

## Implementation Notes

### 使用技術
- **暗号化**: Web Crypto API (AES-256-GCM)
- **鍵導出**: PBKDF2 (SHA-256, 100,000 iterations)
- **ストレージ**: IndexedDB (暗号化データ), sessionStorage (Master Key)

### テスト要件
- 暗号化/復号の正常系・異常系テスト
- パスフレーズ強度バリデーション
- Master Key回転機能のテスト
- ブラウザ間互換性テスト（Chrome, Firefox, Safari）

## Related
- REQ-008: 認証情報の暗号化保存
- REQ-031: ハードコード禁止
- REQ-032: マスターキー生成
- REQ-037: ブラウザストレージ暗号化
- DESIGN-資産管理WEBアプリ-001-C4.md: EncryptionService

## Date
2026-02-11
