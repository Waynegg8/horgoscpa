-- Fix all user passwords to 111111 using PBKDF2
-- Password: 111111
-- Format: pbkdf2$100000$salt$hash
-- Note: Cloudflare Workers crypto API max iterations is 100000

UPDATE Users 
SET password_hash = 'pbkdf2$100000$+9PMuJVh17FuHvSjN9gMdQ==$fx+Q65o1T+hfJTdvio5RXuZKjtrDWvadNI1tOmArQrc='
WHERE username IN ('admin', 'liu', 'tian', 'chen');

