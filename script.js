// Master League Betting System - Firebase Version
const FIREBASE_URL = "https://master-league-853a2-default-rtdb.firebaseio.com/";

// Global State
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  games: [],
  bets: []
};

// Admin Configuration
const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

// Utility Functions
const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: (amount) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(amount),
  cleanBetAmount: (value) => value.replace(/\./g, ''),
  validateRequired: (fields) => fields.every(f => f && f.toString().trim())
};

// Firebase Functions
const Firebase = {
  saveGames: async () => {
    await fetch(`${FIREBASE_URL}/games.json`, {
      method: "PUT",
      body: JSON.stringify(appState.games)
    });
  },
  saveBets: async () => {
    await fetch(`${FIREBASE_URL}/bets.json`, {
      method: "PUT",
      body: JSON.stringify(appState.bets)
    });
  },
  loadGames: async () => {
    const res = await fetch(`${FIREBASE_URL}/games.json`);
    const data = await res.json();
    appState.games = data ? Object.values(data) : [];
  },
  loadBets: async () => {
    const res = await fetch(`${FIREBASE_URL}/bets.json`);
    const data = await res.json();
    appState.bets = data ? Object.values(data) : [];
  }
};

// UI Functions
const UI = {
  showNotification: (msg, isError = false) => {
    const notif = document.getElementById("notification");
    const notifText = document.getElementById("notificationText");
    notifText.textContent = msg;
    notif.className = `notification ${isError ? 'error' : ''} show`;
    setTimeout(() => notif.classList.remove("show"), 5000);
  },
  toggleVisibility: (id, show) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  },
  clearForm: (formId) => {
    const form = document.getElementById(formId);
    if (form) form.reset();
  }
};

// Admin Auth
const Auth = {
  login: (password) => {
    if (password === ADMIN_PASSWORD) {
      appState.isAdmin = true;
      UI.toggleVisibility("adminPanel", true);
      UI.toggleVisibility("adminLogin", false);
      GameManager.renderGames();
      BetManager.renderBets();
      UI.showNotification("Login realizado!");
    } else UI.showNotification("Senha incorreta!", true);
  },
  logout: () => {
    appState.isAdmin = false;
    UI.toggleVisibility("adminPanel", false);
    UI.toggleVisibility("adminLogin", true);
  }
};

// Game Manager
const GameManager = {
  add: async (data) => {
    if (!Utils.validateRequired([data.name, data.homeTeam, data.awayTeam, data.homeOdd, data.drawOdd, data.awayOdd])) {
      UI.showNotification("Preencha todos os campos!", true);
      return;
    }
    const game = { id: Utils.generateId(), ...data };
    appState.games.push(game);
    await Firebase.saveGames();
    GameManager.renderGames();
    GameManager.renderGameOptions();
    UI.showNotification(`Jogo "${data.name}" adicionado!`);
  },
  renderGames: () => {
    const tbody = document.querySelector("#gamesTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!appState.games.length) {
      tbody.innerHTML = "<tr><td colspan='6'>Nenhum jogo cadastrado</td></tr>";
      return;
    }
    appState.games.forEach(game => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${game.name}</td>
        <td>${game.homeTeam} vs ${game.awayTeam}</td>
        <td>${game.homeOdd}</td>
        <td>${game.drawOdd}</td>
        <td>${game.awayOdd}</td>
        <td><button class="btn btn-danger" onclick="GameManager.remove('${game.id}')">🗑️ Remover</button></td>
      `;
    });
  },
  renderGameOptions: () => {
    const select = document.getElementById("gameSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um jogo...</option>';
    appState.games.forEach(game => {
      const opt = document.createElement("option");
      opt.value = game.id;
      opt.textContent = `${game.name} - ${game.homeTeam} vs ${game.awayTeam}`;
      select.appendChild(opt);
    });
  },
  remove: async (id) => {
    appState.games = appState.games.filter(g => g.id !== id);
    await Firebase.saveGames();
    GameManager.renderGames();
    GameManager.renderGameOptions();
    UI.showNotification("Jogo removido!");
  }
};

// Bet Manager
const BetManager = {
  place: async (data) => {
    if (!Utils.validateRequired([data.playerName, data.gameId, data.betType, data.amount])) {
      UI.showNotification("Preencha todos os campos!", true);
      return;
    }
    const game = appState.games.find(g => g.id === data.gameId);
    if (!game) { UI.showNotification("Jogo inválido!", true); return; }
    const bet = { id: Utils.generateId(), gameName: game.name, ...data, status: "Pendente" };
    appState.bets.push(bet);
    await Firebase.saveBets();
    BetManager.renderBets();
    UI.showNotification(`Aposta registrada!`);
  },
  renderBets: () => {
    const tbody = document.querySelector("#betsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!appState.bets.length) {
      tbody.innerHTML = "<tr><td colspan='8'>Nenhuma aposta registrada</td></tr>";
      return;
    }
    appState.bets.forEach(bet => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${bet.playerName}</td>
        <td>${bet.gameName}</td>
        <td>${bet.betType}</td>
        <td>${Utils.formatCurrency(bet.amount)}</td>
        <td>${bet.odd || '-'}</td>
        <td>${Utils.formatCurrency(bet.amount)}</td>
        <td>${bet.status}</td>
        <td></td>
      `;
    });
  }
};

// Event Handlers
document.getElementById("adminLogin")?.addEventListener("submit", (e) => { e.preventDefault(); Auth.login(document.getElementById("adminPassword").value); });
document.getElementById("addGameForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await GameManager.add({
    name: document.getElementById("gameName").value,
    homeTeam: document.getElementById("homeTeam").value,
    awayTeam: document.getElementById("awayTeam").value,
    homeOdd: parseFloat(document.getElementById("homeOdd").value),
    drawOdd: parseFloat(document.getElementById("drawOdd").value),
    awayOdd: parseFloat(document.getElementById("awayOdd").value)
  });
  UI.clearForm("addGameForm");
});
document.getElementById("betForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await BetManager.place({
    playerName: document.getElementById("playerName").value,
    gameId: document.getElementById("gameSelect").value,
    betType: document.getElementById("oddsButtons").querySelector(".selected")?.dataset.type,
    amount: parseInt(Utils.cleanBetAmount(document.getElementById("betAmount").value))
  });
  UI.clearForm("betForm");
});

// Initialize App
async function init() {
  await Firebase.loadGames();
  await Firebase.loadBets();
  GameManager.renderGameOptions();
  GameManager.renderGames();
  BetManager.renderBets();
}
document.addEventListener("DOMContentLoaded", init);
