// 다크모드 초기값과 토글 계산을 검증한다.
import { describe, expect, test } from "vitest";
import { nextTheme, resolveInitialTheme } from "../src/lib/theme";

describe("theme preferences", () => {
  test("uses stored theme before system preference", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  test("falls back to system preference when no stored theme exists", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  test("toggles between light and dark", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});
