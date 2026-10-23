import { PIECE } from './shogi.js';
const P = PIECE;

export const VALUE = {
  [P.PAWN]:100,[P.LANCE]:430,[P.KNIGHT]:450,[P.SILVER]:640,
  [P.GOLD]:690,[P.BISHOP]:890,[P.ROOK]:1040,[P.KING]:20000,
  [P.PPAWN]:600,[P.PLANCE]:630,[P.PKNIGHT]:630,[P.PSILVER]:680,
  [P.PBISHOP]:1150,[P.PROOK]:1300,
};

const PAWN_ADV  = [40,32,24,16, 8, 2, 0,-5,-10];
const LANCE_ADV = [25,20,15,10, 5, 0,-5,-10,-15];
const KNTE_ADV  = [25,20,15, 5,-5,-15,-25,-35,-40];

function posBonus(p, r, turn) {
  const row = turn === 1 ? r : 8 - r;
  if (p === P.PAWN)   return PAWN_ADV[row]  || 0;
  if (p === P.PPAWN)  return (PAWN_ADV[row] || 0) * 0.4;
  if (p === P.LANCE)  return LANCE_ADV[row] || 0;
  if (p === P.KNIGHT) return KNTE_ADV[row]  || 0;
  return 0;
}

// Reward pieces adjacent to own king (castle formation)
function castleBonus(board, turn, kr, kc) {
  let bonus = 0;
  const golds   = new Set([P.GOLD, P.PPAWN, P.PLANCE, P.PKNIGHT, P.PSILVER]);
  const shields  = new Set([P.GOLD, P.SILVER, P.PPAWN, P.PLANCE, P.PKNIGHT, P.PSILVER]);
  for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
    if (!dr && !dc) continue;
    const r=kr+dr, c=kc+dc;
    if (r<0||r>=9||c<0||c>=9) continue;
    const raw=board[r][c];
    if (Math.sign(raw)===turn) {
      const p=Math.abs(raw);
      if (golds.has(p))   bonus += 50;
      else if (shields.has(p)) bonus += 30;
    }
  }
  return bonus;
}

export function evaluate(game) {
  let score = 0;
  let sKr=8,sKc=4,gKr=0,gKc=4;
  const board = game.board;

  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const raw=board[r][c];
    if (raw === P.KING)  { sKr=r; sKc=c; }
    if (raw === -P.KING) { gKr=r; gKc=c; }
  }
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const raw=board[r][c]; if (!raw) continue;
    const p=Math.abs(raw), s=Math.sign(raw), v=VALUE[p]||0;
    score += s * (v + posBonus(p, r, s));
    if (s===-1) score -= v*0.2/(1+Math.max(Math.abs(r-sKr),Math.abs(c-sKc)));
    if (s=== 1) score += v*0.2/(1+Math.max(Math.abs(r-gKr),Math.abs(c-gKc)));
  }
  // Castle bonus: reward formation pieces near own king
  score += castleBonus(board, 1, sKr, sKc);
  score -= castleBonus(board, -1, gKr, gKc);

  for (const [pk,n] of Object.entries(game.hand['1']))  score += (n||0)*(VALUE[+pk]||0)*0.85;
  for (const [pk,n] of Object.entries(game.hand['-1'])) score -= (n||0)*(VALUE[+pk]||0)*0.85;
  return score;
}

// ── Filtered move generation for search ──────────────────────────
// Drops with no tactical value are excluded to reduce branching factor.
// The player-facing legalMoves() is not affected.
function searchMoves(game) {
  const all = game.legalMoves();
  const turn = game.turn;
  const board = game.board;

  let eKr=4, eKc=4, myKr=4, myKc=8;
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (board[r][c] ===  turn*P.KING) { myKr=r; myKc=c; }
    if (board[r][c] === -turn*P.KING) { eKr=r;  eKc=c;  }
  }

  const out = [];
  for (const m of all) {
    if (!m.drop) { out.push(m); continue; }

    const p = m.piece, v = VALUE[p]||0;

    // Rook/Bishop: always keep
    if (v >= VALUE[P.BISHOP]) { out.push(m); continue; }

    const dr = Math.max(Math.abs(m.toR-eKr), Math.abs(m.toC-eKc));
    const dm = Math.max(Math.abs(m.toR-myKr), Math.abs(m.toC-myKc));

    // Near enemy king (attack)
    if (dr <= 3) { out.push(m); continue; }
    // Near our own king (defense)
    if (dm <= 2) { out.push(m); continue; }

    // Pawn: keep only if it attacks an enemy piece or is in enemy half
    if (p === P.PAWN) {
      const ar = turn===1 ? m.toR-1 : m.toR+1;
      if (ar>=0 && ar<9 && Math.sign(board[ar][m.toC])===-turn) { out.push(m); continue; }
      if (turn===1 ? m.toR<=3 : m.toR>=5) { out.push(m); continue; }
      continue; // skip pawn drops that don't attack or advance
    }

    // Gold/Silver/Lance/Knight: keep if in enemy half
    const inEnemyHalf = turn===1 ? m.toR<=4 : m.toR>=4;
    if (inEnemyHalf) { out.push(m); continue; }
  }

  return out.length > 0 ? out : all;
}

