// RoamLo server: serves the website and handles registering and logging in

// ===== Modules =====
const express = require("express");   // web server framework
const crypt = require("crypto");      // built-in Node module for salts and password hashing
const mysql = require("mysql2");      // MySQL driver

const app = express();                // creates the web server app

// ===== Middleware =====
// Reads form data sent with method="POST" into req.body
app.use(express.urlencoded({ extended: true }));
// Serves every file in the public folder (index.html, login.html, style.css, images...)
app.use(express.static("public"));

// ===== Database connection =====
// The MySQL root password comes from an environment variable so it is never saved in the code
const pass = process.env.ROOTPASS;
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: pass,
  database: "roamlo",
  port: 3306
});

// Try to connect once at startup. If MySQL is not running, log it and keep serving pages.
conn.connect(err => {
  if (err) {
    console.log("Could not connect to MySQL: " + (err.message || err.code));
    console.log("The website still loads, but register and login will show an error page.");
  } else {
    console.log("Connected to the roamlo database");
  }
});

// Log connection errors that happen later instead of letting them crash the server
conn.on("error", err => {
  console.log("MySQL connection error: " + (err.message || err.code));
});

// ===== Password hashing settings =====
// The sample used 100 rounds. Real guidance is far higher (100,000+) so that
// guessing passwords from a stolen table is slow. It takes a fraction of a second per login.
const hashRounds = 100000;
const hashLength = 64;          // 64 bytes = 128 hex characters (matches CHAR(128) in setup.sql)
const hashDigest = "sha512";

// Turns a plain password and a salt into a hex hash string
function hashPassword(plainPass, salt) {
  return crypt.pbkdf2Sync(plainPass, salt, hashRounds, hashLength, hashDigest).toString("hex");
}

