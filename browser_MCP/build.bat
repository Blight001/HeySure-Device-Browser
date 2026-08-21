@echo off
setlocal EnableExtensions

cd /d "%~dp0"

rem Release builds must never inherit a local-test flag from the parent shell.
set "HEYSURE_LOCAL_TEST=false"
set "HEYSURE_SERVER="
set "VITE_HEYSURE_SERVER="
set "HEYSURE_BUILD_MODE=remote"
set "HEYSURE_OUTPUT_DIR=dist"
if /i "%~1"=="--local" (
  set "HEYSURE_LOCAL_TEST=true"
  set "HEYSURE_BUILD_MODE=local"
  set "HEYSURE_OUTPUT_DIR=dist-local"
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [error] npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [setup] Installing extension dependencies...
  call npm install
  if errorlevel 1 goto fail
)

echo [build] Building browser extension (%HEYSURE_BUILD_MODE% default server)...
call npm run build
if errorlevel 1 goto fail

if not exist "%HEYSURE_OUTPUT_DIR%\manifest.json" (
  echo [error] %HEYSURE_OUTPUT_DIR%\manifest.json was not generated.
  goto fail
)

echo.
echo [done] Extension dist is ready:
echo %CD%\%HEYSURE_OUTPUT_DIR%
echo.
echo In Chrome or Edge, choose "Load unpacked" and select the folder above.
pause
exit /b 0

:fail
echo.
echo [failed] Browser extension build failed.
pause
exit /b 1
