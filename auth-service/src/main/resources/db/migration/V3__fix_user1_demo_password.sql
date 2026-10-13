-- V3 — The user1 hash seeded in V2 did not match the documented demo password (user123).
-- V2 stays untouched (Flyway checksum); this migration corrects the hash.
UPDATE users SET password = '$2a$10$aeaj1QmFAaZLNFgpITIGy.aduZQ9vAkJ0YKiJ91.UvW4kjlKipFIu' WHERE username = 'user1';