// ── Killers & History ──────────────────────────────────────────────
const killers = Array.from({length:30}, ()=>[null,null]);
const hist = new Int32Array(9*9*9*9);

function histIdx(m) { return (m.fromR*9+m.fromC)*81+(m.toR*9+m.toC); }
function isKiller(m,d) {
  return !m.drop&&d<30&&killers[d].some(k=>k&&!k.drop&&k.fromR===m.fromR&&k.fromC===m.fromC&&k.toR===m.toR&&k.toC===m.toC);
}
function storeKiller(m,d) {
  if (!m.drop&&d<30&&!isKiller(m,d)){killers[d][1]=killers[d][0];killers[d][0]=m;}
}
function updateHist(m,d) { if (!m.drop) hist[histIdx(m)] = Math.min(hist[histIdx(m)]+d*d, 30000); }

// ── Move ordering ──────────────────────────────────────────────────
function moveScore(game, m, ply) {
  if (!m.drop && game.board[m.toR][m.toC]) {
    const v = VALUE[Math.abs(game.board[m.toR][m.toC])]||0;
    const a = VALUE[Math.abs(game.board[m.fromR][m.fromC])]||1;
    return 20000 + v*10 - a;
  }
  if (isKiller(m, ply)) return 15000;
  if (m.promote) return 8000 + (VALUE[Math.abs((game.board[m.fromR]||[])[m.fromC]||0)]||0);
  if (!m.drop)   return 5000 + Math.min(hist[histIdx(m)]||0, 9999);
  return 3000 + (VALUE[m.piece]||0);
}

// ── Quiescence ────────────────────────────────────────────────────
function quiesce(game, alpha, beta, max, qdepth=0) {
  const sp = evaluate(game);
  if (max) { if(sp>=beta) return beta;  if(sp>alpha) alpha=sp; }
  else     { if(sp<=alpha)return alpha; if(sp<beta)  beta=sp;  }
  if (qdepth >= 4) return max ? alpha : beta;
  const caps = game.legalMoves().filter(m=>!m.drop&&game.board[m.toR][m.toC]);
  caps.sort((a,b)=>(VALUE[Math.abs(game.board[b.toR][b.toC])]||0)-(VALUE[Math.abs(game.board[a.toR][a.toC])]||0));
  for (const m of caps) {
    game.applyMove(m);
    const v = quiesce(game, alpha, beta, !max, qdepth+1);
    game.undo();
    if (max) { if(v>alpha)alpha=v; if(alpha>=beta)return beta;  }
    else     { if(v<beta) beta=v;  if(beta<=alpha)return alpha; }
  }
  return max ? alpha : beta;
}

// ── Alpha-beta ────────────────────────────────────────────────────
let _deadline = 0;

function ab(game, depth, alpha, beta, max, ply=0) {
  if (Date.now() >= _deadline) return max ? alpha : beta;
  if (depth === 0) return quiesce(game, alpha, beta, max);

  const moves = searchMoves(game);
  if (!moves.length) return max ? -50000+ply : 50000-ply;
  moves.sort((a,b) => moveScore(game,b,ply) - moveScore(game,a,ply));

  let best = max ? -Infinity : Infinity;
  for (const m of moves) {
    if (Date.now() >= _deadline) break;
    game.applyMove(m);
    const v = ab(game, depth-1, alpha, beta, !max, ply+1);
    game.undo();
    if (max) {
      if (v>best) best=v; if (v>alpha) alpha=v;
      if (beta<=alpha) { storeKiller(m,ply); updateHist(m,depth); break; }
    } else {
      if (v<best) best=v; if (v<beta) beta=v;
      if (beta<=alpha) { storeKiller(m,ply); updateHist(m,depth); break; }
    }
  }
  return best;
}

