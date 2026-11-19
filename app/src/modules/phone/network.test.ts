import { expect, test } from "bun:test";
import type { NetworkInterfaceInfo } from "node:os";
import { isPrivateIPv4, isVirtualAdapter, selectLocalAddresses } from "./network";

function ipv4(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    family: "IPv4",
    internal,
    netmask: "255.255.255.0",
    mac: "00:00:00:00:00:00",
    cidr: `${address}/24`,
  };
}

function ipv6(address: string): NetworkInterfaceInfo {
  return {
    address,
    family: "IPv6",
    internal: false,
    netmask: "ffff:ffff:ffff:ffff::",
    mac: "00:00:00:00:00:00",
    cidr: `${address}/64`,
    scopeid: 0,
  };
}

test("rangos privados", () => {
  expect(["10.0.0.1", "172.16.0.1", "172.31.255.1", "192.168.0.1"].every(isPrivateIPv4)).toBe(true);
  expect(
    ["172.15.0.1", "172.32.0.1", "169.254.1.1", "100.64.0.1", "8.8.8.8", "127.0.0.1", "192.168.1", "abc"].some(
      isPrivateIPv4,
    ),
  ).toBe(false);
});

test("reconoce adaptadores virtuales", () => {
  const virtual = [
    "vEthernet (WSL)",
    "VirtualBox Host-Only Network",
    "VMware Network Adapter VMnet8",
    "Loopback Pseudo-Interface 1",
    "Bluetooth Network Connection",
    "docker0",
    "ProtonVPN",
    "lo",
  ];
  for (const name of virtual) expect(isVirtualAdapter(name)).toBe(true);
  for (const name of ["Wi-Fi", "Ethernet", "wlan0", "en0", "eth0"]) expect(isVirtualAdapter(name)).toBe(false);
});

test("prioriza Wi-Fi, luego cable, y descarta virtuales, IPv6, internas y públicas", () => {
  const addresses = selectLocalAddresses({
    "vEthernet (WSL)": [ipv4("172.20.0.1")],
    "Ethernet 2": [ipv4("192.168.56.1")],
    "Ethernet 3": [ipv4("192.168.56.7")],
    Ethernet: [ipv4("10.0.0.20"), ipv6("fe80::1")],
    "Loopback Pseudo-Interface 1": [ipv4("127.0.0.1", true)],
    Tailscale: [ipv4("100.100.1.2")],
    Otro: [ipv4("172.16.5.5")],
    "Wi-Fi": [ipv4("192.168.1.108"), ipv6("fe80::2")],
  });
  expect(addresses).toEqual([
    { ip: "192.168.1.108", interfaceName: "Wi-Fi", label: "Wi-Fi" },
    { ip: "10.0.0.20", interfaceName: "Ethernet", label: "Cable de red" },
    { ip: "172.16.5.5", interfaceName: "Otro", label: "Otro" },
  ]);
});

test("sin red devuelve una lista vacía", () => {
  expect(selectLocalAddresses({ lo: [ipv4("127.0.0.1", true)], eth0: undefined })).toEqual([]);
});

test("con la WiFi apagada, la red solo-anfitrión de VirtualBox no cuenta como red", () => {
  expect(selectLocalAddresses({ "Ethernet 2": [ipv4("192.168.56.1")], lo: [ipv4("127.0.0.1", true)] })).toEqual([]);
});

test("192.168.56.x en un adaptador Wi-Fi sí es la red del local", () => {
  expect(selectLocalAddresses({ "Wi-Fi": [ipv4("192.168.56.20")] })).toEqual([
    { ip: "192.168.56.20", interfaceName: "Wi-Fi", label: "Wi-Fi" },
  ]);
});
