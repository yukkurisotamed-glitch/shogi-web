export const LANGS = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어',
  es: 'Español',
};

export const DIFFICULTY = {
  ja: { beginner: '入門', easy: '初級', medium: '中級', hard: '上級' },
  en: { beginner: 'Beginner', easy: 'Easy', medium: 'Medium', hard: 'Hard' },
  zh: { beginner: '入门', easy: '初级', medium: '中级', hard: '高级' },
  ko: { beginner: '입문', easy: '초급', medium: '중급', hard: '상급' },
  es: { beginner: 'Principiante', easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
};

export const TRANSLATIONS = {
  ja: {
    productHeading: '物理セットで遊ぼう',
    productDesc: 'チェス駒シルエット × 和の装束。本物の駒で対局するならこちら。',
    productBtn: 'Etsy で見る',
    title: '将棋 CPU 対戦',
    yourTurn: 'あなたの番（先手）',
    cpuTurn: 'CPU の番（後手）',
    cpuThinking: 'CPU が考え中…',
    cpuHand: 'CPU 持ち駒',
    yourHand: 'あなた 持ち駒',
    undo: '待った',
    reset: '最初から',
    promoteQ: '成りますか？',
    promoteYes: '成る',
    promoteNo: '成らない',
    cpuWins: 'CPU の勝ち！',
    youWin: 'あなたの勝ち！',
    draw: '引き分け（手詰まり）',
    playAgain: 'もう一度',
    confirmReset: '最初からやり直しますか？',
    loading: 'エンジン読み込み中…',
    loadFailed: 'エンジン読み込み失敗',
    strength: '強さ',
  },
  en: {
    productHeading: 'Play with a Physical Set',
    productDesc: 'Chess silhouettes meet Japanese aesthetics. Try the real board experience.',
    productBtn: 'View on Etsy',
    title: 'Shogi vs CPU',
    yourTurn: 'Your Turn (Sente)',
    cpuTurn: "CPU's Turn (Gote)",
    cpuThinking: 'CPU is thinking…',
    cpuHand: 'CPU Pieces',
    yourHand: 'Your Pieces',
    undo: 'Undo',
    reset: 'New Game',
    promoteQ: 'Promote piece?',
    promoteYes: 'Promote',
    promoteNo: 'No',
    cpuWins: 'CPU Wins!',
    youWin: 'You Win!',
    draw: 'Draw (Stalemate)',
    playAgain: 'Play Again',
    confirmReset: 'Start a new game?',
    loading: 'Loading engine…',
    loadFailed: 'Engine failed to load',
    strength: 'Level',
  },
  zh: {
    productHeading: '用实体棋盘对弈',
    productDesc: '西洋棋剪影 × 和风美学。体验真实棋盘的乐趣。',
    productBtn: '在 Etsy 上查看',
    title: '将棋 人机对战',
    yourTurn: '你的回合（先手）',
    cpuTurn: 'CPU 的回合（后手）',
    cpuThinking: 'CPU 思考中…',
    cpuHand: 'CPU 持驹',
    yourHand: '你的持驹',
    undo: '悔棋',
    reset: '重新开始',
    promoteQ: '升变？',
    promoteYes: '升变',
    promoteNo: '不升',
    cpuWins: 'CPU 获胜！',
    youWin: '你获胜！',
    draw: '平局（无子可动）',
    playAgain: '再来一局',
    confirmReset: '重新开始游戏？',
    loading: '引擎加载中…',
    loadFailed: '引擎加载失败',
    strength: '难度',
  },
  ko: {
    productHeading: '실물 보드로 즐기기',
    productDesc: '체스 실루엣 × 일본 미학. 진짜 보드의 경험을 느껴보세요.',
    productBtn: 'Etsy에서 보기',
    title: '쇼기 CPU 대전',
    yourTurn: '당신의 차례 (선수)',
    cpuTurn: 'CPU 차례 (후수)',
    cpuThinking: 'CPU 생각 중…',
    cpuHand: 'CPU 패',
    yourHand: '내 패',
    undo: '무르기',
    reset: '처음부터',
    promoteQ: '승격할까요?',
    promoteYes: '승격',
    promoteNo: '안함',
    cpuWins: 'CPU 승리!',
    youWin: '당신 승리!',
    draw: '무승부 (스테일메이트)',
    playAgain: '다시 하기',
    confirmReset: '처음부터 다시 하시겠습니까?',
    loading: '엔진 로딩 중…',
    loadFailed: '엔진 로딩 실패',
    strength: '난이도',
  },
  es: {
    productHeading: 'Juega con el tablero físico',
    productDesc: 'Siluetas de ajedrez con estética japonesa. Vive la experiencia real.',
    productBtn: 'Ver en Etsy',
    title: 'Shogi vs CPU',
    yourTurn: 'Tu turno (Sente)',
    cpuTurn: 'Turno de CPU (Gote)',
    cpuThinking: 'CPU pensando…',
    cpuHand: 'Piezas de CPU',
    yourHand: 'Tus piezas',
    undo: 'Deshacer',
    reset: 'Nueva partida',
    promoteQ: '¿Promover pieza?',
    promoteYes: 'Promover',
    promoteNo: 'No',
    cpuWins: '¡Gana CPU!',
    youWin: '¡Ganaste!',
    draw: 'Empate',
    playAgain: 'Jugar de nuevo',
    confirmReset: '¿Empezar nueva partida?',
    loading: 'Cargando motor…',
    loadFailed: 'Error al cargar motor',
    strength: 'Nivel',
  },
};

let _lang = localStorage.getItem('lang') || detectLang();

function detectLang() {
  const nav = navigator.language?.slice(0, 2) || 'ja';
  return TRANSLATIONS[nav] ? nav : 'ja';
}

export function t(key) {
  return (TRANSLATIONS[_lang] ?? TRANSLATIONS.ja)[key] ?? key;
}

export function getLang() { return _lang; }

export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  localStorage.setItem('lang', lang);
}
