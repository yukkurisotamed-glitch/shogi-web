import { PIECE } from './shogi.js';

const P = PIECE;

const PIECE_LETTER_BARE = {
  [P.PAWN]:'P',[P.LANCE]:'L',[P.KNIGHT]:'N',[P.SILVER]:'S',
  [P.GOLD]:'G',[P.BISHOP]:'B',[P.ROOK]:'R',[P.KING]:'K',
  [P.PPAWN]:'+P',[P.PLANCE]:'+L',[P.PKNIGHT]:'+N',[P.PSILVER]:'+S',
  [P.PBISHOP]:'+B',[P.PROOK]:'+R',
};
const LETTER_PIECE = {
  'P':P.PAWN,'L':P.LANCE,'N':P.KNIGHT,'S':P.SILVER,
  'G':P.GOLD,'B':P.BISHOP,'R':P.ROOK,'K':P.KING,
  '+P':P.PPAWN,'+L':P.PLANCE,'+N':P.PKNIGHT,'+S':P.PSILVER,
  '+B':P.PBISHOP,'+R':P.PROOK,
};
const HAND_ORDER = [P.ROOK,P.BISHOP,P.GOLD,P.SILVER,P.KNIGHT,P.LANCE,P.PAWN];

// ── SFEN encoder ────────────────────────────────────────────────
export function boardToSfen(board, hand, turn, moveNum=1) {
  const rows = [];
  for (let r=0;r<9;r++) {
    let row='', empty=0;
    for (let c=0;c<9;c++) {
      const raw=board[r][c];
      if (!raw){empty++;continue;}
      if (empty){row+=empty;empty=0;}
      const p=Math.abs(raw);
      const letter=PIECE_LETTER_BARE[p]||'?';
      row += raw>0 ? letter.toUpperCase() : letter.toLowerCase();
    }
    if (empty) row+=empty;
    rows.push(row);
  }
  let handStr='';
  for (const p of HAND_ORDER){
    const cnt=hand['1'][p]||0;
    if(cnt>1)handStr+=cnt;
    if(cnt>0)handStr+=PIECE_LETTER_BARE[p];
  }
  for (const p of HAND_ORDER){
    const cnt=hand['-1'][p]||0;
    if(cnt>1)handStr+=cnt;
    if(cnt>0)handStr+=PIECE_LETTER_BARE[p].toLowerCase();
  }
  return `${rows.join('/')} ${turn===1?'b':'w'} ${handStr||'-'} ${moveNum}`;
}

// ── USI move → our move ────────────────────────────────────────
export function usiToMove(usi) {
  if (!usi || usi==='(none)') return null;
  if (usi[1]==='*') {
    const key = usi[0].toUpperCase();
    const piece = LETTER_PIECE[key];
    const toC = 9-parseInt(usi[2]);
    const toR = usi.charCodeAt(3)-97;
    return {drop:true, piece, toR, toC};
  }
  const fromC = 9-parseInt(usi[0]);
  const fromR = usi.charCodeAt(1)-97;
  const toC   = 9-parseInt(usi[2]);
  const toR   = usi.charCodeAt(3)-97;
  const promote = usi[4]==='+';
  return {fromR,fromC,toR,toC,promote};
}

// ── YaneuraOu K-P engine (SuishoPetite内蔵) ────────────────────
export class ShogiEngine {
  constructor() {
    this._sf = null;
    this._ready = false;
    this._resolvers = [];
    this._moveResolver = null;
  }

  async init() {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/yaneuraou/yaneuraou.k-p.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('YaneuraOu load failed'));
      document.head.appendChild(s);
    });

    // eslint-disable-next-line no-undef
    this._sf = await YaneuraOu_K_P();

    this._sf.addMessageListener(msg => {
      for (let i=this._resolvers.length-1;i>=0;i--) {
        const [token,res]=this._resolvers[i];
        if (msg.startsWith(token)) { this._resolvers.splice(i,1); res(msg); return; }
      }
      if (msg.startsWith('bestmove') && this._moveResolver) {
        this._moveResolver(msg.split(' ')[1]);
        this._moveResolver = null;
      }
    });

    await this._cmd('usi',     'usiok');
    await this._cmd('isready', 'readyok');
    this._sf.postMessage('usinewgame');
    this._ready = true;
  }

  _cmd(send, waitFor) {
    return new Promise(resolve => {
      this._resolvers.push([waitFor, resolve]);
      this._sf.postMessage(send);
    });
  }

  // opts: { depth?: number, movetime?: number }
  getBestMove(board, hand, turn, opts = {}) {
    const sfen = boardToSfen(board, hand, turn);
    let goCmd = 'go';
    if (opts.depth)    goCmd += ` depth ${opts.depth}`;
    if (opts.movetime) goCmd += ` movetime ${opts.movetime}`;
    if (goCmd === 'go') goCmd = 'go movetime 3000';
    return new Promise(resolve => {
      this._moveResolver = usi => resolve(usiToMove(usi));
      this._sf.postMessage(`position sfen ${sfen}`);
      this._sf.postMessage(goCmd);
    });
  }

  newGame() {
    if (this._ready) this._sf.postMessage('usinewgame');
  }
}
