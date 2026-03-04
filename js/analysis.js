/* ========================================
   Analysis — Move analysis, position
   explanation, opening identification
   ======================================== */

const Analysis = (() => {

  async function analyzeLastMove(fen, moves) {
    UI.showCoachLoading();

    try {
      const result = await AI.analyzeMove(fen, moves);

      // Parse quality from first word
      const firstWord = result.split(/[\s,.!]/)[0].toUpperCase();
      let quality = 'info';
      if (firstWord === 'GOOD') quality = 'good';
      else if (firstWord === 'INACCURACY') quality = 'inaccuracy';
      else if (firstWord === 'BLUNDER') quality = 'blunder';

      // Build badge
      const badgeLabels = { good: 'Good Move', inaccuracy: 'Inaccuracy', blunder: 'Blunder' };
      const badgeHtml = quality !== 'info'
        ? `<span class="quality-badge ${quality}">${badgeLabels[quality]}</span>`
        : '';

      // Strip quality word from display text
      let displayText = result;
      if (['GOOD', 'INACCURACY', 'BLUNDER'].includes(firstWord)) {
        displayText = result.slice(firstWord.length).replace(/^[\s:,.-]+/, '');
      }

      UI.showCoachMessage(badgeHtml + `<p>${UI.escapeHtml(displayText)}</p>`);

      // Toast notification
      if (quality !== 'info') {
        const shortMsg = displayText.length > 80 ? displayText.slice(0, 80) + '...' : displayText;
        UI.showToast(quality, badgeLabels[quality], shortMsg);
      }
    } catch (e) {
      console.error('Analysis error:', e);
      UI.showCoachMessage(`<p class="text-muted italic">Analysis unavailable: ${UI.escapeHtml(e.message)}</p>`);
    }
  }

  async function explainPosition() {
    if (Board.getHistory().length === 0) {
      UI.showToast('info', 'No Moves', 'Make some moves first to get a position analysis.');
      return;
    }

    // Show modal with loading state
    UI.showModal('Position Analysis', `
      <div class="shimmer" style="width:90%"></div>
      <div class="shimmer" style="width:80%"></div>
      <div class="shimmer" style="width:70%"></div>
      <div class="shimmer" style="width:85%"></div>
      <div class="shimmer" style="width:60%"></div>
    `);

    try {
      const result = await AI.explainPosition(Board.getFen(), Board.getHistory().join(' '));

      // Parse sections by ## headers
      const sections = result.split(/^##\s*/m).filter(Boolean);
      let html = '';

      for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        html += `
          <div class="analysis-section">
            <h4>${UI.escapeHtml(title)}</h4>
            <p>${UI.escapeHtml(body)}</p>
          </div>
        `;
      }

      if (!html) {
        html = `<p>${UI.escapeHtml(result)}</p>`;
      }

      document.getElementById('modal-body').innerHTML = html;
    } catch (e) {
      document.getElementById('modal-body').innerHTML =
        `<p class="text-muted">Error: ${UI.escapeHtml(e.message)}</p>`;
    }
  }

  async function identifyOpening(moves) {
    try {
      const result = await AI.identifyOpening(moves);
      const parts = result.split(' - ');
      const name = parts[0].trim().replace(/^["']|["']$/g, '');
      const desc = parts.slice(1).join(' - ').trim().replace(/^["']|["']$/g, '');
      UI.showOpeningBanner(name, desc);
    } catch (e) {
      console.error('Opening identification error:', e);
    }
  }

  return { analyzeLastMove, explainPosition, identifyOpening };

})();
