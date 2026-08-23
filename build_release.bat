@echo off
REM ============================================================
REM  Celestial Cutaway - release packager
REM
REM  This COPIES files into dist\. Nothing is compiled, bundled,
REM  minified or transpiled - the .js files that ship are the
REM  same ones in the repo. That is deliberate: the project is
REM  meant to stay open and readable.
REM
REM  Output: dist\ - ready to zip for itch.io, or to open
REM  directly by double-clicking dist\index.html
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo  Celestial Cutaway - building release
echo  ------------------------------------

if exist "dist" (
    echo  Clearing previous dist...
    rmdir /s /q "dist"
)
mkdir "dist"

echo  Copying app files...
copy /y "index.html"  "dist\"  >nul || goto :copyfail
copy /y "style.css"   "dist\"  >nul || goto :copyfail
if exist "README.md" copy /y "README.md" "dist\" >nul

REM Source folders. Trailing backslash on the destination tells xcopy the
REM target is a directory rather than prompting "(F)ile or (D)irectory?",
REM which is what makes these silently fail when run non-interactively.
for %%D in (js lib assets) do (
    if exist "%%D\" (
        echo    %%D\
        xcopy "%%D\*" "dist\%%D\" /e /i /q /y >nul || goto :copyfail
    )
)

REM Optional: include the launcher and server if present.
if exist "launch_app_win.bat" copy /y "launch_app_win.bat" "dist\" >nul
if exist "mongoose.exe"       copy /y "mongoose.exe"       "dist\" >nul

REM Fail loudly if the app's own scripts never made it in.
if not exist "dist\js" (
    echo.
    echo  WARNING: no js\ folder was copied. The release will not run.
    echo.
)

REM Deliberately NOT copied: docs\ tools\ test\ node_modules\
REM .git\ .gitignore package.json CLAUDE.md *.md working notes

echo.
echo  Done. Release is in:  dist\
echo.
echo  - Double-click dist\index.html to run it
echo  - Zip the dist folder to upload to itch.io
echo.

REM Report file count and size so bloat is visible immediately.
REM Uses a temp script file rather than an inline -command: pipes inside an
REM inline command need escaping that breaks depending on how the .bat itself
REM was invoked, which is a needless source of fragility.
> "%TEMP%\cc_size.ps1" echo $f = Get-ChildItem 'dist' -Recurse -File
>> "%TEMP%\cc_size.ps1" echo $kb = ($f ^| Measure-Object Length -Sum).Sum / 1KB
>> "%TEMP%\cc_size.ps1" echo '{0} files, {1:N0} KB' -f $f.Count, $kb
for /f "usebackq delims=" %%A in (`powershell -nologo -noprofile -file "%TEMP%\cc_size.ps1"`) do (
    echo  Package: %%A
)
del "%TEMP%\cc_size.ps1" >nul 2>&1
echo.

endlocal
pause
goto :eof

:copyfail
echo.
echo  BUILD FAILED - a copy step did not succeed.
echo.
endlocal
pause
exit /b 1
