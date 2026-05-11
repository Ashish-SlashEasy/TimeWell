import leoProfanity from "leo-profanity";

leoProfanity.loadDictionary("en");

export function containsProfanity(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => t && leoProfanity.check(t));
}
