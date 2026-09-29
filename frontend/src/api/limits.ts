export const limits = {
  minContent: 200,
  maxContent: 20_000,
  maxQuestions: 10,
};

export function codePointLength(text: string): number {
  return Array.from(text).length;
}
