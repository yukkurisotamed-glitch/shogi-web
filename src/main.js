import { ShogiGame, PIECE, CHESS_IMG, PIECE_NAME, CAN_PROMOTE } from './shogi.js';
import { t, setLang, getLang, LANGS, DIFFICULTY } from './i18n.js';
import { ShogiEngine, usiToMove } from './shogi-engine.js';

const P = PIECE;

const IMG_BASE_NORMAL = '/pieces/normal/';
const IMG_BASE_PROMO  = '/pieces/promoted/';

const IS_PROMOTED = new Set([P.PPAWN, P.PLANCE, P.PKNIGHT, P.PSILVER, P.PBISHOP, P.PROOK]);

function pieceImgSrc(p, isSente) {
  const color = isSente ? '白' : '黒';
  const name = CHESS_IMG[p];
  if (!name) return '';
  const base = IS_PROMOTED.has(p) ? IMG_BASE_PROMO : IMG_BASE_NORMAL;
  return `${base}${color}${name}.png`;
}

const game = new ShogiGame();

// YaneuraOu K-P engine (SuishoPetite内蔵, GPL-3.0)
const engine = new ShogiEngine();
let engineReady = false;

// Fallback: custom AI Web Worker (エンジン起動前に使用)
const aiWorker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });

// engine: true → YaneuraOu, false → 独自AI
// depth: YaneuraOu の探索深さ上限, movetime: 思考時間上限(ms)
// maxDepth/noise: 独自AI用
const DEPTH_MAP = {
  d1:  { engine: false, movetime:  300, maxDepth: 2,  noise: 0, randomRate: 0.95 }, // 入門1: 95%ランダム
  d2:  { engine: false, movetime:  400, maxDepth: 2,  noise: 0, randomRate: 0.78 }, // 入門2: 78%ランダム
  d3:  { engine: false, movetime:  500, maxDepth: 3,  noise: 0, randomRate: 0.55 }, // 入門3: 55%ランダム
  d4:  { engine: false, movetime:  700, maxDepth: 3,  noise: 0, randomRate: 0.30 }, // 初級1: 30%ランダム
  d5:  { engine: false, movetime: 1200, maxDepth: 4,  noise: 0, randomRate: 0.12 }, // 初級2: 12%ランダム
  d6:  { engine: false, movetime: 2000, maxDepth: 5,  noise: 0, randomRate: 0.03 }, // 初級3: 3%ランダム
  d7:  { engine: true,  depth: 1, movetime: 1500, randomRate: 0.70 },               // 中級1: YaneuraOu + 70%ランダム
  d8:  { engine: true,  depth: 1, movetime: 3000, randomRate: 0.48 },               // 中級2: YaneuraOu + 48%ランダム
  d9:  { engine: true,  depth: 1, movetime: 5000, randomRate: 0.22 },               // 中級3: YaneuraOu + 22%ランダム
  d10: { engine: true,  depth: 1, movetime: 5000 },                                 // 上級1: YaneuraOu depth1
  d12: { engine: true,  depth: 3, movetime: 8000 },                                 // 上級2: YaneuraOu depth3
  d15: { engine: true,  movetime: 5000 },                                            // 上級3: フル思考
};

let selected = null;
let legalDests = [];
let pendingPromote = null;
let aiThinking = false;
let lastMove = null; // { fromR, fromC, toR, toC } or { drop, toR, toC }

