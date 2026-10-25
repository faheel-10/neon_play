
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 3000;

// Create the database file automatically.
const db = new Database(path.join(__dirname, "neonplay.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create database tables if they do not exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, game),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "neonplay-local-practice-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 2 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, "public"), {
  index: false
}));

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Please sign in first." });
  }
  next();
}

function startUserSession(req, res, user) {
  req.session.regenerate(error => {
    if (error) {
      return res.status(500).json({ error: "Could not start session." });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    req.session.save(error => {
      if (error) {
        return res.status(500).json({ error: "Could not save session." });
      }
      res.json({
        message: "Success!",
        user: req.session.user
      });
    });
  });
}

app.get("/", (req, res) => {
  res.redirect(req.session.user ? "/index.html" : "/signin.html");
});

app.get("/index.html", (req, res) => {
  if (!req.session.user) return res.redirect("/signin.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Sign up
app.post("/api/signup", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      error: "Name must be 2 to 50 characters."
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: "Enter a valid email address."
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      error: "Password must be 8 to 72 characters."
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run(name, email, passwordHash);

    const user = {
      id: Number(result.lastInsertRowid),
      name,
      email
    };

    startUserSession(req, res, user);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    console.error(error);
    res.status(500).json({ error: "Could not create account." });
  }
});

// Sign in
app.post("/api/signin", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  try {
    const user = db.prepare(`
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = ?
    `).get(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Incorrect email or password."
      });
    }

    startUserSession(req, res, user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not sign in." });
  }
});

// Check the current user
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// Sign out
app.post("/api/signout", (req, res) => {
  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({ error: "Could not sign out." });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Signed out." });
  });
});

const allowedGames = [
  "Tic-Tac-Toe",
  "Rock Paper Scissors",
  "Number Guessing"
];

// Read scores for the signed-in user
app.get("/api/scores", requireLogin, (req, res) => {
  const rows = db.prepare(`
    SELECT game, wins
    FROM scores
    WHERE user_id = ?
  `).all(req.session.user.id);

  const games = {};
  let totalWins = 0;

  for (const row of rows) {
    games[row.game] = row.wins;
    totalWins += row.wins;
  }

  res.json({ totalWins, games });
});

// Save a win for the signed-in user
app.post("/api/win", requireLogin, (req, res) => {
  const game = req.body.game;

  if (!allowedGames.includes(game)) {
    return res.status(400).json({ error: "Invalid game name." });
  }

  db.prepare(`
    INSERT INTO scores (user_id, game, wins)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, game)
    DO UPDATE SET wins = wins + 1
  `).run(req.session.user.id, game);

  const rows = db.prepare(`
    SELECT game, wins
    FROM scores
    WHERE user_id = ?
  `).all(req.session.user.id);

  const games = {};
  let totalWins = 0;

  for (const row of rows) {
    games[row.game] = row.wins;
    totalWins += row.wins;
  }

  res.json({ message: "Score saved!", totalWins, games });
});

app.listen(PORT, () => {
  console.log(`🎮 NeonPlay running at http://localhost:${PORT}`);
});
