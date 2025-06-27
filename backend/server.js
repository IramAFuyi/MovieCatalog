const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Conexión a la base de datos
const db = new sqlite3.Database("./db/database.sqlite", (err) => {
  if (err) console.error(err.message);
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      titulo TEXT,
      year TEXT
    )
  `);
});

// Registrar usuario
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  db.run(
    "INSERT INTO usuarios (email, password) VALUES (?, ?)",
    [email, hash],
    function (err) {
      if (err) return res.status(400).json({ error: "Usuario ya existe" });
      res.json({ userId: this.lastID });
    }
  );
});

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.get(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    (err, user) => {
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      res.json({ success: true, userId: user.id, email: user.email });
    }
  );
});

// Agregar favorito
app.post("/api/favoritos", (req, res) => {
  const { userId, titulo, year } = req.body;
  db.run(
    "INSERT INTO favoritos (user_id, titulo, year) VALUES (?, ?, ?)",
    [userId, titulo, year],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al guardar favorito" });
      res.json({ success: true });
    }
  );
});

// Obtener favoritos de un usuario
app.get("/api/favoritos/:userId", (req, res) => {
  const { userId } = req.params;
  db.all("SELECT titulo, year FROM favoritos WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener favoritos" });
    res.json(rows);
  });
});


// Eliminar favorito
app.delete("/api/favoritos", (req, res) => {
  const { userId, titulo } = req.body;

  db.run(
    "DELETE FROM favoritos WHERE user_id = ? AND titulo = ?",
    [userId, titulo],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al eliminar favorito" });
      res.json({ success: true });
    }
  );
});

const path = require("path");

// Servir archivos estáticos desde /frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Redirigir "/" a index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
