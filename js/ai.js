/* ========================================
   AI Layer — All Groq API calls go through
   the server-side /api/chess endpoint
   ======================================== */

const AI = (() => {

  async function callChessAPI(payload) {
    const res = await fetch('/api/chess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    const data = await res.json();
    return data.result;
  }

  async function getMove(fen, difficulty) {
    return callChessAPI({ action: 'get_move', fen, difficulty });
  }

  async function analyzeMove(fen, moves) {
    return callChessAPI({ action: 'analyze_move', fen, moves });
  }

  async function explainPosition(fen, moves) {
    return callChessAPI({ action: 'explain_position', fen, moves });
  }

  async function chat(fen, moves, chatHistory) {
    return callChessAPI({ action: 'chat', fen, moves, chatHistory });
  }

  async function identifyOpening(moves) {
    return callChessAPI({ action: 'identify_opening', moves });
  }

  return { getMove, analyzeMove, explainPosition, chat, identifyOpening };

})();
