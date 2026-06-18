# stock-monitoring 데이터를 수집하고 암호화해서 GitHub Pages에 배포한다.
[CmdletBinding()]
param(
    [string]$ProjectDir = "E:\Github\stock-monitoring",
    [switch]$NoWaitPages,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host "Usage: Update-StockMonitoring [-NoWaitPages] [-ProjectDir <path>]"
    Write-Host ""
    Write-Host "Runs npm run daily-update from the stock-monitoring project."
    Write-Host "Prompts for PORTFOLIO_PASSWORD only when it is not already set."
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

    $beforeHead = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "git rev-parse failed before update"
    }

    if (-not $hadPassword) {
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
