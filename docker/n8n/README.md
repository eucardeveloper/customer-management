# n8n AI agent workflow

`workflows/ai-agent.json` is the workflow behind the AI agent UI (`frontend/ai-agent-app`, port 3001):
a chat trigger, an Orchestrator agent, and two tool agents (Customer-Agent, Order-Agent) that call
the gateway (`http://api-gateway:8080`) with the OpenRouter model `google/gemini-2.5-pro`.

It contains **no secrets and no credential ids**. After importing, pick or create the credentials below.

## Import

1. Open http://localhost:5678, then Workflows, then **Import from file**, and choose `workflows/ai-agent.json`.
2. Create these credentials and select them on the nodes that ask for one:
   - **OpenRouter** (three "OpenRouter Chat Model" nodes): your OpenRouter API key.
   - **Postgres** (three "Postgres Chat Memory" nodes): host `customer-db`, port `5432`, database `n8n_db`,
     user `n8n_app`, password = `N8N_DB_PASSWORD` from `.env`.
   - **Custom Auth** (node "Gateway Girişi"): JSON `{"body": {"username": "<user>", "password": "<password>"}}`.
     Use a dedicated ADMIN account created in the user management screen, not a shared one.
3. **Publish** the workflow, open the chat trigger node, copy its *Chat URL* (`http://localhost:5678/webhook/<id>/chat`), and put it into `.env`
   as `N8N_WEBHOOK_URL=...` (a webhook URL is a credential; never commit it). Replace `localhost` with `n8n`:
   the AI agent UI runs in its own container, where `localhost` is the container itself, so the value must be
   `http://n8n:5678/webhook/<id>/chat`.
4. `docker compose up -d --force-recreate ai-agent-frontend`, then try http://localhost:3001.

## How it authenticates

The gateway requires a signed-in user and the session lasts 30 minutes, so the workflow signs in at the
start of **every** chat message ("Gateway Girişi" logs in, "Gateway Oturumu" reads the token from the
`customer_session` cookie) and the HTTP tool nodes send `Authorization: Bearer <token>`. The services are
not called directly: they only accept requests carrying the gateway's shared secret (ADR 0001).

## Known limits

- The agent runs with the permissions of the account in "Gateway Girişi". With an ADMIN account it can add,
  change and delete customers and orders, and it sees prices. Use a read-only (USER) account and remove the
  POST/PUT/DELETE tool nodes if you want a read-only agent.
- The agent UI's chat endpoint only serves a signed-in CRM ADMIN (it asks the gateway about the
  `customer_session` cookie, so sign in at http://localhost:3000 first), because the agent acts with an
  admin account. This protects the UI; it does not protect the n8n webhook itself.
- n8n's chat trigger does not check the `X-Webhook-Secret` header that the UI sends, so the production
  URL is the only protection for the webhook. Keep it private and keep n8n on loopback.
- The write tools (POST/PUT) build their JSON body by putting the model's text between quotes
  (`"firstName": "{{ $fromAI('firstName') }}"`). A value that contains a double quote or a backslash
  breaks the request (the API answers 400; the agent reports it), and text that came from a record the
  model read could try to add fields. Not fixed because the workflow cannot be run in CI; the usual
  remedy is a body built with `JSON.stringify({ ... })`. Verify it in n8n before adopting it.
- The PUT tools do not send the `version` field that customers and orders now accept, so an update made
  by the agent is not checked against a concurrent edit (it reads the record, then writes it back).
- Deleting and updating are guarded only by the agents' instructions ("ask when the record is unclear",
  no bulk deletes), which a model can misread; there is no confirmation step before a DELETE. Customers
  with orders are protected by the API (`409`), orders are not.
- This workflow was adapted from an older export and has not been run end to end in CI.
