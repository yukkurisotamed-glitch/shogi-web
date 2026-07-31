// Shogi rules engine — vanilla JS, no dependencies
// Board: 9x9, row 0 = rank 1 (opponent back rank), row 8 = rank 9 (player back rank)
// col 0 = file 9 (right), col 8 = file 1 (left) — standard shogi orientation
// Pieces: positive = sente (black, moves up = row-1), negative = gote (white, moves down = row+1)

export const PIECE = {
  PAWN: 1, LANCE: 2, KNIGHT: 3, SILVER: 4, GOLD: 5, BISHOP: 6, ROOK: 7, KING: 8,
  PPAWN: 9, PLANCE: 10, PKNIGHT: 11, PSILVER: 12, PBISHOP: 13, PROOK: 14,
};

const P = PIECE;

// Piece names for display
export const PIECE_NAME = {
  [P.PAWN]: '歩', [P.LANCE]: '香', [P.KNIGHT]: '桂', [P.SILVER]: '銀',
  [P.GOLD]: '金', [P.BISHOP]: '角', [P.ROOK]: '飛', [P.KING]: '王',
  [P.PPAWN]: 'と', [P.PLANCE]: '成香', [P.PKNIGHT]: '成桂', [P.PSILVER]: '成銀',
  [P.PBISHOP]: '馬', [P.PROOK]: '龍',
};

export const CHESS_IMG = {
  [P.PAWN]: 'ポーン', [P.LANCE]: 'ランス', [P.KNIGHT]: 'ナイト', [P.SILVER]: 'シルバー',
  [P.GOLD]: 'ゴールド', [P.BISHOP]: 'ビショップ', [P.ROOK]: 'ルーク', [P.KING]: 'キング',
  [P.PPAWN]: 'ポーン', [P.PLANCE]: 'ランス', [P.PKNIGHT]: 'ナイト', [P.PSILVER]: 'シルバー',
  [P.PBISHOP]: 'ビショップ', [P.PROOK]: 'ルーク',
};

export const CAN_PROMOTE = new Set([P.PAWN, P.LANCE, P.KNIGHT, P.SILVER, P.BISHOP, P.ROOK]);
export const PROMOTE_TO = {
  [P.PAWN]: P.PPAWN, [P.LANCE]: P.PLANCE, [P.KNIGHT]: P.PKNIGHT,
  [P.SILVER]: P.PSILVER, [P.BISHOP]: P.PBISHOP, [P.ROOK]: P.PROOK,
};
export const DEMOTE = {
  [P.PPAWN]: P.PAWN, [P.PLANCE]: P.LANCE, [P.PKNIGHT]: P.KNIGHT,
  [P.PSILVER]: P.SILVER, [P.PBISHOP]: P.BISHOP, [P.PROOK]: P.ROOK,
};

// Gold-like movement (used by promoted pieces)
const GOLD_DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]]; // for sente
const GOLD_DIRS_G = [[1,-1],[1,0],[1,1],[0,-1],[0,1],[-1,0]]; // for gote

function inBounds(r, c) { return r >= 0 && r < 9 && c >= 0 && c < 9; }

