export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_KEYS = [
    process.env.GROQ_KEY_1,
    process.env.GROQ_KEY_2,
    process.env.GROQ_KEY_3,
  ].filter(Boolean);

  if (GROQ_KEYS.length === 0) {
    return res.status(500).json({ error: 'No API keys configured' });
  }

  let keyIndex = Math.floor(Math.random() * GROQ_KEYS.length);

  async function callGroq(systemPrompt, messages, maxTokens = 500, temperature = 0.7) {
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
      keyIndex++;
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: maxTokens,
            temperature,
          }),
        });
        if (r.status === 429) continue;
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          throw new Error(`Groq ${r.status}: ${errText}`);
        }
        const d = await r.json();
        return d.choices[0].message.content.trim();
      } catch (e) {
        if (i === GROQ_KEYS.length - 1) throw e;
      }
    }
    throw new Error('All API keys rate limited');
  }

  const { action, fen, moves, question, difficulty, chatHistory } = req.body;

  try {
    let result;

    if (action === 'get_move') {
      const diff = difficulty === 'hard'
        ? 'Play the absolute best move possible like a grandmaster. Calculate deeply.'
        : difficulty === 'easy'
        ? 'Play a reasonable but slightly suboptimal move, like a club player. Occasionally miss tactics.'
        : 'Play a solid, good move but not necessarily the engine-best line.';
      result = await callGroq(
        `You are a chess engine playing Black. ${diff} Given the FEN, return ONLY the move in UCI format (e.g. e7e5). No explanation, no punctuation, just the move.`,
        [{ role: 'user', content: `FEN: ${fen}` }],
        20,
        difficulty === 'easy' ? 0.9 : difficulty === 'hard' ? 0.2 : 0.5
      );

    } else if (action === 'analyze_move') {
      result = await callGroq(
        `You are a world-class chess coach. The VERY FIRST WORD of your response must be exactly one of: GOOD, INACCURACY, or BLUNDER — rating the quality of the last move played. Then give 2-3 sentences of coaching insight. Be encouraging and specific about what the move accomplished or missed.`,
        [{ role: 'user', content: `FEN after move: ${fen}\nMoves played so far: ${moves}\n\nAnalyze the most recent move.` }],
        200,
        0.5
      );

    } else if (action === 'explain_position') {
      result = await callGroq(
        `You are a grandmaster chess coach. Give a structured breakdown using these exact section headers on their own lines:\n## Material Balance\n## Pawn Structure\n## King Safety\n## Piece Activity\n## Best Plan for White\n\nBe clear, educational, and reference specific squares and pieces.`,
        [{ role: 'user', content: `FEN: ${fen}\nMoves so far: ${moves || 'none'}` }],
        600,
        0.5
      );

    } else if (action === 'chat') {
      const msgs = Array.isArray(chatHistory) ? chatHistory : [{ role: 'user', content: question }];
      result = await callGroq(
        `You are an expert, friendly chess coach. The current game position FEN is: ${fen}. Moves so far: ${moves || 'none'}. Answer the student's question helpfully and concisely, referencing the current board position when relevant. Keep answers to 2-4 sentences unless more detail is needed.`,
        msgs,
        400,
        0.6
      );

    } else if (action === 'identify_opening') {
      result = await callGroq(
        `Given this chess move sequence, identify the opening. Reply with ONLY this format: "Opening Name - one sentence description". Example: "Sicilian Defense, Najdorf Variation - A sharp fighting response to 1.e4 favored by attacking players." If you're not sure, give the closest match.`,
        [{ role: 'user', content: `Moves: ${moves}` }],
        80,
        0.3
      );

    } else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    res.status(200).json({ result });
  } catch (e) {
    console.error('Chess API error:', e);
    res.status(500).json({ error: e.message });
  }
}
