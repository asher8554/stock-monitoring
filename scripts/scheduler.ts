// Windows 작업 스케줄러 명령을 만든다.
export interface ScheduleCommandInput {
  mode: "enable" | "disable";
  taskName: string;
  runAt: string;
  projectDir: string;
}

export interface ShellCommandSpec {
  file: string;
  args: string[];
}

export function buildScheduleCommand(input: ScheduleCommandInput): ShellCommandSpec {
  if (input.mode === "disable") {
    return {
      file: "schtasks.exe",
      args: ["/Delete", "/TN", input.taskName, "/F"],
    };
  }

  return {
    file: "schtasks.exe",
    args: [
      "/Create",
      "/TN",
      input.taskName,
      "/SC",
      "DAILY",
      "/ST",
      input.runAt,
      "/TR",
      `cmd.exe /d /s /c "cd /d ${input.projectDir} && npm run publish-data"`,
      "/F",
    ],
  };
}
