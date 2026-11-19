import { type CartLine, stockIssue } from "../../sale-cart";
import type { StatusTone } from "./constants";
import { lineMarks } from "./state";

export function lineHasError(line: CartLine): boolean {
  const id = line.product_id;
  return lineMarks.unavailable.has(id) || lineMarks.serverIssues.has(id) || stockIssue(line) !== null;
}

export function lineMessage(line: CartLine): { text: string; tone: StatusTone } | null {
  const id = line.product_id;
  const { inputErrors, unavailable, serverIssues, lineNotices } = lineMarks;
  const error = inputErrors.get(id) ?? unavailable.get(id) ?? serverIssues.get(id) ?? stockIssue(line);
  if (error) return { text: error, tone: "danger" };
  const notice = lineNotices.get(id);
  return notice ? { text: notice, tone: "warning" } : null;
}
