# Installs the Android command-line tools and the packages Bubblewrap needs,
# then points Bubblewrap at them. Safe to re-run: anything already present is
# skipped.
#
# The SDK is deliberately placed outside OneDrive so it is not synced.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is far faster without the progress bar

$SdkRoot   = Join-Path $env:USERPROFILE 'android-sdk'
$ToolsDir  = Join-Path $SdkRoot 'cmdline-tools\latest'
$SdkManager = Join-Path $ToolsDir 'bin\sdkmanager.bat'
$ToolsUrl  = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$JdkPath   = 'C:\Program Files\Java\jdk-17'

Write-Host ''
Write-Host '== StudyQuest / Android SDK setup ==' -ForegroundColor Cyan
Write-Host "SDK location : $SdkRoot"
Write-Host "JDK          : $JdkPath"
Write-Host ''

if (-not (Test-Path (Join-Path $JdkPath 'bin\java.exe'))) {
    throw "JDK 17 not found at $JdkPath. Install it, or edit `$JdkPath in this script."
}
$env:JAVA_HOME = $JdkPath
$env:PATH = "$JdkPath\bin;$env:PATH"

# --- 1. command-line tools -------------------------------------------------
if (Test-Path $SdkManager) {
    Write-Host '[1/4] Command-line tools already present — skipping download.' -ForegroundColor DarkGray
} else {
    Write-Host '[1/4] Downloading Android command-line tools (~150 MB)...' -ForegroundColor Yellow
    $tmp = Join-Path $env:TEMP 'android-cmdline-tools'
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null

    $zip = Join-Path $tmp 'cmdline-tools.zip'
    Invoke-WebRequest -Uri $ToolsUrl -OutFile $zip
    Write-Host ('      downloaded {0:N0} MB' -f ((Get-Item $zip).Length / 1MB))

    Write-Host '      extracting...'
    Expand-Archive -Path $zip -DestinationPath $tmp -Force

    New-Item -ItemType Directory -Force -Path (Join-Path $SdkRoot 'cmdline-tools') | Out-Null
    if (Test-Path $ToolsDir) { Remove-Item -Recurse -Force $ToolsDir }
    Move-Item (Join-Path $tmp 'cmdline-tools') $ToolsDir
    Remove-Item -Recurse -Force $tmp

    if (-not (Test-Path $SdkManager)) { throw "sdkmanager.bat still missing at $SdkManager" }
    Write-Host '      done.' -ForegroundColor Green
}

# --- 2. licences -----------------------------------------------------------
Write-Host ''
Write-Host '[2/4] Android SDK licences.' -ForegroundColor Yellow
Write-Host '      Read them and answer y to the ones you accept.' -ForegroundColor Yellow
Write-Host ''
& $SdkManager "--sdk_root=$SdkRoot" --licenses

$licenceDir = Join-Path $SdkRoot 'licenses'
if (-not (Test-Path $licenceDir)) {
    throw 'No licences were accepted, so the SDK packages cannot be installed. Re-run this script to try again.'
}

# --- 3. packages -----------------------------------------------------------
Write-Host ''
Write-Host '[3/4] Installing platform-tools, android-36 and build-tools 36.0.0 (~1.5 GB)...' -ForegroundColor Yellow
& $SdkManager "--sdk_root=$SdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed with exit code $LASTEXITCODE" }

# --- 4. point Bubblewrap at it --------------------------------------------
Write-Host ''
Write-Host '[4/4] Writing Bubblewrap config...' -ForegroundColor Yellow
$cfgDir = Join-Path $env:USERPROFILE '.bubblewrap'
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfg = [ordered]@{
    jdkPath        = $JdkPath
    androidSdkPath = $SdkRoot
}
$cfg | ConvertTo-Json | Set-Content -Path (Join-Path $cfgDir 'config.json') -Encoding utf8

Write-Host ''
Write-Host '== Setup complete ==' -ForegroundColor Green
Write-Host "SDK      : $SdkRoot"
Write-Host "Licences : $licenceDir"
Write-Host ''
Write-Host 'Next: run build-apk.ps1 in this folder to produce the APK.' -ForegroundColor Cyan
