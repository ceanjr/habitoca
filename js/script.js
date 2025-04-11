document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const habitForm = document.getElementById('habit-form');
  const habitNameInput = document.getElementById('habit-name');
  const habitsContainer = document.getElementById('habits');
  const appContainer = document.querySelector('.container');
  const authContainer = document.querySelector('.auth-container');
  const registerMessage = document.getElementById('register-message');
  const loginMessage = document.getElementById('login-message');
  const logoutButton = document.getElementById('logout-button');
  const loginContainer = document.getElementById('login-container');
  const registerContainer = document.getElementById('register-container');
  const showRegisterButton = document.getElementById('show-register');
  const showLoginButton = document.getElementById('show-login');

  const config = {
    rows: 7,
    cols: 30,
  };

  const serverURL = 'https://kaleidoscopic-horse-7b4ff9.netlify.app'; // Atualiza a porta para 4000
  let authToken = localStorage.getItem('authToken');

  async function registerUser(name, email, password) {
    try {
      const response = await fetch(`${serverURL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (registerMessage) {
          // Verifique se registerMessage existe
          registerMessage.textContent = data.message;
        }
      } else {
        if (registerMessage) {
          // Verifique se registerMessage existe
          registerMessage.textContent = data.error || 'Erro ao registrar.';
        }
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
      if (registerMessage) {
        // Verifique se registerMessage existe
        registerMessage.textContent = 'Erro de conexão com o servidor.';
      }
    }
  }

  async function loginUser(email, password) {
    try {
      const response = await fetch(`${serverURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userName', data.name);
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        if (loginMessage) {
          // Verificação adicional
          loginMessage.textContent = '';
        }
        displayUserName();
        await loadHabits();
      } else {
        console.log(loginMessage); // verificação
        if (loginMessage) {
          // Verificação adicional
          loginMessage.textContent = data.error || 'Erro ao fazer login.';
        }
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      if (loginMessage) {
        // Verificação adicional
        loginMessage.textContent = 'Erro de conexão com o servidor.';
      }
    }
  }

  function displayUserName() {
    const userName = localStorage.getItem('userName');
    if (userName) {
      const greetingElement = document.getElementById('greeting'); // Crie um elemento com esse ID no seu HTML
      if (greetingElement) {
        greetingElement.textContent = `Olá, ${userName}!`;
      } else {
        console.warn('Elemento com ID "greeting" não encontrado no HTML.');
      }
    }
  }

  // Função genérica para fazer requisições autenticadas
  async function authenticatedFetch(url, options = {}) {
    if (!authToken) {
      // Se não houver token, redirecione para a tela de login ou mostre um erro
      authContainer.style.display = 'block';
      appContainer.style.display = 'none';
      throw new Error('Não autenticado.');
    }
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...options.headers,
    };
    return fetch(url, { ...options, headers });
  }

  async function fetchHabitsFromServer() {
    try {
      const response = await authenticatedFetch(`${serverURL}/habits`);
      const data = await response.json();
      // Como o backend retorna { [userId]: habits }, precisamos extrair os hábitos
      const userIdFromToken = JSON.parse(atob(authToken.split('.')[1])).userId;
      return data[userIdFromToken] || [];
    } catch (error) {
      console.error('Erro ao buscar hábitos do servidor:', error);
      return [];
    }
  }

  async function saveHabitToServer(habit) {
    try {
      const response = await authenticatedFetch(`${serverURL}/habits`, {
        method: 'POST',
        body: JSON.stringify({ habits: [habit] }),
      });
      const data = await response.json();
      return data.results && data.results[0];
    } catch (error) {
      console.error('Erro ao salvar hábito no servidor:', error);
      return null;
    }
  }

  async function updateHabitProgressOnServer(habitId, progressArray) {
    try {
      await authenticatedFetch(`${serverURL}/habits/${habitId}`, {
        method: 'PUT',
        body: JSON.stringify({ progress: progressArray }),
      });
    } catch (error) {
      console.error('Erro ao atualizar progresso no servidor:', error);
    }
  }

  async function deleteHabitFromServer(habitId) {
    try {
      await authenticatedFetch(`${serverURL}/habits/${habitId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Erro ao deletar hábito do servidor:', error);
    }
  }

  async function loadHabits() {
    const habits = await fetchHabitsFromServer();
    habits.forEach((habit) =>
      addHabitToUI(
        habit.name,
        config.rows,
        config.cols,
        habit.id,
        habit.progress
      )
    );

    habits.forEach((habit) => {
      // Verifica se os botões devem ser desabilitados no carregamento inicial
      if (
        dailyActions[habit.id] &&
        isSameDay(new Date(dailyActions[habit.id]))
      ) {
        const habitElement = document.querySelector(
          `.habit[data-habit-id="${habit.id}"]`
        );
        if (habitElement) {
          habitElement.querySelector('.add-progress').disabled = true;
          habitElement.querySelector('.remove-progress').disabled = true;
        }
      }
    });
  }

  function highlightSequences(grid, progress) {
    const days = Array.from(grid.querySelectorAll('.day'));
    let longestSequence = 0;
    let currentSequenceLength = 0;

    // Limpa todas as classes de sequência existentes
    days.forEach((day) => {
      for (let i = 1; i <= progress.length; i++) {
        day.classList.remove(`sequence-${i}`);
      }
    });

    // Recalcula e adiciona as classes de sequência apenas onde necessário
    days.forEach((day, index) => {
      const progressValue = parseInt(day.dataset.progress);

      if (progressValue === 1) {
        currentSequenceLength++;
        day.classList.add(`sequence-${currentSequenceLength}`);
        longestSequence = Math.max(longestSequence, currentSequenceLength);
      } else {
        currentSequenceLength = 0;
      }
    });

    // Opcional: Você pode usar 'longestSequence' para algo no futuro, como destacar a maior sequência.
  }

  async function handleAddHabit(habitName) {
    const newHabit = {
      name: habitName,
      progress: Array(config.rows * config.cols).fill(0),
    };
    const savedHabit = await saveHabitToServer(newHabit);
    if (savedHabit && savedHabit.id) {
      addHabitToUI(
        savedHabit.name,
        config.rows,
        config.cols,
        savedHabit.id,
        savedHabit.progress
      );
    }
  }

  async function removeHabit(habitElement, habitId) {
    await deleteHabitFromServer(habitId);
    habitsContainer.removeChild(habitElement);
  }

  let dailyActions = JSON.parse(localStorage.getItem('dailyActions')) || {};

  function addHabitToUI(name, rows, cols, id, progress) {
    const habit = document.createElement('div');
    habit.draggable = true;
    habit.classList.add('habit');
    habit.dataset.habitId = id;

    habit.innerHTML = `
      <div class="card-header">
        <h2>${name}</h2>
        <img class="remove-habit" src="./assets/lixeira.svg" alt="icone de lixeira">
      </div>
      <p class="notification" style="display: none;">Todos os quadrados já foram preenchidos!</p>
      <div class="habit-grid"></div>
      <div class="habit-buttons">
        <div>
          <button type="button" class="add-progress">Sim</button>
          <button type="button" class="remove-progress">Não</button>
        </div>
        <span class="checked-span">Check!</span>
      </div>
    `;

    const grid = habit.querySelector('.habit-grid');
    const notification = habit.querySelector('.notification');
    const addProgressButton = habit.querySelector('.add-progress');
    const removeProgressButton = habit.querySelector('.remove-progress');
    const removeHabitButton = habit.querySelector('.remove-habit');
    const checkedSpan = habit.querySelector('.checked-span');

    checkedSpan.style.display = 'none';

    const progressArray = progress || Array(rows * cols).fill(0);

    progressArray.forEach((value, index) => {
      const day = document.createElement('div');
      day.classList.add('day');
      day.dataset.index = index;
      day.dataset.progress = value;
      if (value === 1) day.classList.add('level-1');
      if (value === -1) day.classList.add('level-negative');
      grid.appendChild(day);
    });

    highlightSequences(grid, progressArray);

    // Verifica se os botões devem ser desabilitados
    if (dailyActions[id] && isSameDay(new Date(dailyActions[id]))) {
      addProgressButton.disabled = true;
      removeProgressButton.disabled = true;
      checkedSpan.style.display = 'inline'; // Mostra o "Check!"
    }

    addProgressButton.addEventListener('click', () => {
      handleProgressChange(grid, 1, notification, id);
      disableButtons(id);
      checkedSpan.style.display = 'inline'; // Mostra o "Check!"
    });

    removeProgressButton.addEventListener('click', () => {
      handleProgressChange(grid, -1, notification, id);
      disableButtons(id);
      checkedSpan.style.display = 'inline'; // Mostra o "Check!"
    });

    let confirmDelete = false;

    removeHabitButton.addEventListener('click', () => {
      if (!confirmDelete) {
        confirmDelete = true;
        removeHabitButton.classList.add('second-click-remove-habit');
        setTimeout(() => {
          confirmDelete = false;
          removeHabitButton.classList.remove('second-click-remove-habit');
        }, 5000);
      } else {
        removeHabit(habit, id);
      }
    });

    habitsContainer.appendChild(habit);
  }

  showRegisterButton.addEventListener('click', () => {
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
  });

  showLoginButton.addEventListener('click', () => {
    registerContainer.style.display = 'none';
    loginContainer.style.display = 'block';
  });

  async function handleProgressChange(
    grid,
    progressType,
    notification,
    habitId
  ) {
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
        selectedDay.classList.add('level-1');
      } else if (progressType === -1) {
        selectedDay.classList.add('level-negative');
      }

      const updatedProgress = days.map((day) => parseInt(day.dataset.progress));
      await updateHabitProgressOnServer(habitId, updatedProgress);

      highlightSequences(grid, updatedProgress);

      // Atualiza a data da última ação
      dailyActions[habitId] = new Date().toISOString(); // Armazena como string ISO
      localStorage.setItem('dailyActions', JSON.stringify(dailyActions));

      const allFilled = updatedProgress.every((value) => value !== 0);
      notification.style.display = allFilled ? 'block' : 'none';
    }
  }

  function disableButtons(habitId) {
    const habitElement = document.querySelector(
      `.habit[data-habit-id="${habitId}"]`
    );
    if (habitElement) {
      habitElement.querySelector('.add-progress').disabled = true;
      habitElement.querySelector('.remove-progress').disabled = true;
    }
  }

  function enableButtons(habitId) {
    const habitElement = document.querySelector(
      `.habit[data-habit-id="${habitId}"]`
    );
    if (habitElement) {
      habitElement.querySelector('.add-progress').disabled = false;
      habitElement.querySelector('.remove-progress').disabled = false;
      habitElement.querySelector('.checked-span').style.display = 'none'; // Esconde o "Check!"
    }
  }

  function isSameDay(date) {
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function checkDailyActions() {
    dailyActions = JSON.parse(localStorage.getItem('dailyActions')) || {}; // Recarrega do localStorage
    Object.keys(dailyActions).forEach((habitId) => {
      if (!isSameDay(new Date(dailyActions[habitId]))) {
        enableButtons(habitId);
      }
    });
  }

  // Verifica as ações diárias a cada minuto
  setInterval(checkDailyActions, 60000);

  habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const habitName = habitNameInput.value.trim();
    if (habitName) {
      const newHabit = {
        name: habitName,
        progress: Array(config.rows * config.cols).fill(0),
      };
      const savedHabit = await saveHabitToServer(newHabit);
      if (savedHabit && savedHabit.id) {
        addHabitToUI(
          savedHabit.name,
          config.rows,
          config.cols,
          savedHabit.id,
          savedHabit.progress
        );
        habitNameInput.value = '';
      }
    }
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value; // Obtém o nome
    const email = document.getElementById('register-email').value; // Obtém o email
    const password = document.getElementById('register-password').value;
    registerUser(name, email, password); // Chama registerUser com nome e email
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value; // Obtém o email
    const password = document.getElementById('login-password').value;
    loginUser(email, password); // Chama loginUser com email
  });

  function logout() {
    localStorage.removeItem('authToken'); // Remove o token do localStorage
    authToken = null; // Limpa a variável authToken
    authContainer.style.display = 'block'; // Mostra a tela de autenticação
    appContainer.style.display = 'none'; // Esconde a aplicação
    habitsContainer.innerHTML = ''; // Limpa a lista de hábitos (opcional)
  }

  // Adiciona um event listener ao botão de logout
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  }
  themeToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });

  // Verifica se já existe um token ao carregar a página
  if (authToken) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    displayUserName();
    loadHabits();
  } else {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
  }

  let input = document.querySelector('.password');
  let img = document.querySelector('#eye');
  img.addEventListener('click', function () {
    // if (input.type == 'text') {
    //   input.type = 'password';
    // } else {
    //   input.type = 'text';
    // }
    input.type = input.type == 'text' ? 'password' : 'text';
  });
});
