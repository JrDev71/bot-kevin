// protectionManager.js
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.resolve(__dirname, "protectionData.json");

// Estrutura inicial
// { panela: ["ID1", "ID2"], blacklist: ["ID3", "ID4"] }

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { panela: [], blacklist: [] };
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Erro ao ler protectionData.json:", e);
    return { panela: [], blacklist: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  // --- PANELA (Anti-ban) ---
  addToPanela: (userId) => {
    const data = loadData();
    if (data.panela.includes(userId)) return false;
    data.panela.push(userId);
    saveData(data);
    return true;
  },
  removeFromPanela: (userId) => {
    const data = loadData();
    const index = data.panela.indexOf(userId);
    if (index === -1) return false;
    data.panela.splice(index, 1);
    saveData(data);
    return true;
  },
  isPanela: (userId) => {
    const data = loadData();
    return data.panela.includes(userId);
  },

  // --- BLACKLIST ---
  addToBlacklist: (userId) => {
    const data = loadData();
    if (data.blacklist.includes(userId)) return false;
    data.blacklist.push(userId);
    saveData(data);
    return true;
  },
  removeFromBlacklist: (userId) => {
    const data = loadData();
    const index = data.blacklist.indexOf(userId);
    if (index === -1) return false;
    data.blacklist.splice(index, 1);
    saveData(data);
    return true;
  },
  isBlacklisted: (userId) => {
    const data = loadData();
    return data.blacklist.includes(userId);
  },

  getList: (type) => {
    const data = loadData();
    return data[type] || [];
  },
};
