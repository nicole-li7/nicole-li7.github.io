// Othello and Chess for the minimax demo: a JavaScript port of Othello.cpp,
// Chess.cpp and Minimax.cpp from github.com/nicole-li7/minimax.
// Runs as a Web Worker on search.html so deep searches don't freeze the page;
// the board code is also used directly on the page for legal moves.

// ---------- engine (Minimax.cpp) ----------
var POS_INF = 1000000, NEG_INF = -1000000, nodes = 0;

function orderMoves(state, moves, maximizing) {
  var scored = moves.map(function (m) { return { s: state.apply(m).evaluate(), m: m }; });
  scored.sort(maximizing ? function (a, b) { return b.s - a.s; } : function (a, b) { return a.s - b.s; });
  return scored.map(function (x) { return x.m; });
}

function alphabeta(state, depth, alpha, beta, maximizing, prune) {
  nodes++;
  if (state.isTerminal() || depth === 0) return state.evaluate();
  var moves = state.moves();
  if (prune) moves = orderMoves(state, moves, maximizing);
  var best = maximizing ? NEG_INF : POS_INF;
  for (var i = 0; i < moves.length; i++) {
    var score = alphabeta(state.apply(moves[i]), depth - 1, alpha, beta, !maximizing, prune);
    if (maximizing) { if (score > best) best = score; if (score > alpha) alpha = score; }
    else            { if (score < best) best = score; if (score < beta)  beta  = score; }
    if (prune && beta <= alpha) break;
  }
  return best;
}

function bestMove(state, maxDepth, prune) {
  nodes = 0;
  var moves = state.moves();
  if (!moves.length) return { move: -1, nodes: 0 };
  var maximizing = state.player === 1;
  var ordered = orderMoves(state, moves, maximizing);
  var bestScore = maximizing ? NEG_INF : POS_INF, best = ordered[0];
  for (var i = 0; i < ordered.length; i++) {
    var score = alphabeta(state.apply(ordered[i]), maxDepth - 1, NEG_INF, POS_INF, !maximizing, prune);
    if (maximizing && score > bestScore) { bestScore = score; best = ordered[i]; }
    else if (!maximizing && score < bestScore) { bestScore = score; best = ordered[i]; }
  }
  return { move: best, nodes: nodes };
}

// ---------- Othello (Othello.cpp) ----------
// cells 0-63 row-major; 1 = black (moves first), -1 = white; move -1 = pass
var ODR = [-1, -1, -1, 0, 0, 1, 1, 1], ODC = [-1, 0, 1, -1, 1, -1, 0, 1];
var OWEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120
];

function Othello(board, player) {
  if (board) { this.board = board; this.player = player; return; }
  this.board = new Array(64).fill(0);
  this.board[27] = -1; this.board[28] = 1; this.board[35] = 1; this.board[36] = -1;
  this.player = 1;
}
Othello.prototype.validFor = function (idx, pl) {
  var b = this.board;
  if (b[idx] !== 0) return false;
  var r0 = idx >> 3, c0 = idx & 7;
  for (var d = 0; d < 8; d++) {
    var r = r0 + ODR[d], c = c0 + ODC[d], foundOpp = false;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      var v = b[r * 8 + c];
      if (v === -pl) foundOpp = true;
      else if (v === pl) { if (foundOpp) return true; break; }
      else break;
      r += ODR[d]; c += ODC[d];
    }
  }
  return false;
};
Othello.prototype.hasAnyMove = function (pl) {
  for (var i = 0; i < 64; i++) if (this.board[i] === 0 && this.validFor(i, pl)) return true;
  return false;
};
Othello.prototype.moves = function () {
  var m = [];
  for (var i = 0; i < 64; i++) if (this.validFor(i, this.player)) m.push(i);
  if (!m.length && this.hasAnyMove(-this.player)) m.push(-1);
  return m;
};
Othello.prototype.apply = function (move) {
  var n = new Othello(this.board.slice(), -this.player), pl = this.player;
  if (move === -1) return n;
  n.board[move] = pl;
  var r0 = move >> 3, c0 = move & 7;
  for (var d = 0; d < 8; d++) {
    var r = r0 + ODR[d], c = c0 + ODC[d], fl = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      var v = n.board[r * 8 + c];
      if (v === -pl) fl.push(r * 8 + c);
      else if (v === pl) { for (var i = 0; i < fl.length; i++) n.board[fl[i]] = pl; break; }
      else break;
      r += ODR[d]; c += ODC[d];
    }
  }
  return n;
};
Othello.prototype.isTerminal = function () { return !this.hasAnyMove(1) && !this.hasAnyMove(-1); };
Othello.prototype.count = function (pl) { return this.board.filter(function (v) { return v === pl; }).length; };
Othello.prototype.evaluate = function () {
  if (this.isTerminal()) {
    var b = this.count(1), w = this.count(-1);
    return b > w ? 10000 : w > b ? -10000 : 0;
  }
  var s = 0;
  for (var i = 0; i < 64; i++) s += this.board[i] * OWEIGHTS[i];
  return s;
};

