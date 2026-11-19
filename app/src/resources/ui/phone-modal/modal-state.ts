import type { PhoneInfo } from "../../../modules/phone/phone.protocol";
import type { PairingInfo } from "../../../modules/phone/phone.service";
import type { ModalParts } from "./modal-parts";

type ModalPhase = "closed" | "opening" | "open" | "closing";

interface PhoneModalState {
  parts: ModalParts | null;
  phones: readonly PhoneInfo[];
  pairing: PairingInfo | null;
  pairingRequest: number;
  renewTimer: number | undefined;
  closeTimer: number | undefined;
  phonesWhenOpened: Set<string>;
  renderNavButton: () => void;
  phase: ModalPhase;
}

export const state: PhoneModalState = {
  parts: null,
  phones: [],
  pairing: null,
  pairingRequest: 0,
  renewTimer: undefined,
  closeTimer: undefined,
  phonesWhenOpened: new Set<string>(),
  renderNavButton: () => undefined,
  phase: "closed",
};

export function isOpen(): boolean {
  return state.phase === "opening" || state.phase === "open";
}
