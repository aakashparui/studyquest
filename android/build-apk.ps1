# Builds the StudyQuest Android package (a Trusted Web Activity around the
# deployed PWA) with Bubblewrap.
#
# On the first run it creates a signing key. KEEP THAT KEY: Android only
# accepts an update if it is signed with the same one. The password is written
# to keystore.properties, which is gitignored — back both up together.
#
# Safe to re-run; the key is reused once it exists.

$ErrorActionPreference = 'Stop'

$Here       = Split-Path -Parent $MyInvocation.MyCommand.Path
$SdkRoot    = Join-Path $env:USERPROFILE 'android-sdk'
$JdkPath    = 'C:\Program Files\Java\jdk-17'
$Keytool    = Join-Path $JdkPath 'bin\keytool.exe'
$Keystore   = Join-Path $Here 'android.keystore'
$PropsFile  = Join-Path $Here 'keystore.properties'
$Alias      = 'studyquest'

Set-Location $Here

$env:JAVA_HOME   = $JdkPath
$env:ANDROID_HOME = $SdkRoot
# $Here goes on PATH because Bubblewrap shells out to a bare `gradlew.bat`,
# which cmd does not reliably resolve from the working directory.
$env:PATH = "$JdkPath\bin;$Here;$env:PATH"

if (-not (Test-Path (Join-Path $SdkRoot 'build-tools'))) {
    throw "Android build-tools not found in $SdkRoot. Run accept-licenses-and-install.ps1 first."
}

# --- 1. signing key --------------------------------------------------------
if (Test-Path $Keystore) {
    Write-Host '[1/3] Reusing the existing signing key.' -ForegroundColor DarkGray
    $password = (Get-Content $PropsFile | Where-Object { $_ -like 'password=*' }) -replace '^password=', ''
    if (-not $password) { throw "Found $Keystore but no password in $PropsFile." }
} else {
    Write-Host '[1/3] Creating a signing key...' -ForegroundColor Yellow
    $bytes = New-Object 'System.Byte[]' 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $password = [Convert]::ToBase64String($bytes).TrimEnd('=')

    & $Keytool -genkeypair -v -keystore $Keystore -alias $Alias `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $password -keypass $password `
        -dname 'CN=StudyQuest, O=StudyQuest, C=IN'
    if ($LASTEXITCODE -ne 0) { throw "keytool failed with exit code $LASTEXITCODE" }

    $props = @(
        '# Signing key for the StudyQuest APK. Keep this file and android.keystore',
        '# together, and out of version control. Losing them means future builds',
        '# cannot update an already-installed app.',
        "alias=$Alias",
        "password=$password"
    ) -join "`r`n"
    [System.IO.File]::WriteAllText($PropsFile, $props, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "      key written to $Keystore (password in keystore.properties)" -ForegroundColor Green
}

$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $password
$env:BUBBLEWRAP_KEY_PASSWORD      = $password

# --- 2. generate the Android project --------------------------------------
Write-Host ''
Write-Host '[2/3] Generating the Android project from twa-manifest.json...' -ForegroundColor Yellow

# A live Gradle daemon keeps file handles on app\build, and this project sits
# in a OneDrive folder, so regeneration hits EBUSY unless both are settled.
if (Test-Path (Join-Path $Here 'gradlew.bat')) {
    & (Join-Path $Here 'gradlew.bat') --stop 2>&1 | Out-Null
}
$buildDir = Join-Path $Here 'app\build'
if (Test-Path $buildDir) {
    Start-Sleep -Seconds 2
    Remove-Item -Recurse -Force $buildDir -ErrorAction SilentlyContinue
}

& bubblewrap update --skipVersionUpgrade
if ($LASTEXITCODE -ne 0) { throw "bubblewrap update failed with exit code $LASTEXITCODE" }

# --- 3. build --------------------------------------------------------------
Write-Host ''
Write-Host '[3/3] Building the APK...' -ForegroundColor Yellow

# Bubblewrap's own signing step shells out to an unquoted java path, which
# breaks on "C:\Program Files". Let it build and align, then sign here.
& bubblewrap build --skipPwaValidation
$bubblewrapExit = $LASTEXITCODE

$aligned = Join-Path $Here 'app-release-unsigned-aligned.apk'
$signed  = Join-Path $Here 'StudyQuest.apk'

if (-not (Test-Path $aligned)) {
    throw "bubblewrap build failed with exit code $bubblewrapExit and produced no aligned APK."
}

$buildTools = Get-ChildItem (Join-Path $SdkRoot 'build-tools') |
    Sort-Object Name -Descending | Select-Object -First 1
$apksigner = Join-Path $buildTools.FullName 'lib\apksigner.jar'
$java = Join-Path $JdkPath 'bin\java.exe'

Write-Host '      signing...' -ForegroundColor Yellow
& $java '-jar' $apksigner sign `
    '--ks' $Keystore `
    '--ks-key-alias' $Alias `
    "--ks-pass" "pass:$password" `
    "--key-pass" "pass:$password" `
    '--out' $signed $aligned
if ($LASTEXITCODE -ne 0) { throw "apksigner failed with exit code $LASTEXITCODE" }

Write-Host '      verifying...' -ForegroundColor Yellow
& $java '-jar' $apksigner verify --print-certs $signed
if ($LASTEXITCODE -ne 0) { throw "apksigner verify failed with exit code $LASTEXITCODE" }

Remove-Item $aligned -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '== Build complete ==' -ForegroundColor Green
Get-ChildItem $Here -Filter '*.apk' | ForEach-Object {
    Write-Host ('{0}  {1:N2} MB' -f $_.Name, ($_.Length / 1MB))
}
if (Test-Path (Join-Path $Here 'assetlinks.json')) {
    Write-Host ''
    Write-Host 'assetlinks.json was generated — publish it at:' -ForegroundColor Cyan
    Write-Host '  https://aakashparui.github.io/.well-known/assetlinks.json'
}
