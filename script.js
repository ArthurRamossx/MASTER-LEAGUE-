// Master League Betting System - Versão Final
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  games: [],
  bets: [],
  isLoading: false
};

const STORAGE_KEYS = {
  GAMES: "masterleague_games_v2",
  BETS: "masterleague_bets_v2",
  ADMIN_SESSION: "masterleague_admin_session"
};

const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: num => `€${Number(num).toLocaleString("pt-BR")}`,
  show: el => el.classList.remove("hidden"),
  hide: el => el.classList.add("hidden")
};

// --- ADMIN LOGIN ---
window.loginAdmin = function () {
  const passInput = document.getElementById("adminPassword").value;
  if (passInput === ADMIN_PASSWORD) {
    appState.isAdmin = true;
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, "true");
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
    renderGamesTable();
    renderBetsTable();
    notify("✔️ Login admin bem-sucedido!");
  } else {
    notify("❌ Senha incorreta!");
  }
};

window.logoutAdmin = function () {
  appState.isAdmin = false;
  localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  Utils.hide(document.getElementById("adminPanel"));
  Utils.show(document.getElementById("adminLogin"));
  notify("⚠️ Logout realizado.");
};

// --- NOTIFICAÇÕES ---
function notify(msg) {
  const el = document.getElementById("notification");
  document.getElementById("notificationText").textContent = msg;
  Utils.show(el);
  setTimeout(() => Utils.hide(el), 3000);
}
window.closeNotification = () => Utils.hide(document.getElementById("notification"));

// --- FORMATAÇÃO DE APOSTA ---
window.formatBetAmount = function (input) {
  let val = input.value.replace(/\D/g, "");
  input.value = Number(val).toLocaleString("pt-BR");
  calculatePossibleWin();
};

// --- CALCULAR POSSÍVEL GANHO ---
function calculatePossibleWin() {
  if (!appState.selectedGameId || !appState.selectedBetType) return;
  const game = appState.games.find(g => g.id === appState.selectedGameId);
  if (!game) return;
  const amountInput = document.getElementById("betAmount").value.replace(/\D/g, "");
  const amount = Number(amountInput);
  if (amount < BET_LIMITS.MIN || amount > BET_LIMITS.MAX) return;
  let odd = 1;
  if (appState.selectedBetType === "home") odd = game.homeOdd;
  if (appState.selectedBetType === "draw") odd = game.drawOdd;
  if (appState.selectedBetType === "away") odd = game.awayOdd;
  document.getElementById("possibleWinAmount").textContent = Utils.formatCurrency(amount * odd);
  Utils.show(document.getElementById("possibleWinDisplay"));
}

// --- JOGOS ---
function saveGames() {
  localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(appState.games));
}
function loadGames() {
  const data = localStorage.getItem(STORAGE_KEYS.GAMES);
  if (data) appState.games = JSON.parse(data);
}
window.addGame = function (e) {
  e.preventDefault();
  const game = {
    id: Utils.generateId(),
    name: document.getElementById("gameName").value,
    homeTeam: document.getElementById("homeTeam").value,
    awayTeam: document.getElementById("awayTeam").value,
    homeOdd: Number(document.getElementById("homeOdd").value),
    drawOdd: Number(document.getElementById("drawOdd").value),
    awayOdd: Number(document.getElementById("awayOdd").value)
  };
  appState.games.push(game);
  saveGames();
  renderGamesTable();
  populateGameSelect();
  e.target.reset();
  notify("✅ Jogo adicionado!");
};
function renderGamesTable() {
  const tbody = document.querySelector("#gamesTable tbody");
  tbody.innerHTML = "";
  appState.games.forEach(g => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.name}</td>
      <td>${g.homeTeam} x ${g.awayTeam}</td>
      <td>${g.homeOdd}</td>
      <td>${g.drawOdd}</td>
      <td>${g.awayOdd}</td>
      <td><button class="btn btn-danger" onclick="deleteGame('${g.id}')">🗑️ Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.deleteGame = function (id) {
  appState.games = appState.games.filter(g => g.id !== id);
  saveGames();
  renderGamesTable();
  populateGameSelect();
  notify("⚠️ Jogo removido!");
};

// --- SELECIONAR JOGO PARA APOSTA ---
function populateGameSelect() {
  const select = document.getElementById("gameSelect");
  select.innerHTML = `<option value="">Selecione um jogo...</option>`;
  appState.games.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    select.appendChild(option);
  });
}
window.selectGame = function () {
  const gameId = document.getElementById("gameSelect").value;
  appState.selectedGameId = gameId;
  const oddsContainer = document.getElementById("oddsContainer");
  if (!gameId) {
    Utils.hide(oddsContainer);
    return;
  }
  Utils.show(oddsContainer);
  const game = appState.games.find(g => g.id === gameId);
  const container = document.getElementById("oddsButtons");
  container.innerHTML = `
    <button type="button" class="btn btn-secondary" onclick="selectBetType('home')">${game.homeTeam} (${game.homeOdd})</button>
    <button type="button" class="btn btn-secondary" onclick="selectBetType('draw')">Empate (${game.drawOdd})</button>
    <button type="button" class="btn btn-secondary" onclick="selectBetType('away')">${game.awayTeam} (${game.awayOdd})</button>
  `;
};
window.selectBetType = function (type) {
  appState.selectedBetType = type;
  calculatePossibleWin();
};

