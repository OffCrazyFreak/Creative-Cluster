-- Backstop for MIN_ADMINS (src/constants/roles.ts): the app checks first for a clear message,
-- this makes the rule hold when two changes race. Keep the 2 in step with the constant.
CREATE FUNCTION enforce_min_admins() RETURNS trigger AS $$
DECLARE
  remaining integer;
BEGIN
  IF OLD.role = 'admin' AND OLD.banned = false
     AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NEW.banned = true) THEN
    -- Serialises concurrent demotions; the count below runs after the lock, so it sees the other commit.
    PERFORM pg_advisory_xact_lock(hashtext('min_admins'));
    SELECT count(*) INTO remaining FROM "user"
      WHERE role = 'admin' AND banned = false AND id <> OLD.id;
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
CREATE TRIGGER user_min_admins BEFORE UPDATE OF role, banned OR DELETE ON "user"
  FOR EACH ROW EXECUTE FUNCTION enforce_min_admins();
