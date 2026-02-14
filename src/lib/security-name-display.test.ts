import { describe, expect, it } from "vitest";
import { normalizeSecurityNameForDisplay } from "@/lib/security-name-display";

describe("normalizeSecurityNameForDisplay", () => {
  it("全角スペースを半角スペースに変換する", () => {
    expect(normalizeSecurityNameForDisplay("ｅＭＡＸＩＳ　Ｓｌｉｍ")).toBe("eMAXIS Slim");
  });

  it("全角英数字を半角英数字に変換する", () => {
    expect(normalizeSecurityNameForDisplay("ＡＢＣ１２３")).toBe("ABC123");
  });

  it("日本語や記号はそのまま維持する", () => {
    expect(normalizeSecurityNameForDisplay("ＳＢＩ日本高配当株式（年４回）")).toBe(
      "SBI日本高配当株式（年4回）"
    );
  });
});
