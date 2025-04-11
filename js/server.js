// app.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database'); // Importa as funções do banco de dados

const app = express();
app.use(bodyParser.json());
// app.use(cors());
app.use(
  cors({
    origin: '*', // Ou especificar o domínio permitido
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const JWT_SECRET = 'han-sola'; // Mantenha isso em um ambiente de variáveis

// Rota de registro
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email já existe.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser(name, email, hashedPassword);
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ message: 'Usuário registrado com sucesso!', token });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar o usuário.' });
  }
});

// Rota de login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      name: user.name,
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao realizar o login.' });
  }
});

// Middleware de autenticação para proteger rotas
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401); // Não autorizado
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Proibido (token inválido)
    }
    req.userId = user.userId;
    next();
  });
}

// Rota para buscar os hábitos de um usuário
app.get('/habits', authenticateToken, async (req, res) => {
  try {
    const habits = await db.getHabits(req.userId);
    res.json({ [req.userId]: habits }); // Retorna os hábitos para o userId autenticado
  } catch (error) {
    console.error('Erro ao buscar hábitos:', error);
    res
      .status(500)
      .json({ error: 'Erro ao buscar hábitos do banco de dados.' });
  }
});

// Rota para adicionar um novo hábito
app.post('/habits', authenticateToken, async (req, res) => {
  const { habits: newHabits } = req.body;
  if (!Array.isArray(newHabits) || newHabits.length === 0) {
    return res.status(400).json({ error: 'Dados de hábito inválidos.' });
  }

  try {
    const results = await Promise.all(
      newHabits.map((habit) =>
        db.addHabit(req.userId, habit.name, habit.progress)
      )
    );
    res.json({ message: 'Hábitos salvos com sucesso!', results });
  } catch (error) {
    console.error('Erro ao salvar hábitos:', error);
    res
      .status(500)
      .json({ error: 'Erro ao salvar hábitos no banco de dados.' });
  }
});

// Rota para atualizar o progresso de um hábito específico
app.put('/habits/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;

  if (!Array.isArray(progress)) {
    return res.status(400).json({ error: 'Progresso inválido.' });
  }

  try {
    // Adicione uma verificação para garantir que o hábito pertence ao usuário autenticado
    const habits = await db.getHabits(req.userId);
    const habitExists = habits.some((habit) => habit.id === parseInt(id));
    if (!habitExists) {
      return res
        .status(403)
        .json({ error: 'Você não tem permissão para atualizar este hábito.' });
    }

    const result = await db.updateHabitProgress(id, progress);
    if (result.changes > 0) {
      res.json({ message: 'Progresso do hábito atualizado com sucesso!' });
    } else {
      res.status(404).json({ error: 'Hábito não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    res
      .status(500)
      .json({ error: 'Erro ao atualizar o progresso no banco de dados.' });
  }
});

// Rota para remover um hábito
app.delete('/habits/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Adicione uma verificação para garantir que o hábito pertence ao usuário autenticado
    const habits = await db.getHabits(req.userId);
    const habitExists = habits.some((habit) => habit.id === parseInt(id));
    if (!habitExists) {
      return res
        .status(403)
        .json({ error: 'Você não tem permissão para remover este hábito.' });
    }

    const result = await db.deleteHabit(id);
    if (result.changes > 0) {
      res.json({ message: 'Hábito removido com sucesso!' });
    } else {
      res.status(404).json({ error: 'Hábito não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao deletar hábito:', error);
    res
      .status(500)
      .json({ error: 'Erro ao deletar o hábito do banco de dados.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Certifique-se de fechar a conexão com o banco de dados ao encerrar o servidor
process.on('SIGINT', () => {
  db.db.close((err) => {
    if (err) {
      console.error('Erro ao fechar o banco de dados:', err.message);
    } else {
      console.log('Banco de dados SQLite fechado.');
    }
    server.close(() => {
      console.log('Servidor encerrado.');
      process.exit(0);
    });
  });
});
