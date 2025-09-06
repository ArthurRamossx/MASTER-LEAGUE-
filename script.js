// Master League Betting System
// Complete JavaScript functionality for eFootball 2026 betting platform

// Global State Management
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  games: [],
  bets: [],
  isLoading: false
};

// Storage Keys
const STORAGE_KEYS = {
  GAMES: "masterleague_games_v2",
  BETS: "masterleague_bets_v2",
  ADMIN_SESSION: "masterleague_admin_session"
};

// Admin Configuration
const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = {
  MIN: 500000,
  MAX: 5000000
};

// Utility Functions
const Utils = {
  // Generate unique ID
  generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Format currency for display
  formatCurrency: (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(numAmount);
  },
  
  // Format bet amount with dots
  formatBetAmount: (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
  
  // Clean bet amount (remove dots)
  cleanBetAmount: (value) => {
    return value.replace(/\./g, '');
  },
  
  // Format date for display
  formatDate: (date) => {
    return new Date(date).toLocaleString('pt-BR');
  },
  
  // Validate form data
  validateRequired: (fields) => {
    return fields.every(field => field && field.toString().trim());
  },
  
  // Debounce function for performance
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Data Storage Management
const Storage = {
  // Save data to localStorage with error handling
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      UI.showNotification('Erro ao salvar dados', true);
      return false;
    }
  },
  
  // Load data from localStorage
  load: (key, defaultValue = []) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('Storage load error:', error);
      return defaultValue;
    }
  },
  
  // Save all app data
  saveAll: () => {
    const success = Storage.save(STORAGE_KEYS.GAMES, appState.games) && 
                   Storage.save(STORAGE_KEYS.BETS, appState.bets);
    
    if (success) {
      console.log('Data saved successfully');
    }
    return success;
  },
  
  // Load all app data
  loadAll: () => {
    appState.games = Storage.load(STORAGE_KEYS.GAMES, []);
    appState.bets = Storage.load(STORAGE_KEYS.BETS, []);
    
    // Load admin session
    const adminSession = Storage.load(STORAGE_KEYS.ADMIN_SESSION, null);
    if (adminSession && (Date.now() - adminSession.timestamp) < 86400000) { // 24 hours
      appState.isAdmin = adminSession.isLoggedIn;
    }
    
    console.log('Data loaded:', { 
      games: appState.games.length, 
      bets: appState.bets.length,
      isAdmin: appState.isAdmin
    });
  }
};

// UI Management
const UI = {
  // Show notification toast
  showNotification: (message, isError = false) => {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notificationText");
    
    notificationText.textContent = message;
    notification.className = `notification ${isError ? 'error' : ''} show`;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      UI.hideNotification();
    }, 5000);
  },
  
  // Hide notification
  hideNotification: () => {
    const notification = document.getElementById("notification");
    notification.classList.remove('show');
  },
  
  // Show loading spinner
  showLoading: () => {
    appState.isLoading = true;
    document.getElementById("loadingSpinner").classList.remove("hidden");
  },
  
  // Hide loading spinner
  hideLoading: () => {
    appState.isLoading = false;
    document.getElementById("loadingSpinner").classList.add("hidden");
  },
  
  // Toggle element visibility
  toggleVisibility: (elementId, show) => {
    const element = document.getElementById(elementId);
    if (show) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  },
  
  // Clear form
  clearForm: (formId) => {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  },
  
  // Update possible win display
  updatePossibleWin: Utils.debounce(() => {
    const betAmountInput = document.getElementById("betAmount");
    const possibleWinDisplay = document.getElementById("possibleWinDisplay");
    const possibleWinAmount = document.getElementById("possibleWinAmount");
    
    if (appState.selectedGameId && appState.selectedBetType && betAmountInput.value) {
      const game = appState.games.find(g => g.id === appState.selectedGameId);
      const amount = parseInt(Utils.cleanBetAmount(betAmountInput.value));
      
      if (game && !isNaN(amount) && amount > 0) {
        let odd = 0;
        switch (appState.selectedBetType) {
          case 'home': odd = game.homeOdd; break;
          case 'draw': odd = game.drawOdd; break;
          case 'away': odd = game.awayOdd; break;
        }
        
        const possibleWin = amount * odd;
        possibleWinAmount.textContent = Utils.formatCurrency(possibleWin);
        UI.toggleVisibility("possibleWinDisplay", true);
        return;
      }
    }
    
    UI.toggleVisibility("possibleWinDisplay", false);
  }, 300)
};

