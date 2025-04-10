document.addEventListener('DOMContentLoaded', () => {
  const habitForm = document.getElementById('habit-form');
  const habitNameInput = document.getElementById('habit-name');
  const habitsContainer = document.getElementById('habits');

  const API_URL = 'http://localhost:4000/habits'; // URL do backend
  const config = {
    rows: 7, // Número de linhas (ajustável)
    cols: 30, // Número de colunas (ajustável)
  };

  // Carrega os hábitos do backend
  async function loadHabitsFromBackend() {
    try {
      const response = await fetch(API_URL);
      const habits = await response.json();
      habits.forEach((habit) =>
        addHabit(habit.name, config.rows, config.cols, habit.id)
      );
    } catch (error) {
      console.error('Erro ao carregar hábitos:', error);
    }
  }

  // Envia um novo hábito ao backend
  async function handleAddHabit(habitName) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: habitName }),
      });
      const newHabit = await response.json();
      addHabit(newHabit.name, config.rows, config.cols, newHabit.id);
    } catch (error) {
      console.error('Erro ao adicionar hábito:', error);
    }
  }

  // Remove um hábito do backend
  async function removeHabitFromBackend(habitElement, habitId) {
    try {
      await fetch(`${API_URL}/${habitId}`, { method: 'DELETE' });
      habitsContainer.removeChild(habitElement);
    } catch (error) {
      console.error('Erro ao remover hábito:', error);
    }
  }

  // Adiciona hábito ao DOM
  function addHabit(name, rows, cols, id) {
    const habit = document.createElement('div');
    habit.classList.add('habit');

    habit.innerHTML = `
      <h2>${name}</h2>
      <p class="notification" style="display: none;">Todos os quadrados já foram preenchidos!</p>
      <div class="habit-grid"></div>
      <div class="habit-buttons">
        <button class="add-progress">+</button> 
        <button class="remove-progress">-</button>
        <button class="remove-habit">Remover Hábito</button>
      </div>
      `;

    const grid = habit.querySelector('.habit-grid');
    const notification = habit.querySelector('.notification');
    const addProgressButton = habit.querySelector('.add-progress');
    const removeProgressButton = habit.querySelector('.remove-progress');
    const removeHabitButton = habit.querySelector('.remove-habit');

    for (let i = 0; i < rows * cols; i++) {
      const day = document.createElement('div');
      day.classList.add('day');
      day.dataset.progress = '0'; // Inicializa como não preenchido
      grid.appendChild(day);
    }

    addProgressButton.addEventListener('click', () => {
      handleRandomFill(
        grid,
        1,
        notification,
        addProgressButton,
        removeProgressButton
      );
    });

    removeProgressButton.addEventListener('click', () => {
      handleRandomFill(
        grid,
        -1,
        notification,
        addProgressButton,
        removeProgressButton
      );
    });

    removeHabitButton.addEventListener('click', () => {
      removeHabitFromBackend(habit, id); // Agora usamos o id do backend
    });

    habitsContainer.appendChild(habit);
  }

  // Lida com preenchimento aleatório
  function handleRandomFill(
    grid,
    progressType,
    notification,
    addButton,
    removeButton
  ) {
    const days = Array.from(grid.querySelectorAll('.day'));
    const targetDays = days.filter(
      (day) => parseInt(day.dataset.progress) === 0
    );

    if (targetDays.length > 0) {
      const randomIndex = Math.floor(Math.random() * targetDays.length);
      const selectedDay = targetDays[randomIndex];
      selectedDay.dataset.progress = progressType;
      updateDayColor(selectedDay, progressType);
    }

    // Checa se todos os quadrados estão preenchidos
    if (targetDays.length === 1) {
      notification.style.display = 'block'; // Mostra notificação
      addButton.disabled = true; // Desativa o botão +
      removeButton.disabled = true; // Desativa o botão -
    }
  }

  // Atualiza a cor do quadrado com base no progresso
  function updateDayColor(day, progress) {
    day.className = 'day'; // Reseta as classes
    if (progress === 1) {
      day.classList.add('level-1'); // Verde
    } else if (progress === -1) {
      day.classList.add('level-negative'); // Vermelho
    }
  }

  // Evento de envio do formulário
  habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const habitName = habitNameInput.value.trim();
    if (habitName) {
      handleAddHabit(habitName);
      habitNameInput.value = '';
    }
  });

  // Carrega os hábitos ao iniciar
  loadHabitsFromBackend();
});
