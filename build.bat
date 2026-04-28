@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Cleaning previous build artifacts...
if exist "build" rmdir /s /q "build"
if exist "dist\YTBmonitor.exe" del /q "dist\YTBmonitor.exe"

echo Installing build deps...
python -m pip install -q -r requirements.txt pyinstaller

echo Building YTBmonitor.exe ...
pyinstaller --noconfirm --clean --onefile --windowed --name YTBmonitor ^
  --icon "icon.ico" ^
  --add-data "index.html;." ^
  --add-data "style.css;." ^
  --add-data "app.js;." ^
  --add-data "main.js;." ^
  --add-data "state-store.js;." ^
  --add-data "dom-utils.js;." ^
  --add-data "api-client.js;." ^
  --add-data "player-manager.js;." ^
  --add-data "ui-controller.js;." ^
  --add-data "icon.ico;." ^
  --collect-all yt_dlp ^
  --collect-all webview ^
  --hidden-import=config_manager ^
  --hidden-import=avatar_cache ^
  --hidden-import=scanner ^
  --hidden-import=api ^
  --hidden-import=uvicorn.protocols.http.auto ^
  --hidden-import=uvicorn.protocols.websockets.auto ^
  --hidden-import=uvicorn.loops.auto ^
  --hidden-import=uvicorn.logging ^
  main.py

if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo.
echo Done: dist\YTBmonitor.exe
echo You can now run build_installer.bat to create setup.exe with uninstall support.
exit /b 0
