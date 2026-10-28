-- An invited admin who never signed in (no password, no Google link) cannot use the account, so only admins
-- with a sign-in method count towards MIN_ADMINS (src/lib/auth/min-admins.server.ts applies the same rule first).
CREATE OR REPLACE FUNCTION enforce_min_admins() RETURNS trigger AS $$
DECLARE
  remaining integer;
BEGIN
  IF OLD.role = 'admin' AND OLD.banned = false
     AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NEW.banned = true)
     AND EXISTS (SELECT 1 FROM account WHERE user_id = OLD.id) THEN
    -- Serialises concurrent demotions; the count below runs after the lock, so it sees the other commit.
    PERFORM pg_advisory_xact_lock(hashtext('min_admins'));
    SELECT count(*) INTO remaining FROM "user" u
      WHERE u.role = 'admin' AND u.banned = false AND u.id <> OLD.id
        AND EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id);
    IF remaining < 2 THEN
      RAISE EXCEPTION 'min_admins' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- better-auth deletes a user's accounts before the user row, so removing an admin's last sign-in method is
-- guarded here too. A cascade from deleting the user runs after the user row is gone and is not affected.
CREATE FUNCTION enforce_min_admins_account() RETURNS trigger AS $$
DECLARE
  remaining integer;
BEGIN
  IF EXISTS (SELECT 1 FROM "user" WHERE id = OLD.user_id AND role = 'admin' AND banned = false)
     AND NOT EXISTS (SELECT 1 FROM account WHERE user_id = OLD.user_id AND id <> OLD.id) THEN
    PERFORM pg_advisory_xact_lock(hashtext('min_admins'));
    SELECT count(*) INTO remaining FROM "user" u
      WHERE u.role = 'admin' AND u.banned = false AND u.id <> OLD.user_id
        AND EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id);
    IF remaining < 2 THEN
      RAISE EXCEPTION 'min_admins' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER account_min_admins BEFORE DELETE ON account
  FOR EACH ROW EXECUTE FUNCTION enforce_min_admins_account();
