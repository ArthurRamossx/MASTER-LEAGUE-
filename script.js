// Master League - Firebase e Gerenciamento Final

import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Config
const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };
const db = getDatabase();

// Estado
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
};

// Utils
const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: (val) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "EUR",
    }).format(val),
  formatBetAmount: (val) =>
    val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  cleanBetAmount: (val) => val.replace(/\./g, ""),
};

// UI
const UI = {
  toggle: (id, show) =>
    document.getElementById(id)?.classList[show ? "remove" : "add"]("hidden"),
  notify: (msg, error = false) => {
    const n = document.getElementById("notification");
    document.getElementById("notificationText").textContent = msg;
    n.className = `notification ${error ? "error" : ""} show`;
    setTimeout(() => n.classList.remove("show"), 5000);
  },
};

// Auth
function loginAdmin() {
  const pass = document.getElementById("adminPassword").value;
  if (pass === ADMIN_PASSWORD) {
    appState.isAdmin = true;
    UI.toggle("adminPanel", true);
    UI.toggle("adminLogin", false);
    UI.notify("Login admin realizado!");
  } else UI.notify("Senha incorreta!", true);
}
function logoutAdmin() {
  appState.isAdmin = false;
  UI.toggle("adminPanel", false);
  UI.toggle("adminLogin", true);
  UI.notify("Logout realizado!");
}

// Game Management
function addGame(event) {
  event.preventDefault();
  const name = document.getElementById("gameName").value;
  const homeTeam = document.getElementById("homeTeam").value;
  const awayTeam = document.getElementById("awayTeam").value;
  const homeOdd = parseFloat(document.getElementById("homeOdd").value);
  const drawOdd = parseFloat(document.getElementById("drawOdd").value);
  const awayOdd = parseFloat(document.getElementById("awayOdd").value);

  if (!name || !homeTeam || !awayTeam || !homeOdd || !drawOdd || !awayOdd)
    return UI.notify("Preencha todos os campos!", true);

  push(ref(db, "games"), {
    name,
    homeTeam,
    awayTeam,
    homeOdd,
    drawOdd,
    awayOdd,
  });
  UI.notify(`Jogo "${name}" adicionado!`);
}

function removeGame(id) {
  remove(ref(db, "games/" + id));
  UI.notify("Jogo removido!");
}

function renderGames(games) {
  const tbody = document.querySelector("#gamesTable tbody");
  const select = document.getElementById("gameSelect");
  tbody.innerHTML = "";
  select.innerHTML = '<option value="">Selecione um jogo...</option>';
  if (!games) return;
  Object.entries(games).forEach(([id, game]) => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${game.name}</td>
      <td>${game.homeTeam} vs ${game.awayTeam}</td>
      <td>${game.homeOdd}</td>
      <td>${game.drawOdd}</td>
      <td>${game.awayOdd}</td>
      <td>${appState.isAdmin ? `<button class="btn btn-danger" onclick="removeGame('${id}')">Remover</button>` : ""}</td>`;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${game.name} - ${game.homeTeam} vs ${game.awayTeam}`;
    select.appendChild(opt);
  });
}

function renderOddsButtons(game) {
  const container = document.getElementById("oddsButtons");
  container.innerHTML = `
    <div class="odd-button" onclick="selectBetType('home')">${game.homeTeam} (${game.homeOdd})</div>
    <div class="odd-button" onclick="selectBetType('draw')">Empate (${game.drawOdd})</div>
    <div class="odd-button" onclick="selectBetType('away')">${game.awayTeam} (${game.awayOdd})</div>
  `;
}

// Bets
function placeBet(event) {
  event.preventDefault();
  const playerName = document.getElementById("playerName").value;
  const amount = parseInt(
    Utils.cleanBetAmount(document.getElementById("betAmount").value),
  );
  const gameId = appState.selectedGameId;
  const betType = appState.selectedBetType;

  if (!playerName || !gameId || !betType || !amount)
    return UI.notify("Preencha todos os campos!", true);
  if (amount < BET_LIMITS.MIN || amount > BET_LIMITS.MAX)
    return UI.notify(
      `Aposta entre ${Utils.formatCurrency(BET_LIMITS.MIN)} e ${Utils.formatCurrency(BET_LIMITS.MAX)}!`,
      true,
    );

  onValue(
    ref(db, "games/" + gameId),
    (snap) => {
      const game = snap.val();
      if (!game) return UI.notify("Jogo inválido!", true);
      const odd =
        betType === "home"
          ? game.homeOdd
          : betType === "draw"
            ? game.drawOdd
            : game.awayOdd;
      push(ref(db, "bets"), {
        playerName,
        gameId,
        gameName: game.name,
        betType,
        amount,
        odd,
        status: "Pendente",
        createdAt: new Date().toISOString(),
      });
      UI.notify("Aposta registrada!");
    },
    { once: true },
  );
}

function selectBetType(type) {
  appState.selectedBetType = type;
  updatePossibleWin();
}

function selectGame() {
  const sel = document.getElementById("gameSelect");
  const gameId = sel.value;
  appState.selectedGameId = gameId;
  onValue(
    ref(db, "games/" + gameId),
    (snap) => {
      const game = snap.val();
      if (game) {
        renderOddsButtons(game);
        UI.toggle("oddsContainer", true);
      }
    },
    { once: true },
  );
}

function updatePossibleWin() {
  const amt = document.getElementById("betAmount").value;
  const winEl = document.getElementById("possibleWinAmount");
  if (!appState.selectedGameId || !appState.selectedBetType || !amt) {
    UI.toggle("possibleWinDisplay", false);
    return;
  }
  const amount = parseInt(Utils.cleanBetAmount(amt));
  onValue(
    ref(db, "games/" + appState.selectedGameId),
    (snap) => {
      const game = snap.val();
      if (!game) return;
      const odd =
        appState.selectedBetType === "home"
          ? game.homeOdd
          : appState.selectedBetType === "draw"
            ? game.drawOdd
            : game.awayOdd;
      winEl.textContent = Utils.formatCurrency(amount * odd);
      UI.toggle("possibleWinDisplay", true);
    },
    { once: true },
  );
}

// Render bets table
function renderBets(bets) {
  const tbody = document.querySelector("#betsTable tbody");
  tbody.innerHTML = "";
  if (!bets) return;
  Object.values(bets).forEach((bet) => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${bet.playerName}</td>
      <td>${bet.gameName}</td>
      <td>${bet.betType}</td>
      <td>${Utils.formatCurrency(bet.amount)}</td>
      <td>${bet.odd}</td>
      <td>${Utils.formatCurrency(bet.amount * bet.odd)}</td>
      <td>${bet.status}</td>
      <td>${new Date(bet.createdAt).toLocaleString()}</td>`;
  });
}

// Início
document.addEventListener("DOMContentLoaded", () => {
  // Jogos
  onValue(ref(db, "games"), (snap) => {
    renderGames(snap.val());
  });

  // Apostas
  onValue(ref(db, "bets"), (snap) => {
    renderBets(snap.val());
  });
});