const boardEl       = document.getElementById('board');
const turnLabel     = document.getElementById('turn-label');
const handSenteEl   = document.getElementById('hand-sente-pieces');
const handGoteEl    = document.getElementById('hand-gote-pieces');
const promoteDialog = document.getElementById('promote-dialog');
const overlay       = document.getElementById('overlay');
const endDialog     = document.getElementById('end-dialog');
const endMsg        = document.getElementById('end-message');
const btnPromoteYes = document.getElementById('btn-promote-yes');
const btnPromoteNo  = document.getElementById('btn-promote-no');
const btnEndOk      = document.getElementById('btn-end-ok');
const btnUndo       = document.getElementById('btn-undo');
const btnReset      = document.getElementById('btn-reset');
const selLevel      = document.getElementById('sel-level');
const selLang       = document.getElementById('sel-lang');
const btnRefToggle  = document.getElementById('btn-ref-toggle');
const refPanel      = document.getElementById('ref-panel');
btnRefToggle.addEventListener('click', () => {
  const on = refPanel.classList.toggle('hidden') === false;
  btnRefToggle.style.background = on ? 'var(--btn-hover)' : '';
});

const btnHowto      = document.getElementById('btn-howto');
const howtoModal    = document.getElementById('howto-modal');
const btnHowtoClose = document.getElementById('btn-howto-close');
const btnHowtoPrev  = document.getElementById('btn-howto-prev');
const btnHowtoNext  = document.getElementById('btn-howto-next');
const howtoPage     = document.getElementById('howto-page');
const howtoImgs     = document.querySelectorAll('.howto-img');

let howtoIdx = 0;

function showHowto(idx) {
  howtoIdx = (idx + howtoImgs.length) % howtoImgs.length;
  howtoImgs.forEach((img, i) => img.classList.toggle('active', i === howtoIdx));
  howtoPage.textContent = `${howtoIdx + 1} / ${howtoImgs.length}`;
  btnHowtoPrev.disabled = howtoIdx === 0;
  btnHowtoNext.disabled = howtoIdx === howtoImgs.length - 1;
}

