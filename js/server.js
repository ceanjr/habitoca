const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let habitData = {}; // Simula o armazenamento no servidor

app.get('/habits', (req, res) => {
  res.json(habitData);
});

app.post('/habits', (req, res) => {
  const { userId, habits } = req.body;
  habitData[userId] = habits;
  res.json({ message: 'Dados salvos com sucesso!' });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
