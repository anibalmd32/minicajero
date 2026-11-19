import { PhoneLink, type PhoneLinkHandlers } from "../../phone-link";

const handlers: PhoneLinkHandlers = {
  onState: () => undefined,
  onResult: () => undefined,
  onDrop: () => undefined,
};

export const link = new PhoneLink({
  onState: (state) => handlers.onState(state),
  onResult: (result) => handlers.onResult(result),
  onDrop: () => handlers.onDrop(),
});

export function bindLinkHandlers(next: PhoneLinkHandlers): void {
  Object.assign(handlers, next);
}

export function isConnected(): boolean {
  return link.current.kind === "connected";
}
