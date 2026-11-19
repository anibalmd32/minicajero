export function show(element: HTMLElement, visible: boolean): void {
  element.classList.toggle("d-none", !visible);
}

export function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
