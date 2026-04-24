// Quick smoke-test for the new pgnParser logic.
// Run with: node scripts/test-parser.js
'use strict';

const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

// ── Inline the core parser logic (mirrors src/pgn/pgnParser.ts) ──────────────

function preprocess(raw) {
  let s = raw;
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return s.trim();
}

function splitIntoGameStrings(pgn) {
  const games = [];
  const lines = pgn.split('\n');
  let current = [], seenMoves = false, commentDepth = 0;
  for (const line of lines) {
    let inQ = false;
    for (const ch of line) {
      if (commentDepth === 0) {
        if (ch === '"') inQ = !inQ;
        if (!inQ && ch === '{') commentDepth++;
      } else {
        if (ch === '}') commentDepth--;
      }
    }
    const t = line.trim();
    const isTag = commentDepth === 0 && t.startsWith('[');
    if (isTag && seenMoves) {
      const tx = current.join('\n').trim();
      if (tx) games.push(tx);
      current = [line];
      seenMoves = false;
    } else {
      current.push(line);
      if (t !== '' && !isTag) seenMoves = true;
    }
  }
  const last = current.join('\n').trim();
  if (last) games.push(last);
  return games.length > 0 ? games : [pgn];
}

function extractTagsAndMoves(gt) {
  const lines = gt.split('\n');
  const tags = {};
  let msi = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith('[')) {
      const m = t.match(/\[(\w+)\s+"([^"]*)"/);
      if (m) tags[m[1]] = m[2];
    } else { msi = i; break; }
  }
  return { tags, movesText: lines.slice(msi).join('\n') };
}

function stripAnnotations(raw) {
  const s = raw.replace(/\[%[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  return s || null;
}

const SUFFIX_NAG = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };

function tokenize(movesText) {
  const tokens = [];
  const s = movesText;
  const n = s.length;
  let i = 0;
  while (i < n) {
    const ch = s[i];
    if (' \n\t\r'.includes(ch)) { i++; continue; }
    if (ch === '{') {
      i++;
      let text = '';
      while (i < n && s[i] !== '}') text += s[i++];
      if (i < n) i++;
      const c = stripAnnotations(text);
      if (c) tokens.push({ type: 'comment', text: c });
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'var_open' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'var_close' }); i++; continue; }
    if (ch === '$') {
      i++;
      let d = '';
      while (i < n && s[i] >= '0' && s[i] <= '9') d += s[i++];
      const v = parseInt(d, 10);
      if (!isNaN(v)) tokens.push({ type: 'nag', value: v });
      continue;
    }
    let w = '';
    while (i < n && !' \n\t\r{()}$'.includes(s[i])) w += s[i++];
    if (!w) { i++; continue; }
    for (const t of classifyWord(w)) tokens.push(t);
  }
  return tokens;
}

function normCastle(s) {
  if (s.startsWith('0-0')) return s.replace(/^0-0(-0)?/, (m) => m.replace(/0/g, 'O'));
  return s;
}

