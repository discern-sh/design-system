export function derivedInitials(
  name: string,
  limit: number,
  wordPattern: RegExp = /\s+/,
): string {
  const words = name.trim().split(wordPattern).filter((word) =>
    word.length > 0
  );
  const edges = words.length > 1 ? [words.at(0), words.at(-1)] : [words.at(0)];
  return edges
    .flatMap((word) => (word === undefined ? [] : [...word].slice(0, 1)))
    .slice(0, limit)
    .join("")
    .toUpperCase();
}
