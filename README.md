# Customer Management System

A production-ready microservices architecture built with Spring Boot, featuring an AI-powered agent orchestration system for natural language data management.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌──────────────────────┐        ┌──────────────────────┐         │
│   │   Customer Frontend  │        │  AI Agent Frontend   │         │
│   │   Next.js  :3000     │        │  Next.js  :3001      │         │
│   └──────────┬───────────┘        └──────────┬───────────┘         │
└──────────────┼──────────────────────────────┼─────────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────┐    ┌──────────────────────────┐
│      API Gateway        │    │          n8n             │
│   Spring Cloud  :8080   │    │   Workflow Engine :5678  │
│   JWT GlobalFilter      │    │   AI Agent Orchestrator  │
└────────┬───────┬────────┘    └──────────────────────────┘
         │       │                          │
    ┌────┘       └────┐          ┌──────────┴──────────┐
    ▼                 ▼          ▼                      ▼
┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐
│Auth Service│  │  Customer  │  │   Customer   │  │    Order     │
│  :8083     │  │  Service   │  │   Backend    │  │   Backend    │
│ Spring Boot│  │   :8081    │  │    :8081     │  │    :8082     │
└─────┬──────┘  └─────┬──────┘  └──────────────┘  └──────────────┘
      │               │                │                  │
      ▼               ▼                └──── Kafka ───────┘
┌──────────┐   ┌──────────┐                  :9092
│ auth-db  │   │customer-db│         ┌──────────────┐
│ Postgres │   │ Postgres  │         │   order-db   │
│  :5436   │   │  :5434    │         │   Postgres   │
└──────────┘   └──────────┘         │    :5435     │
                                     └──────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4.0.7 |
| API Gateway | Spring Cloud Gateway, JWT |
| Databases | PostgreSQL 16 (per service) |
| Migrations | Flyway |
| Messaging | Apache Kafka + Zookeeper |
| AI Orchestration | n8n, OpenRouter GPT-4o Mini |
| Frontend | Next.js 15, Material UI |
| Testing | JUnit 5, Mockito, MockMvc |
| CI/CD | GitHub Actions |
| Containerization | Docker, Docker Compose |

---

## Services

### auth-service (port 8083)
Handles user registration, login and JWT token generation. Role-based access control with `USER` and `ADMIN` roles.

**Endpoints:**
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login and receive JWT token
- `GET /api/users` — List all users (ADMIN only)
- `DELETE /api/users/{id}` — Delete user (ADMIN only)
- `PUT /api/users/{id}/role` — Update user role (ADMIN only)

### customer-service (port 8081)
Full CRUD operations for customer management. Publishes Kafka events on customer creation.

**Endpoints:**
- `GET /api/customers` — List all customers
- `GET /api/customers/{id}` — Get customer by ID
- `POST /api/customers` — Create customer
- `PUT /api/customers/{id}` — Update customer
- `DELETE /api/customers/{id}` — Delete customer

### order-service (port 8082)
Full CRUD operations for order management. Publishes Kafka events on order creation.

**Endpoints:**
- `GET /api/orders` — List all orders
- `GET /api/orders/{id}` — Get order by ID
- `GET /api/orders/customer/{id}` — Get orders by customer
- `POST /api/orders` — Create order
- `PUT /api/orders/{id}` — Update order
- `DELETE /api/orders/{id}` — Delete order

### api-gateway (port 8080)
Spring Cloud Gateway with JWT GlobalFilter. All requests from the frontend pass through here. Validates JWT and routes to the appropriate service.

### AI Agent Orchestration (n8n + GPT-4o Mini)
Natural language interface for data operations. Three specialized agents:
- **Orchestrator** — Analyzes user intent, routes to correct agent
- **Customer-Agent** — Handles all customer API calls
- **Order-Agent** — Handles all order API calls

---

## Running Locally

**Prerequisites:** Docker Desktop, Java 21, Maven

```bash
# Clone the repository
git clone https://github.com/eucardeveloper/customer-management.git
cd customer-management

# Start all services
docker-compose up -d

# Access points
# Customer UI:     http://localhost:3000
# AI Agent UI:     http://localhost:3001
# API Gateway:     http://localhost:8080
# n8n Workflows:   http://localhost:5678
```

---

## Testing

63 unit and integration tests across all services, all passing.

```bash
# Run tests for each service
cd auth-service && mvn test
cd customer-service && mvn test
cd order-service && mvn test
```

**Test coverage:**
- `auth-service` — 24 tests (AuthController, UserController, AuthService, UserService)
- `customer-service` — 18 tests (CustomerController, CustomerService)
- `order-service` — 21 tests (OrderController, OrderService)

---

## CI/CD

GitHub Actions runs 3 parallel jobs on every push to `main`:

```
push to main
     │
     ├── auth-service tests    (JDK 21, Maven)
     ├── customer-service tests (JDK 21, Maven)
     └── order-service tests   (JDK 21, Maven)
```

---

## Database Migrations

Flyway manages schema versioning for all three databases.

| Service | Migration | Table |
|---|---|---|
| auth-service | V1__create_users_table.sql | users |
| customer-service | V1__create_customer_table.sql | customer |
| order-service | V1__create_orders_table.sql | orders |

---

## Project Structure

```
customer-management/
├── auth-service/           # JWT auth, user management
├── customer-service/       # Customer CRUD + Kafka producer
├── order-service/          # Order CRUD + Kafka producer
├── apigateway/             # Spring Cloud Gateway + JWT filter
├── frontend/
│   ├── customer-app/       # Next.js customer management UI
│   └── ai-agent-app/       # Next.js AI agent chat UI
├── .github/workflows/
│   └── ci.yml              # GitHub Actions CI
└── docker-compose.yml      # Full stack orchestration
```

---

## Author

**Enes Uçar** — eucardeveloper@gmail.com  
[GitHub](https://github.com/eucardeveloper)