// ---------- Chess (Chess.cpp) ----------
// 0 = a8 ... 63 = h1; P1 N2 B3 R4 Q5 K6, positive = white; 1 = white, -1 = black
// move = from | to << 6 | flag << 12
var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
var MN = 0, ME = 1, MCK = 2, MCQ = 3, MPQ = 4, MPR = 5, MPB = 6, MPN = 7;
function mk(fr, to, fl) { return fr | (to << 6) | ((fl || 0) << 12); }
function mfr(m) { return m & 63; }
function mto(m) { return (m >> 6) & 63; }
function mfl(m) { return (m >> 12) & 15; }
function pcol(p) { return p > 0 ? 1 : p < 0 ? -1 : 0; }
function ptyp(p) { return p < 0 ? -p : p; }
var KR = [-2, -2, -1, -1, 1, 1, 2, 2], KC = [-1, 1, -2, 2, -2, 2, -1, 1];
var ADR = [-1, -1, 1, 1, -1, 1, 0, 0], ADC = [-1, 1, -1, 1, 0, 0, -1, 1];

function Chess(src) {
  if (src) {
    this.board = src.board.slice(); this.player = src.player; this.castling = src.castling;
    this.ep = src.ep; this.lastFrom = src.lastFrom; this.lastTo = src.lastTo;
    return;
  }
  var b = this.board = new Array(64).fill(0);
  var back = [R, N, B, Q, K, B, N, R];
  for (var i = 0; i < 8; i++) { b[i] = -back[i]; b[8 + i] = -P; b[48 + i] = P; b[56 + i] = back[i]; }
  this.player = 1; this.castling = 15; this.ep = -1; this.lastFrom = -1; this.lastTo = -1;
}
Chess.prototype.attacked = function (sq, by) {
  var b = this.board, r = sq >> 3, c = sq & 7, d, nr, nc, v;
  if (by === 1) {
    if (r + 1 < 8 && c > 0 && b[(r + 1) * 8 + c - 1] === P) return true;
    if (r + 1 < 8 && c < 7 && b[(r + 1) * 8 + c + 1] === P) return true;
  } else {
    if (r > 0 && c > 0 && b[(r - 1) * 8 + c - 1] === -P) return true;
    if (r > 0 && c < 7 && b[(r - 1) * 8 + c + 1] === -P) return true;
  }
  for (d = 0; d < 8; d++) {
    nr = r + KR[d]; nc = c + KC[d];
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === by * N) return true;
  }
  for (d = 0; d < 8; d++) {
    var diag = d < 4;
    nr = r + ADR[d]; nc = c + ADC[d];
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      v = b[nr * 8 + nc];
      if (v) { if (v === by * Q || v === by * (diag ? B : R)) return true; break; }
      nr += ADR[d]; nc += ADC[d];
    }
  }
  for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    nr = r + dr; nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === by * K) return true;
  }
  return false;
};
Chess.prototype.pseudo = function () {
  var b = this.board, pl = this.player, out = [];
  for (var sq = 0; sq < 64; sq++) {
    var p = b[sq]; if (pcol(p) !== pl) continue;
    var pt = ptyp(p), r = sq >> 3, c = sq & 7, d, nr, nc;
    if (pt === P) {
      var dir = pl === 1 ? -1 : 1, sr = pl === 1 ? 6 : 1, pr = pl === 1 ? 0 : 7, fwd = sq + dir * 8;
      if (fwd >= 0 && fwd < 64 && !b[fwd]) {
        if ((fwd >> 3) === pr) { out.push(mk(sq, fwd, MPQ)); out.push(mk(sq, fwd, MPN)); }
        else {
          out.push(mk(sq, fwd, MN));
          if (r === sr && !b[sq + dir * 16]) out.push(mk(sq, sq + dir * 16, MN));
        }
      }
      for (var dcx = -1; dcx <= 1; dcx += 2) {
        nc = c + dcx; if (nc < 0 || nc >= 8) continue;
        var csq = (r + dir) * 8 + nc; if (csq < 0 || csq >= 64) continue;
        if (pcol(b[csq]) === -pl) {
          if ((csq >> 3) === pr) { out.push(mk(sq, csq, MPQ)); out.push(mk(sq, csq, MPN)); }
          else out.push(mk(sq, csq, MN));
        }
        if (csq === this.ep) out.push(mk(sq, csq, ME));
      }
    } else if (pt === N) {
      for (d = 0; d < 8; d++) {
        nr = r + KR[d]; nc = c + KC[d];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && pcol(b[nr * 8 + nc]) !== pl) out.push(mk(sq, nr * 8 + nc, MN));
      }
    } else if (pt === B || pt === R || pt === Q) {
      var s = pt === R ? 4 : 0, e = pt === B ? 4 : 8;
      for (d = s; d < e; d++) {
        nr = r + ADR[d]; nc = c + ADC[d];
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          var vc = pcol(b[nr * 8 + nc]);
          if (vc === pl) break;
          out.push(mk(sq, nr * 8 + nc, MN));
          if (vc === -pl) break;
          nr += ADR[d]; nc += ADC[d];
        }
      }
    } else {
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        nr = r + dr; nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && pcol(b[nr * 8 + nc]) !== pl) out.push(mk(sq, nr * 8 + nc, MN));
      }
      var opp = -pl, cs = this.castling;
      if (pl === 1 && sq === 60) {
        if ((cs & 1) && !b[61] && !b[62] && b[63] === R && !this.attacked(60, opp) && !this.attacked(61, opp) && !this.attacked(62, opp)) out.push(mk(60, 62, MCK));
        if ((cs & 2) && !b[59] && !b[58] && !b[57] && b[56] === R && !this.attacked(60, opp) && !this.attacked(59, opp) && !this.attacked(58, opp)) out.push(mk(60, 58, MCQ));
      } else if (pl === -1 && sq === 4) {
        if ((cs & 4) && !b[5] && !b[6] && b[7] === -R && !this.attacked(4, opp) && !this.attacked(5, opp) && !this.attacked(6, opp)) out.push(mk(4, 6, MCK));
        if ((cs & 8) && !b[3] && !b[2] && !b[1] && b[0] === -R && !this.attacked(4, opp) && !this.attacked(3, opp) && !this.attacked(2, opp)) out.push(mk(4, 2, MCQ));
      }
    }
  }
  return out;
};
Chess.prototype.apply = function (mv) {
  var n = new Chess(this), b = n.board, pl = this.player;
  var fr = mfr(mv), to = mto(mv), fl = mfl(mv), pc = b[fr], pt = ptyp(pc);
  n.ep = -1; n.lastFrom = fr; n.lastTo = to; n._moves = undefined;
  b[to] = pc; b[fr] = 0;
  if (fl === ME) b[(fr >> 3) * 8 + (to & 7)] = 0;
  else if (fl === MCK) { if (pl === 1) { b[63] = 0; b[61] = R; } else { b[7] = 0; b[5] = -R; } }
  else if (fl === MCQ) { if (pl === 1) { b[56] = 0; b[59] = R; } else { b[0] = 0; b[3] = -R; } }
  else if (fl === MPQ) b[to] = pl * Q;
  else if (fl === MPR) b[to] = pl * R;
  else if (fl === MPB) b[to] = pl * B;
  else if (fl === MPN) b[to] = pl * N;
  if (pt === P && Math.abs(to - fr) === 16) n.ep = (fr + to) >> 1;
  if (pt === K) n.castling &= pl === 1 ? ~3 : ~12;
  if (fr === 63 || to === 63) n.castling &= ~1;
  if (fr === 56 || to === 56) n.castling &= ~2;
  if (fr === 7 || to === 7) n.castling &= ~4;
  if (fr === 0 || to === 0) n.castling &= ~8;
  n.player = -pl;
  return n;
};
Chess.prototype.kingSq = function (pl) { return this.board.indexOf(pl * K); };
Chess.prototype.inCheck = function (pl) { var k = this.kingSq(pl); return k >= 0 && this.attacked(k, -pl); };
// legal moves are cached per position: evaluate() and isTerminal() both need them
Chess.prototype.moves = function () {
  if (this._moves) return this._moves;
  var pl = this.player, self = this;
  return (this._moves = this.pseudo().filter(function (mv) {
    var n = self.apply(mv), k = n.kingSq(pl);
    return k >= 0 && !n.attacked(k, -pl);
  }));
};
Chess.prototype.isTerminal = function () { return this.moves().length === 0; };
var MAT = [0, 100, 320, 330, 500, 900, 20000];
var PST = [null,
  [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
   0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
   -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
   -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
   -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
   0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
];
Chess.prototype.evaluate = function () {
  if (!this.moves().length) return this.inCheck(this.player) ? (this.player === 1 ? -1000000 : 1000000) : 0;
  var s = 0, b = this.board;
  for (var i = 0; i < 64; i++) {
    var v = b[i]; if (!v) continue;
    var c = pcol(v), pt = ptyp(v), pi = c === 1 ? i : (7 - (i >> 3)) * 8 + (i & 7);
    s += c * (MAT[pt] + PST[pt][pi]);
  }
  return s;
};

// ---------- worker / module glue ----------
function revive(msg) {
  if (msg.game === 'othello') return new Othello(msg.state.board, msg.state.player);
  return new Chess(msg.state);
}
// one computer turn; with compare, also searches again without pruning for the stats
function think(msg) {
  var state = revive(msg), t0 = Date.now(), r = bestMove(state, msg.depth, true);
  var out = { id: msg.id, move: r.move, nodes: r.nodes, ms: Date.now() - t0 };
  if (msg.compare) out.plain = bestMove(state, msg.depth, false).nodes;
  return out;
}
if (typeof module !== 'undefined') {
  module.exports = { Othello: Othello, Chess: Chess, bestMove: bestMove, think: think };
} else if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = function (e) { self.postMessage(think(e.data)); };
}
