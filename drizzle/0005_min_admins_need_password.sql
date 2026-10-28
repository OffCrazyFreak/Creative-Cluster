-- An invited admin who never chose a password cannot sign in, so only admins with a credential count
-- towards MIN_ADMINS (src/lib/auth/min-admins.server.ts applies the same rule first).
CREATE OR REPLACE FUNCTION enforce_min_admins() RETURNS trigger AS $$
DECLARE
  remaining integer;
BEGIN
  IF OLD.role = 'admin' AND OLD.banned = false
     AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NEW.banned = true)
     AND EXISTS (SELECT 1 FROM account WHERE user_id = OLD.id AND provider_id = 'credential') THEN
    -- Serialises concurrent demotions; the count below runs after the lock, so it sees the other commit.
    PERFORM pg_advisory_xact_lock(hashtext('min_admins'));
    SELECT count(*) INTO remaining FROM "user" u
      WHERE u.role = 'admin' AND u.banned = false AND u.id <> OLD.id
        AND EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id AND a.provider_id = 'credential');
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
