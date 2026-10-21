# Customer Management backup + restore test, one command:  .\restore-test.ps1
# 1) backs up the three databases  2) writes a marker into one customer's last name
# 3) restores the backup  4) checks the marker is gone and the customer count is unchanged.
# Needs the stack to be running (docker compose up -d). The restore puts the changed row back.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Sql($q) { (docker exec customer-db psql -U postgres -d customer_db -t -A -c $q).Trim() }

Write-Host '1/5 backup ...'
cmd /c backup.bat | Out-Host
$ts = (Get-ChildItem backups | Sort-Object Name | Select-Object -Last 1).Name
foreach ($p in 'auth','customer','order') {
  $f = Join-Path $PSScriptRoot "backups\$ts\${p}_db.dump"
  if (-not (Test-Path $f) -or (Get-Item $f).Length -lt 1000) { throw "No valid backup at $f" }
}
$before = Sql 'SELECT count(*) FROM customer'

Write-Host '2/5 writing a marker into the first customer ...'
$null = Sql "UPDATE customer SET last_name = coalesce(last_name,'') || ' RESTORE-TEST-MARKER' WHERE id = (SELECT min(id) FROM customer)"
if ((Sql "SELECT count(*) FROM customer WHERE last_name LIKE '%RESTORE-TEST-MARKER%'") -ne '1') { throw 'Marker was not written' }

Write-Host '3/5 restoring the backup ...'
docker compose stop auth-backend customer-backend order-backend api-gateway | Out-Host
foreach ($p in 'auth','customer','order') {
  $f = Join-Path $PSScriptRoot "backups\$ts\${p}_db.dump"
  docker cp $f "${p}-db:/tmp/restore.dump" | Out-Host
  docker exec "${p}-db" pg_restore -U postgres -d "${p}_db" --clean --if-exists --no-owner /tmp/restore.dump 2>&1 | Out-Host
  Write-Host "${p}_db pg_restore exit code: $LASTEXITCODE"
  docker exec "${p}-db" rm -f /tmp/restore.dump
}
docker compose up -d | Out-Host

Write-Host '4/5 checking ...'
$marker = Sql "SELECT count(*) FROM customer WHERE last_name LIKE '%RESTORE-TEST-MARKER%'"
$after = Sql 'SELECT count(*) FROM customer'
if ($marker -eq '0' -and $before -eq $after) {
  Write-Host "PASS: backup $ts restored, marker gone, customer count $after = $before." -ForegroundColor Green
  Write-Host "5/5 Record this date in docs\BACKUP-RESTORE.md: $(Get-Date -Format yyyy-MM-dd)"
} else {
  Write-Host "FAIL: marker=$marker, customers before=$before after=$after" -ForegroundColor Red
  exit 1
}
