-- Fix all user passwords to 111111 using PBKDF2
-- Password: 111111
-- Format: pbkdf2$310000$salt$hash

UPDATE Users 
SET password_hash = 'pbkdf2$310000$AunoPI+FGTfidsGvc8c08Q==$mWFxV58XNwW8AvOr4CFnfWn4Lr3McDoh45d39wJuKio='
WHERE username IN ('admin', 'liu', 'tian', 'chen');

