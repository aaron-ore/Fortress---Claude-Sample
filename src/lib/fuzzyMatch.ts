// Deterministic fuzzy string matching for POS-name -> recipe suggestions.
// Plain Levenshtein distance + a normalized similarity score. No LLM, no I/O.

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Similarity in [0,1]: 1 = identical (after normalization), 0 = completely different. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/**
 * Rank candidates by similarity to the query, best first. Ties broken by the
 * candidate's name for stable, deterministic ordering.
 */
export function rankMatches<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
  limit = 5,
): FuzzyMatch<T>[] {
  return items
    .map((item) => ({ item, score: similarity(query, getName(item)) }))
    .sort((a, b) => b.score - a.score || getName(a.item).localeCompare(getName(b.item)))
    .slice(0, limit);
}
