-- Custom SQL migration file, put your code below! --
-- Data migration: mark every pre-existing user as email-verified.
-- Until now the platform was admin-only (public sign-up disabled), so every
-- account in this table is a trusted, manually-provisioned operator. This PR
-- turns on `requireEmailVerification`, which would otherwise lock out admins
-- created via the seed script (which never set email_verified). New public
-- sign-ups created after this migration go through the real verification flow.
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;