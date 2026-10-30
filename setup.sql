-- RoamLo database setup
-- Run this once in MySQL Workbench (or the mysql command line) before starting server.js

-- Create the database if it does not exist yet, then switch to it
CREATE DATABASE IF NOT EXISTS roamlo;
USE roamlo;

-- Table that stores one row per registered user
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,           -- unique number for each user
  username VARCHAR(50) NOT NULL UNIQUE,        -- login name, no two users can share one
  email VARCHAR(255) NOT NULL,                 -- e-mail address from the register form
  password_hash CHAR(128) NOT NULL,            -- pbkdf2 sha512 hash, 64 bytes as hex
  salt CHAR(32) NOT NULL,                      -- random 16-byte salt for this user, as hex
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- when the account was made
);
