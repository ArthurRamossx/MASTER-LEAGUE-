// Master League Betting System - Versão Final Completa

// Estado global
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  games: [],
  bets: [],
  isLoading: false
};

// Chaves de armazenamento
const STORAGE_KEYS = {
  GAMES: "masterleague_games_v2",
  BETS: "masterleague_bets_v2",
  ADMIN_SESSION: "masterleague_admin_session"
};

// Configurações
const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

// Utilitários
const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(numAmount);
  },
  formatBetAmount: (value) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
  cleanBetAmount: (value) => value.replace(/\./g, ''),
  formatDate: (date) => new Date(date).toLocaleString('pt-BR'),
  validateRequired: (fields) => fields.every(field => field && field.toString().trim()),
  debounce: (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
};

// Armazenamento
const Storage = {
  save: (key, data) => {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch (e) { console.error(e); return false; }
  },
  load: (key, defaultValue = []) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch { return defaultValue; }
  },
  saveAll: () => {
    Storage.save(STORAGE_KEYS.GAMES, appState.games);
    Storage.save(STORAGE_KEYS.BETS, appState.bets);
  },
  loadAll: () => {
    appState.games = Storage.load(STORAGE_KEYS.GAMES, []);
    appState.bets = Storage.load(STORAGE_KEYS.BETS, []);
    const session = Storage.load(STORAGE_KEYS.ADMIN_SESSION, null);
    if (session && session.isLoggedIn) appState.isAdmin = true;
  }
};

// UI
const UI = {
  toggleVisibility: (id, show) => {
    const el = document.getElementById(id);
    if (el) el.classList[show ? 'remove' : 'add']('hidden');
  },
  showNotification: (msg, error = false) => {
    const notif = document.getElementById("notification");
    const text = document.getElementById("notificationText");
    text.textContent = msg;
    notif.className = `notification ${error ? 'error' : ''} show`;
    setTimeout(() => notif.classList.remove('show'), 5000);
  },
  updatePossibleWin: Utils.debounce(() => {
    const betAmountInput = document.getElementById("betAmount");
    const possibleWinAmount = document.getElementById("possibleWinAmount");
    if (appState.selectedGameId && appState.selectedBetType && betAmountInput.value) {
      const game = appState.games.find(g => g.id === appState.selectedGameId);
      const amount = parseInt(Utils.cleanBetAmount(betAmountInput.value));
      if (game && !isNaN(amount) && amount > 0) {
        const odd = appState.selectedBetType === 'home' ? game.homeOdd : appState.selectedBetType === 'draw' ? game.drawOdd : game.awayOdd;
        possibleWinAmount.textContent = Utils.formatCurrency(amount * odd);
        UI.toggleVisibility("possibleWinDisplay", true);
        return;
      }
    }
    UI.toggleVisibility("possibleWinDisplay", false);
  }, 300)
};

// Autenticação
const Auth = {
  login: (password) => {
    if (password === ADMIN_PASSWORD) {
      appState.isAdmin = true;
      Storage.save(STORAGE_KEYS.ADMIN_SESSION, { isLoggedIn: true });
      UI.toggleVisibility("adminPanel", true);
      UI.toggleVisibility("adminLogin", false);
      GameManager.renderGames();
      BetManager.renderBets();
      UI.showNotification("Login admin realizado!");
      return true;
    } else {
      UI.showNotification("Senha incorreta!", true);
      return false;
    }
  },
  logout: () => {
    appState.isAdmin = false;
    Storage.save(STORAGE_KEYS.ADMIN_SESSION, { isLoggedIn: false });
    UI.toggleVisibility("adminPanel", false);
    UI.toggleVisibility("adminLogin", true);
    UI.showNotification("Logout realizado!");
  }
};

