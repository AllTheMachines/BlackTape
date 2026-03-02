@echo off
REM Sign a Tauri build using rsign2 (Tauri CLI signer hangs on Windows).
REM The key is read from ~/.tauri/blacktape.key (base64-encoded minisign secret key).
REM
REM Usage: sign-build.bat
REM Requires: rsign2 (cargo install rsign2)

setlocal

REM Find the latest NSIS installer
for /f "delims=" %%i in ('dir /b /od src-tauri\target\release\bundle\nsis\*.exe 2^>nul') do set INSTALLER=src-tauri\target\release\bundle\nsis\%%i
if "%INSTALLER%"=="" (
    echo No NSIS installer found. Run 'npx tauri build' first.
    exit /b 1
)

echo Signing: %INSTALLER%

REM Decode the base64 key to a temp file
set TMPKEY=%TEMP%\blacktape-raw.key
certutil -decode %USERPROFILE%\.tauri\blacktape.key %TMPKEY% >nul 2>&1
if errorlevel 1 (
    echo Failed to decode key from %USERPROFILE%\.tauri\blacktape.key
    exit /b 1
)

REM Sign with rsign2
rsign sign -s %TMPKEY% -W -x %INSTALLER%.sig %INSTALLER%
if errorlevel 1 (
    echo Signing failed
    del %TMPKEY% 2>nul
    exit /b 1
)

echo Signed: %INSTALLER%.sig
del %TMPKEY% 2>nul
echo Done.
