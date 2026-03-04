/* ========================================
   UI — Modals, Toasts, Settings, Banners
   ======================================== */

const UI = (() => {

  let autoAnalysis = true;

  /* ----- Modal ----- */

  function showModal(title, htmlContent) {
    const backdrop = document.getElementById('modal-backdrop');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = htmlContent;
    backdrop.classList.remove('closing');
    backdrop.classList.add('active');
  }

  function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop.classList.contains('active')) return;
    backdrop.classList.add('closing');
    setTimeout(() => {
      backdrop.classList.remove('active', 'closing');
    }, 200);
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ----- Toasts ----- */

  function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const icons = {
      good: '\u2713',
      inaccuracy: '!',
      blunder: '\u2717',
      info: 'i'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'i'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('dismissing');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  /* ----- Opening Banner ----- */

  function showOpeningBanner(name, description) {
    const slot = document.getElementById('opening-slot');
    // Remove existing
    slot.innerHTML = '';

    const banner = document.createElement('div');
    banner.className = 'opening-banner';
    banner.innerHTML = `
      <span class="opening-icon">&#9822;</span>
      <div class="opening-info">
        <div class="opening-name">${escapeHtml(name)}</div>
        ${description ? `<div class="opening-desc">${escapeHtml(description)}</div>` : ''}
      </div>
      <button class="opening-close" onclick="this.parentElement.remove()" title="Dismiss">&times;</button>
    `;
    slot.appendChild(banner);
  }

  /* ----- Settings Drawer ----- */

  function toggleSettings() {
    document.getElementById('settings-overlay').classList.toggle('active');
    document.getElementById('settings-drawer').classList.toggle('open');
  }

  function toggleAnalysis() {
    autoAnalysis = !autoAnalysis;
    const track = document.getElementById('analysis-toggle');
    track.classList.toggle('on', autoAnalysis);
    document.getElementById('analysis-label').textContent = autoAnalysis ? 'On' : 'Off';
  }

  function toggleBoardTheme() {
    document.body.classList.toggle('light-board');
    const isLight = document.body.classList.contains('light-board');
    document.getElementById('theme-toggle').classList.toggle('on', isLight);
    document.getElementById('theme-label').textContent = isLight ? 'Light' : 'Dark';
  }

  function isAutoAnalysis() {
    return autoAnalysis;
  }

  /* ----- Coach Panel ----- */

  function showCoachLoading() {
    document.getElementById('coach-content').innerHTML = `
      <div class="shimmer" style="width:90%"></div>
      <div class="shimmer" style="width:75%"></div>
      <div class="shimmer" style="width:60%"></div>
    `;
  }

  function showCoachMessage(html) {
    document.getElementById('coach-content').innerHTML = html;
  }

  function showCoachEmpty() {
    document.getElementById('coach-content').innerHTML =
      '<p class="text-muted italic">Make a move to get analysis...</p>';
  }

  /* ----- Turn & Status ----- */

  function updateTurn(isWhite) {
    const dot = document.getElementById('turn-dot');
    dot.className = 'turn-dot' + (isWhite ? '' : ' black-turn') + ' active';
    document.getElementById('turn-text').textContent = isWhite ? 'White to move' : 'Black to move';

    const wrapper = document.getElementById('board-wrapper');
    wrapper.classList.toggle('your-turn', isWhite);
  }

  function updateStatus(text, isCheck) {
    const bar = document.getElementById('status-bar');
    document.getElementById('status-text').textContent = text;
    bar.classList.toggle('check', !!isCheck);
  }

  function updateMoveNumber(n) {
    document.getElementById('move-number').textContent = n;
  }

  /* ----- Move History ----- */

  function updateMoveHistory(history) {
    const el = document.getElementById('move-list');
    if (history.length === 0) {
      el.innerHTML = '<span class="text-muted italic">No moves yet</span>';
      return;
    }
    let html = '';
    for (let i = 0; i < history.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      const isLastWhite = i === history.length - 1 || i === history.length - 2;
      const isLastBlack = i + 1 === history.length - 1;
      html += `<span class="move-pair">`;
      html += `<span class="move-num">${num}.</span>`;
      html += `<span class="move-white${isLastWhite && !history[i+1] ? ' last-move' : ''}">${history[i]}</span>`;
      if (history[i + 1]) {
        html += `<span class="move-black${isLastBlack ? ' last-move' : ''}">${history[i + 1]}</span>`;
      }
      html += `</span>`;
    }
    el.innerHTML = html;
    el.parentElement.scrollTop = el.parentElement.scrollHeight;
  }

  /* ----- Material ----- */

  function updateMaterial(chess) {
    const board = chess.board();
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let white = 0, black = 0;
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        const v = values[sq.type] || 0;
        if (sq.color === 'w') white += v;
        else black += v;
      }
    }
    const total = white + black || 1;
    const pct = Math.round((white / total) * 100);
    const diff = white - black;

    const container = document.getElementById('material-container');
    container.style.display = (white + black < 78) ? 'block' : 'none'; // show after captures

    document.getElementById('material-fill').style.width = pct + '%';
    document.getElementById('material-diff').textContent =
      diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Even';
  }

  /* ----- Game Over Modal ----- */

  function showGameOver(title, detail) {
    const icon = title.includes('Wins') ? (title.includes('White') ? '\u2654' : '\u265A') : '\u00BD';
    showModal('Game Over', `
      <div class="game-over-content">
        <div class="result-icon">${icon}</div>
        <h2>${escapeHtml(title)}</h2>
        <p class="result-detail">${escapeHtml(detail)}</p>
        <button class="btn btn-primary" onclick="UI.closeModal(); App.newGame();">Play Again</button>
      </div>
    `);
  }

  /* ----- Utility ----- */

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return {
    showModal, closeModal,
    showToast, showOpeningBanner,
    toggleSettings, toggleAnalysis, toggleBoardTheme,
    isAutoAnalysis,
    showCoachLoading, showCoachMessage, showCoachEmpty,
    updateTurn, updateStatus, updateMoveNumber,
    updateMoveHistory, updateMaterial,
    showGameOver, escapeHtml
  };

})();
