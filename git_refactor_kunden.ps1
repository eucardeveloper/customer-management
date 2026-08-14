# git_refactor_kunden.ps1
# Bu script eski Almanca package klasorlerini git'ten kaldirir,
# frontend klasorunu rename eder ve degisiklikleri commit + push eder.
# Calistirmadan once: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$root = "C:\Users\enes_\OneDrive\Desktop\kundenverwaltung"
Set-Location $root

Write-Host "=== Eski kundenservice package klasoru git'ten kaldiriliyor ===" -ForegroundColor Cyan
git rm -r --cached kundenservice/src/main/java/com/enesucar/kundenservice 2>$null
if (Test-Path "kundenservice\src\main\java\com\enesucar\kundenservice") {
    Remove-Item -Recurse -Force "kundenservice\src\main\java\com\enesucar\kundenservice"
    Write-Host "Fiziksel olarak da silindi." -ForegroundColor Yellow
}

Write-Host "=== Eski bestellungservice package klasoru git'ten kaldiriliyor ===" -ForegroundColor Cyan
git rm -r --cached bestellungservice/src/main/java/com/enesucar/bestellungservice 2>$null
if (Test-Path "bestellungservice\src\main\java\com\enesucar\bestellungservice") {
    Remove-Item -Recurse -Force "bestellungservice\src\main\java\com\enesucar\bestellungservice"
    Write-Host "Fiziksel olarak da silindi." -ForegroundColor Yellow
}

Write-Host "=== frontend/kunden-app -> frontend/customer-app rename ediliyor ===" -ForegroundColor Cyan
if (Test-Path "frontend\kunden-app") {
    git mv frontend/kunden-app frontend/customer-app
    Write-Host "Rename tamamlandi." -ForegroundColor Green
} else {
    Write-Host "frontend/kunden-app bulunamadi, atlandi." -ForegroundColor Yellow
}

Write-Host "=== Yeni dosyalar ve degisiklikler staging'e ekleniyor ===" -ForegroundColor Cyan
git add .

Write-Host "=== Commit olusturuluyor ===" -ForegroundColor Cyan
git commit -m "refactor: rename German identifiers to English

- kundenservice package -> customerservice
- bestellungservice package -> orderservice
- KundenserviceApplication -> CustomerServiceApplication
- BestellungserviceApplication -> OrderServiceApplication
- Kunde -> Customer, Bestellung -> Order (entity/DTO/repo/service/controller)
- BestellungConsumer -> OrderConsumer, BestellungProducer -> OrderProducer
- Table name: kunde -> customer, bestellung -> orders
- pom.xml artifactId: kundenservice -> customer-service, bestellungservice -> order-service
- application.properties: spring.application.name updated
- kafka consumer group-id: kunden-group -> customer-group
- docker-compose: kunden-db -> customer-db, bestellung-db -> order-db
- frontend/kunden-app -> frontend/customer-app
- API URLs preserved: /api/kunden and /api/bestellungen unchanged"

Write-Host "=== Remote'a push ediliyor ===" -ForegroundColor Cyan
git push

Write-Host "=== Refactoring tamamlandi! ===" -ForegroundColor Green
