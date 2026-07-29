export function hasKoreanFinalConsonant(value) {
  const text = String(value || "").trim();
  const lastCharacter = text.at(-1);

  if (!lastCharacter) return false;

  const codePoint = lastCharacter.codePointAt(0);
  const hangulStart = 0xac00;
  const hangulEnd = 0xd7a3;

  if (codePoint < hangulStart || codePoint > hangulEnd) return false;

  return (codePoint - hangulStart) % 28 !== 0;
}

export function withKoreanObjectParticle(value) {
  const text = String(value || "").trim();

  return `${text}${hasKoreanFinalConsonant(text) ? "을" : "를"}`;
}
