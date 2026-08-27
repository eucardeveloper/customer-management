# Customer Management System

A full-stack, production-ready CRM built with **Spring Boot**, **Next.js 15**, **Kafka**, and **PostgreSQL** — designed to demonstrate enterprise-level architecture, real-time event streaming, role-based access control, and AI-assisted analytics in a single cohesive project.

---

## Live Demo

> **URL:** _Add your Railway URL here after deploy_
>
> | Account | Username | Password | Access |
> |---------|----------|----------|--------|
> | Administrator | `admin` | `admin123` | Full access — revenue, analytics, user management, all CRUD |
> | Standard User | `enes` | `enes1234` | Read-only — orders & customers visible, no financial data |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                          │
│              Next.js 15 · React 19 · MUI v9 · TypeScript         │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST (JWT Bearer)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     ORDER BACKEND (Spring Boot 3)                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Auth API   │  │ Customer API │  │      Order API         │  │
│  │  /api/auth  │  │/api/customers│  │     /api/orders        │  │
│  └─────────────┘  └──────────────┘  └───────────┬────────────┘  │
│                                                  │ Kafka Produce │
└──────────────────────────────────────────────────┼───────────────┘
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                        KAFKA (Apache)                            │
│                   Topic: order-events                            │
│   Decouples order creation from downstream processing            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Kafka Consume
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│               NOTIFICATION / ANALYTICS SERVICE                   │
│    Listens to order-events → updates aggregate stats             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                                 │
│        customers · orders · users · order_events                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Frontend | Next.js | 15 (App Router) | SSR, file-based routing, React Server Components |
| UI | Material UI | v9 | Production-grade component library with theme system |
| Language | TypeScript | 5 | Type safety across entire frontend |
| Backend | Spring Boot | 3.x | Battle-tested Java framework, auto-configuration |
| Security | Spring Security + JWT | — | Stateless auth, role-based access |
| Message Broker | Apache Kafka | — | Event-driven order processing (see justification below) |
| Database | PostgreSQL | 15 | Relational integrity for customer/order data |
| AI | OpenRouter API (GPT-4o) | — | CRM assistant with role-aware context injection |
| Container | Docker + Docker Compose | — | Reproducible local + cloud environment |
| Cloud | Railway | — | Zero-config PostgreSQL + Kafka hosting |

---

## Why Kafka?

A common question: *"Why use Kafka for a CRM app — isn't REST enough?"*

**The design decision is intentional and justified:**

1. **Decoupling** — Order creation (write) is separated from downstream processing (analytics, notifications, email). The Order API returns instantly; consumers process at their own pace.

2. **Resilience** — If the analytics service goes down, orders are not lost. Kafka retains events; the consumer catches up when it restarts. A direct REST call would fail and lose data.

3. **Scalability** — At high order volume, multiple consumer instances can read from the same topic in parallel (consumer groups), horizontally scaling processing without touching the producer.

4. **Audit Trail** — Kafka's immutable log gives a complete history of every order event — far easier to replay than reconstructing from a mutable database.

5. **Real-world relevance** — E-commerce, fintech, and logistics systems (Amazon, Uber, LinkedIn) all use event streaming for exactly this pattern. Demonstrating it in a portfolio project shows understanding of production-grade system design.

**In short:** REST is used for synchronous client→server calls. Kafka is used for asynchronous server→server event propagation. Both are correct for their purpose.

---

## Project Structure

```
customer-management/
├── order-backend/          # Spring Boot 3 — REST API + Kafka producer
│   ├── src/main/java/
│   │   ├── controller/     # AuthController, CustomerController, OrderController
│   │   ├── service/        # Business logic
│   │   ├── model/          # JPA entities (Customer, Order, User)
│   │   ├── security/       # JWT filter, UserDetailsService
│   │   └── kafka/          # OrderEventProducer, OrderEventConsumer
│   └── docker/
├── customer-app/           # Next.js 15 frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Main dashboard (all tabs)
│       │   ├── login/page.tsx  # Login page
│       │   └── register/page.tsx
│       ├── lib/
│       │   └── auth.ts         # JWT storage helpers
│       └── middleware.ts       # Route protection
├── seed-data.js            # Demo data generator (20 customers, 180 orders)
└── docker-compose.yml      # PostgreSQL + Kafka + Zookeeper + Backend + Frontend
```