// Authentication System
const Auth = {
  // Admin login
  login: (password) => {
    if (password === ADMIN_PASSWORD) {
      appState.isAdmin = true;
      
      // Save admin session
      Storage.save(STORAGE_KEYS.ADMIN_SESSION, {
        isLoggedIn: true,
        timestamp: Date.now()
      });
      
      UI.toggleVisibility("adminPanel", true);
      UI.toggleVisibility("adminLogin", false);
      
      // Render admin data
      GameManager.renderGames();
      BetManager.renderBets();
      
      UI.showNotification("Login realizado com sucesso!");
      return true;
    } else {
      UI.showNotification("Senha incorreta! Tente novamente.", true);
      return false;
    }
  },
  
  // Admin logout
  logout: () => {
    appState.isAdmin = false;
    
    // Clear admin session
    Storage.save(STORAGE_KEYS.ADMIN_SESSION, {
      isLoggedIn: false,
      timestamp: Date.now()
    });
    
    UI.toggleVisibility("adminPanel", false);
    UI.toggleVisibility("adminLogin", true);
    
    // Reset selected values
    appState.selectedGameId = "";
    appState.selectedBetType = "";
    
    UI.showNotification("Logout realizado com sucesso!");
  }
};

// Game Management System
const GameManager = {
  // Add new game
  add: (gameData) => {
    const { name, homeTeam, awayTeam, homeOdd, drawOdd, awayOdd } = gameData;
    
    // Validation
    if (!Utils.validateRequired([name, homeTeam, awayTeam, homeOdd, drawOdd, awayOdd])) {
      UI.showNotification("Preencha todos os campos!", true);
      return false;
    }
    
    if (homeOdd <= 0 || drawOdd <= 0 || awayOdd <= 0) {
      UI.showNotification("Todas as odds devem ser maiores que 0!", true);
      return false;
    }
    
    // Create game object
    const game = {
      id: Utils.generateId(),
      name: name.trim(),
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeOdd: parseFloat(homeOdd),
      drawOdd: parseFloat(drawOdd),
      awayOdd: parseFloat(awayOdd),
      createdAt: new Date().toISOString()
    };
    
    // Add to state and save
    appState.games.push(game);
    Storage.saveAll();
    
    // Update UI
    GameManager.renderGames();
    GameManager.renderGameOptions();
    
    UI.showNotification(`Jogo "${name}" adicionado com sucesso!`);
    return true;
  },
  
  // Remove game
  remove: (gameId) => {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) return false;
    
    if (confirm(`Tem certeza que deseja remover o jogo "${game.name}"?`)) {
      // Remove from state
      appState.games = appState.games.filter(g => g.id !== gameId);
      Storage.saveAll();
      
      // Update UI
      GameManager.renderGames();
      GameManager.renderGameOptions();
      
      UI.showNotification("Jogo removido com sucesso!");
      return true;
    }
    return false;
  },
  
  // Render games table (admin view)
  renderGames: () => {
    const tbody = document.querySelector("#gamesTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (appState.games.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum jogo cadastrado ainda</td></tr>';
      return;
    }
    
    appState.games.forEach((game) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${game.name}</strong></td>
        <td>${game.homeTeam} vs ${game.awayTeam}</td>
        <td><span style="background: rgba(72, 187, 120, 0.1); color: #2f855a; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${game.homeOdd}</span></td>
        <td><span style="background: rgba(237, 137, 54, 0.1); color: #c05621; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${game.drawOdd}</span></td>
        <td><span style="background: rgba(245, 101, 101, 0.1); color: #c53030; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${game.awayOdd}</span></td>
        <td>
          <button class="btn btn-danger" onclick="GameManager.remove('${game.id}')" data-testid="button-remove-game-${game.id}">
            🗑️ Remover
          </button>
        </td>
      `;
    });
  },
  
  // Render game options for betting
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
  
  // Render odds buttons for selected game
  renderOddsButtons: (game) => {
    const container = document.getElementById("oddsButtons");
    if (!container) return;
    
    container.innerHTML = `
      <div class="odd-button" onclick="BetManager.selectBetType('home')" data-testid="button-bet-home">
        <div class="team-name">${game.homeTeam}</div>
        <div class="bet-type">Casa</div>
        <div class="odd-value">${game.homeOdd}</div>
      </div>
      <div class="odd-button" onclick="BetManager.selectBetType('draw')" data-testid="button-bet-draw">
        <div class="team-name">Empate</div>
        <div class="bet-type">X</div>
        <div class="odd-value">${game.drawOdd}</div>
      </div>
      <div class="odd-button" onclick="BetManager.selectBetType('away')" data-testid="button-bet-away">
        <div class="team-name">${game.awayTeam}</div>
        <div class="bet-type">Fora</div>
        <div class="odd-value">${game.awayOdd}</div>
      </div>
    `;
  }
};

// Bet Management System
const BetManager = {
  // Place new bet
  place: (betData) => {
    const { playerName, gameId, betType, amount } = betData;
    
    // Validation
    if (!Utils.validateRequired([playerName, gameId, betType, amount])) {
      UI.showNotification("Preencha todos os campos!", true);
      return false;
    }
    
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < BET_LIMITS.MIN || numAmount > BET_LIMITS.MAX) {
      UI.showNotification(`A aposta deve estar entre ${Utils.formatCurrency(BET_LIMITS.MIN)} e ${Utils.formatCurrency(BET_LIMITS.MAX)}!`, true);
      return false;
    }
    
    const game = appState.games.find(g => g.id === gameId);
    if (!game) {
      UI.showNotification("Jogo inválido!", true);
      return false;
    }
    
    // Calculate odds and possible win
    let odd = 0;
    let betTypeLabel = "";
    
    switch (betType) {
      case 'home': 
        odd = game.homeOdd; 
        betTypeLabel = "Casa";
        break;
      case 'draw': 
        odd = game.drawOdd; 
        betTypeLabel = "Empate";
        break;
      case 'away': 
        odd = game.awayOdd; 
        betTypeLabel = "Fora";
        break;
      default:
        UI.showNotification("Tipo de aposta inválido!", true);
        return false;
    }
    
    const possibleWin = numAmount * odd;
    
    // Create bet object
    const bet = {
      id: Utils.generateId(),
      playerName: playerName.trim(),
      gameId: gameId,
      gameName: game.name,
      betType: betType,
      betTypeLabel: betTypeLabel,
      amount: numAmount,
      odd: odd,
      possibleWin: possibleWin,
      status: "Pendente",
      createdAt: new Date().toISOString()
    };
    
    // Add to state and save
    appState.bets.push(bet);
    Storage.saveAll();
    
    // Update UI
    BetManager.renderBets();
    
    UI.showNotification(`Aposta de ${Utils.formatCurrency(numAmount)} registrada com sucesso!`);
    return true;
  },
  
  // Update bet status (admin only)
  updateStatus: (betId, status) => {
    if (!appState.isAdmin) return false;
    
    const bet = appState.bets.find(b => b.id === betId);
    if (!bet) return false;
    
    if (confirm(`Confirmar que a aposta ${status.toLowerCase()}?`)) {
      bet.status = status;
      Storage.saveAll();
      
      BetManager.renderBets();
      UI.showNotification(`Status da aposta atualizado para "${status}"!`);
      return true;
    }
    return false;
  },
  
  // Select bet type
  selectBetType: (type) => {
    appState.selectedBetType = type;
    
    // Update visual selection
    const buttons = document.querySelectorAll('.odd-button');
    buttons.forEach(button => button.classList.remove('selected'));
    
    const selectedIndex = type === 'home' ? 0 : type === 'draw' ? 1 : 2;
    if (buttons[selectedIndex]) {
      buttons[selectedIndex].classList.add('selected');
    }
    
    UI.updatePossibleWin();
  },
  
  // Render bets table (admin view)
  renderBets: () => {
    const tbody = document.querySelector("#betsTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (appState.bets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhuma aposta registrada ainda</td></tr>';
      return;
    }
    
    // Sort bets by creation date (newest first)
    const sortedBets = [...appState.bets].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    sortedBets.forEach((bet) => {
      const statusClass = bet.status === "Pendente" ? "status-pending" : 
                         bet.status === "Ganhou" ? "status-won" : "status-lost";
      
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${bet.playerName}</strong></td>
        <td>${bet.gameName}</td>
        <td><span style="background: rgba(102, 126, 234, 0.1); color: #667eea; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${bet.betTypeLabel}</span></td>
        <td><strong>${Utils.formatCurrency(bet.amount)}</strong></td>
        <td>${bet.odd}</td>
        <td><strong style="color: #667eea;">${Utils.formatCurrency(bet.possibleWin)}</strong></td>
        <td><span class="status-badge ${statusClass}">${bet.status}</span></td>
        <td>
          ${bet.status === 'Pendente' ? 
            `<button class="btn btn-success" onclick="BetManager.updateStatus('${bet.id}', 'Ganhou')" data-testid="button-bet-won-${bet.id}">✅ Ganhou</button>
             <button class="btn btn-danger" onclick="BetManager.updateStatus('${bet.id}', 'Perdeu')" data-testid="button-bet-lost-${bet.id}">❌ Perdeu</button>` : 
            '<span style="color: #718096; font-size: 12px;">Finalizado</span>'
          }
        </td>
      `;
    });
  }
};

