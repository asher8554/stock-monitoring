// 사용자 테마 선호를 계산한다.
export type ThemeMode = "light" | "dark";

export function resolveInitialTheme(storedTheme: string | null, prefersDark: boolean): ThemeMode {
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }
  return prefersDark ? "dark" : "light";
}

export function nextTheme(theme: ThemeMode): ThemeMode {
  return theme === "dark" ? "light" : "dark";
}