btnHowto.addEventListener('click', () => {
  showHowto(0);
  howtoModal.classList.remove('hidden');
});
btnHowtoClose.addEventListener('click', () => howtoModal.classList.add('hidden'));
howtoModal.addEventListener('click', e => { if (e.target === howtoModal) howtoModal.classList.add('hidden'); });
btnHowtoPrev.addEventListener('click', () => showHowto(howtoIdx - 1));
btnHowtoNext.addEventListener('click', () => showHowto(howtoIdx + 1));
// キーボード操作
document.addEventListener('keydown', e => {
  if (howtoModal.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') showHowto(howtoIdx + 1);
  if (e.key === 'ArrowLeft')  showHowto(howtoIdx - 1);
  if (e.key === 'Escape')     howtoModal.classList.add('hidden');
});

// ─── i18n ────────────────────────────────────────────────────────
function applyLang() {
  // Static elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Difficulty options
  document.querySelectorAll('#sel-level option').forEach(opt => {
    const level = opt.dataset.level;
    const num   = opt.dataset.num;
    if (level && num) {
      const label = DIFFICULTY[getLang()]?.[level] ?? level;
      opt.textContent = `${label} ${num}`;
    }
  });
  // HTML lang attribute
  document.documentElement.lang = getLang();
  // Sync selector
  selLang.value = getLang();
}

selLang.addEventListener('change', () => {
  setLang(selLang.value);
  applyLang();
  updateStatus(); // re-render dynamic status text
});

function render() {
  renderBoard();
  renderHand(1,  handSenteEl);
  renderHand(-1, handGoteEl);
  updateStatus();
}

function renderBoard() {
  boardEl.innerHTML = '';
  const board = game.board;

  let checkKingPos = null;
  if (game.inCheck()) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === game.turn * P.KING) checkKingPos = `${r}-${c}`;
  }

  const legalSet = new Set(legalDests.map(m => `${m.toR}-${m.toC}`));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      const raw = board[r][c];
      const key = `${r}-${c}`;

      if (lastMove) {
        if (!lastMove.drop && lastMove.fromR === r && lastMove.fromC === c)
          cell.classList.add('last-from');
        if (lastMove.toR === r && lastMove.toC === c)
          cell.classList.add('last-to');
      }
      if (selected && !selected.drop && selected.fromR === r && selected.fromC === c)
        cell.classList.add('selected');
      if (legalSet.has(key))
        cell.classList.add('legal');
      if (checkKingPos === key)
        cell.classList.add('check');

      if (raw !== 0) {
        const p = Math.abs(raw);
        const isSente = raw > 0;
        const img = document.createElement('img');
        img.src = pieceImgSrc(p, isSente);
        img.className = `piece ${isSente ? 'sente' : 'gote'}`;
        img.alt = PIECE_NAME[p] || '';
        cell.appendChild(img);
        if (IS_PROMOTED.has(p)) cell.classList.add('promoted-piece');
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function renderHand(turn, el) {
  el.innerHTML = '';
  const hand = game.getHand(turn);
  for (const [pieceStr, count] of Object.entries(hand)) {
    if ((count || 0) <= 0) continue;
    const p = Number(pieceStr);
    const div = document.createElement('div');
    div.className = 'hand-piece';
    if (selected?.drop && selected.piece === p && selected.turn === turn)
      div.classList.add('selected-drop');

    const img = document.createElement('img');
    img.src = pieceImgSrc(p, turn === 1);
    img.alt = PIECE_NAME[p] || '';
    div.appendChild(img);

    if (count > 1) {
      const cnt = document.createElement('span');
      cnt.className = 'count';
      cnt.textContent = count;
      div.appendChild(cnt);
    }

    if (turn === 1 && game.turn === 1 && !aiThinking)
      div.addEventListener('click', () => onHandClick(p, turn));

    el.appendChild(div);
  }
}

function updateStatus() {
  if (!engineReady && !aiThinking) {
    turnLabel.textContent = 'エンジン起動中…';
  } else if (aiThinking) {
    turnLabel.textContent = t('cpuThinking');
  } else {
    turnLabel.textContent = game.turn === 1 ? t('yourTurn') : t('cpuTurn');
  }
  btnUndo.disabled = aiThinking || game.history.length === 0;
}

function onCellClick(r, c) {
  if (aiThinking || game.turn !== 1) return;

  if (selected?.drop) {
    const legal = legalDests.find(m => m.drop && m.piece === selected.piece && m.toR === r && m.toC === c);
    if (legal) {
      commitMove({ drop: true, piece: selected.piece, toR: r, toC: c });
    } else {
      clearSelection();
    }
    return;
  }

  if (selected) {
    const dests = legalDests.filter(m => m.toR === r && m.toC === c);
    if (dests.length > 0) {
      if (dests.length === 2) {
        askPromote(dests.find(m => !m.promote), dests.find(m => m.promote));
      } else {
        commitMove(dests[0]);
      }
      return;
    }
    if (Math.sign(game.board[r][c]) === 1) {
      selectSquare(r, c);
      return;
    }
    clearSelection();
    return;
  }

  if (Math.sign(game.board[r][c]) === 1) {
    selectSquare(r, c);
  }
}

function onHandClick(piece, turn) {
  if (aiThinking || game.turn !== 1) return;
  const allLegal = game.legalMoves();
  const drops = allLegal.filter(m => m.drop && m.piece === piece);
  if (drops.length === 0) return;
  selected = { drop: true, piece, turn };
  legalDests = drops;
  render();
}

function selectSquare(r, c) {
  selected = { fromR: r, fromC: c };
  const allLegal = game.legalMoves();
  legalDests = allLegal.filter(m => !m.drop && m.fromR === r && m.fromC === c);
  render();
}

function clearSelection() {
  selected = null;
  legalDests = [];
  render();
}

function askPromote(noMove, yesMove) {
  pendingPromote = { noMove, yesMove };
  overlay.classList.remove('hidden');
  promoteDialog.classList.remove('hidden');
}

function commitMove(move) {
  clearSelection();
  lastMove = move;
  game.applyMove(move);
  render();
  checkEnd();
  if (!game.isCheckmate() && !game.isStalemate()) {
    scheduleAI();
  }
}

btnPromoteYes.addEventListener('click', () => {
  overlay.classList.add('hidden');
  promoteDialog.classList.add('hidden');
  if (pendingPromote) { commitMove(pendingPromote.yesMove); pendingPromote = null; }
});
btnPromoteNo.addEventListener('click', () => {
  overlay.classList.add('hidden');
  promoteDialog.classList.add('hidden');
  if (pendingPromote) { commitMove(pendingPromote.noMove); pendingPromote = null; }
});

const MIN_AI_WAIT = 1500; // CPUが早く読み終わっても最低1.5秒待つ

function scheduleAI() {
  if (game.turn !== -1) return;
  aiThinking = true;
  updateStatus();
  const levelVal = selLevel?.value || 'd7';
  const cfg = DEPTH_MAP[levelVal] ?? { engine: true, movetime: 3000 };
  const startTime = Date.now();

  const applyAfterWait = (move) => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_AI_WAIT - elapsed);
    setTimeout(() => {
      aiThinking = false;
      if (move) { lastMove = move; game.applyMove(move); }
      render();
      checkEnd();
    }, remaining);
  };

  if (engineReady && cfg.engine) {
    // YaneuraOu K-P（中級〜上級）
    engine.getBestMove(
      game.board.map(r => [...r]),
      { '1': { ...game.hand['1'] }, '-1': { ...game.hand['-1'] } },
      game.turn,
      { depth: cfg.depth, movetime: cfg.movetime },
    ).then(move => {
      // randomRate: エンジン応手をランダム手に差し替える確率
      const rr = cfg.randomRate ?? 0;
      if (rr > 0 && Math.random() < rr) {
        const rand = game.legalMoves();
        if (rand.length > 0) move = rand[Math.floor(Math.random() * rand.length)];
      }
      applyAfterWait(move);
    });
  } else {
    // 独自AI（入門レベル、またはエンジン未起動時）
    aiWorker.onmessage = (e) => applyAfterWait(e.data);
    aiWorker.postMessage({
      board: game.board.map(r => [...r]),
      hand: { '1': { ...game.hand['1'] }, '-1': { ...game.hand['-1'] } },
      turn: game.turn,
      movetime:   cfg.movetime   ?? 2000,
      maxDepth:   cfg.maxDepth   ?? 4,
      noise:      cfg.noise      ?? 0,
      randomRate: cfg.randomRate ?? 0,
    });
  }
}

