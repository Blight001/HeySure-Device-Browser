@echo off
setlocal EnableExtensions

rem Build an unpacked extension whose first-run server is the local test gateway.
call "%~dp0build.bat" --local
exit /b %ERRORLEVEL%
