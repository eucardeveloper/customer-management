@echo off
:: Customer Management restore. Usage:  .\restore.bat 20261019_180000
:: WARNING: replaces the three databases with the contents of the chosen backup.
setlocal
cd /d "%~dp0"
if "%~1"=="" (echo Usage: .\restore.bat YYYYMMDD_HHMMSS & goto :end)
set DIR=%~dp0backups\%~1
if not exist "%DIR%\auth_db.dump" (echo ERROR: backup not found: %DIR% & goto :end)
set /p OK=This replaces the current data with %~1. Type YES to continue: 
if /i not "%OK%"=="YES" (echo Cancelled. & goto :end)
docker compose stop auth-backend customer-backend order-backend api-gateway
docker compose up -d auth-db customer-db order-db
for %%P in (auth customer order) do (
  echo Restoring %%P_db ...
  docker exec -i %%P-db pg_restore -U postgres -d %%P_db --clean --if-exists --no-owner --exit-on-error < "%DIR%\%%P_db.dump"
  if errorlevel 1 (echo ERROR: restoring %%P_db failed - stopping. Check the message above before starting the services. & goto :end)
)
docker compose up -d
echo Restore finished. Wait about a minute, then open http://localhost:3000 and check the data.
:end
endlocal
