import type { NavigationPath, PathSegment } from '../types/moveTree';

/**
 * Serialize a NavigationPath to a compact JSON string safe for localStorage.
 * Format: JSON array of PathSegment objects.
 */
export function serializeNavigationPath(path: NavigationPath): string {
  return JSON.stringify(path);
}

/**
 * Deserialize a NavigationPath from the string produced by serializeNavigationPath.
 * Returns [] on any parse failure.
 */
export function deserializeNavigationPath(raw: string | null | undefined): NavigationPath {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSegment);
  } catch {
    return [];
  }
}

function isValidSegment(seg: unknown): seg is PathSegment {
  if (typeof seg !== 'object' || seg === null) return false;
  const s = seg as Record<string, unknown>;
  if (typeof s.index !== 'number') return false;
  if ('variationIndex' in s && typeof s.variationIndex !== 'number') return false;
  return true;
}
