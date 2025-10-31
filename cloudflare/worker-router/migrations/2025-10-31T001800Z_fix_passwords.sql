-- Fix all user passwords to 111111
-- bcrypt hash of '111111' with salt rounds 10

UPDATE Users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username IN ('admin', 'liu', 'tian', 'chen');

