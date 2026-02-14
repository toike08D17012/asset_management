# Package Codemap Template

個別パッケージのコードマップテンプレートです。

---

## Package: `@nahisaho/musubix-{package-name}`

### Overview

| Property | Value |
|----------|-------|
| **Purpose** | {パッケージの目的} |
| **Version** | {バージョン} |
| **Dependencies** | {主要依存パッケージ} |
| **Test Count** | {テスト数} |

---

### Directory Structure

```
packages/{package-name}/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts          # Public exports
    ├── types.ts          # Type definitions
    ├── {module}/         # Feature modules
    │   ├── index.ts
    │   ├── {service}.ts
    │   └── __tests__/
    │       └── {service}.test.ts
    └── integration/      # Integration bridges
        ├── index.ts
        └── __tests__/
```

---

### Public API

#### Exports from `index.ts`

```typescript
// Main exports
export { MainService } from './main-service';
export { HelperFunction } from './helpers';

// Types
export type { MainConfig, MainResult } from './types';

// Constants
export { DEFAULT_CONFIG } from './constants';
```

#### Key Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `createService` | `(config: Config) => Service` | サービスインスタンス生成 |
| `processData` | `(data: Input) => Result<Output, Error>` | データ処理 |
| `validateInput` | `(input: unknown) => boolean` | 入力検証 |

---

### Internal Modules

#### `{module-name}/`

**Purpose**: {モジュールの目的}

**Key Files**:
- `service.ts`: {説明}
- `types.ts`: {説明}
- `utils.ts`: {説明}

**Dependencies**:
- `../types`: 型定義
- `external-package`: {用途}

---

### Data Flow

```
Input
  ↓ [validate]
Validated Input
  ↓ [process]
Intermediate State
  ↓ [transform]
Output
```

---

### Integration Points

#### Consumed By
- `@nahisaho/musubix-{consumer-package}`: {用途}

#### Consumes
- `@nahisaho/musubix-{dependency-package}`: {用途}

---

### Configuration

```typescript
interface Config {
  // Required
  required: string;
  
  // Optional with defaults
  optional?: number; // default: 10
  
  // Feature flags
  enableFeature?: boolean; // default: false
}
```

---

### Error Handling

| Error Class | When Thrown | Recovery |
|-------------|-------------|----------|
| `ValidationError` | Invalid input | Fix input |
| `ProcessingError` | Processing failure | Retry |
| `ConfigError` | Invalid config | Fix config |

---

### Testing Strategy

| Type | Coverage Target | Location |
|------|-----------------|----------|
| Unit | 80%+ | `src/**/__tests__/*.test.ts` |
| Integration | Key flows | `src/integration/__tests__/` |

---

### Change History

| Version | Changes |
|---------|---------|
| v3.7.0 | Initial release |
| v3.7.1 | Bug fixes |
| v3.7.2 | Performance improvements |

---

## Update Instructions

1. 新しい export 追加時 → Public API セクション更新
2. 新しいモジュール追加時 → Internal Modules セクション更新
3. 設定項目追加時 → Configuration セクション更新
4. 新しいエラー追加時 → Error Handling セクション更新
