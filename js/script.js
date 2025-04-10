document.addEventListener('DOMContentLoaded', () => {
  const habitForm = document.getElementById('habit-form');
  const habitNameInput = document.getElementById('habit-name');
  const habitsContainer = document.getElementById('habits');
  const userId = 'unique-user-id'; // Identificador único do usuário

  const config = {
    rows: 7,
    cols: 30,
  };

  const serverURL = 'http://localhost:3000/habits';

  // Testar localStorage
  let isLocalStorageAvailable = true;
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    isLocalStorageAvailable = false;
    console.warn(
      'LocalStorage indisponível. Usando sincronização com o servidor.'
    );
  }

  // Funções de comunicação com o servidor
  async function fetchHabitsFromServer() {
    try {
      const response = await fetch(serverURL);
      const data = await response.json();
      return data[userId] || [];
    } catch (error) {
      console.error('Erro ao buscar hábitos do servidor:', error);
      return [];
    }
  }

  async function saveHabitsToServer(habits) {
    try {
      await fetch(serverURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, habits }),
      });
    } catch (error) {
      console.error('Erro ao salvar hábitos no servidor:', error);
    }
  }

  // Funções utilitárias
  function getStorage(key) {
    if (isLocalStorageAvailable) {
      return JSON.parse(localStorage.getItem(key)) || [];
    }
    return []; // Retorna vazio caso localStorage e servidor não estejam disponíveis
  }

  async function setStorage(key, value) {
    if (isLocalStorageAvailable) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      await saveHabitsToServer(value);
    }
  }

  async function loadHabits() {
    let habits = getStorage('habits');
    if (!isLocalStorageAvailable || habits.length === 0) {
      habits = await fetchHabitsFromServer();
    }
    habits.forEach((habit) =>
      addHabit(habit.name, config.rows, config.cols, habit.id, habit.progress)
    );
  }

  async function updateHabitProgress(habitId, progressArray) {
    const habits = getStorage('habits');
    const habitIndex = habits.findIndex((habit) => habit.id === habitId);
    if (habitIndex !== -1) {
      habits[habitIndex].progress = progressArray;
      await setStorage('habits', habits);
    }
  }

  function handleAddHabit(habitName) {
    const habits = getStorage('habits');
    const newHabit = {
      id: Date.now(),
      name: habitName,
      progress: Array(config.rows * config.cols).fill(0),
    };
    habits.push(newHabit);
    setStorage('habits', habits);
    addHabit(
      newHabit.name,
      config.rows,
      config.cols,
      newHabit.id,
      newHabit.progress
    );
  }

  function removeHabit(habitElement, habitId) {
    let habits = getStorage('habits');
    habits = habits.filter((habit) => habit.id !== habitId);
    setStorage('habits', habits);
    habitsContainer.removeChild(habitElement);
  }

  function addHabit(name, rows, cols, id, progress) {
    const habit = document.createElement('div');
    habit.draggable = true;
    habit.classList.add('habit');

    habit.innerHTML = `
    <div class="card-header">
      <h2>${name}</h2>
      <img class="remove-habit" src="./assets/lixeira.svg" alt="icone de lixeira">
    </div>
      <p class="notification" style="display: none;">Todos os quadrados já foram preenchidos!</p>
      <div class="habit-grid"></div>
      <div class="habit-buttons">
        <button class="add-progress">Sim</button> 
        <button class="remove-progress">Não</button>
      </div>
    `;

    const grid = habit.querySelector('.habit-grid');
    const notification = habit.querySelector('.notification');
    const addProgressButton = habit.querySelector('.add-progress');
    const removeProgressButton = habit.querySelector('.remove-progress');
    const removeHabitButton = habit.querySelector('.remove-habit');

    const progressArray = progress || Array(rows * cols).fill(0);

    progressArray.forEach((value, index) => {
      const day = document.createElement('div');
      day.classList.add('day');
      day.dataset.index = index;
      day.dataset.progress = value;
      if (value === 1) day.classList.add('level-1'); // Verde
      if (value === -1) day.classList.add('level-negative'); // Vermelho
      grid.appendChild(day);
    });

    addProgressButton.addEventListener('click', () => {
      handleProgressChange(grid, 1, notification, id, addProgressButton);
    });

    removeProgressButton.addEventListener('click', () => {
      handleProgressChange(grid, -1, notification, id, removeProgressButton);
    });

    let confirmDelete = false; // Estado de confirmação

    removeHabitButton.addEventListener('click', () => {
      if (!confirmDelete) {
        // Primeiro clique
        confirmDelete = true;
        removeHabitButton.classList.add('second-click-remove-habit');
        setTimeout(() => {
          // Reseta o estado após 5 segundos
          confirmDelete = false;
          removeHabitButton.classList.remove('second-click-remove-habit');
        }, 5000);
      } else {
        // Segundo clique: Remove o hábito
        removeHabit(habit, id);
      }
    });

    habitsContainer.appendChild(habit);
  }

  function handleProgressChange(grid, progressType, notification, habitId) {
    const days = Array.from(grid.querySelectorAll('.day'));
    const currentProgress = days.map((day) => parseInt(day.dataset.progress));

    const targetDays = days.filter(
      (day) => parseInt(day.dataset.progress) === 0
    );

    if (targetDays.length > 0) {
      const randomIndex = Math.floor(Math.random() * targetDays.length);
      const selectedDay = targetDays[randomIndex];
      selectedDay.dataset.progress = progressType;
      if (progressType === 1) {
        selectedDay.classList.add('level-1'); // Verde
      } else if (progressType === -1) {
        selectedDay.classList.add('level-negative'); // Vermelho
      }
    }

    const updatedProgress = days.map((day) => parseInt(day.dataset.progress));
    updateHabitProgress(habitId, updatedProgress);

    const allFilled = updatedProgress.every((value) => value !== 0);
    notification.style.display = allFilled ? 'block' : 'none';
  }

  habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const habitName = habitNameInput.value.trim();
    if (habitName) {
      handleAddHabit(habitName);
      habitNameInput.value = '';
    }

    saveHabitsOrderToLocalStorage();
  });

  const themeToggle = document.getElementById('theme-toggle');

  // Carregar o tema salvo no localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  }

  // Alternar tema ao clicar no botão
  themeToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });

  loadHabits();
});
