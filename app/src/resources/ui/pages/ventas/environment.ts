import { LG_BREAKPOINT } from "./constants";

export function isDesktop(): boolean {
  return window.matchMedia(LG_BREAKPOINT).matches;
}

export function hasFinePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}
