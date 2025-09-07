// --- ESTADO GLOBAL ---
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  games: [],
  bets: []
};

const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: num => `€${Number(num).toLocaleString("pt-BR")}`,
  show: el => el.classList.remove("hidden"),
  hide: el => el.classList.add("hidden")
};

// --- LOGIN ADMIN ---
window.loginAdmin = function () {
  const passInput = document.getElementById("adminPassword").value;
  if (passInput === ADMIN_PASSWORD) {
    appState.isAdmin = true;
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

// --- RENDERIZAÇÃO ---
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

function renderBetsTable() {
  const tbody = document.querySelector("#betsTable tbody");
  tbody.innerHTML = "";
  appState.bets.forEach(b => {
    const game = appState.games.find(g => g.id === b.gameId);
    if (!game) return;
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

// --- FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  databaseURL: "https://master-league-853a2-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- LISTENERS EM TEMPO REAL ---
onValue(ref(db, "games"), (snapshot) => {
  const data = snapshot.val();
  appState.games = data ? Object.values(data) : [];
  renderGamesTable();
  populateGameSelect();
});

onValue(ref(db, "bets"), (snapshot) => {
  const data = snapshot.val();
  appState.bets = data ? Object.values(data) : [];
  renderBetsTable();
});

// --- AÇÕES ---
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
  set(ref(db, `games/${game.id}`), game);
  e.target.reset();
  notify("✅ Jogo adicionado!");
};

window.deleteGame = function (id) {
  remove(ref(db, `games/${id}`));
  notify("⚠️ Jogo removido!");
};

window.placeBet = function (e) {
  e.preventDefault();
  if (!appState.selectedGameId || !appState.selectedBetType) {
    return notify("❌ Selecione um jogo e aposta!");
  }
  const name = document.getElementById("playerName").value;
  const amount = Number(document.getElementById("betAmount").value.replace(/\D/g, ""));
  if (amount < BET_LIMITS.MIN || amount > BET_LIMITS.MAX) {
    return notify("❌ Valor fora do limite!");
  }
  const bet = {
    id: Utils.generateId(),
    player: name,
    gameId: appState.selectedGameId,
    type: appState.selectedBetType,
    amount,
    status: "Pendente"
  };
  set(ref(db, `bets/${bet.id}`), bet);
  document.getElementById("betForm").reset();
  Utils.hide(document.getElementBy
             // --- Complemento para manter sessão do admin ---
             window.loginAdmin = function () {
               const passInput = document.getElementById("adminPassword").value;
               if (passInput === ADMIN_PASSWORD) {
                 appState.isAdmin = true;
                 localStorage.setItem("isAdminSession", "true"); // salva sessão
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
               localStorage.removeItem("isAdminSession"); // remove sessão
               Utils.hide(document.getElementById("adminPanel"));
               Utils.show(document.getElementById("adminLogin"));
               notify("⚠️ Logout realizado.");
             };

             // Ao carregar a página, verifica se já estava logado
             document.addEventListener("DOMContentLoaded", () => {
               if (localStorage.getItem("isAdminSession") === "true") {
                 appState.isAdmin = true;
                 Utils.show(document.getElementById("adminPanel"));
                 Utils.hide(document.getElementById("adminLogin"));
                 renderGamesTable();
                 renderBetsTable();
               }
             });
