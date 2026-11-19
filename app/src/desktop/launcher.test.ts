import { expect, test } from "bun:test";
import { candidatePorts, isAddressInUse, launch, NoFreePortError } from "./launcher";

function addressInUse(): Error {
  return Object.assign(new Error("Failed to start server. Is port in use?"), { code: "EADDRINUSE" });
}

test("reutiliza la instancia que ya responde sin levantar otro servidor", async () => {
  const listened: number[] = [];
  const result = await launch({
    preferredPort: 4000,
    searchSize: 10,
    isRunning: async (port) => port === 4000,
    isPortInUse: async () => false,
    listen: (port) => listened.push(port),
  });
  expect(result).toEqual({ kind: "existing", port: 4000 });
  expect(listened).toEqual([]);
});

test("si otro programa ocupa el puerto prueba el siguiente", async () => {
  const busy: number[] = [];
  const result = await launch({
    preferredPort: 4000,
    searchSize: 10,
    isRunning: async () => false,
    isPortInUse: async () => false,
    listen: (port) => {
      if (port < 4002) throw addressInUse();
      return `servidor:${port}`;
    },
    onPortBusy: (port) => busy.push(port),
  });
  expect(result).toEqual({ kind: "started", port: 4002, server: "servidor:4002" });
  expect(busy).toEqual([4000, 4001]);
});

test("encuentra una instancia en un puerto posterior del rango", async () => {
  const result = await launch({
    preferredPort: 4000,
    searchSize: 10,
    isRunning: async (port) => port === 4001,
    isPortInUse: async () => false,
    listen: () => {
      throw addressInUse();
    },
  });
  expect(result).toEqual({ kind: "existing", port: 4001 });
});

test("falla con un mensaje claro si no queda ningún puerto libre", async () => {
  const options = {
    searchSize: 3,
    isRunning: async () => false,
    isPortInUse: async () => false,
    listen: (): never => {
      throw addressInUse();
    },
  };
  await expect(launch({ ...options, preferredPort: 4000 })).rejects.toThrow(/entre 4000 y 4002/);
  await expect(launch({ ...options, preferredPort: 4000, searchSize: 1 })).rejects.toBeInstanceOf(NoFreePortError);
});

test("propaga errores que no son de puerto ocupado", async () => {
  const result = launch({
    preferredPort: 4000,
    searchSize: 5,
    isRunning: async () => false,
    isPortInUse: async () => false,
    listen: () => {
      throw new Error("permiso denegado");
    },
  });
  await expect(result).rejects.toThrow("permiso denegado");
});

test("salta los puertos que otro programa ya atiende aunque escuchar no falle", async () => {
  const busy: number[] = [];
  const result = await launch({
    preferredPort: 4000,
    searchSize: 10,
    isRunning: async () => false,
    isPortInUse: async (port) => port === 4000,
    listen: (port) => `servidor:${port}`,
    onPortBusy: (port) => busy.push(port),
  });
  expect(result).toEqual({ kind: "started", port: 4001, server: "servidor:4001" });
  expect(busy).toEqual([4000]);
});

test("puertos candidatos sin pasar de 65535", () => {
  expect(candidatePorts(4000, 3)).toEqual([4000, 4001, 4002]);
  expect(candidatePorts(65534, 10)).toEqual([65534, 65535]);
  expect(candidatePorts(4000, 0)).toEqual([4000]);
  expect(isAddressInUse(addressInUse())).toBe(true);
  expect(isAddressInUse(new Error("x"))).toBe(false);
});
