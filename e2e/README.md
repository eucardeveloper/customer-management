# End-to-end tests

Run against a stack that is already up:

```
docker compose up -d --build        # from the repo root, wait until the gateway answers
cd e2e
npm install
npx playwright install chromium
npx playwright test
```

What they prove: login/redirect behaviour, the aligned customers table, that a password change signs out
every older session (old token -> 401), and that the API refuses to delete a customer who has orders or
to create an order for an unknown customer. They create one throw-away user per run (`e2e_<timestamp>`, deleted again at the end)
and never touch the seeded accounts' passwords.
