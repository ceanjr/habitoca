// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'habits.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    createHabitsTable(); // Cria a tabela de hábitos se não existir
    createUsersTable();
  }
});

function createUsersTable() {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `,
    (err) => {
      if (err) {
        console.error('Erro ao criar a tabela de usuários:', err.message);
      } else {
        console.log('Tabela de usuários criada (se não existia).');
      }
    }
  );
}

function createHabitsTable() {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      progress TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `,
    (err) => {
      if (err) {
        console.error('Erro ao criar a tabela de hábitos:', err.message);
      } else {
        console.log('Tabela de hábitos criada (se não existia).');
      }
    }
  );
}

// Função para buscar todos os hábitos de um usuário
function getHabits(userId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM habits WHERE userId = ?`, [userId], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar hábitos:', err.message);
        reject(err);
      } else {
        // Converter a string de progresso de volta para array
        const habitsWithProgressArray = rows.map((habit) => ({
          ...habit,
          progress: JSON.parse(habit.progress),
        }));
        resolve(habitsWithProgressArray);
      }
    });
  });
}

// Função para adicionar um novo hábito
function addHabit(userId, name, progress) {
  return new Promise((resolve, reject) => {
    const progressString = JSON.stringify(progress); // Salvar o array de progresso como string
    db.run(
      `INSERT INTO habits (userId, name, progress) VALUES (?, ?, ?)`,
      [userId, name, progressString],
      function (err) {
        if (err) {
          console.error('Erro ao adicionar hábito:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, userId, name, progress });
        }
      }
    );
  });
}

// Função para atualizar o progresso de um hábito
function updateHabitProgress(id, progress) {
  return new Promise((resolve, reject) => {
    const progressString = JSON.stringify(progress); // Salvar o array de progresso como string
    db.run(
      `UPDATE habits SET progress = ? WHERE id = ?`,
      [progressString, id],
      function (err) {
        if (err) {
          console.error('Erro ao atualizar progresso do hábito:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      }
    );
  });
}

// Função para remover um hábito
function deleteHabit(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM habits WHERE id = ?`, [id], function (err) {
      if (err) {
        console.error('Erro ao deletar hábito:', err.message);
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function createUser(username, password) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, password],
      function (err) {
        if (err) {
          console.error('Erro ao criar usuário:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, username });
        }
      }
    );
  });
}

module.exports = {
  getHabits,
  addHabit,
  updateHabitProgress,
  deleteHabit,
  getUserByUsername,
  createUser,
  db, // Exportar a conexão com o banco de dados para fechamento
};
