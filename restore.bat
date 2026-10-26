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
docker compose stop auth-backend customer-backend order-backend api-gateway n8n
docker compose up -d auth-db customer-db order-db
for %%P in (auth customer order) do (
  echo Restoring %%P_db ...
  docker exec -i %%P-db pg_restore -U postgres -d %%P_db --clean --if-exists --no-owner --exit-on-error < "%DIR%\%%P_db.dump"
  if errorlevel 1 (echo ERROR: restoring %%P_db failed - stopping. Check the message above before starting the services. & goto :end)
)
if exist "%DIR%\n8n_db.dump" (
  echo Restoring n8n_db ...
  docker exec -i customer-db pg_restore -U postgres -d n8n_db --clean --if-exists --no-owner --exit-on-error < "%DIR%\n8n_db.dump"
  if errorlevel 1 (echo ERROR: restoring n8n_db failed - stopping. & goto :end)
  :: pg_restore --no-owner makes postgres the owner; n8n connects as n8n_app and then cannot see its tables.
  docker exec customer-db psql -U postgres -d n8n_db -c "DO $$ DECLARE r record; BEGIN FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE format('ALTER TABLE public.%%I OWNER TO n8n_app', r.tablename); END LOOP; FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='public' LOOP EXECUTE format('ALTER SEQUENCE public.%%I OWNER TO n8n_app', r.sequencename); END LOOP; END $$;"
  if errorlevel 1 (echo ERROR: could not give n8n_app ownership of the n8n tables. & goto :end)
)
docker compose up -d
if exist "%DIR%\n8n-files.tgz" (
  echo Restoring the n8n encryption key and files ...
  docker exec -i n8n tar xzf - -C /home/node/.n8n < "%DIR%\n8n-files.tgz"
  docker compose restart n8n
)
echo Restore finished. Wait about a minute, then open http://localhost:3000 and check the data.
:end
endlocal
