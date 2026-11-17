@echo off
rem Rejoins the AWSBedrockImplementation module package from its parts. Keep this file next to the .partNNN files and double-click it.
cd /d "%~dp0"
set "OUT=AWSBedrockImplementation_FULL_33MB.mpk"
set "EXPECTED=7191FB44D784157C421C2F73D4A0C12595B4D572C7FE83F56CCF09DF06DB1F09"
if exist "%OUT%" del "%OUT%"
echo Joining 35 parts...
copy /b "AWSBedrockImplementation_FULL_33MB.mpk.part001"+"AWSBedrockImplementation_FULL_33MB.mpk.part002"+"AWSBedrockImplementation_FULL_33MB.mpk.part003"+"AWSBedrockImplementation_FULL_33MB.mpk.part004"+"AWSBedrockImplementation_FULL_33MB.mpk.part005"+"AWSBedrockImplementation_FULL_33MB.mpk.part006"+"AWSBedrockImplementation_FULL_33MB.mpk.part007"+"AWSBedrockImplementation_FULL_33MB.mpk.part008"+"AWSBedrockImplementation_FULL_33MB.mpk.part009"+"AWSBedrockImplementation_FULL_33MB.mpk.part010"+"AWSBedrockImplementation_FULL_33MB.mpk.part011"+"AWSBedrockImplementation_FULL_33MB.mpk.part012"+"AWSBedrockImplementation_FULL_33MB.mpk.part013"+"AWSBedrockImplementation_FULL_33MB.mpk.part014"+"AWSBedrockImplementation_FULL_33MB.mpk.part015"+"AWSBedrockImplementation_FULL_33MB.mpk.part016"+"AWSBedrockImplementation_FULL_33MB.mpk.part017"+"AWSBedrockImplementation_FULL_33MB.mpk.part018"+"AWSBedrockImplementation_FULL_33MB.mpk.part019"+"AWSBedrockImplementation_FULL_33MB.mpk.part020"+"AWSBedrockImplementation_FULL_33MB.mpk.part021"+"AWSBedrockImplementation_FULL_33MB.mpk.part022"+"AWSBedrockImplementation_FULL_33MB.mpk.part023"+"AWSBedrockImplementation_FULL_33MB.mpk.part024"+"AWSBedrockImplementation_FULL_33MB.mpk.part025"+"AWSBedrockImplementation_FULL_33MB.mpk.part026"+"AWSBedrockImplementation_FULL_33MB.mpk.part027"+"AWSBedrockImplementation_FULL_33MB.mpk.part028"+"AWSBedrockImplementation_FULL_33MB.mpk.part029"+"AWSBedrockImplementation_FULL_33MB.mpk.part030"+"AWSBedrockImplementation_FULL_33MB.mpk.part031"+"AWSBedrockImplementation_FULL_33MB.mpk.part032"+"AWSBedrockImplementation_FULL_33MB.mpk.part033"+"AWSBedrockImplementation_FULL_33MB.mpk.part034"+"AWSBedrockImplementation_FULL_33MB.mpk.part035" "%OUT%" >nul
if errorlevel 1 ( echo FAILED: a part is missing or could not be read. & pause & exit /b 1 )
set "GOT="
for /f "skip=1 tokens=* delims=" %%H in ('certutil -hashfile "%OUT%" SHA256') do if not defined GOT set "GOT=%%H"
set "GOT=%GOT: =%"
if /i "%GOT%"=="%EXPECTED%" (
  echo OK - checksum matches. Created %OUT%
  echo Import it in Studio Pro: App ^> Import module package.
) else (
  echo CHECKSUM MISMATCH - a part is damaged or incomplete. Download the parts again.
  del "%OUT%"
)
pause
