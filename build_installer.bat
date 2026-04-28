@echo off
chcp 65001 >nul
cd /d "%~dp0"

call build.bat
if errorlevel 1 exit /b 1

set "ISCC_CMD="

for %%I in (iscc.exe iscc) do (
  where %%I >nul 2>nul
  if not errorlevel 1 (
    set "ISCC_CMD=%%I"
    goto :build
  )
)

for %%P in (
  "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
  "%ProgramFiles%\Inno Setup 6\ISCC.exe"
  "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
) do (
  if exist %%~P (
    set "ISCC_CMD=%%~P"
    goto :build
  )
)

echo Inno Setup compiler (ISCC.exe) was not found.
echo Please install Inno Setup 6, or add ISCC.exe to PATH, then rerun this script.
echo Expected common paths:
echo   %ProgramFiles(x86)%\Inno Setup 6\ISCC.exe
echo   %ProgramFiles%\Inno Setup 6\ISCC.exe
echo   %LocalAppData%\Programs\Inno Setup 6\ISCC.exe
exit /b 1

:build
echo Building installer with Inno Setup...
set "APP_DEFAULT_DIR={autopf}\YTBmonitor"
if not "%~1"=="" set "APP_DEFAULT_DIR=%~1"
echo Installer default directory: %APP_DEFAULT_DIR%
"%ISCC_CMD%" /DMyAppDefaultDir="%APP_DEFAULT_DIR%" installer.iss
if errorlevel 1 (
  echo Installer build failed.
  exit /b 1
)

echo.
echo Done: dist\YTBmonitor-Setup.exe
exit /b 0
