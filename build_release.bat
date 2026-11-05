@echo off
REM ============================================================
REM  Celestial Cutaway - release packager
REM
REM  This COPIES files into dist\ and zips them. Nothing is
REM  compiled, bundled, minified or transpiled - the .js files
REM  that ship are the same ones in the repo. That is deliberate:
REM  the project is meant to stay open and readable.
REM
REM  Output:
REM    dist\celestial-cutaway\               the release folder
REM    dist\celestial-cutaway-v4.0.zip       browser upload
REM    dist\celestial-cutaway-v4.0-offline.zip  paid download
REM  The two zips are identical.
REM ============================================================

setlocal
cd /d "%~dp0"

set "NAME=celestial-cutaway"
set "VERSION=4.0"
set "ROOT=dist\%NAME%"

echo.
echo  Celestial Cutaway v%VERSION% - building release
echo  ------------------------------------

if exist "dist" (
    echo  Clearing previous dist...
    rmdir /s /q "dist"
)
mkdir "%ROOT%"

echo  Copying app files...
for %%F in (index.html style.css favicon.ico README.md guide.md LICENSE) do (
    copy /y "%%F" "%ROOT%\" >nul || goto :copyfail
)

REM Trailing backslash on the destination tells xcopy the target is a directory
REM rather than prompting "(F)ile or (D)irectory?", which is what makes these
REM silently fail when run non-interactively.
echo    js\
xcopy "js\*" "%ROOT%\js\" /e /i /q /y >nul || goto :copyfail
echo    lib\
xcopy "lib\*.js" "%ROOT%\lib\" /i /q /y >nul || goto :copyfail
echo    promo\
xcopy "promo\*" "%ROOT%\promo\" /e /i /q /y >nul || goto :copyfail

REM Deliberately NOT copied: promo.md (internal) docs\ test\ node_modules\
REM .git\ .gitignore package.json CLAUDE.md launch_app_win.bat lib\README.md

REM Writes each entry by hand, because Compress-Archive and ZipFile's
REM CreateFromDirectory both put backslashes in the entry names under Windows
REM PowerShell, and a Linux host such as itch.io does not read those as folders.
REM Uses a temp script file rather than an inline -command: pipes inside an
REM inline command need escaping that breaks depending on how the .bat itself
REM was invoked, which is a needless source of fragility.
echo  Zipping...
set "PS1=%TEMP%\cc_zip.ps1"
> "%PS1%" echo $ErrorActionPreference = 'Stop'
>> "%PS1%" echo Add-Type -AssemblyName System.IO.Compression.FileSystem
>> "%PS1%" echo $base = (Resolve-Path 'dist').Path
>> "%PS1%" echo $files = Get-ChildItem (Join-Path $base '%NAME%') -Recurse -File ^| Sort-Object FullName
>> "%PS1%" echo $path = Join-Path $base '%NAME%-v%VERSION%.zip'
>> "%PS1%" echo $zip = [IO.Compression.ZipFile]::Open($path, 'Create')
>> "%PS1%" echo foreach ($f in $files) {
>> "%PS1%" echo     $entry = $f.FullName.Substring($base.Length + 1).Replace('\', '/')
>> "%PS1%" echo     [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entry, 'Optimal')
>> "%PS1%" echo }
>> "%PS1%" echo $zip.Dispose()
>> "%PS1%" echo Copy-Item $path (Join-Path $base '%NAME%-v%VERSION%-offline.zip')
REM Report file count and size so bloat is visible immediately.
>> "%PS1%" echo $mb = ($files ^| Measure-Object Length -Sum).Sum / 1MB
>> "%PS1%" echo '  Package: {0} files, {1:N1} MB unzipped, {2:N1} MB zipped' -f $files.Count, $mb, ((Get-Item $path).Length / 1MB)
powershell -nologo -noprofile -executionpolicy bypass -file "%PS1%"
if errorlevel 1 goto :zipfail
del "%PS1%" >nul 2>&1

echo.
echo  Done. In dist\:
echo    %NAME%-v%VERSION%.zip          browser upload
echo    %NAME%-v%VERSION%-offline.zip  paid download
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

:zipfail
echo.
echo  BUILD FAILED - the zip step did not succeed.
echo.
endlocal
pause
exit /b 1
