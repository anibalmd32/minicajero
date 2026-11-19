export type RuleViolation = {
  file: string;
  line: number;
  rule: "max-file-lines" | "max-function-lines" | "no-comments";
  detail: string;
};

export const MAX_FILE_LINES = 150;
export const MAX_FUNCTION_LINES = 30;
