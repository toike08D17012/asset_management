// ============================================================
// AccountService (Application Layer)
// REQ-008, REQ-009, REQ-010: アカウント管理
// ============================================================

import { type Result, ok, err } from "@/domain/types";
import type { Account, AccountCredentials, AccountSummary } from "@/domain/entities/account";
import { createAccount, toAccountSummary } from "@/domain/entities/account";
import type { IAccountRepository } from "@/domain/repositories";
import type { EncryptionService } from "@/infrastructure/encryption/encryption-service";

export class AccountService {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async addAccount(credentials: AccountCredentials): Promise<Result<AccountSummary>> {
    // Encrypt credentials
    const encUsername = this.encryption.encrypt(credentials.username);
    if (!encUsername.ok) return encUsername;

    const encPassword = this.encryption.encrypt(credentials.password);
    if (!encPassword.ok) return encPassword;

    // Create account entity
    const accountResult = createAccount({
      name: credentials.name,
      brokerage: credentials.brokerage,
      encryptedUsername: encUsername.value,
      encryptedPassword: encPassword.value,
    });
    if (!accountResult.ok) return accountResult;

    // Save
    const saveResult = await this.repository.save(accountResult.value);
    if (!saveResult.ok) return saveResult;

    return ok(toAccountSummary(saveResult.value));
  }

  async updateAccount(
    id: string,
    credentials: Partial<AccountCredentials>
  ): Promise<Result<AccountSummary>> {
    const existingResult = await this.repository.findById(id);
    if (!existingResult.ok) return existingResult;
    if (!existingResult.value) {
      return err(new Error(`Account not found: ${id}`));
    }

    const existing = existingResult.value;

    let encryptedUsername = existing.encryptedUsername;
    let encryptedPassword = existing.encryptedPassword;

    if (credentials.username) {
      const encResult = this.encryption.encrypt(credentials.username);
      if (!encResult.ok) return encResult;
      encryptedUsername = encResult.value;
    }

    if (credentials.password) {
      const encResult = this.encryption.encrypt(credentials.password);
      if (!encResult.ok) return encResult;
      encryptedPassword = encResult.value;
    }

    const updated: Account = {
      ...existing,
      name: credentials.name ?? existing.name,
      brokerage: credentials.brokerage ?? existing.brokerage,
      encryptedUsername,
      encryptedPassword,
    };

    const saveResult = await this.repository.save(updated);
    if (!saveResult.ok) return saveResult;

    return ok(toAccountSummary(saveResult.value));
  }

  async deleteAccount(id: string): Promise<Result<void>> {
    return this.repository.delete(id);
  }

  async listAccounts(): Promise<Result<AccountSummary[]>> {
    const result = await this.repository.query({});
    if (!result.ok) return result;
    return ok(result.value.map(toAccountSummary));
  }

  async getAccount(id: string): Promise<Result<Account | null>> {
    return this.repository.findById(id);
  }

  async decryptCredentials(
    account: Account
  ): Promise<Result<{ username: string; password: string }>> {
    const username = this.encryption.decrypt(account.encryptedUsername);
    if (!username.ok) return username;

    const password = this.encryption.decrypt(account.encryptedPassword);
    if (!password.ok) return password;

    return ok({ username: username.value, password: password.value });
  }
}