// ===== HTML helpers =====
// Makes user-typed text safe to put inside HTML (stops <script> tags and similar)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Builds a full response page that uses the same photo layout as login.html and register.html.
// heading, message, linkHref and linkText are written by us; only escaped text goes in message.
function renderPage(heading, message, linkHref, linkText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Sets the character encoding and makes the page responsive -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Page title shown in the browser tab -->
  <title>RoamLo | ${heading}</title>

  <!-- Loads the Outfit font from Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap">

  <link rel="stylesheet" href="/style.css">    <!-- Shared colors and the theme toggle -->
  <link rel="stylesheet" href="/auth.css">     <!-- Layout for the login and register pages -->
  <script src="/script.js"></script>           <!-- Loads the light / dark mode script -->
</head>

<body class="auth-body">
  <div class="auth-shell">

    <!-- Photo area: full screen on desktop, a band at the top on phones -->
    <div class="auth-hero">
      <img
        class="auth-photo"
        src="/images/coast.jpg"
        srcset="/images/coast-small.jpg 1200w, /images/coast.jpg 2400w"
        sizes="100vw"
        alt="Aerial view of turquoise sea meeting a green mountain coastline"
      >
      <div class="auth-scrim"></div>      <!-- Navy shade so white text on the photo is readable -->

      <!-- Top bar with a link home and the theme toggle -->
      <header class="auth-top">
        <a class="auth-home" href="/index.html">&larr; Home</a>
        <button type="button" class="theme-toggle">Dark mode</button>      <!-- Button that switches between light and dark mode -->
      </header>

      <!-- RoamLo wordmark and tagline on the photo -->
      <div class="auth-brand">
        <p class="auth-logo">RoamLo</p>
        <p class="auth-tagline">Travel plans that fit your budget.</p>
      </div>
    </div>

    <!-- Main content with the server's message and one link -->
    <main class="auth-main">
      <section class="auth-panel">
        <h1>${heading}</h1>                                  <!-- The main message, e.g. "You have logged in successfully" -->
        <p class="auth-intro">${message}</p>                 <!-- One extra sentence of detail -->
        <a class="auth-button" href="${linkHref}">${linkText}</a>   <!-- The one next step, e.g. "Log in" -->
      </section>
    </main>

    <!-- Footer section with project information and the photo credit -->
    <footer class="auth-footer">
      <p>RoamLo, a class project by Corey Richards. Photo by <a href="https://unsplash.com/@paws_and_prints">paws and prints</a> on <a href="https://unsplash.com/photos/turquoise-ocean-meets-a-lush-green-coastline-with-sandy-beaches-8_nE3qRtNGc">Unsplash</a>.</p>
    </footer>

  </div>
</body>
</html>`;
}

// Sends the "something went wrong" page with status 500 and logs the real error for us
function sendServerError(res, err, linkHref) {
  console.log("Database error: " + (err.message || err.code));
  res.status(500).send(renderPage(
    "Something went wrong.",
    "Please try again in a moment.",
    linkHref,
    "Try again"
  ));
}

// ===== Register route =====
// Receives the form from register.html
app.post("/register", (req, res) => {
  // Read the form fields (trim spaces off the username and e-mail, not the password)
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim();
  const plainPass = req.body.password || "";

  // Every field is required
  if (username === "" || email === "" || plainPass === "") {
    return res.status(400).send(renderPage(
      "Please fill in every field.",
      "Username, e-mail and password are all required.",
      "register.html",
      "Back to register"
    ));
  }

  // Keep values inside the column sizes in setup.sql
  if (username.length > 50 || email.length > 255) {
    return res.status(400).send(renderPage(
      "That entry is too long.",
      "Usernames can be up to 50 characters and e-mails up to 255.",
      "register.html",
      "Back to register"
    ));
  }

  // Each user gets their own random salt, so two people with the same password get different hashes
  const salt = crypt.randomBytes(16).toString("hex");   // 16 bytes = 32 hex characters
  const hashedPass = hashPassword(plainPass, salt);

  // The ? placeholders let mysql2 insert the values safely (no SQL injection)
  conn.query(
    "INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)",
    [username, email, hashedPass, salt],
    (err) => {
      if (err) {
        // The username column is UNIQUE, so a repeat name gives this error code
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).send(renderPage(
            "That username is already taken.",
            "Please pick a different username.",
            "register.html",
            "Back to register"
          ));
        }
        return sendServerError(res, err, "register.html");
      }

      // Success message required by the assignment, with a link to the login page
      res.send(renderPage(
        "You have successfully registered",
        "Your RoamLo account is ready.",
        "login.html",
        "Log in"
      ));
    }
  );
});

// ===== Login route =====
// Receives the form from login.html
app.post("/login", (req, res) => {
  // Read the form fields (trim spaces off the username, not the password)
  const username = (req.body.username || "").trim();
  const plainPass = req.body.password || "";

  // Message used for a missing user, a wrong password, or empty fields
  const sendIncorrect = () => res.status(401).send(renderPage(
    "The login credentials were incorrect.",
    "Check your username and password and try again.",
    "login.html",
    "Try again"
  ));

  // Empty fields count as a failed login
  if (username === "" || plainPass === "") {
    return sendIncorrect();
  }

  // Look up the user by name (parameterized query)
  conn.query(
    "SELECT username, password_hash, salt FROM users WHERE username = ?",
    [username],
    (err, result) => {
      if (err) {
        return sendServerError(res, err, "login.html");
      }

      // No user with that name
      if (result.length === 0) {
        return sendIncorrect();
      }

      // Hash the typed password with this user's saved salt, then compare the two hashes
      const user = result[0];
      const typedHash = Buffer.from(hashPassword(plainPass, user.salt), "hex");
      const savedHash = Buffer.from(user.password_hash, "hex");

      // timingSafeEqual takes the same time whether the hashes differ early or late
      const matches = typedHash.length === savedHash.length &&
        crypt.timingSafeEqual(typedHash, savedHash);

      if (!matches) {
        return sendIncorrect();
      }

      // Success message required by the assignment (username is escaped before going into HTML)
      res.send(renderPage(
        "You have logged in successfully",
        "Welcome back, " + escapeHtml(user.username) + ".",
        "index.html",
        "Back to home"
      ));
    }
  );
});

// ===== Start the server =====
app.listen(3000, () => {
  console.log("RoamLo is running at http://localhost:3000");
});
