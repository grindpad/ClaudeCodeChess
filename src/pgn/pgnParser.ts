/**
 * Hand-written PGN tokeniser + recursive-descent parser.
 *
 * Replaces @mliebelt/pgn-parser entirely. Handles every edge case found
 * in the project's real fixture files:
 *
 *   test-fixtures/Aljechin e5, Nc3, dxc3_Schwarz_2026 (1).pgn
 *     — single game, BOM (EF BB BF), CRLF line endings, 5-level nested
 *       variations, multi-line comment containing a game-reference string
 *       like "0-1 (65) Bacrot,E (2628)-Bortnyk,O (2601) Chess.com INT 2025"
 *
 *   test-fixtures/Scandinavisch 3.. Dd6 (1).pgn
 *     — two identical games, CRLF endings, deep inline variations,
 *       compressed move notation (many moves per line)
 *
 *   test-fixtures/EN - Vienna Game for White - Top-Level Repertoire.pgn
 *     — 42 games, BOM, mixed CRLF + LF line endings, [%csl]/[%cal]/[%evp]
 *       graphic annotations, NAGs $132/$146, extra tags (GameId,
 *       SourceVersionDate, EventDate, PlyCount), 10+-level nested variations,
 *       multi-line comments, incomplete games ending with *
 *
 *   test-fixtures/alekhine.pgn  (simple fixture — 5-level variations, NAGs)
 *   test-fixtures/scandinavian.pgn  (simple fixture — two-game multi-import)
 *
 * Key design decisions
 * ─────────────────────
 * • Pre-process first: strip BOM, normalise all line endings to \n.
 * • Game splitting: track comment-depth so that "(" and "[" inside {...}
 *   never trigger false boundaries.  Split only when a tag-line is seen
 *   AFTER move text has been observed for the current game.
 * • Tokeniser: character-scan, not regex-split. {…} comments consumed as
 *   a single token (safe from nested-paren and result-string false positives).
 * • All [%…] annotations (csl, cal, evp, …) stripped from comments at
 *   tokenise time; empty comments are discarded.
 * • NAGs: any $N 0–255 stored as numbers. Inline !/?/!?/… suffix on a SAN
 *   converted to the corresponding NAG and emitted as a separate token.
 * • Castling: both "O-O" and "0-0" accepted (normalised before chess.js).
 * • Error isolation: one bad game never crashes the batch. Illegal moves
 *   stop only that line (logged as warnings); parse errors skip that game.
 */

import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedPgn, PgnMetadata } from '../types/pgn';
import type { MoveNode, MoveTree } from '../types/moveTree';
import { STARTING_FEN } from '../types/moveTree';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ImportableGame {
  /** 0-based index within the PGN file */
  index: number;
  /** Raw single-game PGN string — pass to parsePgn() when loading */
  pgn: string;
  white: string | null;
  black: string | null;
  event: string | null;
  date: string | null;
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null;
  /** Half-move count: from PlyCount tag if present, else estimated from text */
  plyCount: number | null;
  /** True if the move text contains comments, NAGs, or variations */
  hasAnnotations: boolean;
}

export interface ParseResult {
  games: ImportableGame[];
  parseErrors: string[];
}

// ── Entry points ──────────────────────────────────────────────────────────────

/** Parse a single-game PGN string into a MoveTree. Throws on fatal error. */
export function parsePgn(raw: string): ParsedPgn {
  return parseSingleGame(preprocess(raw));
}

/**
 * Parse a string that may contain one or more games.
 * Never throws — errors from individual games accumulate in parseErrors.
 */
