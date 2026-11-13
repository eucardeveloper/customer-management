-- E-mail uniqueness regardless of letter case, enforced by the database (the customer-service does the same
-- in its V5). The plain UNIQUE on users.email (V1) treated "A@x.com" and "a@x.com" as different accounts.
-- NOTE: if two existing accounts differ only by case this migration fails on purpose; merge or rename
-- them by hand first (nothing is deleted automatically).
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));
