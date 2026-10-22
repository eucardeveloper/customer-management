# 0001 Identity propagation: gateway-confirmed session, shared secret, fail closed

Status: accepted

## Context
Customer and order services need the caller's name and role to enforce "read: any user, write: ADMIN" and
price masking. Only the gateway is published; the services sit on an internal network. The network
boundary alone is weak: any other container on that network (n8n, a compromised frontend, a debug container)
could send `X-Auth-Role: ADMIN` straight to a service.

## Decision
- The gateway verifies the JWT signature, then asks the auth-service whether the session is still valid and
  who it belongs to (`GET /api/auth/session`). Name and role come from that answer, not from token claims, so a
  demotion applies at once.
- On every authenticated request the gateway sets `X-Auth-User`, `X-Auth-Role` and `X-Gateway-Secret`,
  overwriting anything the client sent. (The public `/api/auth/login|register|logout` routes go only to the
  auth-service, which never reads these headers.)
- The services accept the identity headers only when `X-Gateway-Secret` matches (`MessageDigest.isEqual`,
  constant time). A service started without `GATEWAY_SHARED_SECRET` refuses to start; tests opt out explicitly
  with `gateway.allow-unsigned-headers=true`.
- Authorization is enforced in each service's `SecurityConfig`; the UI only hides what a role cannot use.

## Alternatives rejected
- **Every service verifies the JWT itself.** Removes the shared secret, but each service would also need the
  revocation check (0002), i.e. a call to the auth-service or a copy of its tables. The gateway already makes
  that call once per request.
- **mTLS between gateway and services.** The right tool in production; certificate issuance and rotation are
  out of proportion for a compose demo. The shared secret gives the same "only the gateway can assert an
  identity" property at this scale.
- **Trust the network, no secret.** Rejected: one misconfigured port or one extra container is enough to become ADMIN.
- **Fail open when the secret is missing** (the behaviour before this record). Rejected: a forgotten variable
  on a deployment would silently disable the check.

## Consequences
- One more secret to rotate, shared by three processes.
- Services do not see the JWT's own claims; they trust the gateway's reading of it.
- Service-to-service calls (customer asks order "does this customer have orders?") forward the caller's
  identity with the same headers, so the callee applies its normal rules.
