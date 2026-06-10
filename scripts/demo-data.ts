// 더미 포트폴리오를 암호화해 GitHub Pages 미리보기 데이터를 만든다.
import path from "node:path";
import { encryptPayload } from "../src/lib/crypto";
import type { PortfolioPayload, TargetWeight } from "../src/types/portfolio";
import { mergeTargetsIntoPortfolio, readJsonFile, writeJsonFile } from "./payload";

const projectDir = process.cwd();
const portfolio = await readJsonFile<PortfolioPayload>(path.join(projectDir, "samples", "demo-portfolio.json"));
const targets = await readJsonFile<TargetWeight[]>(path.join(projectDir, "samples", "targets.sample.json"));
const encrypted = await encryptPayload(mergeTargetsIntoPortfolio(portfolio, targets), "demo-password", {
  iterations: 1000,
});

await writeJsonFile(path.join(projectDir, "public", "portfolio.enc.json"), encrypted);
console.log("Demo encrypted portfolio written with password demo-password");
