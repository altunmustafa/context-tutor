export type GenerationKind = "summary" | "quiz";

export interface GenerationFailure {
  kind: GenerationKind;
  message: string;
}
