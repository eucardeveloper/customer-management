@echo off
:: Customer Management backup: dumps the three databases into backups\<timestamp>\ (custom format).
:: Run from this folder while the stack is up:  .\backup.bat   (code is backed up by git)
setlocal
cd /d "%~dp0"
for /f %%i in ('powershell -nologo -command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set DIR=%~dp0backups\%TS%
mkdir "%DIR%"
for %%P in (auth customer order) do (
  echo Backing up %%P_db ...
  docker exec %%P-db pg_dump -U postgres -Fc %%P_db > "%DIR%\%%P_db.dump"
  if errorlevel 1 (echo ERROR: %%P dump failed. Is the stack running? & goto :end)
  for %%F in ("%DIR%\%%P_db.dump") do if %%~zF LSS 1000 (echo ERROR: %%P dump is suspiciously small & goto :end)
)
echo Backing up n8n_db ...
docker exec customer-db pg_dump -U postgres -Fc n8n_db > "%DIR%\n8n_db.dump"
if errorlevel 1 (echo ERROR: n8n dump failed. & goto :end)
for %%F in ("%DIR%\n8n_db.dump") do if %%~zF LSS 1000 (echo ERROR: n8n dump is suspiciously small & goto :end)
echo Backing up the n8n encryption key and files ...
docker exec n8n tar czf - -C /home/node/.n8n . > "%DIR%\n8n-files.tgz"
if errorlevel 1 (echo ERROR: n8n files backup failed. Is the n8n container running? & goto :end)
echo OK: %DIR%
echo Test it with:  .\restore.bat %TS%   (replaces the current data)
:end
endlocal
