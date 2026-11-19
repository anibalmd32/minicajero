const SCAN_FLASH_CLASS = "scan-flash";

export function flash(element: HTMLElement): void {
  element.classList.remove(SCAN_FLASH_CLASS);
  void element.offsetWidth;
  element.classList.add(SCAN_FLASH_CLASS);
}
