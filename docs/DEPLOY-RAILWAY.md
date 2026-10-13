# Hosted demo on Railway (runbook)

This repository is built for `docker compose`. A hosted demo is a **separate deployment of the same images**; this page is the checklist for it. Nothing in the repository deploys itself, and a demo link is only worth putting on a CV while it is up and reflects the current `main`.

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

Plus three PostgreSQL databases and one Kafka broker. Kafka is the heaviest part: a managed Kafka (or Redpanda) service is simpler than running ZooKeeper plus Kafka.

## 2. Variables

Use Railway private networking (`<service>.railway.internal`) between backends. Only the frontend and (for API clients) the gateway need a public domain.

| Service | Variables |
|---|---|
| auth-backend | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION=86400000`, `AUTH_COOKIE_SECURE=true` |
| customer-backend | `PORT=8081`, `DATABASE_URL` (JDBC form), `PGUSER`, `PGPASSWORD`, `KAFKACLUSTER_BROKERS`, `ORDER_SERVICE_URL=http://order-backend.railway.internal:8082` |
| order-backend | `PORT=8082`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `KAFKA_URL`, `CUSTOMER_SERVICE_URL=http://customer-backend.railway.internal:8081` |
| api-gateway | `JWT_SECRET` (same value as auth), `AUTH_SERVICE_URL`, `CUSTOMER_SERVICE_URL`, `ORDER_SERVICE_URL`, `CORS_ALLOWED_ORIGINS=https://<frontend domain>` |
| customer-frontend | build args `NEXT_PUBLIC_API_URL=` (empty) and `API_PROXY_TARGET=http://api-gateway.railway.internal:8080`; runtime `API_INTERNAL_URL` (same URL), `OPENROUTER_API_KEY` |
| ai-agent-frontend | `N8N_WEBHOOK_URL` |

`JWT_SECRET`: a fresh `openssl rand -hex 32`, never the local one.

## 3. Why the frontend proxies `/api`

The session is an HttpOnly, `SameSite=Strict` cookie. If the frontend and the gateway sit on two different `*.up.railway.app` hostnames, the browser treats them as different sites and **does not send the cookie** to the gateway, so every request after login would answer 401. With `NEXT_PUBLIC_API_URL` empty and `API_PROXY_TARGET` set at build time, the browser only talks to the frontend's own origin and Next.js forwards `/api/auth|customers|orders|users/*` to the gateway. Add the frontend's public URL to `CORS_ALLOWED_ORIGINS` (the gateway also uses that list for its Origin check on cookie-authenticated writes).

Locally nothing changes: without those two settings the app talks to `http://localhost:8080` as before.

## 4. Before the demo is public

- **Change the seeded accounts.** `admin / admin123` and `user1 / user123` are published in this README. On a public URL, change both passwords right after the first start (Users page → reset password), or the demo is open to anyone.
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