// Gerenciamento de jogos
const GameManager = {
  add: ({name, homeTeam, awayTeam, homeOdd, drawOdd, awayOdd}) => {
    if (!Utils.validateRequired([name, homeTeam, awayTeam, homeOdd, drawOdd, awayOdd])) { UI.showNotification("Preencha todos os campos!", true); return; }
    const game = { id: Utils.generateId(), name, homeTeam, awayTeam, homeOdd: parseFloat(homeOdd), drawOdd: parseFloat(drawOdd), awayOdd: parseFloat(awayOdd) };
    appState.games.push(game);
    Storage.saveAll();
    GameManager.renderGames();
    GameManager.renderGameOptions();
    UI.showNotification(`Jogo "${name}" adicionado!`);
  },
  remove: (id) => {
    appState.games = appState.games.filter(g => g.id !== id);
    Storage.saveAll();
    GameManager.renderGames();
    GameManager.renderGameOptions();
    UI.showNotification("Jogo removido!");
  },
  renderGames: () => {
    const tbody = document.querySelector("#gamesTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (appState.games.length === 0) { tbody.innerHTML = '<tr><td colspan="6">Nenhum jogo cadastrado</td></tr>'; return; }
    appState.games.forEach(game => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${game.name}</td>
        <td>${game.homeTeam} vs ${game.awayTeam}</td>
        <td>${game.homeOdd}</td>
        <td>${game.drawOdd}</td>
        <td>${game.awayOdd}</td>
        <td><button class="btn btn-danger" onclick="GameManager.remove('${game.id}')">Remover</button></td>
      `;
    });
  },
  renderGameOptions: () => {
    const select = document.getElementById("gameSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um jogo...</option>';
    appState.games.forEach(game => {
      const option = document.createElement('option');
      option.value = game.id;
      option.textContent = `${game.name} - ${game.homeTeam} vs ${game.awayTeam}`;
      select.appendChild(option);
    });
  },
  renderOddsButtons: (game) => {
    const container = document.getElementById("oddsButtons");
    if (!container) return;
    container.innerHTML = `
      <div class="odd-button" onclick="BetManager.selectBetType('home')">${game.homeTeam} (${game.homeOdd})</div>
      <div class="odd-button" onclick="BetManager.selectBetType('draw')">Empate (${game.drawOdd})</div>
      <div class="odd-button" onclick="BetManager.selectBetType('away')">${game.awayTeam} (${game.awayOdd})</div>
    `;
  }
};

// Gerenciamento de apostas
const BetManager = {
  place: ({playerName, gameId, betType, amount}) => {
    if (!Utils.validateRequired([playerName, gameId, betType, amount])) { UI.showNotification("Preencha todos os campos!", true); return; }
    const numAmount = parseInt(amount);
    if (numAmount < BET_LIMITS.MIN || numAmount > BET_LIMITS.MAX) { UI.showNotification(`Aposta entre ${Utils.formatCurrency(BET_LIMITS.MIN)} e ${Utils.formatCurrency(BET_LIMITS.MAX)}!`, true); return; }
    const game = appState.games.find(g => g.id === gameId);
    if (!game) { UI.showNotification("Jogo inválido!", true); return; }
    const odd = betType === 'home' ? game.homeOdd : betType === 'draw' ? game.drawOdd : game.awayOdd;
    const bet = { id: Utils.generateId(), playerName, gameId, gameName: game.name, betType, amount: numAmount, odd, status: "Pendente", createdAt: new Date().toISOString() };
    appState.bets.push(bet);
    Storage.saveAll();
    BetManager.renderBets();
    UI.showNotification("Aposta registrada!");
  },
  selectBetType: (type) => {
    appState.selectedBetType = type;
    UI.updatePossibleWin();
  },
  renderBets: () => {
    const tbody = document.querySelector("#betsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (appState.bets.length === 0) { tbody.innerHTML = '<tr><td colspan="8">Nenhuma aposta registrada</td></tr>'; return; }
    appState.bets.forEach(bet => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${bet.playerName}</td>
        <td>${bet.gameName}</td>
        <td>${bet.betType}</td>
        <td>${Utils.formatCurrency(bet.amount)}</td>
        <td>${bet.odd}</td>
        <td>${Utils.formatCurrency(bet.amount * bet.odd)}</td>
        <td>${bet.status}</td>
        <td>${Utils.formatDate(bet.createdAt)}</td>
      `;
    });
  }
};

// Eventos
function loginAdmin() { Auth.login(document.getElementById("adminPassword").value); }
function logoutAdmin() { Auth.logout(); }
function addGame(event) { event.preventDefault(); GameManager.add({
  name: document.getElementById("gameName").value,
  homeTeam: document.getElementById("homeTeam").value,
  awayTeam: document.getElementById("awayTeam").value,
  homeOdd: document.getElementById("homeOdd").value,
  drawOdd: document.getElementById("drawOdd").value,
  awayOdd: document.getElementById("awayOdd").value
}); }
function selectGame() {
  const sel = document.getElementById("gameSelect");
  const gameId = sel.value;
  appState.selectedGameId = gameId;
  const game = appState.games.find(g => g.id === gameId);
  if (game) GameManager.renderOddsButtons(game);
  UI.toggleVisibility("oddsContainer", !!game);
}
function formatBetAmount(input) { input.value = Utils.formatBetAmount(input.value); UI.updatePossibleWin(); }
function placeBet(event) {
  event.preventDefault();
  BetManager.place({
    playerName: document.getElementById("playerName").value,
    gameId: appState.selectedGameId,
    betType: appState.selectedBetType,
    amount: Utils.cleanBetAmount(document.getElementById("betAmount").value)
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  Storage.loadAll();
  if (appState.isAdmin) { UI.toggleVisibility("adminPanel",