const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexão com o banco de dados
const db = new sqlite3.Database('habitos.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criar tabela se não existir
db.run(
  `CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`
);

// Rotas
app.get('/habits', (req, res) => {
  db.all('SELECT * FROM habits', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/habits', (req, res) => {
  const { name } = req.body;
  if (name) {
    db.run('INSERT INTO habits (name) VALUES (?)', [name], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(201).json({ id: this.lastID, name });
      }
    });
  } else {
    res.status(400).json({ error: 'O nome do hábito é obrigatório.' });
  }
});

app.delete('/habits/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM habits WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Hábito não encontrado.' });
    } else {
      res.status(200).json({ message: 'Hábito removido.' });
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
