// 증권사 API 자격 증명 환경변수 파싱을 검증한다.
import { describe, expect, test } from "vitest";
import { parseEnvFile } from "../scripts/credentials";
import { loadBrokerCredentials } from "../scripts/credentials";

describe("broker credentials", () => {
  test("loads Korea Investment and Toss credentials from local environment values", () => {
    const credentials = loadBrokerCredentials({
      KIS_APP_KEY: "kis-app-key",
      KIS_APP_SECRET: "kis-app-secret",
      KIS_ACCOUNT_NO: "12345678",
      KIS_ACCOUNT_PRODUCT_CODE: "01",
      KIS_ACCOUNT_ALIAS: "한국투자 ISA",
      TOSS_APP_KEY: "toss-app-key",
      TOSS_APP_SECRET: "toss-app-secret",
      TOSS_ACCOUNT_ALIAS: "토스 일반",
    });

    expect(credentials.koreaInvestment).toEqual({
      appKey: "kis-app-key",
      appSecret: "kis-app-secret",
      accountNo: "12345678",
      accountProductCode: "01",
      accountAlias: "한국투자 ISA",
      environment: "real",
    });
    expect(credentials.toss).toEqual({
      appKey: "toss-app-key",
      appSecret: "toss-app-secret",
      accountAlias: "토스 일반",
    });
  });

  test("rejects partially configured broker credentials", () => {
    expect(() =>
      loadBrokerCredentials({
        KIS_APP_KEY: "kis-app-key",
      }),
    ).toThrow("KIS credentials are incomplete");
  });

  test("parses local dotenv content without exposing comments", () => {
    expect(
      parseEnvFile(`
# local only
KIS_APP_KEY = kis-app-key
KIS_APP_SECRET="kis-app-secret"
`),
    ).toEqual({
      KIS_APP_KEY: "kis-app-key",
      KIS_APP_SECRET: "kis-app-secret",
    });
  });

  test("loads Korea Investment demo environment when explicitly configured", () => {
    const credentials = loadBrokerCredentials({
      KIS_APP_KEY: "kis-app-key",
      KIS_APP_SECRET: "kis-app-secret",
      KIS_ACCOUNT_NO: "12345678",
      KIS_ACCOUNT_PRODUCT_CODE: "01",
      KIS_ACCOUNT_ALIAS: "한국투자 ISA",
      KIS_ENVIRONMENT: "demo",
    });

    expect(credentials.koreaInvestment?.environment).toBe("demo");
  });

  test("does not treat display aliases alone as configured broker credentials", () => {
    const credentials = loadBrokerCredentials({
      KIS_ACCOUNT_ALIAS: "한국투자 ISA",
      TOSS_ACCOUNT_ALIAS: "토스 일반",
    });

    expect(credentials).toEqual({
      koreaInvestment: null,
      toss: null,
    });
  });
});
