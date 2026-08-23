@echo off
REM ============================================================
REM  Celestial Cutaway - local launcher
REM
REM  The app is plain HTML/CSS/JS and opens fine straight from
REM  the filesystem. This launcher exists for convenience and
REM  for the cases where a server is preferable (some browsers
REM  restrict clipboard and download behaviour on file://).
REM
REM  If mongoose.exe is present it serves the folder; otherwise
REM  index.html is opened directly.
REM ============================================================

cd /d "%~dp0"

if exist "mongoose.exe" (
    echo Starting local server...
    echo.
    echo   Open:  http://localhost:8080
    echo   Stop:  close this window
    echo.
    start "" http://localhost:8080
    mongoose.exe -listening_port 8080 -document_root .
) else (
    echo mongoose.exe not found - opening index.html directly.
    echo (That works fine; a server is optional.)
    echo.
    start "" "index.html"
)
