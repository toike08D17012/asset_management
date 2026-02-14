import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { parseJsonObject, readEnumField, readStringField } from "@/lib/request-validation";

function createJsonRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("request-validation", () => {
  it("parses valid JSON object body", async () => {
    const req = createJsonRequest(JSON.stringify({ name: "test" }));
    const result = await parseJsonObject(req);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("test");
    }
  });

  it("rejects JSON array body", async () => {
    const req = createJsonRequest(JSON.stringify(["not-object"]));
    const result = await parseJsonObject(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("validates required string field and trim behavior", () => {
    const body: Record<string, unknown> = { name: "  account  " };
    const result = readStringField(body, "name", { required: true, minLength: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("account");
    }
  });

  it("validates enum field", () => {
    const body: Record<string, unknown> = { brokerage: "rakuten" };
    const result = readEnumField(body, "brokerage", ["rakuten", "sbi"] as const, {
      required: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("rakuten");
    }
  });
});
