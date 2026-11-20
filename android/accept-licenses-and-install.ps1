# Accepts the Android SDK licences non-interactively and installs the packages
# Bubblewrap needs.
#
# The repository owner explicitly asked for the licences to be accepted on
# their behalf. Running this script means accepting the Android SDK Terms and
# Conditions: https://developer.android.com/studio/terms
#
# Safe to re-run.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SdkRoot    = Join-Path $env:USERPROFILE 'android-sdk'
$SdkManager = Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
$JdkPath    = 'C:\Program Files\Java\jdk-17'

if (-not (Test-Path $SdkManager)) {
    throw "sdkmanager not found at $SdkManager. Run setup-android-sdk.ps1 first."
}

$env:JAVA_HOME = $JdkPath
$env:PATH = "$JdkPath\bin;$env:PATH"

Write-Host ''
Write-Host '[1/3] Accepting Android SDK licences...' -ForegroundColor Yellow

# sdkmanager asks once to review, then once per licence. Feed it plenty of
# affirmatives so it never blocks waiting on a terminal.
$answers = (1..40 | ForEach-Object { 'y' }) -join "`r`n"
$answers | & $SdkManager "--sdk_root=$SdkRoot" --licenses

$licenceDir = Join-Path $SdkRoot 'licenses'
if (-not (Test-Path $licenceDir)) {
    throw 'Licences were still not recorded — nothing was installed.'
}
$count = (Get-ChildItem $licenceDir -File).Count
Write-Host "      recorded $count licence file(s) in $licenceDir" -ForegroundColor Green

Write-Host ''
Write-Host '[2/3] Installing platform-tools, android-36, build-tools 36.1.0 (~1.5 GB)...' -ForegroundColor Yellow
# 36.1.0 is the version Bubblewrap pins (BUILD_TOOLS_VERSION in its core).
& $SdkManager "--sdk_root=$SdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.1.0'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed with exit code $LASTEXITCODE" }

# Bubblewrap looks for sdkmanager at <sdk>/tools/bin or <sdk>/bin, but modern
# SDKs put it under cmdline-tools/latest. A junction satisfies both.
$toolsLink = Join-Path $SdkRoot 'tools'
if (-not (Test-Path $toolsLink)) {
    Write-Host '      linking <sdk>\tools -> cmdline-tools\latest' -ForegroundColor DarkGray
    New-Item -ItemType Junction -Path $toolsLink -Target (Join-Path $SdkRoot 'cmdline-tools\latest') | Out-Null
}

Write-Host ''
Write-Host '[3/3] Writing Bubblewrap config...' -ForegroundColor Yellow
$cfgDir = Join-Path $env:USERPROFILE '.bubblewrap'
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfg = [ordered]@{ jdkPath = $JdkPath; androidSdkPath = $SdkRoot }
# WriteAllText, not Set-Content: PowerShell 5.1's -Encoding utf8 adds a BOM,
# and Node's JSON parser rejects it.
[System.IO.File]::WriteAllText(
    (Join-Path $cfgDir 'config.json'),
    ($cfg | ConvertTo-Json),
    (New-Object System.Text.UTF8Encoding $false)
)

Write-Host ''
Write-Host '== SDK ready ==' -ForegroundColor Green
Get-ChildItem $SdkRoot | Select-Object -ExpandProperty Name
