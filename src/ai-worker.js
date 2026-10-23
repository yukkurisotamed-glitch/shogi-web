import { ShogiGame } from './shogi.js';
import { bestMoveWithTime } from './ai.js';

self.onmessage = (e) => {
  const { board, hand, turn, movetime, maxDepth, noise, randomRate } = e.data;
  const game = new ShogiGame();
  game.board = board.map(r => [...r]);
  game.hand = { '1': { ...hand['1'] }, '-1': { ...hand['-1'] } };
  game.turn = turn;
  game.history = [];
  const move = bestMoveWithTime(game, movetime, maxDepth ?? 15, noise ?? 0, randomRate ?? 0);
  self.postMessage(move);
};
