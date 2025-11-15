// game/gameState.js

// Objeto que armazenará o estado de todas as rodadas em todos os servidores
const gameState = {};

/**
 * Inicializa ou retorna o estado do jogo para um servidor específico.
 * @param {string} guildId - O ID do servidor.
 * @returns {object} O objeto de estado do jogo.
 */
function getGameState(guildId) {
  if (!gameState[guildId]) {
    gameState[guildId] = {
      isActive: false,
      currentRound: 0,
      maxRounds: 3, //L imite de rodadas
      totalScores: {}, // Placar acumulado de todos os jogadores
      currentLetter: null,
      startTime: null,
      duration: 60,
      players: {},
      categories: ["Nome", "Objeto", "Cidade", "Animal"],
      timer: null, // Para armazenar o objeto Timer
    };
  }
  return gameState[guildId];
}

module.exports = {
  getGameState,
};
