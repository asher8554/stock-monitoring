// 포트폴리오 암호화 왕복 동작을 검증한다.
import { describe, expect, test } from "vitest";
import { decryptPayload, encryptPayload } from "../src/lib/crypto";

describe("portfolio encryption", () => {
  test("encrypts payload without storing plaintext and decrypts with the password", async () => {
    const payload = {
      version: 1,
      message: "민감한 투자 데이터",
      positions: [{ id: "KRX:005930", valuationKrw: 750000 }],
    };

    const encrypted = await encryptPayload(payload, "correct horse battery staple", {
      iterations: 1000,
      salt: new Uint8Array(16).fill(7),
      iv: new Uint8Array(12).fill(3),
    });

    expect(encrypted.algorithm).toBe("AES-GCM");
    expect(encrypted.kdf).toBe("PBKDF2-SHA-256");
    expect(encrypted.ciphertext).not.toContain("민감한 투자 데이터");

    await expect(decryptPayload(encrypted, "wrong-password")).rejects.toThrow();
    await expect(decryptPayload(encrypted, "correct horse battery staple")).resolves.toEqual(payload);
  });
});