// --- APOSTAS ---
function saveBets() {
  localStorage.setItem(STORAGE_KEYS.BETS, JSON.stringify(appState.bets));
}
function loadBets() {
  const data = localStorage.getItem(STORAGE_KEYS.BETS);
  if (data) appState.bets = JSON.parse(data);
}
window.placeBet = function (e) {
  e.preventDefault();
  if (!appState.selectedGameId || !appState.selectedBetType) return notify("❌ Selecione um jogo e aposta!");
  const name = document.getElementById("playerName").value;
  const amount = Number(document.getElementById("betAmount").value.replace(/\D/g, ""));
  if (amount < BET_LIMITS.MIN || amount > BET_LIMITS.MAX) return notify("❌ Valor fora do limite!");
  const bet = {
    id: Utils.generateId(),
    player: name,
    gameId: appState.selectedGameId,
    type: appState.selectedBetType,
    amount,
    status: "Pendente"
  };
  appState.bets.push(bet);
  saveBets();
  renderBetsTable();
  document.getElementById("betForm").reset();
  Utils.hide(document.getElementById("oddsContainer"));
  notify("✅ Aposta registrada!");
};
function renderBetsTable() {
  const tbody = document.querySelector("#betsTable tbody");
  tbody.innerHTML = "";
  appState.bets.forEach(b => {
    const game = appState.games.find(g => g.id === b.gameId);
    const typeText = b.type === "home" ? game.homeTeam : b.type === "draw" ? "Empate" : game.awayTeam;
    const odd = b.type === "home" ? game.homeOdd : b.type === "draw" ? game.drawOdd : game.awayOdd;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.player}</td>
      <td>${game.name}</td>
      <td>${typeText}</td>
      <td>${Utils.formatCurrency(b.amount)}</td>
      <td>${odd}</td>
      <td>${Utils.formatCurrency(b.amount * odd)}</td>
      <td>${b.status}</td>
      <td><button class="btn btn-danger" onclick="deleteBet('${b.id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.deleteBet = function (id) {
  appState.bets = appState.bets.filter(b => b.id !== id);
  saveBets();
  renderBetsTable();
  notify("⚠️ Aposta removida!");
};

// --- INICIALIZAÇÃO ---
function init() {
  loadGames();
  loadBets();
  populateGameSelect();
  if (localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === "true") {
    appState.isAdmin = true;
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
    renderGamesTable();
    renderBetsTable();
  }
}
init();
// --- Firebase Initialization ---
const FIREBASE_URL = "https://master-league-853a2-default-rtdb.firebaseio.com/";
const Firebase = {
  get: async (path) => {
    try {
      const res = await fetch(`${FIREBASE_URL}${path}.json`);
      return await res.json();
    } catch (err) {
      console.error("Firebase GET error:", err);
      return null;
    }
  },
  set: async (path, data) => {
    try {
      const res = await fetch(`${FIREBASE_URL}${path}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error("Firebase SET error:", err);
      return null;
    }
  },
  push: async (path, data) => {
    try {
      const res = await fetch(`${FIREBASE_URL}${path}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error("Firebase PUSH error:", err);
      return null;
    }
  }
};

// --- Overwrite GameManager.add to push to Firebase ---
const originalAddGame = GameManager.add;
GameManager.add = (gameData) => {
  const result = originalAddGame(gameData);
  if (result) {
    Firebase.push("games", appState.games[appState.games.length - 1]);
  }
  return result;
};

// --- Load games from Firebase on init ---
async function loadGamesFromFirebase() {
  const fbGames = await Firebase.get("games");
  if (fbGames) {
    appState.games = Object.values(fbGames);
    GameManager.renderGames();
    GameManager.renderGameOptions();
  }
}

// --- Overwrite BetManager.place to push bets to Firebase ---
const originalPlaceBet = BetManager.place;
BetManager.place = (betData) => {
  const result = originalPlaceBet(betData);
  if (result) {
    Firebase.push("bets", appState.bets[appState.bets.length - 1]);
  }
  return result;
};

// --- Load bets from Firebase on init ---
async function loadBetsFromFirebase() {
  const fbBets = await Firebase.get("bets");
  if (fbBets) {
    appState.bets = Object.values(fbBets);
    BetManager.renderBets();
  }
}

// --- Initialize Firebase Data on DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", async () => {
  await loadGamesFromFirebase();
  await loadBetsFromFirebase();
});

