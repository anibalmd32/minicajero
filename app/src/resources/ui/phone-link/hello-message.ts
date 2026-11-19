import { PHONE_PROTOCOL_VERSION, type PhoneToServerMessage } from "../../../modules/phone/phone.protocol";

export function helloMessage(token: string | null): PhoneToServerMessage {
  return {
    type: "hello",
    version: PHONE_PROTOCOL_VERSION,
    token: token ?? "",
    device: navigator.userAgent,
  };
}
