import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

type ParseJsonResult =
  | { ok: true; data: JsonObject }
  | { ok: false; response: NextResponse };

type StringFieldResult =
  | { ok: true; value: string | null }
  | { ok: false; response: NextResponse };

type EnumFieldResult<T extends string> =
  | { ok: true; value: T | null }
  | { ok: false; response: NextResponse };

function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonObject(
  request: NextRequest,
  options?: { maxChars?: number },
): Promise<ParseJsonResult> {
  const maxChars = options?.maxChars ?? 1_000_000;

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, response: jsonError("リクエストボディの読み取りに失敗しました", 400) };
  }

  if (rawBody.length === 0) {
    return { ok: false, response: jsonError("リクエストボディが空です", 400) };
  }

  if (rawBody.length > maxChars) {
    return { ok: false, response: jsonError("リクエストサイズが上限を超えています", 413) };
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, response: jsonError("JSONオブジェクトを送信してください", 400) };
    }
    return { ok: true, data: parsed as JsonObject };
  } catch {
    return { ok: false, response: jsonError("不正なJSON形式です", 400) };
  }
}

export function readStringField(
  body: JsonObject,
  field: string,
  options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    trim?: boolean;
    label?: string;
  },
): StringFieldResult {
  const required = options?.required ?? false;
  const trim = options?.trim ?? true;
  const label = options?.label ?? field;
  const rawValue = body[field];

  if (rawValue === undefined || rawValue === null) {
    if (required) {
      return { ok: false, response: jsonError(`${label}は必須です`, 400) };
    }
    return { ok: true, value: null };
  }

  if (typeof rawValue !== "string") {
    return { ok: false, response: jsonError(`${label}は文字列で指定してください`, 400) };
  }

  const value = trim ? rawValue.trim() : rawValue;
  const minLength = options?.minLength ?? 0;
  const maxLength = options?.maxLength ?? 10_000;

  if (required && value.length === 0) {
    return { ok: false, response: jsonError(`${label}は必須です`, 400) };
  }

  if (value.length > 0 && value.length < minLength) {
    return {
      ok: false,
      response: jsonError(`${label}は${minLength}文字以上で入力してください`, 400),
    };
  }

  if (value.length > maxLength) {
    return {
      ok: false,
      response: jsonError(`${label}は${maxLength}文字以内で入力してください`, 400),
    };
  }

  return { ok: true, value };
}

export function readEnumField<T extends string>(
  body: JsonObject,
  field: string,
  values: readonly T[],
  options?: {
    required?: boolean;
    label?: string;
  },
): EnumFieldResult<T> {
  const required = options?.required ?? false;
  const label = options?.label ?? field;
  const rawValue = body[field];

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    if (required) {
      return { ok: false, response: jsonError(`${label}は必須です`, 400) };
    }
    return { ok: true, value: null };
  }

  if (typeof rawValue !== "string") {
    return { ok: false, response: jsonError(`${label}の値が不正です`, 400) };
  }

  if (!values.includes(rawValue as T)) {
    return {
      ok: false,
      response: jsonError(`${label}は ${values.join(" / ")} のいずれかを指定してください`, 400),
    };
  }

  return { ok: true, value: rawValue as T };
}
