/* ========================================
   Board — Chess.js + Chessboard.js wiring
   ======================================== */

const Board = (() => {

  let chess = new Chess();
  let board = null;
  let highlights = [];
  let aiThinking = false;

  function init() {
    const config = {
      position: 'start',
      draggable: true,
      pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      onMouseoverSquare: onMouseoverSquare,
      onMouseoutSquare: clearHighlights
    };

    board = Chessboard('board', config);
    $(window).on('resize', () => board.resize());

    // Initial UI
    UI.updateTurn(true);
    UI.updateStatus('Your turn \u2014 drag a piece to move');
  }

  function onDragStart(source, piece) {
    if (chess.game_over() || aiThinking) return false;
    if (chess.turn() === 'b') return false;
    if (piece.search(/^b/) !== -1) return false;
  }

  function onDrop(source, target) {
    clearHighlights();

    const move = chess.move({
      from: source,
      to: target,
      promotion: 'q'
    });

    if (move === null) return 'snapback';

    afterHumanMove(move);
  }

  function onSnapEnd() {
    board.position(chess.fen());
  }

  function onMouseoverSquare(square) {
    if (aiThinking || chess.game_over()) return;
    const piece = chess.get(square);
    if (!piece || piece.color !== 'w' || chess.turn() !== 'w') return;

    const moves = chess.moves({ square, verbose: true });
    if (moves.length === 0) return;

    clearHighlights();
    for (const m of moves) {
      const target = chess.get(m.to);
      const cls = target ? 'highlight-legal-capture' : 'highlight-legal';
      $('#board .square-' + m.to).addClass(cls);
      highlights.push({ sq: m.to, cls });
    }
  }

  function clearHighlights() {
    for (const h of highlights) {
      $('#board .square-' + h.sq).removeClass(h.cls);
    }
    highlights = [];
  }

  function highlightLastMove(from, to) {
    // Clear old last-move highlights
    $('#board .highlight-last-from').removeClass('highlight-last-from');
    $('#board .highlight-last-to').removeClass('highlight-last-to');

    $('#board .square-' + from).addClass('highlight-last-from');
    $('#board .square-' + to).addClass('highlight-last-to');
  }

  function highlightCheck() {
    // Find king square of the player in check
    const turn = chess.turn();
    const boardState = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = boardState[r][c];
        if (sq && sq.type === 'k' && sq.color === turn) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          const sqName = file + rank;
          $('#board .square-' + sqName).addClass('highlight-check');
          highlights.push({ sq: sqName, cls: 'highlight-check' });
        }
      }
    }
  }

  /* ----- After human move ----- */

  async function afterHumanMove(move) {
    syncUI(move);

    if (chess.game_over()) {
      handleGameOver();
      return;
    }

    // AI analysis of human move
    if (UI.isAutoAnalysis()) {
      Analysis.analyzeLastMove(chess.fen(), chess.history().join(' '));
    }

    // Identify opening at move 5 or 10
    const fullMoves = Math.ceil(chess.history().length / 2);
    if (fullMoves === 5 || fullMoves === 10) {
      Analysis.identifyOpening(chess.history().join(' '));
    }

    // AI's turn
    await makeAIMove();
  }

  /* ----- AI Move ----- */

  async function makeAIMove() {
    if (chess.game_over() || chess.turn() !== 'b') return;

    aiThinking = true;
    UI.updateStatus('AI is thinking...');
    document.getElementById('board').classList.add('board-thinking');

    try {
      const response = await AI.getMove(chess.fen(), App.getDifficulty());
      const move = parseAndMakeUCI(response);

      if (move) {
        board.position(chess.fen(), true);
        syncUI(move);

        if (move.captured) {
          document.getElementById('board-container').classList.add('capture-shake');
          setTimeout(() => document.getElementById('board-container').classList.remove('capture-shake'), 300);
        }

        if (chess.game_over()) {
          handleGameOver();
        } else if (UI.isAutoAnalysis()) {
          Analysis.analyzeLastMove(chess.fen(), chess.history().join(' '));
        }

        const fullMoves = Math.ceil(chess.history().length / 2);
        if (fullMoves === 5 || fullMoves === 10) {
          Analysis.identifyOpening(chess.history().join(' '));
        }
      }
    } catch (e) {
      console.error('AI move error:', e);
      // Fallback: random legal move
      const legals = chess.moves({ verbose: true });
      if (legals.length > 0) {
        const rand = legals[Math.floor(Math.random() * legals.length)];
        const move = chess.move(rand);
        board.position(chess.fen(), true);
        syncUI(move);
        UI.showToast('info', 'AI Fallback', 'AI made a random move due to an error.');
      }
    } finally {
      aiThinking = false;
      document.getElementById('board').classList.remove('board-thinking');
      if (!chess.game_over()) {
        if (chess.in_check()) {
          UI.updateStatus('Check! Your turn');
        } else {
          UI.updateStatus('Your turn \u2014 drag a piece to move');
        }
      }
    }
  }

  function parseAndMakeUCI(text) {
    const match = text.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/);
    if (!match) {
      // Fallback: pick random move
      const legals = chess.moves({ verbose: true });
      if (legals.length > 0) {
        return chess.move(legals[Math.floor(Math.random() * legals.length)]);
      }
      return null;
    }
    const uci = match[1];
    const moveObj = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    if (uci.length === 5) moveObj.promotion = uci[4];
    return chess.move(moveObj);
  }

  /* ----- UI Sync ----- */

  function syncUI(lastMove) {
    const isWhite = chess.turn() === 'w';
    UI.updateTurn(isWhite);
    UI.updateMoveHistory(chess.history());
    UI.updateMoveNumber(Math.ceil(chess.history().length / 2));
    UI.updateMaterial(chess);

    if (lastMove) {
      highlightLastMove(lastMove.from, lastMove.to);
    }

    if (chess.in_check()) {
      highlightCheck();
      UI.updateStatus('Check!', true);
    }
  }

  /* ----- Game Over ----- */

  function handleGameOver() {
    let title = '', detail = '';
    if (chess.in_checkmate()) {
      title = chess.turn() === 'w' ? 'Black Wins!' : 'White Wins!';
      detail = 'Checkmate';
    } else if (chess.in_stalemate()) {
      title = 'Draw';
      detail = 'Stalemate';
    } else if (chess.in_threefold_repetition()) {
      title = 'Draw';
      detail = 'Threefold repetition';
    } else if (chess.insufficient_material()) {
      title = 'Draw';
      detail = 'Insufficient material';
    } else if (chess.in_draw()) {
      title = 'Draw';
      detail = '50-move rule';
    }
    UI.updateStatus(title + ' \u2014 ' + detail);
    UI.showGameOver(title, detail);
  }

  /* ----- Controls ----- */

  function reset() {
    chess.reset();
    board.start();
    clearHighlights();
    $('#board .highlight-last-from').removeClass('highlight-last-from');
    $('#board .highlight-last-to').removeClass('highlight-last-to');
    $('#board .highlight-check').removeClass('highlight-check');
    UI.updateTurn(true);
    UI.updateStatus('Your turn \u2014 drag a piece to move');
    UI.updateMoveHistory([]);
    UI.updateMoveNumber(0);
    UI.showCoachEmpty();
    document.getElementById('opening-slot').innerHTML = '';
    document.getElementById('material-container').style.display = 'none';
  }

  function undoMove() {
    if (aiThinking || chess.history().length === 0) return;
    chess.undo(); // undo Black
    chess.undo(); // undo White
    board.position(chess.fen());
    clearHighlights();
    $('#board .highlight-last-from').removeClass('highlight-last-from');
    $('#board .highlight-last-to').removeClass('highlight-last-to');
    $('#board .highlight-check').removeClass('highlight-check');
    syncUI(null);
    UI.updateStatus('Your turn \u2014 drag a piece to move');
  }

  function flipBoard() {
    board.flip();
  }

  function getFen() {
    return chess.fen();
  }

  function getHistory() {
    return chess.history();
  }

  function getChess() {
    return chess;
  }

  return {
    init, reset, undoMove, flipBoard,
    getFen, getHistory, getChess
  };

})();
