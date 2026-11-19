import { expect, test } from "bun:test";
import { handle, route } from "./http";
import { ConflictError, NotFoundError } from "./http-errors";
import { readJson, readOptionalJson } from "./request";
import { Validator } from "./validation";

const server = {} as Parameters<ReturnType<typeof handle>>[1];

function post(body: string, contentType = "application/json"): Request {
  return new Request("http://local/api/v1/test", {
    method: "POST",
    body,
    headers: { "content-type": contentType },
  });
}

const echo = handle(async (req) => {
  const body = await readJson(req);
  const v = new Validator(body);
  const nombre = v.requiredString("nombre");
  v.assertValid();
  return Response.json({ nombre });
});

test("handle + readJson: cuerpo válido", async () => {
  const res = await echo(post(JSON.stringify({ nombre: "Ana" })), server);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ nombre: "Ana" });
});

test.each([
  ["", "El cuerpo de la solicitud está vacío"],
  ["{malo", "El cuerpo no es JSON válido"],
  ["[1,2]", "El cuerpo debe ser un objeto JSON"],
  ["null", "El cuerpo debe ser un objeto JSON"],
])("400 con cuerpo %p", async (body, error) => {
  const res = await echo(post(body), server);
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error });
});

test("400 con content-type distinto de JSON", async () => {
  const res = await echo(post("nombre=Ana", "application/x-www-form-urlencoded"), server);
  expect(res.status).toBe(400);
});

test("400 con details de validación", async () => {
  const res = await echo(post("{}"), server);
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({
    error: "Hay datos inválidos en el formulario",
    details: { nombre: "Este campo es obligatorio" },
  });
});

test("404 tipado", async () => {
  const notFound = handle(() => {
    throw new NotFoundError("Cliente no encontrado");
  });
  const res = await notFound(post("{}"), server);
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "Cliente no encontrado" });
});

test("409 tipado con details", async () => {
  const conflict = handle(() => {
    throw new ConflictError("Documento duplicado", { numero_doc: "Ya existe" });
  });
  const res = await conflict(post("{}"), server);
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "Documento duplicado", details: { numero_doc: "Ya existe" } });
});

test("500 genérico sin filtrar detalles internos y logueado", async () => {
  const original = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    const boom = handle(async () => {
      throw new Error("SQLITE_BUSY interno");
    });
    const res = await boom(post("{}"), server);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Error interno del servidor" });
    expect(logged.length).toBe(1);
  } finally {
    console.error = original;
  }
});

test("route responde 405 con Allow para métodos no definidos", async () => {
  const r = route({ GET: () => Response.json({ ok: true }) });
  const res = await r(post("{}"), server);
  expect(res.status).toBe(405);
  expect(res.headers.get("allow")).toBe("GET");
  const ok = await r(new Request("http://local/x"), server);
  expect(ok.status).toBe(200);
});

test("readOptionalJson: cuerpo vacío o ausente es un objeto vacío", async () => {
  expect(await readOptionalJson(post(""))).toEqual({});
  expect(await readOptionalJson(new Request("http://local/api/v1/test", { method: "POST" }))).toEqual({});
});

test("readOptionalJson con cuerpo valida igual que readJson", async () => {
  expect(await readOptionalJson(post(JSON.stringify({ reason: "x" })))).toEqual({ reason: "x" });
  expect(readOptionalJson(post("[1]"))).rejects.toThrow("El cuerpo debe ser un objeto JSON");
});