---

## Features

### Role-Based Access Control

| Feature | ADMIN | USER |
|---------|-------|------|
| View customers & orders | ✅ | ✅ |
| Add / Edit / Delete customers | ✅ | ❌ |
| Add / Edit / Delete orders | ✅ | ❌ |
| View revenue & pricing | ✅ | ❌ |
| Revenue analytics charts | ✅ | ❌ |
| Top Products by Revenue | ✅ | ❌ |
| User Management tab | ✅ | ❌ |
| AI: revenue questions | ✅ | ❌ |
| AI: order & customer questions | ✅ | ✅ |

### Dashboard
- Real-time KPI cards: Total Customers, Total Orders, Total Revenue (admin), Fulfillment Rate
- Trend badges calculated from last 30 days vs prior 30 days
- Sparkline chart with real monthly order data
- Top Customers table and Recent Orders feed

### Analytics
- Revenue Overview (monthly bar chart) — admin only
- Order Status Distribution (pie chart)
- Customer Type breakdown
- Top Products by Revenue — admin only

### AI Agent
- Powered by GPT-4o via OpenRouter
- Role-aware: USER role never receives financial data in context
- Quick question chips adapt to role
- Full order history + customer data injected into system prompt

---

## Local Development

### Prerequisites
- Docker Desktop
- Node.js 20+

### Start with Docker

```bash
git clone https://github.com/your-username/customer-management.git
cd customer-management

# Set your OpenRouter API key
echo "NEXT_PUBLIC_OPENROUTER_KEY=sk-or-v1-..." > customer-app/.env.local

docker-compose build customer-frontend
docker-compose up -d
```

Services:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Kafka:** localhost:9092
- **PostgreSQL:** localhost:5432

### Seed Demo Data

```bash
node seed-data.js --api http://localhost:8080
```

Creates 20 customers and 180 orders spread across 12 months — giving all charts real, meaningful data.

### Frontend Dev Server (hot-reload)

```bash
cd customer-app
npm install
npm run dev   # http://localhost:3003
```

---

## Environment Variables

### Frontend — `customer-app/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_OPENROUTER_KEY=sk-or-v1-your-key-here
```

### Railway Dashboard (production)

Set these in your Railway service environment settings:
- `NEXT_PUBLIC_OPENROUTER_KEY`
- `NEXT_PUBLIC_API_URL` → your backend Railway URL

> ⚠️ **Never commit `.env` files or application secrets to git.**

---

## Railway Deployment

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin
4. Add a **Kafka** plugin (or use Upstash Kafka)
5. Set environment variables in Railway dashboard (see above)
6. Railway auto-detects Dockerfile and deploys — done

---

## API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | `{username, password}` | Returns JWT token |
| POST | `/api/auth/register` | `{username, email, password}` | Creates USER-role account |

### Customers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/customers` | Bearer | List all customers |
| POST | `/api/customers` | Bearer (ADMIN) | Create customer |
| PUT | `/api/customers/{id}` | Bearer (ADMIN) | Update customer |
| DELETE | `/api/customers/{id}` | Bearer (ADMIN) | Delete customer |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Bearer (ADMIN) | List all users |
| PATCH | `/api/users/{id}/role` | Bearer (ADMIN) | Update user role |
| DELETE | `/api/users/{id}` | Bearer (ADMIN) | Delete user |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | Bearer | List all orders |
| POST | `/api/orders` | Bearer (ADMIN) | Create order (triggers Kafka event) |
| PUT | `/api/orders/{id}` | Bearer (ADMIN) | Update order |
| DELETE | `/api/orders/{id}` | Bearer (ADMIN) | Delete order |

---

## Security Notes

- JWT tokens stored in `localStorage` (acceptable for demo; production would use `httpOnly` cookies)
- Passwords hashed with BCrypt
- Role enforced server-side on every API call — client-side hiding is UX, not a security boundary
- Financial data excluded from AI context for USER role at the server/prompt level
- Price stored as `NUMERIC(19,10)` in PostgreSQL — custom Jackson `BigDecimalSerializer` strips trailing zeros and prevents scientific notation, ensuring exact decimal fidelity from DB to Excel export

---

## License

MIT — free to use for portfolio, interviews, and personal projects.