// Export System
const ExportManager = {
  // Export to CSV
  exportCSV: () => {
    if (appState.bets.length === 0) {
      UI.showNotification("Nenhuma aposta para exportar!", true);
      return;
    }
    
    let csv = "Jogador,Jogo,Tipo de Aposta,Valor (EUR),Odd,Possível Ganho (EUR),Status,Data/Hora\n";
    
    appState.bets.forEach(bet => {
      const timestamp = Utils.formatDate(bet.createdAt);
      csv += `"${bet.playerName}","${bet.gameName}","${bet.betTypeLabel}",${bet.amount},${bet.odd},${bet.possibleWin},"${bet.status}","${timestamp}"\n`;
    });
    
    ExportManager.downloadFile(csv, 'text/csv;charset=utf-8;', '.csv');
    UI.showNotification("Relatório CSV exportado com sucesso!");
  },
  
  // Export to PDF
  exportPDF: () => {
    if (appState.bets.length === 0) {
      UI.showNotification("Nenhuma aposta para exportar!", true);
      return;
    }
    
    if (!window.jsPDF) {
      UI.showNotification("Biblioteca PDF não carregada!", true);
      return;
    }
    
    UI.showLoading();
    
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('pt-BR');
      
      // Title
      doc.setFontSize(18);
      doc.text('Master League - Relatório de Apostas', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Data: ${currentDate}`, 105, 30, { align: 'center' });
      
      // Prepare table data
      const tableData = appState.bets.map(bet => [
        bet.playerName,
        bet.gameName,
        bet.betTypeLabel,
        Utils.formatCurrency(bet.amount),
        bet.odd.toString(),
        Utils.formatCurrency(bet.possibleWin),
        bet.status,
        Utils.formatDate(bet.createdAt)
      ]);
      
      // Add table
      doc.autoTable({
        head: [['Jogador', 'Jogo', 'Tipo', 'Valor', 'Odd', 'Poss. Ganho', 'Status', 'Data/Hora']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [45, 55, 72],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });
      
      const fileName = `relatorio_apostas_masterleague_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      UI.showNotification("Relatório PDF exportado com sucesso!");
    } catch (error) {
      console.error('PDF export error:', error);
      UI.showNotification("Erro ao exportar PDF!", true);
    } finally {
      UI.hideLoading();
    }
  },
  
  // Export to WORD
  exportWORD: () => {
    if (appState.bets.length === 0) {
      UI.showNotification("Nenhuma aposta para exportar!", true);
      return;
    }
    
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    let htmlContent = `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Relatório Master League</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; color: #2d3748; margin-bottom: 10px; }
          .date { text-align: center; margin-bottom: 30px; color: #718096; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background-color: #2d3748; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .currency { text-align: right; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h1>Master League - Relatório de Apostas</h1>
        <p class="date">Data: ${currentDate}</p>
        <table>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Jogo</th>
              <th>Tipo de Aposta</th>
              <th>Valor</th>
              <th>Odd</th>
              <th>Possível Ganho</th>
              <th>Status</th>
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    appState.bets.forEach(bet => {
      const timestamp = Utils.formatDate(bet.createdAt);
      htmlContent += `
        <tr>
          <td>${bet.playerName}</td>
          <td>${bet.gameName}</td>
          <td class="center">${bet.betTypeLabel}</td>
          <td class="currency">${Utils.formatCurrency(bet.amount)}</td>
          <td class="center">${bet.odd}</td>
          <td class="currency">${Utils.formatCurrency(bet.possibleWin)}</td>
          <td class="center">${bet.status}</td>
          <td class="center">${timestamp}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    ExportManager.downloadFile(htmlContent, 'application/msword;charset=utf-8', '.doc');
    UI.showNotification("Relatório WORD exportado com sucesso!");
  },
  
  // Download file helper
  downloadFile: (content, mimeType, extension) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_apostas_masterleague_${new Date().toISOString().split('T')[0]}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Event Handlers
function loginAdmin() {
  const password = document.getElementById("adminPassword").value;
  if (Auth.login(password)) {
    document.getElementById("adminPassword").value = "";
  }
}

function logoutAdmin() {
  Auth.logout();
}

function addGame(event) {
  event.preventDefault();
  
  const gameData = {
    name: document.getElementById("gameName").value,
    homeTeam: document.getElementById("homeTeam").value,
    awayTeam: document.getElementById("awayTeam").value,
    homeOdd: document.getElementById("homeOdd").value,
    drawOdd: document.getElementById("drawOdd").value,
    awayOdd: document.getElementById("awayOdd").value
  };
  
  if (GameManager.add(gameData)) {
    UI.clearForm("addGameForm");
  }
}

function selectGame() {
  const gameSelect = document.getElementById("gameSelect");
  appState.selectedGameId = gameSelect.value;
  
  if (appState.selectedGameId) {
    const game = appState.games.find(g => g.id === appState.selectedGameId);
    if (game) {
      GameManager.renderOddsButtons(game);
      UI.toggleVisibility("oddsContainer", true);
    }
  } else {
    UI.toggleVisibility("oddsContainer", false);
  }
  
  appState.selectedBetType = "";
  UI.updatePossibleWin();
}

function formatBetAmount(input) {
  let value = input.value.replace(/\D/g, '');
  if (value) {
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = value;
  }
  UI.updatePossibleWin();
}

function placeBet(event) {
  event.preventDefault();
  
  const playerName = document.getElementById("playerName").value;
  const betAmountValue = document.getElementById("betAmount").value;
  const amount = Utils.cleanBetAmount(betAmountValue);
  
  const betData = {
    playerName: playerName,
    gameId: appState.selectedGameId,
    betType: appState.selectedBetType,
    amount: amount
  };
  
  if (BetManager.place(betData)) {
    // Clear form
    UI.clearForm("betForm");
    UI.toggleVisibility("oddsContainer", false);
    UI.toggleVisibility("possibleWinDisplay", false);
    
    // Reset state
    appState.selectedGameId = "";
    appState.selectedBetType = "";
  }
}

function toggleExportMenu() {
  const menu = document.getElementById("exportMenu");
  menu.classList.toggle("hidden");
}

function exportCSV() {
  ExportManager.exportCSV();
  document.getElementById("exportMenu").classList.add("hidden");
}

function exportPDF() {
  ExportManager.exportPDF();
  document.getElementById("exportMenu").classList.add("hidden");
}

function exportWORD() {
  ExportManager.exportWORD();
  document.getElementById("exportMenu").classList.add("hidden");
}

function closeNotification() {
  UI.hideNotification();
}

// Close export menu when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.querySelector('.export-dropdown');
  const menu = document.getElementById('exportMenu');
  
  if (dropdown && menu && !dropdown.contains(event.target)) {
    menu.classList.add('hidden');
  }
});

// Prevent form submission on Enter key in inputs (except submit buttons)
document.addEventListener('keypress', function(event) {
  if (event.key === 'Enter' && event.target.tagName !== 'BUTTON' && event.target.type !== 'submit') {
    event.preventDefault();
  }
});

// Auto-save data periodically
setInterval(() => {
  if (appState.games.length > 0 || appState.bets.length > 0) {
    Storage.saveAll();
  }
}, 60000); // Save every minute

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  console.log('Master League Betting System - Initializing...');
  
  // Load data from storage
  Storage.loadAll();
  
  // Initialize UI based on loaded data
  if (appState.isAdmin) {
    UI.toggleVisibility("adminPanel", true);
    UI.toggleVisibility("adminLogin", false);
    GameManager.renderGames();
    BetManager.renderBets();
  }
  
  // Always render game options for betting
  GameManager.renderGameOptions();
  
  console.log('Master League Betting System - Ready!');
});