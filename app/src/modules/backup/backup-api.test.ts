import { expect, test } from "bun:test";
import { listBackupsHandler, restoreBackupHandler } from "./backup.controller";
import { createDownloadBackup } from "./backup.service";
import { businessName, restoreRequest, setBusinessName, uploadForm, useBackupEnvironment } from "./backup.test-support";

useBackupEnvironment();

test("rechaza cuerpos que no son multipart y campos ausentes", async () => {
  const json = await restoreBackupHandler(restoreRequest("{}", { "Content-Type": "application/json" })).catch(
    (err) => err,
  );
  expect(json).toMatchObject({ status: 400 });

  const missing = new FormData();
  missing.append("otro", "x");
  await expect(restoreBackupHandler(restoreRequest(missing))).rejects.toMatchObject({ status: 400 });
});

test("rechaza orígenes ajenos sin tocar los datos", async () => {
  setBusinessName("Original");
  const { bytes } = createDownloadBackup();
  setBusinessName("Cambiado");
  await expect(
    restoreBackupHandler(restoreRequest(uploadForm(bytes), { Origin: "http://malicioso.example" })),
  ).rejects.toMatchObject({ status: 403 });
  expect(businessName()).toBe("Cambiado");
});

test("acepta multipart del mismo origen y lista el respaldo previo", async () => {
  setBusinessName("Original");
  const { bytes } = createDownloadBackup();
  setBusinessName("Cambiado");

  const ok = await restoreBackupHandler(restoreRequest(uploadForm(bytes), { Origin: "http://localhost:4000" }));
  expect(ok.status).toBe(200);
  expect(await ok.json()).toMatchObject({ status: "restored" });
  expect(businessName()).toBe("Original");

  const list = await listBackupsHandler().json();
  expect(list.items).toHaveLength(1);
  expect(list.items[0]).toMatchObject({ kind: "pre-restore" });
});
