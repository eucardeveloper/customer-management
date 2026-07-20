# Kundenverwaltung - Microservices Project

A microservices-based customer and order management system built with Spring Boot, Apache Kafka, and Docker.

## Architecture

Client → API Gateway (8080) → Kunden-Service (8081)
→ Bestellung-Service (8082)

Bestellung-Service → Kafka → Kunden-Service
## Services

### Kunden-Service (Port: 8081)
- Customer management (CRUD)
- Listens to Kafka events from Bestellung-Service

### Bestellung-Service (Port: 8082)
- Order management (CRUD)
- Publishes events to Kafka when an order is created

### API Gateway (Port: 8080)
- Single entry point for all requests
- Routes requests to the appropriate service

## Technologies
- Java 21
- Spring Boot 4.0.7
- Spring Cloud Gateway
- Apache Kafka
- PostgreSQL
- Docker & Docker Compose
- Lombok
- Swagger / OpenAPI

## Running the Project

### Prerequisites
- Docker Desktop
- Java 21
- Maven

### Start Kafka and Databases
```bash
docker-compose up -d
```

### Start Services
Run each service separately in IntelliJ:
1. KundenServiceApplication (port 8081)
2. BestellungServiceApplication (port 8082)
3. ApigatewayApplication (port 8080)

## API Endpoints

### Kunden-Service
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/kunden | Add customer |
| GET | /api/kunden | List all customers |
| GET | /api/kunden/{id} | Get customer by ID |
| PUT | /api/kunden/{id} | Update customer |
| DELETE | /api/kunden/{id} | Delete customer |

### Bestellung-Service
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/bestellungen | Create order |
| GET | /api/bestellungen | List all orders |
| GET | /api/bestellungen/{id} | Get order by ID |
| GET | /api/bestellungen/kunde/{kundeId} | Get orders by customer |
| DELETE | /api/bestellungen/{id} | Delete order |

## Swagger UI
- Kunden-Service: http://localhost:8081/swagger-ui/index.html
- Bestellung-Service: http://localhost:8082/swagger-ui/index.html

## Author
Enes Uçar - eucardeveloper@gmail.com