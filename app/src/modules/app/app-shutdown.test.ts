import { expect, test } from "bun:test";
import { shutdownAppHandler } from "./app.controller";
import { onShutdownRequested } from "./app.service";

const JSON_HEADERS = { "Content-Type": "application/json" };

function shutdownRequest(headers: Record<string, string>, body?: string): Request {
  return new Request("http://localhost/api/v1/app/shutdown", { method: "POST", headers, body });
}

test("el cierre exige contenido JSON", async () => {
  await expect(shutdownAppHandler(shutdownRequest({}))).rejects.toThrow(/application\/json/);
  await expect(shutdownAppHandler(shutdownRequest({ "Content-Type": "text/plain" }, "x"))).rejects.toThrow(
    /application\/json/,
  );
  await expect(
    shutdownAppHandler(shutdownRequest({ "Content-Type": "text/plain; x=application/json" }, "{}")),
  ).rejects.toThrow(/application\/json/);
});

test("el cierre rechaza orígenes ajenos y cuerpos inválidos", async () => {
  await expect(
    shutdownAppHandler(shutdownRequest({ ...JSON_HEADERS, Origin: "http://evil.example" }, "{}")),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    shutdownAppHandler(shutdownRequest({ ...JSON_HEADERS, Origin: "http://localhost:9999" }, "{}")),
  ).rejects.toMatchObject({ status: 403 });
  await expect(shutdownAppHandler(shutdownRequest(JSON_HEADERS, "{malo"))).rejects.toThrow();
});

test("el cierre se programa una sola vez", async () => {
  let calls = 0;
  onShutdownRequested(() => calls++);

  const first = await shutdownAppHandler(shutdownRequest(JSON_HEADERS, "{}"));
  const second = await shutdownAppHandler(
    shutdownRequest({ "Content-Type": "Application/JSON; charset=utf-8", Origin: "http://localhost" }),
  );
  expect(first.status).toBe(202);
  expect(await first.json()).toEqual({ status: "closing" });
  expect(second.status).toBe(202);

  await Bun.sleep(400);
  expect(calls).toBe(1);
});