function checkEnd() {
  if (game.isCheckmate()) {
    showEnd(game.turn === 1 ? t('cpuWins') : t('youWin'));
  } else if (game.isStalemate()) {
    showEnd(t('draw'));
  }
}

function showEnd(msg) {
  endMsg.textContent = msg;
  overlay.classList.remove('hidden');
  endDialog.classList.remove('hidden');
}

btnEndOk.addEventListener('click', () => {
  overlay.classList.add('hidden');
  endDialog.classList.add('hidden');
  game.reset();
  selected = null; legalDests = []; aiThinking = false; lastMove = null;
  render();
});

btnUndo.addEventListener('click', () => {
  if (aiThinking) return;
  game.undo();
  if (game.turn !== 1 && game.history.length > 0) game.undo();
  lastMove = game.history.at(-1) ?? null;
  clearSelection();
});

btnReset.addEventListener('click', () => {
  if (!confirm(t('confirmReset'))) return;
  aiThinking = false;
  lastMove = null;
  engine.newGame();
  game.reset();
  clearSelection();
});

applyLang();
render();

// YaneuraOu エンジン起動（非同期・バックグラウンド）
engine.init().then(() => {
  engineReady = true;
  updateStatus();
  console.log('YaneuraOu K-P (SuishoPetite) ready');
}).catch(err => {
  console.warn('YaneuraOu init failed, using fallback AI:', err);
});
