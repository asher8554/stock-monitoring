# stock-monitoring 데이터를 수집하고 암호화해서 GitHub Pages에 배포한다.
[CmdletBinding()]
param(
    [string]$ProjectDir = "E:\Github\stock-monitoring",
    [switch]$NoWaitPages,
    [switch]$SavePassword,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host "Usage: Update-StockMonitoring [-SavePassword] [-NoWaitPages] [-ProjectDir <path>]"
    Write-Host ""
    Write-Host "Runs npm run daily-update from the stock-monitoring project."
    Write-Host "Uses PORTFOLIO_PASSWORD from the current session or .env.local when available."
    Write-Host "Use -SavePassword once to store PORTFOLIO_PASSWORD in local .env.local."
    return
}

function Convert-SecureStringToPlainText {
    param([securestring]$SecureValue)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function ConvertFrom-EnvValue {
    param([string]$Value)

    if ($Value.Length -ge 2) {
        $first = $Value.Substring(0, 1)
        $last = $Value.Substring($Value.Length - 1, 1)
        if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
            return $Value.Substring(1, $Value.Length - 2)
        }
    }

    return $Value
}

function ConvertTo-EnvValue {
    param([string]$Value)

    if ($Value -match "[`r`n]") {
        throw "비밀번호에는 줄바꿈을 넣을 수 없습니다."
    }
    if ($Value -notmatch "\s" -and -not $Value.Contains('"') -and -not $Value.Contains("'")) {
        return $Value
    }
    if (-not $Value.Contains('"')) {
        return '"' + $Value + '"'
    }
    if (-not $Value.Contains("'")) {
        return "'" + $Value + "'"
    }

    throw "비밀번호에 작은따옴표와 큰따옴표가 모두 있어 자동 저장할 수 없습니다. .env.local에 직접 입력하세요."
}

function Get-EnvFileValue {
    param(
        [string]$FilePath,
        [string]$Key
    )

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $FilePath -Encoding UTF8) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 0) {
            continue
        }

        $name = $trimmed.Substring(0, $separatorIndex).Trim()
        if ($name -eq $Key) {
            $rawValue = $trimmed.Substring($separatorIndex + 1).Trim()
            return ConvertFrom-EnvValue $rawValue
        }
    }

    return $null
}

function Set-EnvFileValue {
    param(
        [string]$FilePath,
        [string]$Key,
        [string]$Value
    )

    $lineValue = "$Key=$(ConvertTo-EnvValue $Value)"
    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        Set-Content -LiteralPath $FilePath -Encoding UTF8 -Value @($lineValue)
        return
    }

    $lines = @(Get-Content -LiteralPath $FilePath -Encoding UTF8)
    $updated = $false
    for ($index = 0; $index -lt $lines.Count; $index += 1) {
        $trimmed = $lines[$index].Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 0) {
            continue
        }

        $name = $trimmed.Substring(0, $separatorIndex).Trim()
        if ($name -eq $Key) {
            $lines[$index] = $lineValue
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $lines += $lineValue
    }

    Set-Content -LiteralPath $FilePath -Encoding UTF8 -Value $lines
}

function Invoke-NativeCommand {
    param(
        [string]$File,
        [string[]]$Arguments
    )

    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$File $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Get-PagesRunForHead {
    param(
        [string]$HeadSha,
        [string]$Branch
    )

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        return $null
    }

    $json = & gh run list --workflow pages.yml --branch $Branch --limit 10 --json databaseId,headSha,status,conclusion 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
        return $null
    }

    $runs = $json | ConvertFrom-Json
    @($runs) | Where-Object { $_.headSha -eq $HeadSha } | Select-Object -First 1
}

$hadPassword = -not [string]::IsNullOrWhiteSpace($env:PORTFOLIO_PASSWORD)
$passwordSetByScript = $false
$locationPushed = $false

try {
    if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) {
        throw "Project directory not found: $ProjectDir"
    }

    Push-Location -LiteralPath $ProjectDir
    $locationPushed = $true

    if (-not (Test-Path -LiteralPath "package.json" -PathType Leaf)) {
        throw "package.json not found in $ProjectDir"
    }

    $savedPassword = Get-EnvFileValue -FilePath ".env.local" -Key "PORTFOLIO_PASSWORD"
    $hasSavedPassword = -not [string]::IsNullOrWhiteSpace($savedPassword)

    $beforeHead = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "git rev-parse failed before update"
    }

    if ($SavePassword) {
        if ($hadPassword) {
            $plainPassword = $env:PORTFOLIO_PASSWORD
        }
        else {
            $securePassword = Read-Host "저장할 사이트 잠금해제 비밀번호" -AsSecureString
            $plainPassword = Convert-SecureStringToPlainText $securePassword
            if ([string]::IsNullOrWhiteSpace($plainPassword)) {
                throw "비밀번호가 비어 있습니다."
            }
            $env:PORTFOLIO_PASSWORD = $plainPassword
            $passwordSetByScript = $true
        }

        Set-EnvFileValue -FilePath ".env.local" -Key "PORTFOLIO_PASSWORD" -Value $plainPassword
        $hasSavedPassword = $true
        Write-Host ".env.local에 PORTFOLIO_PASSWORD 저장 완료."
    }
    elseif (-not $hadPassword -and -not $hasSavedPassword) {
        $securePassword = Read-Host "사이트 잠금해제 비밀번호" -AsSecureString
        $plainPassword = Convert-SecureStringToPlainText $securePassword
        if ([string]::IsNullOrWhiteSpace($plainPassword)) {
            throw "비밀번호가 비어 있습니다."
        }
        $env:PORTFOLIO_PASSWORD = $plainPassword
        $passwordSetByScript = $true
    }

    Invoke-NativeCommand "npm.cmd" @("run", "daily-update")

    $afterHead = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "git rev-parse failed after update"
    }

    if ($afterHead -eq $beforeHead) {
        Write-Host "새 commit 없음. Pages 대기 생략."
        return
    }

    if ($NoWaitPages) {
        Write-Host "push 완료. Pages 대기 생략."
        return
    }

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "push 완료. gh 없음. Pages 배포 확인 생략."
        return
    }

    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
        throw "git branch --show-current failed"
    }

    $run = $null
    for ($attempt = 1; $attempt -le 6; $attempt += 1) {
        $run = Get-PagesRunForHead $afterHead $branch
        if ($run) {
            break
        }
        Start-Sleep -Seconds 5
    }

    if (-not $run) {
        Write-Host "push 완료. 해당 commit의 Pages run을 찾지 못해 배포 대기 생략."
        return
    }

    if ($run.status -ne "completed") {
        Invoke-NativeCommand "gh" @("run", "watch", [string]$run.databaseId, "--exit-status")
    }
    elseif ($run.conclusion -ne "success") {
        throw "Pages deploy failed: $($run.conclusion)"
    }

    Write-Host "갱신과 Pages 배포 확인 완료."
}
finally {
    if ($passwordSetByScript) {
        Remove-Item Env:\PORTFOLIO_PASSWORD -ErrorAction SilentlyContinue
    }
    if ($locationPushed) {
        Pop-Location
    }
}