export function parseMultiPgn(raw: string): ParseResult {
  const pgn = preprocess(raw);
  const gameStrings = splitIntoGameStrings(pgn);
  const games: ImportableGame[] = [];
  const parseErrors: string[] = [];

  for (let i = 0; i < gameStrings.length; i++) {
    try {
      const { tags, movesText } = extractTagsAndMoves(gameStrings[i]);
      games.push({
        index: i,
        pgn: gameStrings[i],
        white: tags['White'] ?? null,
        black: tags['Black'] ?? null,
        event: tags['Event'] ?? null,
        date: tags['Date'] ?? null,
        result: normalizeResult(tags['Result']),
        plyCount: derivePlyCount(tags, movesText),
        hasAnnotations: /[{!?$()]/.test(movesText),
      });
    } catch (err) {
      parseErrors.push(
        `Game ${i + 1}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { games, parseErrors };
}

// ── Pre-processing ────────────────────────────────────────────────────────────

function preprocess(raw: string): string {
  let s = raw;
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);       // strip BOM
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');     // normalise endings
  return s.trim();
}

// ── Game splitting ────────────────────────────────────────────────────────────

/**
 * Split a preprocessed multi-game PGN into individual game strings.
 *
 * Rule: a new game begins when a tag-line (line starting with "[") appears
 * AFTER move text has been seen for the current game.  Comment depth is
 * tracked so that "[" characters inside {…} blocks don't trigger a split.
 *
 * Why not split on blank lines? Because PGN allows blank lines between the
 * tag section and the move text inside a single game.
 */
function splitIntoGameStrings(pgn: string): string[] {
  const games: string[] = [];
  const lines = pgn.split('\n');
  let current: string[] = [];
  let seenMoves = false;
  let commentDepth = 0;

  for (const line of lines) {
    // Track { } depth across the raw line (before any other classification).
    // We track quote state so { inside a tag value like [Event "a{b"] is ignored.
    let inQuotes = false;
    for (const ch of line) {
      if (commentDepth === 0) {
        if (ch === '"') inQuotes = !inQuotes;
        if (!inQuotes && ch === '{') commentDepth++;
      } else {
        if (ch === '}') commentDepth--;
      }
    }

    const trimmed = line.trim();
    const isTagLine = commentDepth === 0 && trimmed.startsWith('[');

    if (isTagLine && seenMoves) {
      // New game boundary — flush the current game
      const text = current.join('\n').trim();
      if (text) games.push(text);
      current = [line];
      seenMoves = false;
    } else {
      current.push(line);
      // Non-blank, non-tag content = move text has started
      if (trimmed !== '' && !isTagLine) seenMoves = true;
    }
  }

  const last = current.join('\n').trim();
  if (last) games.push(last);
  return games.length > 0 ? games : [pgn];
}

// ── Tag / moves extraction ────────────────────────────────────────────────────

function extractTagsAndMoves(gameText: string): {
  tags: Record<string, string>;
  movesText: string;
} {
  const lines = gameText.split('\n');
  const tags: Record<string, string> = {};
  let movesStartIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;

    if (trimmed.startsWith('[')) {
      // [TagName "Value"] — value may contain escaped \"
      const m = trimmed.match(/^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]$/);
      if (m) tags[m[1]] = m[2].replace(/\\(["\\])/g, '$1');
    } else {
      movesStartIdx = i;
      break;
    }
  }

  return { tags, movesText: lines.slice(movesStartIdx).join('\n') };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeResult(
  v: string | undefined
): '1-0' | '0-1' | '1/2-1/2' | '*' | null {
  if (v === '1-0' || v === '0-1' || v === '1/2-1/2' || v === '*') return v;
  return null;
}

function derivePlyCount(
  tags: Record<string, string>,
  movesText: string
): number | null {
  const fromTag = parseInt(tags['PlyCount'] ?? '', 10);
  if (!isNaN(fromTag)) return fromTag;
  // Estimate: highest move number in text × 2 (rough, includes variations)
  const nums = movesText.match(/\b(\d+)\./g);
  if (!nums) return null;
  const last = parseInt(nums[nums.length - 1], 10);
  return isNaN(last) ? null : last * 2;
}

function extractMetadata(tags: Record<string, string>): PgnMetadata {
  const str = (k: string) => tags[k] ?? null;
  const num = (k: string): number | null => {
    const n = parseInt(tags[k] ?? '', 10);
    return isNaN(n) ? null : n;
  };
  return {
    event: str('Event'),
    site: str('Site'),
    date: str('Date'),
    round: str('Round'),
    white: str('White'),
    black: str('Black'),
    result: normalizeResult(tags['Result']),
    whiteElo: num('WhiteElo'),
    blackElo: num('BlackElo'),
    eco: str('ECO'),
    opening: str('Opening'),
    timeControl: str('TimeControl'),
    annotator: str('Annotator'),
    rawTags: tags,
  };
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────

type Token =
  | { type: 'move_num' }
  | { type: 'san'; value: string }
  | { type: 'nag'; value: number }
  | { type: 'comment'; text: string }
  | { type: 'var_open' }
  | { type: 'var_close' }
  | { type: 'result' };

/** Strip all [%…] graphic / engine annotations from comment text. */
function stripAnnotations(raw: string): string | null {
  const s = raw
    .replace(/\[%[^\]]*\]/g, '')  // remove [%csl …], [%cal …], [%evp …], etc.
    .replace(/\s+/g, ' ')          // collapse whitespace (handles multi-line)
    .trim();
  return s || null;
}

const INLINE_SUFFIX_NAG: Record<string, number> = {
  '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6,
};

function tokenize(movesText: string): Token[] {
  const tokens: Token[] = [];
  const s = movesText;
  const n = s.length;
  let i = 0;

  while (i < n) {
    const ch = s[i];

    // Whitespace
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
      i++;
      continue;
    }

    // Comment {…}  — consume until matching }, handling the text as-is
    if (ch === '{') {
      i++;
      let text = '';
      while (i < n && s[i] !== '}') text += s[i++];
      if (i < n) i++; // consume '}'
      const cleaned = stripAnnotations(text);
      if (cleaned) tokens.push({ type: 'comment', text: cleaned });
      continue;
    }

    // Variation delimiters
    if (ch === '(') { tokens.push({ type: 'var_open' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'var_close' }); i++; continue; }

    // NAG  $N
    if (ch === '$') {
      i++;
      let digits = '';
      while (i < n && s[i] >= '0' && s[i] <= '9') digits += s[i++];
      const v = parseInt(digits, 10);
      if (!isNaN(v)) tokens.push({ type: 'nag', value: v });
      continue;
    }

    // Scan a "word": run of non-whitespace chars not in {, }, (, ), $
    let word = '';
    while (
      i < n &&
      s[i] !== ' ' && s[i] !== '\n' && s[i] !== '\t' && s[i] !== '\r' &&
      s[i] !== '{' && s[i] !== '(' && s[i] !== ')' && s[i] !== '$'
    ) {
      word += s[i++];
    }
    if (!word) { i++; continue; }

    for (const tok of classifyWord(word)) tokens.push(tok);
  }

  return tokens;
}

function classifyWord(word: string): Token[] {
  // Result tokens
  if (
    word === '1-0' || word === '0-1' || word === '1/2-1/2' || word === '*'
  ) return [{ type: 'result' }];

  // Move number: "1.", "12...", etc.
  if (/^\d+\.+$/.test(word)) return [{ type: 'move_num' }];

  // SAN with optional inline annotation suffix (e4!, Nf3?!, O-O??)
  const sfxMatch = word.match(/^(.+?)([!?]{1,2})$/);
  if (sfxMatch) {
    const base = sfxMatch[1];
    const suffix = sfxMatch[2];
    if (isSanLike(base)) {
      const nagVal = INLINE_SUFFIX_NAG[suffix];
      const out: Token[] = [{ type: 'san', value: normaliseCastling(base) }];
      if (nagVal !== undefined) out.push({ type: 'nag', value: nagVal });
      return out;
    }
  }

  if (isSanLike(word)) return [{ type: 'san', value: normaliseCastling(word) }];

  return []; // skip unrecognised tokens
}

/** Accept O-O / O-O-O as well as the non-standard 0-0 / 0-0-0 forms. */
function normaliseCastling(san: string): string {
  if (san === '0-0-0' || san === '0-0-0+' || san === '0-0-0#') {
    return san.replace(/^0/, 'O');
  }
  if (san.startsWith('0-0')) return san.replace(/^0-0/, 'O-O');
  return san;
}

/**
 * Loose pre-filter: does a word look like a chess move?
 * chess.js is the authoritative validator — this just avoids obvious noise.
 */
function isSanLike(w: string): boolean {
  const bare = w.replace(/[+#]$/, '');
  if (bare === 'O-O-O' || bare === 'O-O' || bare === '0-0-0' || bare === '0-0') {
    return true;
  }
  if (bare.length < 2 || bare.length > 8) return false;
  return /^[KQRBNa-h]/.test(bare);
}

// ── Recursive-descent parser ──────────────────────────────────────────────────

function parseSingleGame(gameText: string): ParsedPgn {
  const { tags, movesText } = extractTagsAndMoves(gameText);
  const rootFen =
    tags['SetUp'] === '1' && tags['FEN'] ? tags['FEN'] : STARTING_FEN;
  const metadata = extractMetadata(tags);
  const tokens = tokenize(movesText);
  const pos = { value: 0 };
  const chess = new Chess(rootFen);
  const mainLine = parseLine(tokens, pos, chess, null, 0);
  return { metadata, tree: { rootFen, mainLine } };
}

/**
 * Parse a line (main line or variation branch) from the shared token stream.
 *
 * @param pos          mutable cursor — shared across the entire recursive call tree
 * @param chess        chess.js instance positioned at the START of this line
 * @param lineParentId parent node ID for the first node of this line
 * @param basePly      ply offset: 0 for main line; (parentNode.ply − 1) for variations
 */
function parseLine(
  tokens: Token[],
  pos: { value: number },
  chess: Chess,
  lineParentId: string | null,
  basePly: number
): MoveNode[] {
  const nodes: MoveNode[] = [];
  let parentId = lineParentId;
  let pendingPreComment: string | null = null;

  while (pos.value < tokens.length) {
    const tok = tokens[pos.value];

    // These two token types signal the end of the current line
    if (tok.type === 'result' || tok.type === 'var_close') break;

    if (tok.type === 'move_num') { pos.value++; continue; }

    if (tok.type === 'comment') {
      pos.value++;
      if (nodes.length === 0) {
        // Before any move in this line — treat as pre-comment for next move
        pendingPreComment = tok.text;
      } else {
        const prev = nodes[nodes.length - 1];
        if (prev.comment === null) prev.comment = tok.text;
        else pendingPreComment = tok.text; // attach to following move
      }
      continue;
    }

    if (tok.type === 'nag') {
      pos.value++;
      if (nodes.length > 0) nodes[nodes.length - 1].nags.push(tok.value);
      continue;
    }

    // Orphaned variation open (e.g. malformed PGN) — skip it safely
    if (tok.type === 'var_open') {
      pos.value++;
      skipVariation(tokens, pos);
      continue;
    }

    // ── SAN move ─────────────────────────────────────────────────────────────
    if (tok.type === 'san') {
      pos.value++;
      const fenBefore = chess.fen();

      let moveResult: ReturnType<typeof chess.move> | null = null;
      try { moveResult = chess.move(tok.value); } catch { /* illegal */ }

      if (!moveResult) {
        console.warn(`[pgnParser] Illegal move "${tok.value}" at ${fenBefore.split(' ')[0]}`);
        break; // stop this line; caller continues normally
      }

      const ply = basePly + nodes.length + 1;
      const node: MoveNode = {
        id: uuidv4(),
        san: moveResult.san,
        uci: `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`,
        fen: chess.fen(),
        ply,
        moveNumber: Math.ceil(ply / 2),
        color: moveResult.color as 'w' | 'b',
        comment: null,
        preComment: pendingPreComment,
        nags: [],
        variations: [],
        parent: parentId,
      };
      pendingPreComment = null;

      // Consume NAGs, comments, and variation branches that belong to this node
      while (pos.value < tokens.length) {
        const next = tokens[pos.value];

        if (next.type === 'nag') {
          pos.value++;
          node.nags.push(next.value);
        } else if (next.type === 'comment') {
          pos.value++;
          if (node.comment === null) {
            node.comment = next.text;
          } else {
            pendingPreComment = next.text; // second comment → preComment of next move
          }
        } else if (next.type === 'var_open') {
          pos.value++; // consume '('
          // Branch from the position BEFORE this move was played
          const varChess = new Chess(fenBefore);
          const varLine = parseLine(tokens, pos, varChess, parentId, ply - 1);
          if (pos.value < tokens.length && tokens[pos.value].type === 'var_close') {
            pos.value++; // consume ')'
          }
          if (varLine.length > 0) node.variations.push(varLine);
        } else {
          break;
        }
      }

      nodes.push(node);
      parentId = node.id;
    }
  }

  return nodes;
}

/** Skip tokens until the matching ')' is consumed (depth-tracked). */
function skipVariation(tokens: Token[], pos: { value: number }): void {
  let depth = 1;
  while (pos.value < tokens.length && depth > 0) {
    const t = tokens[pos.value++];
    if (t.type === 'var_open') depth++;
    else if (t.type === 'var_close') depth--;
  }
}
