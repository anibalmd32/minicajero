import { errorMessage, saveDownloadedFile } from "../../api";
import {
  type BackupFile,
  type BackupList,
  backupFileUrl,
  downloadBackup,
  fetchBackups,
  formatFileSize,
} from "../../backups";
import { withBusyButton } from "../../form";
import { formatDateTime, formatInteger } from "../../format";
import { toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";

type ListState = "loading" | "error" | "empty" | "ready";

function showListState(state: ListState): void {
  elements.listLoading.classList.toggle("d-none", state !== "loading");
  elements.listError.classList.toggle("d-none", state !== "error");
  elements.listEmpty.classList.toggle("d-none", state !== "empty");
  elements.listTable.classList.toggle("d-none", state !== "ready");
}

function cell(className = ""): HTMLTableCellElement {
  const td = document.createElement("td");
  if (className) td.className = className;
  return td;
}

function kindBadge(file: BackupFile): HTMLElement | null {
  if (file.kind !== "pre-restore") return null;
  const badge = document.createElement("span");
  badge.className = "badge rounded-pill text-bg-warning ms-sm-2";
  badge.textContent = "Antes de restaurar";
  return badge;
}

function dateCell(file: BackupFile): HTMLTableCellElement {
  const td = cell();
  const date = document.createElement("span");
  date.className = "d-block d-sm-inline";
  date.textContent = formatDateTime(file.created_at);
  td.append(date);
  const badge = kindBadge(file);
  if (badge) td.append(badge);
  const size = document.createElement("span");
  size.className = "d-block d-sm-none small text-body-secondary";
  size.textContent = formatFileSize(file.size_bytes);
  td.append(size);
  return td;
}

function downloadCell(file: BackupFile): HTMLTableCellElement {
  const td = cell("text-end");
  const link = document.createElement("a");
  link.className = "btn btn-sm btn-outline-primary";
  link.href = backupFileUrl(file.name);
  link.download = file.name;
  link.textContent = "Descargar";
  link.setAttribute("aria-label", `Descargar respaldo del ${formatDateTime(file.created_at)}`);
  td.append(link);
  return td;
}

function backupRow(file: BackupFile): HTMLTableRowElement {
  const row = document.createElement("tr");
  const size = cell("text-end text-nowrap d-none d-sm-table-cell");
  size.textContent = formatFileSize(file.size_bytes);
  row.append(dateCell(file), size, downloadCell(file));
  return row;
}

function renderList(list: BackupList): void {
  elements.retention.textContent = formatInteger(list.retention);
  elements.directory.textContent = list.directory;
  elements.directoryRow.classList.remove("d-none");
  elements.listBody.replaceChildren(...list.items.map(backupRow));
  showListState(list.items.length === 0 ? "empty" : "ready");
}

export async function loadBackups(): Promise<void> {
  showListState("loading");
  try {
    renderList(await fetchBackups());
  } catch (err) {
    elements.listErrorMessage.textContent = errorMessage(err);
    showListState("error");
  }
}

export async function downloadCurrentBackup(): Promise<void> {
  try {
    const file = await withBusyButton(elements.downloadButton, downloadBackup, "Preparando…");
    saveDownloadedFile(file);
    toastSuccess(`Respaldo descargado: ${file.fileName}`);
  } catch (err) {
    toastError(`No se pudo descargar el respaldo. ${errorMessage(err)}`);
  }
}
