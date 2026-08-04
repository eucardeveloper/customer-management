# Kundenverwaltung Microservices

Spring Boot 4.0 ile geliştirilmiş çok servisli müşteri ve sipariş yönetim sistemi. İki bağımsız mikroservis, API Gateway ve Apache Kafka ile gerçek zamanlı mesajlaşma içerir. Railway cloud üzerinde canlı olarak yayındadır.

---

## Canlı Demo

| Servis | URL |
|--------|-----|
| Kunden API (Swagger) | https://kundenverwaltung-production.up.railway.app/swagger-ui.html |
| Kunden API (JSON) | https://kundenverwaltung-production.up.railway.app/api/kunden |
| Bestellung API (JSON) | https://bestellungservice-production.up.railway.app/api/bestellungen |

---

## Mimari

```
Client
  │
  └── API Gateway (Spring Cloud Gateway :8080)
        ├── kundenservice (:8081)   → PostgreSQL (kunden_db)
        └── bestellungservice (:8082) → PostgreSQL (bestellung_db)
                │
                └── Apache Kafka (Producer/Consumer)
```

---

## Teknolojiler

- **Java 21** / **Spring Boot 4.0**
- **Spring Cloud Gateway** — API Gateway
- **Apache Kafka** — servisler arası mesajlaşma
- **PostgreSQL** — veri saklama
- **Spring Data JPA / Hibernate** — ORM
- **Springdoc OpenAPI (Swagger UI)** — API dokümantasyonu
- **Docker & Docker Compose** — konteynerizasyon
- **GitHub Actions** — CI/CD pipeline
- **Railway** — cloud deployment

---

## Servisler

### kundenservice (Port: 8081)

Müşteri CRUD işlemlerini yönetir.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /api/kunden | Tüm müşterileri listele |
| GET | /api/kunden/{id} | ID ile müşteri getir |
| POST | /api/kunden | Yeni müşteri ekle |
| PUT | /api/kunden/{id} | Müşteri güncelle |
| DELETE | /api/kunden/{id} | Müşteri sil |

### bestellungservice (Port: 8082)

Sipariş sorgulama işlemlerini yönetir. Kafka üzerinden kundenservice ile iletişim kurar.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /api/bestellungen | Tüm siparişleri listele |
| GET | /api/bestellungen/kunde/{kundeId} | Müşteriye göre siparişleri listele |

---

## Yerel Kurulum

### Gereksinimler

- Java 21
- Docker Desktop
- Maven

### Çalıştırma

```bash
# Repoyu klonla
git clone https://github.com/eucardeveloper/kundenverwaltung.git
cd kundenverwaltung

# Docker ile tüm bağımlılıkları başlat (PostgreSQL, Kafka, Zookeeper)
docker-compose up -d

# Servisleri ayrı terminallerde başlat
cd kundenservice && mvn spring-boot:run
cd bestellungservice && mvn spring-boot:run
```

Swagger UI: http://localhost:8081/swagger-ui.html

---

## CI/CD

Her `main` branch push'unda GitHub Actions otomatik olarak:
1. Maven ile build alır
2. Unit testleri çalıştırır
3. Railway üzerinde deploy eder

---

## Özellikler

- ✅ RESTful API tasarımı
- ✅ @ControllerAdvice ile merkezi hata yönetimi
- ✅ Bean Validation ile input doğrulama
- ✅ Kafka Producer/Consumer entegrasyonu
- ✅ Docker multi-stage build
- ✅ Swagger UI dokümantasyonu
- ✅ Railway cloud deployment
- ✅ GitHub Actions CI/CD