// Returns list of {toR, toC, promote} for one piece on board
function movesForPiece(board, r, c, turn) {
  const raw = board[r][c];
  const p = Math.abs(raw);
  const sgn = Math.sign(raw); // 1=sente, -1=gote
  if (sgn !== turn) return [];

  const moves = [];
  const fwd = turn === 1 ? -1 : 1; // forward row direction

  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (Math.sign(target) === turn) break; // blocked by own piece
        moves.push({ toR: nr, toC: nc });
        if (target !== 0) break; // capture stops slide
        nr += dr; nc += dc;
      }
    }
  };

  const step = (dirs) => {
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (Math.sign(board[nr][nc]) === turn) continue;
      moves.push({ toR: nr, toC: nc });
    }
  };

  switch (p) {
    case P.PAWN:   step([[fwd, 0]]); break;
    case P.LANCE:  slide([[fwd, 0]]); break;
    case P.KNIGHT: step([[fwd*2, -1],[fwd*2, 1]]); break;
    case P.SILVER:
      step(turn === 1
        ? [[-1,-1],[-1,0],[-1,1],[1,-1],[1,1]]
        : [[1,-1],[1,0],[1,1],[-1,-1],[-1,1]]);
      break;
    case P.GOLD:
    case P.PPAWN: case P.PLANCE: case P.PKNIGHT: case P.PSILVER:
      step(turn === 1 ? GOLD_DIRS : GOLD_DIRS_G); break;
    case P.BISHOP: slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case P.ROOK:   slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case P.PBISHOP:
      slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
      step([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case P.PROOK:
      slide([[-1,0],[1,0],[0,-1],[0,1]]);
      step([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case P.KING:
      step([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]); break;
  }
  return moves;
}

function cloneBoard(board) { return board.map(r => [...r]); }

function findKing(board, turn) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] === turn * P.KING) return [r, c];
  return null;
}

function isInCheck(board, turn) {
  const kpos = findKing(board, turn);
  if (!kpos) return true;
  const [kr, kc] = kpos;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (Math.sign(board[r][c]) !== -turn) continue;
      const ms = movesForPiece(board, r, c, -turn);
      if (ms.some(m => m.toR === kr && m.toC === kc)) return true;
    }
  return false;
}

// Drop zones: check nifu, lance/pawn can't go to last rank, etc.
function dropMoves(board, turn, hand) {
  const moves = [];
  for (const [piece, count] of Object.entries(hand)) {
    if (count <= 0) continue;
    const p = Number(piece);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        // Pawn: no drop on last rank, no nifu
        if (p === P.PAWN) {
          if (turn === 1 && r === 0) continue;
          if (turn === -1 && r === 8) continue;
          // nifu check
          let nifu = false;
          for (let rr = 0; rr < 9; rr++)
            if (board[rr][c] === turn * P.PAWN) { nifu = true; break; }
          if (nifu) continue;
        }
        // Lance: no last rank
        if (p === P.LANCE) {
          if (turn === 1 && r === 0) continue;
          if (turn === -1 && r === 8) continue;
        }
        // Knight: no last 2 ranks
        if (p === P.KNIGHT) {
          if (turn === 1 && r <= 1) continue;
          if (turn === -1 && r >= 7) continue;
        }
        // Test: would this leave king in check?
        const nb = cloneBoard(board);
        nb[r][c] = turn * p;
        if (isInCheck(nb, turn)) continue;
        // Pawn drop: must not be immediate checkmate (uchifuzume) — simplified skip for now
        moves.push({ drop: true, piece: p, toR: r, toC: c });
      }
    }
  }
  return moves;
}

export class ShogiGame {
  constructor() {
    this.reset();
  }

  reset() {
    // 0 = empty, positive = sente (player, row 8 side), negative = gote (CPU, row 0 side)
    this.board = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.turn = 1; // 1 = sente, -1 = gote
    this.hand = { 1: {}, '-1': {} }; // captured pieces
    this.history = [];
    this._initBoard();
  }

  _initBoard() {
    const b = this.board;
    // Gote back rank (row 0): pieces face down (negative)
    b[0][0] = -P.LANCE; b[0][1] = -P.KNIGHT; b[0][2] = -P.SILVER;
    b[0][3] = -P.GOLD;  b[0][4] = -P.KING;   b[0][5] = -P.GOLD;
    b[0][6] = -P.SILVER; b[0][7] = -P.KNIGHT; b[0][8] = -P.LANCE;
    b[1][1] = -P.ROOK; b[1][7] = -P.BISHOP;
    for (let c = 0; c < 9; c++) b[2][c] = -P.PAWN;

    // Sente back rank (row 8): positive
    b[8][0] = P.LANCE; b[8][1] = P.KNIGHT; b[8][2] = P.SILVER;
    b[8][3] = P.GOLD;  b[8][4] = P.KING;   b[8][5] = P.GOLD;
    b[8][6] = P.SILVER; b[8][7] = P.KNIGHT; b[8][8] = P.LANCE;
    b[7][7] = P.ROOK; b[7][1] = P.BISHOP;
    for (let c = 0; c < 9; c++) b[6][c] = P.PAWN;
  }

