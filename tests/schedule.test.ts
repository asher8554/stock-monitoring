// Windows 작업 스케줄러 명령 생성을 검증한다.
import { describe, expect, test } from "vitest";
import { buildScheduleCommand } from "../scripts/scheduler";

describe("windows scheduler command", () => {
  test("builds an enable command for the configured market-close time", () => {
    const command = buildScheduleCommand({
      mode: "enable",
      taskName: "StockMonitoring",
      runAt: "16:10",
      projectDir: "E:\\Github\\stock-monitoring",
    });

    expect(command.file).toBe("schtasks.exe");
    expect(command.args).toEqual([
      "/Create",
      "/TN",
      "StockMonitoring",
      "/SC",
      "DAILY",
      "/ST",
      "16:10",
      "/TR",
      'cmd.exe /d /s /c "cd /d E:\\Github\\stock-monitoring && npm run publish-data"',
      "/F",
    ]);
  });

  test("builds a disable command without deleting local settings", () => {
    const command = buildScheduleCommand({
      mode: "disable",
      taskName: "StockMonitoring",
      runAt: "16:10",
      projectDir: "E:\\Github\\stock-monitoring",
    });

    expect(command.file).toBe("schtasks.exe");
    expect(command.args).toEqual(["/Delete", "/TN", "StockMonitoring", "/F"]);
  });
});
