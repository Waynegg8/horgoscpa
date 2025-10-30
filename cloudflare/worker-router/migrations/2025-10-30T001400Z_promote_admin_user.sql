-- Promote existing 'admin' user to administrator (idempotent)
UPDATE Users SET is_admin = 1, updated_at = datetime('now') WHERE LOWER(username) = 'admin' AND is_deleted = 0;


