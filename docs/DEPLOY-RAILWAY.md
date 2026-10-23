# Hosted demo on Railway (runbook)

This repository is built for `docker compose`. A hosted demo is a **separate deployment of the same images**; this page is the checklist for it. Nothing in the repository deploys itself, and a demo link is only worth putting on a CV while it is up and reflects the current `main`.

> **Status (October 2026):** no hosted demo is running. The services are stopped and auto-deploy is off; this page documents how to bring one up. The reference setup is `docker compose`.

## 1. Services

One Railway service per row, each from its own folder (Dockerfile):

| Service | Folder | Needs |
|---|---|---|
| auth-backend | `auth-service` | PostgreSQL |
| customer-backend | `customer-service` | PostgreSQL, Kafka |
| order-backend | `order-service` | PostgreSQL, Kafka |
| api-gateway | `apigateway` | the three backends |
| customer-frontend | `frontend/customer-app` | gateway |
| ai-agent-frontend (optional) | `frontend/ai-agent-app` | an n8n webhook |

Plus three PostgreSQL databases and one Kafka broker. Kafka is the heaviest part: a managed Kafka (or Redpanda) service is simpler than running your own Kafka.

## 2. Variables

Use Railway private networking (`<service>.railway.internal`) between backends. Only the frontend and (for API clients) the gateway need a public domain.

| Service | Variables |
|---|---|
| auth-backend | `AUTH_BOOTSTRAP_ADMIN_PASSWORD` (min. 12 chars; keep it private), `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION=1800000`, `AUTH_COOKIE_SECURE=true` |
| customer-backend | `GATEWAY_SHARED_SECRET`, `PORT=8081`, `DATABASE_URL` (JDBC form), `PGUSER`, `PGPASSWORD`, `KAFKACLUSTER_BROKERS`, `ORDER_SERVICE_URL=http://order-backend.railway.internal:8082` |
| order-backend | `GATEWAY_SHARED_SECRET`, `PORT=8082`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `KAFKA_URL`, `CUSTOMER_SERVICE_URL=http://customer-backend.railway.internal:8081` |
| api-gateway | `GATEWAY_SHARED_SECRET` (same value as the two backends), `JWT_SECRET` (same value as auth), `AUTH_SERVICE_URL`, `CUSTOMER_SERVICE_URL`, `ORDER_SERVICE_URL`, `CORS_ALLOWED_ORIGINS=https://<frontend domain>` |
| customer-frontend | build args `NEXT_PUBLIC_API_URL=` (empty), `API_PROXY_TARGET=http://api-gateway.railway.internal:8080`, `NEXT_PUBLIC_SHOW_DEMO_LOGIN=true` and `NEXT_PUBLIC_DEMO_ADMIN_HINT=false`; runtime `API_INTERNAL_URL` (same URL), `OPENROUTER_API_KEY` |
| ai-agent-frontend | `N8N_WEBHOOK_URL` |

Database users: the compose setup runs each service as a restricted role (`auth_app`, `customer_app`, `order_app`: rows only) and migrates the schema as the owner. On Railway the same split needs two sets of credentials per service: set `SPRING_DATASOURCE_*` / `PGUSER` / `PGPASSWORD` to a role that has only SELECT, INSERT, UPDATE and DELETE (see `docker/db/10-app-role.sh`), and `SPRING_FLYWAY_USER` / `SPRING_FLYWAY_PASSWORD` to the database owner. Without the two Flyway variables the migrations run as the runtime user and need schema rights.

`JWT_SECRET` and `GATEWAY_SHARED_SECRET`: a fresh `openssl rand -hex 32` each, never the local ones. The customer and order services only trust the identity headers when the gateway's secret comes with them, so even a reachable backend cannot be talked to with made-up identities.

## 3. Why the frontend proxies `/api`

The session is an HttpOnly, `SameSite=Strict` cookie. If the frontend and the gateway sit on two different `*.up.railway.app` hostnames, the browser treats them as different sites and **does not send the cookie** to the gateway, so every request after login would answer 401. With `NEXT_PUBLIC_API_URL` empty and `API_PROXY_TARGET` set at build time, the browser only talks to the frontend's own origin and Next.js forwards `/api/auth|customers|orders|users/*` to the gateway. Add the frontend's public URL to `CORS_ALLOWED_ORIGINS` (the gateway also uses that list for its Origin check on cookie-authenticated writes).

Locally nothing changes: without those two settings the app talks to `http://localhost:8080` as before.

## 4. Before the demo is public

- **Visitors get a read-only way in.** The hosted login box shows only the seeded `user1 / user123` account (`NEXT_PUBLIC_SHOW_DEMO_LOGIN=true`, `NEXT_PUBLIC_DEMO_ADMIN_HINT=false`). The `USER` role cannot write anything (every POST/PUT/PATCH/DELETE is `ADMIN`-only) and does not see prices or revenue, so a published password for it cannot damage the data.
- **The admin password is never published.** `admin / admin123` is in this README for the local demo; set `AUTH_BOOTSTRAP_ADMIN_PASSWORD` (a long random value; it replaces the admin password at start-up and ends old sessions) so that password is dead on the hosted deployment. Hand the real one out only on request. Public sign-up stays off (`AUTH_REGISTRATION_ENABLED` unset). `AUTH_BOOTSTRAP_REMOVE_DEMO_USER` stays unset, otherwise `user1` is deleted and visitors cannot sign in.
- Optional: `N8N_WEBHOOK_SECRET` on the AI agent frontend is sent as `X-Webhook-Secret`; give the n8n webhook node Header Auth with the same value so the URL alone is not enough.
- Do not expose databases, Kafka, n8n, Prometheus or Grafana publicly.
- Set a spending limit on the OpenRouter key and keep it only in the frontend's runtime variables.
- The AI agent UI answers `503` until `N8N_WEBHOOK_URL` points to a workflow whose webhook you control.

## 5. Smoke test after every deploy

1. Open the frontend, sign in, see customers and orders (proves cookie, proxy, gateway, auth).
2. Create an order; the row appears in `outbox_event` with `published_at` set (proves migration V6, relay and Kafka).
3. Try to delete a customer that has orders: `409`. Create an order for a missing customer: `400`.
4. Change a throw-away user's password in one tab; the other session is signed out within ~10 s.
5. Sign out, press Back: the login page, not the dashboard.

If a step fails, fix it before sending the link to anyone.
