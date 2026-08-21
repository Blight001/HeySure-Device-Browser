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

if not exist node_modules call npm install
echo Building browser_MCP_win (%HEYSURE_BUILD_MODE% default server)...
call npm run build
if errorlevel 1 exit /b %errorlevel%
if not exist "%HEYSURE_OUTPUT_DIR%\manifest.json" (
  echo [error] %HEYSURE_OUTPUT_DIR%\manifest.json was not generated.
  exit /b 1
)
echo.
echo Build complete. Load this directory in Chrome: %CD%\%HEYSURE_OUTPUT_DIR%
