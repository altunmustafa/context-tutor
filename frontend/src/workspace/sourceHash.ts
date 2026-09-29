/** A deterministic FNV-1a fingerprint for stale detection, not a security boundary. */
export function sourceHash(content: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of content) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
