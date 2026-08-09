UPDATE users SET provider = 'LOCAL' WHERE provider IS NULL;
UPDATE users SET email_verified = true WHERE provider = 'LOCAL';
