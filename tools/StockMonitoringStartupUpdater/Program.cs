// 컴퓨터 시작 시 포트폴리오 갱신을 재시도하고 실행한다.
using System.Diagnostics;
using System.Text;

const string ProjectDir = @"E:\Github\stock-monitoring";
const string UpdateScriptPath = ProjectDir + @"\Update-StockMonitoring.ps1";
const string LogPath = ProjectDir + @"\local\startup-updater.log";
const int MaxAttempts = 30;
var retryDelay = TimeSpan.FromSeconds(30);
var internetCheckUri = new Uri("https://github.com/");

Directory.CreateDirectory(Path.GetDirectoryName(LogPath)!);

using var mutex = new Mutex(false, @"Global\StockMonitoringStartupUpdater");
if (!mutex.WaitOne(TimeSpan.Zero))
{
    Log("Already running. Exit.");
    return 0;
}

if (args.Contains("--self-test", StringComparer.OrdinalIgnoreCase))
{
    return SelfTest();
}

for (var attempt = 1; attempt <= MaxAttempts; attempt += 1)
{
    Log($"Attempt {attempt}/{MaxAttempts}.");

    if (!await HasInternet(internetCheckUri))
    {
        Log($"Internet unavailable. Retry in {retryDelay.TotalSeconds:0}s.");
        await Task.Delay(retryDelay);
        continue;
    }

    var exitCode = RunUpdate();
    if (exitCode == 0)
    {
        Log("Update succeeded. Exit.");
        return 0;
    }

    Log($"Update failed with exit code {exitCode}. Retry in {retryDelay.TotalSeconds:0}s.");
    await Task.Delay(retryDelay);
}

Log("Retry limit reached. Exit.");
return 1;

static int SelfTest()
{
    if (!Directory.Exists(ProjectDir))
    {
        Log($"Project dir missing: {ProjectDir}");
        return 2;
    }
    if (!File.Exists(UpdateScriptPath))
    {
        Log($"Update script missing: {UpdateScriptPath}");
        return 3;
    }
    if (!File.Exists(Path.Combine(ProjectDir, ".env.local")))
    {
        Log(".env.local missing.");
        return 4;
    }

    Log("Self-test ok.");
    return 0;
}

static async Task<bool> HasInternet(Uri uri)
{
    try
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
        using var request = new HttpRequestMessage(HttpMethod.Head, uri);
        using var response = await client.SendAsync(request);
        return (int)response.StatusCode < 500;
    }
    catch (Exception error)
    {
        Log($"Internet check failed: {error.Message}");
        return false;
    }
}

static int RunUpdate()
{
    var startInfo = new ProcessStartInfo
    {
        FileName = "powershell.exe",
        Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{UpdateScriptPath}\" -NoWaitPages",
        WorkingDirectory = ProjectDir,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true,
        StandardOutputEncoding = Encoding.UTF8,
        StandardErrorEncoding = Encoding.UTF8,
    };

    using var process = new Process { StartInfo = startInfo };
    process.OutputDataReceived += (_, eventArgs) =>
    {
        if (!string.IsNullOrWhiteSpace(eventArgs.Data))
        {
            Log(eventArgs.Data);
        }
    };
    process.ErrorDataReceived += (_, eventArgs) =>
    {
        if (!string.IsNullOrWhiteSpace(eventArgs.Data))
        {
            Log(eventArgs.Data);
        }
    };

    process.Start();
    process.BeginOutputReadLine();
    process.BeginErrorReadLine();
    process.WaitForExit();
    return process.ExitCode;
}

static void Log(string message)
{
    var line = $"{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss zzz} {message}{Environment.NewLine}";
    File.AppendAllText(LogPath, line, Encoding.UTF8);
}
