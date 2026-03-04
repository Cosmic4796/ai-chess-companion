/* ========================================
   App — Main controller, init, game ops
   ======================================== */

const App = (() => {

  let difficulty = 'medium';

  function init() {
    Board.init();
    Chat.init();
  }

  function getDifficulty() {
    return difficulty;
  }

  function setDifficulty(val) {
    difficulty = val;
    document.querySelectorAll('#difficulty-pills .pill').forEach(p => {
      p.classList.toggle('active', p.dataset.val === val);
    });
  }

  function newGame() {
    Board.reset();
    Chat.clear();
    UI.showToast('info', 'New Game', 'Board reset. White to move.');
  }

  function copyFen() {
    const fen = Board.getFen();
    navigator.clipboard.writeText(fen).then(() => {
      UI.showToast('info', 'FEN Copied', fen.split(' ')[0] + '...');
    }).catch(() => {
      UI.showToast('info', 'FEN', fen);
    });
  }

  function exportPgn() {
    const chess = Board.getChess();
    const pgn = chess.pgn({ max_width: 60 });
    if (!pgn) {
      UI.showToast('info', 'No Moves', 'Play some moves first.');
      return;
    }
    navigator.clipboard.writeText(pgn).then(() => {
      UI.showToast('info', 'PGN Copied', 'Game notation copied to clipboard.');
    }).catch(() => {
      UI.showModal('PGN Export', `<pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-primary)">${UI.escapeHtml(pgn)}</pre>`);
    });
  }

  // Boot
  $(document).ready(init);

  return { getDifficulty, setDifficulty, newGame, copyFen, exportPgn };

})();
