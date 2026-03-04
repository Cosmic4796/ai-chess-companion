/* ========================================
   Chat — Coach conversation system
   ======================================== */

const Chat = (() => {

  let chatHistory = [];
  let sending = false;

  function init() {
    const input = document.getElementById('chat-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    showEmpty();
  }

  function showEmpty() {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-icon">&#9822;</div>
        <p>Ask me anything about chess!<br>Strategy, openings, tactics, or this position.</p>
      </div>
    `;
  }

  async function send() {
    if (sending) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Remove empty state if present
    const empty = document.querySelector('.chat-empty');
    if (empty) empty.remove();

    // Add user message
    addBubble(text, 'user');
    chatHistory.push({ role: 'user', content: text });

    // Add thinking indicator
    const thinkingEl = addBubble(null, 'thinking');

    sending = true;

    try {
      const result = await AI.chat(
        Board.getFen(),
        Board.getHistory().join(' '),
        chatHistory
      );

      thinkingEl.remove();
      addBubble(result, 'assistant');
      chatHistory.push({ role: 'assistant', content: result });
    } catch (e) {
      thinkingEl.remove();
      addBubble('Sorry, I encountered an error: ' + e.message, 'assistant');
    } finally {
      sending = false;
    }
  }

  function addBubble(text, type) {
    const container = document.getElementById('chat-messages');

    const el = document.createElement('div');

    if (type === 'thinking') {
      el.className = 'chat-message assistant';
      el.innerHTML = `
        <span class="chat-avatar">&#9822; Coach</span>
        <div class="thinking-dots">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
        </div>
      `;
    } else if (type === 'user') {
      el.className = 'chat-message user';
      el.textContent = text;
    } else {
      el.className = 'chat-message assistant';
      el.innerHTML = `<span class="chat-avatar">&#9822; Coach</span>`;
      const p = document.createElement('span');
      p.textContent = text;
      el.appendChild(p);
    }

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function clear() {
    chatHistory = [];
    showEmpty();
  }

  return { init, send, clear };

})();
