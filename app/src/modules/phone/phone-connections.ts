import type { PhoneConnection } from "./hub-types";
import type { PhoneInfo } from "./phone.protocol";

/** Conexiones de teléfono abiertas, identificadas o no. */
export class PhoneConnections {
  private readonly connections = new Set<PhoneConnection>();

  add(phone: PhoneConnection): void {
    this.connections.add(phone);
  }

  remove(phone: PhoneConnection): boolean {
    return this.connections.delete(phone);
  }

  all(): PhoneConnection[] {
    return [...this.connections];
  }

  infos(): PhoneInfo[] {
    return this.all().flatMap((phone) => (phone.info ? [phone.info] : []));
  }

  hasAny(): boolean {
    return this.connections.size > 0;
  }

  hasIdentified(): boolean {
    return this.all().some((phone) => phone.session !== null);
  }

  findByPhoneId(phoneId: string): PhoneConnection | undefined {
    return this.all().find((candidate) => candidate.info?.id === phoneId);
  }

  withSessionIn(sessionIds: ReadonlySet<string>): PhoneConnection[] {
    return this.all().filter((phone) => phone.session !== null && sessionIds.has(phone.session.id));
  }

  otherWithSession(phone: PhoneConnection, sessionId: string): PhoneConnection[] {
    return this.all().filter((other) => other !== phone && other.session?.id === sessionId);
  }
}