function isSanLike(w) {
  const b = w.replace(/[+#]$/, '');
  if (['O-O-O','O-O','0-0-0','0-0'].includes(b)) return true;
  if (b.length < 2 || b.length > 8) return false;
  return /^[KQRBNa-h]/.test(b);
}

function classifyWord(word) {
  if (['1-0','0-1','1/2-1/2','*'].includes(word)) return [{ type: 'result' }];
  if (/^\d+\.+$/.test(word)) return [{ type: 'move_num' }];
  const sfx = word.match(/^(.+?)([!?]{1,2})$/);
  if (sfx && isSanLike(sfx[1])) {
    const nv = SUFFIX_NAG[sfx[2]];
    const t = [{ type: 'san', value: normCastle(sfx[1]) }];
    if (nv !== undefined) t.push({ type: 'nag', value: nv });
    return t;
  }
  if (isSanLike(word)) return [{ type: 'san', value: normCastle(word) }];
  return [];
}

function skipVar(tokens, pos) {
  let d = 1;
  while (pos.value < tokens.length && d > 0) {
    const t = tokens[pos.value++];
    if (t.type === 'var_open') d++;
    else if (t.type === 'var_close') d--;
  }
}

function parseLine(tokens, pos, chess, parentId, basePly) {
  const nodes = [];
  let pid = parentId, ppc = null;
  while (pos.value < tokens.length) {
    const tok = tokens[pos.value];
    if (tok.type === 'result' || tok.type === 'var_close') break;
    if (tok.type === 'move_num') { pos.value++; continue; }
    if (tok.type === 'comment') {
      pos.value++;
      if (!nodes.length) { ppc = tok.text; }
      else {
        const prev = nodes[nodes.length - 1];
        if (!prev.comment) prev.comment = tok.text;
        else ppc = tok.text;
      }
      continue;
    }
    if (tok.type === 'nag') {
      pos.value++;
      if (nodes.length) nodes[nodes.length - 1].nags.push(tok.value);
      continue;
    }
    if (tok.type === 'var_open') { pos.value++; skipVar(tokens, pos); continue; }
    if (tok.type === 'san') {
      pos.value++;
      const fb = chess.fen();
      let mr = null;
      try { mr = chess.move(tok.value); } catch (_) {}
      if (!mr) { break; }
      const ply = basePly + nodes.length + 1;
      const node = {
        san: mr.san, uci: mr.from + mr.to + (mr.promotion || ''),
        fen: chess.fen(), ply, moveNumber: Math.ceil(ply / 2),
        color: mr.color, comment: null, preComment: ppc,
        nags: [], variations: [], parent: pid,
      };
      ppc = null;
      while (pos.value < tokens.length) {
        const nx = tokens[pos.value];
        if (nx.type === 'nag') { pos.value++; node.nags.push(nx.value); }
        else if (nx.type === 'comment') {
          pos.value++;
          if (!node.comment) node.comment = nx.text;
          else ppc = nx.text;
        } else if (nx.type === 'var_open') {
          pos.value++;
          const vc = new Chess(fb);
          const vl = parseLine(tokens, pos, vc, pid, ply - 1);
          if (pos.value < tokens.length && tokens[pos.value].type === 'var_close') pos.value++;
          if (vl.length) node.variations.push(vl);
        } else break;
      }
      nodes.push(node);
      pid = node.san + ply;
    }
  }
  return nodes;
}

function parseGame(gameText) {
  const { tags, movesText } = extractTagsAndMoves(gameText);
  const chess = new Chess();
  const tokens = tokenize(movesText);
  const pos = { value: 0 };
  const mainLine = parseLine(tokens, pos, chess, null, 0);
  return { tags, mainLine };
}

function countVars(nodes) {
  let total = 0;
  for (const n of nodes) {
    total += n.variations.length;
    for (const v of n.variations) total += countVars(v);
  }
  return total;
}

function maxVarDepth(nodes, depth) {
  let max = depth;
  for (const n of nodes) {
    for (const v of n.variations) {
      const d = maxVarDepth(v, depth + 1);
      if (d > max) max = d;
    }
  }
  return max;
}

function hasUnstrippedAnnotations(nodes) {
  for (const n of nodes) {
    if (n.comment && /\[%/.test(n.comment)) return true;
    for (const v of n.variations) {
      if (hasUnstrippedAnnotations(v)) return true;
    }
  }
  return false;
}

function collectNags(nodes, set) {
  for (const n of nodes) {
    for (const nag of n.nags) set.add(nag);
    for (const v of n.variations) collectNags(v, set);
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURES = [
  {
    file: 'Aljechin e5, Nc3, dxc3_Schwarz_2026 (1).pgn',
    label: 'alekhine',
    expectedGames: 1,
    checks: (games, gameStrings) => {
      const { tags, mainLine } = parseGame(gameStrings[0]);
      assert(mainLine.length >= 16, 'main line too short: ' + mainLine.length);
      assert(tags.ECO === 'B02', 'wrong ECO: ' + tags.ECO);
      // Has BOM stripped
      assert(tags.Annotator === 'rolan', 'Annotator tag wrong: ' + tags.Annotator);
      // Multi-line comment with game reference (contains "Bacrot")
      let found = false;
      function findRef(nodes) {
        for (const n of nodes) {
          if (n.comment && n.comment.includes('Bacrot')) found = true;
          for (const v of n.variations) findRef(v);
        }
      }
      findRef(mainLine);
      assert(found, 'game-reference comment not found');
      const depth = maxVarDepth(mainLine, 0);
      assert(depth >= 2, 'variation depth too shallow: ' + depth);
      assert(!hasUnstrippedAnnotations(mainLine), 'ustripped [%...] in comments');
      return { moves: mainLine.length, varDepth: depth };
    },
  },
  {
    file: 'Scandinavisch 3.. Dd6 (1).pgn',
    label: 'scandinavian',
    expectedGames: 2,
    checks: (games, gameStrings) => {
      const { tags: t1, mainLine: ml1 } = parseGame(gameStrings[0]);
      const { tags: t2, mainLine: ml2 } = parseGame(gameStrings[1]);
      assert(t1.ECO === 'B01', 'game1 ECO wrong: ' + t1.ECO);
      assert(t2.ECO === 'B01', 'game2 ECO wrong: ' + t2.ECO);
      assert(ml1.length >= 5, 'game1 main line too short: ' + ml1.length);
      assert(ml2.length >= 5, 'game2 main line too short: ' + ml2.length);
      const vars1 = countVars(ml1);
      assert(vars1 >= 5, 'too few variations in game1: ' + vars1);
      const depth = maxVarDepth(ml1, 0);
      assert(depth >= 3, 'variation depth too shallow: ' + depth);
      return { game1moves: ml1.length, game1vars: vars1, varDepth: depth };
    },
  },
  {
    file: 'EN - Vienna Game for White - Top-Level Repertoire.pgn',
    label: 'vienna',
    expectedGames: 42,
    checks: (games, gameStrings) => {
      // Check game 1 parses
      const { tags: t1, mainLine: ml1 } = parseGame(gameStrings[0]);
      assert(t1.ECO === 'C26', 'game1 ECO wrong: ' + t1.ECO);
      // Check game 2 (long annotated game with [%evp], $146, etc.)
      const { tags: t2, mainLine: ml2 } = parseGame(gameStrings[1]);
      assert(ml2.length >= 5, 'game2 main line too short: ' + ml2.length);
      // Collect NAGs across game2
      const nags = new Set();
      collectNags(ml2, nags);
      assert(nags.has(146) || nags.has(132) || nags.size > 0, 'no NAGs found in game2');
      // Annotation stripping
      assert(!hasUnstrippedAnnotations(ml1), 'ustripped [%...] in game1 comments');
      assert(!hasUnstrippedAnnotations(ml2), 'ustripped [%...] in game2 comments');
      // Check a game with deep variations (game 3)
      const { mainLine: ml3 } = parseGame(gameStrings[2]);
      const depth3 = maxVarDepth(ml3, 0);
      const nags2 = new Set();
      collectNags(ml2, nags2);
      return {
        game1moves: ml1.length, game2moves: ml2.length,
        game3varDepth: depth3, game2nags: [...nags2].join(','),
      };
    },
  },
];

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT: ' + msg);
}

// ── Run ───────────────────────────────────────────────────────────────────────

let allPass = true;
for (const fx of FIXTURES) {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'test-fixtures', fx.file)
    ).toString('utf8');

    const pgn = preprocess(raw);
    assert(pgn.charCodeAt(0) !== 0xFEFF, 'BOM not stripped');
    assert(!pgn.includes('\r'), 'CRLF not normalised');

    const gameStrings = splitIntoGameStrings(pgn);
    assert(
      gameStrings.length === fx.expectedGames,
      `Expected ${fx.expectedGames} games, got ${gameStrings.length}`
    );

    const info = fx.checks(gameStrings.length, gameStrings);
    console.log('[PASS]', fx.label, '(' + fx.file + ')');
    for (const [k, v] of Object.entries(info)) {
      console.log('       ' + k + ':', v);
    }
  } catch (e) {
    console.log('[FAIL]', fx.label, '-', e.message);
    allPass = false;
  }
}

console.log('');
console.log(allPass ? '✓ ALL PASS' : '✗ SOME FAILURES');
process.exit(allPass ? 0 : 1);
