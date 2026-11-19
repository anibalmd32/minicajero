import { type NetworkInterfaceInfo, networkInterfaces } from "node:os";

/** Dirección IPv4 de la red local por la que el teléfono puede llegar a esta computadora. */
export interface LocalAddress {
  ip: string;
  /** Nombre del adaptador tal como lo informa el sistema. */
  interfaceName: string;
  /** Nombre corto y amable para mostrar (`Wi-Fi`, `Cable de red` o el del adaptador). */
  label: string;
}

type InterfaceTable = Record<string, NetworkInterfaceInfo[] | undefined>;

const VIRTUAL_ADAPTER =
  /vethernet|wsl|hyper-?v|virtualbox|vbox|vmware|vmnet|docker|loopback|bluetooth|^lo\d*$|^veth|^br-|^virbr|^utun|^bridge|^tun|^tap|^zt|tailscale|zerotier|hamachi|npcap|vpn|wireguard|wintun|openvpn|tap-windows|nordlynx|proton/i;
const VIRTUALBOX_HOST_ONLY_SUBNET = "192.168.56.";
const WIFI_ADAPTER = /wi-?fi|wlan|wireless|inal[aá]mbric|^wl/i;
const ETHERNET_ADAPTER = /ethernet|^eth\d|^en[ops]?\d|^enp|^eno/i;

/** ¿La IPv4 pertenece a un rango privado (10/8, 172.16/12, 192.168/16)? */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts as [number, number, number, number];
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

/** ¿El nombre del adaptador corresponde a uno virtual o que no lleva a la WiFi del local? */
export function isVirtualAdapter(name: string): boolean {
  return VIRTUAL_ADAPTER.test(name);
}

function adapterRank(name: string): number {
  if (WIFI_ADAPTER.test(name)) return 0;
  if (ETHERNET_ADAPTER.test(name)) return 1;
  return 2;
}

function rangeRank(ip: string): number {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.")) return 1;
  return 2;
}

function addressRank(address: LocalAddress): number {
  return adapterRank(address.interfaceName) * 10 + rangeRank(address.ip);
}

/** ¿Es la red solo-anfitrión de VirtualBox (192.168.56.x en un adaptador que no es Wi-Fi, p. ej. "Ethernet 2")? */
export function isVirtualBoxHostOnly(ip: string, interfaceName: string): boolean {
  return ip.startsWith(VIRTUALBOX_HOST_ONLY_SUBNET) && !WIFI_ADAPTER.test(interfaceName);
}

function adapterLabel(name: string): string {
  const rank = adapterRank(name);
  if (rank === 0) return "Wi-Fi";
  if (rank === 1) return "Cable de red";
  return name;
}

/**
 * IPv4 privadas de los adaptadores reales, sin repetir, ordenadas para que primero vaya la de Wi-Fi,
 * luego la de cable y al final las demás (dentro de cada grupo 192.168.x antes que 10.x y 172.x).
 * Descarta la red solo-anfitrión de VirtualBox, que Windows muestra como un adaptador de cable más.
 */
export function selectLocalAddresses(table: InterfaceTable): LocalAddress[] {
  const found = new Map<string, LocalAddress>();
  for (const [interfaceName, entries] of Object.entries(table)) {
    if (isVirtualAdapter(interfaceName)) continue;
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal || !isPrivateIPv4(entry.address) || found.has(entry.address))
        continue;
      if (isVirtualBoxHostOnly(entry.address, interfaceName)) continue;
      found.set(entry.address, { ip: entry.address, interfaceName, label: adapterLabel(interfaceName) });
    }
  }
  return [...found.values()].sort((a, b) => addressRank(a) - addressRank(b));
}

/** IPv4 privadas de esta computadora en este momento (ver `selectLocalAddresses`). */
export function currentLocalAddresses(): LocalAddress[] {
  return selectLocalAddresses(networkInterfaces());
}