// ── Opening book (gote = AI, turn=-1) ────────────────────────────
// board[row][col]: row0=gote back, row8=sente back, col0=file9, col8=file1
// Gote's standard responses for the first few moves.
// Key: last sente move encoded as "fromR,fromC,toR,toC" (or "" for move 1)
const BOOK_GOTE = new Map([
  // Gote move 1: respond to any sente first move
  ['any1', [{fromR:2,fromC:1,toR:3,toC:1}]], // P-8d (standard)

  // After sente P-7f (6,2→5,2): P-3d
  ['6,2,5,2', [{fromR:2,fromC:6,toR:3,toC:6}]],
  // After sente P-2f (6,7→5,7): P-8d
  ['6,7,5,7', [{fromR:2,fromC:1,toR:3,toC:1}]],
  // After sente P-6f: P-3d
  ['6,3,5,3', [{fromR:2,fromC:6,toR:3,toC:6}]],

  // Gote move 2: S-3b (銀上がり for 振り飛車setup)
  ['any2', [{fromR:1,fromC:6,toR:2,toC:6},{fromR:2,fromC:1,toR:3,toC:1}]],
]);

function openingBookMove(game) {
  if (game.turn !== -1) return null;
  const hist = game.history;
  const gMoves = hist.filter((_,i)=>i%2===1).length; // how many gote moves so far
  if (gMoves >= 4) return null; // stop using book after 4 gote moves

  let key;
  if (gMoves === 0) {
    // gote's first response: check sente's last move
    const last = hist[hist.length-1];
    if (last) key = `${last.fromR},${last.fromC},${last.toR},${last.toC}`;
    const candidates = BOOK_GOTE.get(key) || BOOK_GOTE.get('any1');
    if (!candidates) return null;
    const legal = game.legalMoves();
    for (const c of candidates) {
      const match = legal.find(m=>!m.drop&&m.fromR===c.fromR&&m.fromC===c.fromC&&m.toR===c.toR&&m.toC===c.toC);
      if (match) return match;
    }
  } else if (gMoves === 1) {
    const candidates = BOOK_GOTE.get('any2') || [];
    const legal = game.legalMoves();
    for (const c of candidates) {
      const match = legal.find(m=>!m.drop&&m.fromR===c.fromR&&m.fromC===c.fromC&&m.toR===c.toR&&m.toC===c.toC);
      if (match) return match;
    }
  }
  return null;
}

// ── Iterative deepening ────────────────────────────────────────────
export function bestMoveWithTime(game, movetime, maxDepth=15, noise=0, randomRate=0) {
  // Try opening book first (only for levels with no randomRate)
  if (randomRate === 0 && noise === 0) {
    const bookMove = openingBookMove(game);
    if (bookMove) return bookMove;
  }

  _deadline = Date.now() + movetime;
  killers.forEach(k => { k[0]=null; k[1]=null; });
  hist.fill(0);

  const moves = game.legalMoves();
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];

  // Probabilistic random move — more predictable than noise-based approach
  if (randomRate > 0 && Math.random() < randomRate) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (noise > 800) return moves[Math.floor(Math.random()*moves.length)];

  moves.sort((a,b) => moveScore(game,b,0) - moveScore(game,a,0));
  const isMax = game.turn === 1;
  let best = moves[0];

  for (let depth=1; depth<=maxDepth; depth++) {
    if (Date.now() >= _deadline) break;
    let bestVal = isMax ? -Infinity : Infinity;
    let depthBest = null;
    for (const m of moves) {
      if (Date.now() >= _deadline) break;
      game.applyMove(m);
      let v = ab(game, depth-1, -Infinity, Infinity, !isMax, 1);
      game.undo();
      if (noise > 0) v += (Math.random()*2-1)*noise;
      if (isMax ? v>bestVal : v<bestVal) { bestVal=v; depthBest=m; }
    }
    if (depthBest) best = depthBest;
  }
  return best;
}
