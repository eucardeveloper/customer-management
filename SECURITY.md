# Security

This is a portfolio project, not a production system. What it does, and what it does not, is stated here so nobody has to guess.

## Implemented
- Session in an HttpOnly, `SameSite=Strict` cookie (2 h); `Origin` check on cookie-authenticated writes; CORS allowlist.
- Server-side session revocation (`token_version`, `jti` list), checked by the gateway; fail-closed when the auth-service cannot answer.
- Login throttling in the database: per username (5 / 15 min) and per client address (30 / 15 min).
- Role checks inside the services (ADMIN writes, USER read-only without prices); services trust identity headers only together with a gateway shared secret.
- Public sign-up is off by default; hosted deployments replace the admin password at start-up.
- Non-root containers, no published ports for databases/Kafka/backends, security headers on the frontends, generic error messages for failed sign-in.
- Flyway-only schema changes (`ddl-auto=validate`), input validation, `npm audit` and Dependabot in CI.

## Not covered
- No penetration test or formal ASVS review. Do not read "implemented" as "certified".
- No refresh-token rotation: a stolen cookie works until it expires or the password changes.
- The AI chat sends customer names and order data to OpenRouter; use only with data you may share with that provider.
- Demo credentials are public by design for the local demo.

## Reporting
Open a GitHub issue without exploit details or mail the address in the profile; there is no bounty.
