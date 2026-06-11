// 한국투자증권 접근 토큰을 로컬 파일에 저장한다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CachedKisAccessToken, KisAccessTokenCache } from "./adapters/korea-investment";

export function createFileKisTokenCache(filePath: string): KisAccessTokenCache {
  return {
    async read(): Promise<CachedKisAccessToken | null> {
      let content: string;
      try {
        content = await readFile(filePath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      }

      try {
        const parsed = JSON.parse(content) as Partial<CachedKisAccessToken>;
        if (!parsed.accessToken || !parsed.expiresAt) {
          return null;
        }
        return {
          accessToken: parsed.accessToken,
          expiresAt: parsed.expiresAt,
        };
      } catch {
        return null;
      }
    },
    async write(token: CachedKisAccessToken): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(token, null, 2)}\n`, "utf8");
    },
  };
}