  getHand(turn) {
    return this.hand[String(turn)];
  }

  // Get all legal moves for current turn
  legalMoves() {
    const moves = [];
    const turn = this.turn;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (Math.sign(this.board[r][c]) !== turn) continue;
        const raw = movesForPiece(this.board, r, c, turn);
        for (const m of raw) {
          const p = Math.abs(this.board[r][c]);
          // Check promotion options
          const inZone = turn === 1 ? m.toR <= 2 : m.toR >= 6;
          const wasInZone = turn === 1 ? r <= 2 : r >= 6;
          const canProm = CAN_PROMOTE.has(p) && (inZone || wasInZone);
          // Must promote if piece would be stuck (pawn/lance at last rank, knight at last 2)
          const mustProm = canProm && (
            (p === P.PAWN && (turn === 1 ? m.toR === 0 : m.toR === 8)) ||
            (p === P.LANCE && (turn === 1 ? m.toR === 0 : m.toR === 8)) ||
            (p === P.KNIGHT && (turn === 1 ? m.toR <= 1 : m.toR >= 7))
          );

          const base = { fromR: r, fromC: c, toR: m.toR, toC: m.toC, promote: false };
          const nb1 = this._applyMove(base);
          if (!isInCheck(nb1.board, turn)) {
            if (mustProm) {
              moves.push({ ...base, promote: true });
            } else {
              moves.push(base);
              if (canProm) {
                const pm = { ...base, promote: true };
                const nb2 = this._applyMove(pm);
                if (!isInCheck(nb2.board, turn)) moves.push(pm);
              }
            }
          }
        }
      }
    }
    // Drop moves
    const drops = dropMoves(this.board, turn, this.hand[String(turn)]);
    moves.push(...drops);
    return moves;
  }

  _applyMove(move) {
    const board = cloneBoard(this.board);
    const hand = { 1: { ...this.hand['1'] }, '-1': { ...this.hand['-1'] } };

    if (move.drop) {
      board[move.toR][move.toC] = this.turn * move.piece;
      hand[String(this.turn)][move.piece] = (hand[String(this.turn)][move.piece] || 0) - 1;
    } else {
      let piece = Math.abs(board[move.fromR][move.fromC]);
      const captured = board[move.toR][move.toC];
      if (captured !== 0) {
        const cp = Math.abs(captured);
        const base = DEMOTE[cp] || cp;
        const capTurn = String(this.turn);
        hand[capTurn][base] = (hand[capTurn][base] || 0) + 1;
      }
      if (move.promote) piece = PROMOTE_TO[piece] || piece;
      board[move.toR][move.toC] = this.turn * piece;
      board[move.fromR][move.fromC] = 0;
    }
    return { board, hand };
  }

  applyMove(move) {
    const state = this._applyMove(move);
    this.history.push({
      board: cloneBoard(this.board),
      hand: { 1: { ...this.hand['1'] }, '-1': { ...this.hand['-1'] } },
      turn: this.turn,
      move,
    });
    this.board = state.board;
    this.hand = state.hand;
    this.turn = -this.turn;
  }

  undo() {
    if (!this.history.length) return;
    const s = this.history.pop();
    this.board = s.board;
    this.hand = s.hand;
    this.turn = s.turn;
  }

  isCheckmate() {
    return this.legalMoves().length === 0 && isInCheck(this.board, this.turn);
  }

  isStalemate() {
    return this.legalMoves().length === 0 && !isInCheck(this.board, this.turn);
  }

  inCheck() {
    return isInCheck(this.board, this.turn);
  }
}
