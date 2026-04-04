/**
 * Maps NAG (Numeric Annotation Glyph) numbers to their display symbols.
 * Reference: https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c10
 */

const NAG_MAP: Record<number, string> = {
  1: '!',
  2: '?',
  3: '!!',
  4: '??',
  5: '!?',
  6: '?!',
  7: '□',  // forced move
  10: '=', // equal position
  13: '∞', // unclear
  14: '⩲', // slight advantage white
  15: '⩱', // slight advantage black
  16: '±', // moderate advantage white
  17: '∓', // moderate advantage black
  18: '+-', // decisive advantage white
  19: '-+', // decisive advantage black
  22: '⨀', // zugzwang white
  23: '⨀', // zugzwang black
  32: '⟳', // development advantage white
  33: '⟳', // development advantage black
  36: '→', // attack white
  37: '→', // attack black
  40: '↑', // counterplay white
  41: '↑', // counterplay black
  44: '⊕', // time pressure white
  45: '⊕', // time pressure black
  132: '⇆', // counterplay
  138: '⊕', // time pressure
  140: '△', // with the idea
  142: '⊘', // weak point
  145: 'RR', // editorial comment
  146: 'N',  // novelty
};

export function nagToSymbol(nag: number): string {
  return NAG_MAP[nag] ?? `$${nag}`;
}

export function nagsToString(nags: number[]): string {
  return nags.map(nagToSymbol).join('');
}
