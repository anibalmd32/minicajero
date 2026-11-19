declare module "bootstrap/dist/js/bootstrap.bundle.min.js" {
  interface ComponentInstance {
    show(): void;
    hide(): void;
    dispose(): void;
  }

  interface ComponentClass<Options> {
    new (element: Element, options?: Partial<Options>): ComponentInstance;
    getInstance(element: Element): ComponentInstance | null;
    getOrCreateInstance(element: Element, options?: Partial<Options>): ComponentInstance;
  }

  interface ModalOptions {
    backdrop: boolean | "static";
    keyboard: boolean;
    focus: boolean;
  }

  interface ToastOptions {
    animation: boolean;
    autohide: boolean;
    delay: number;
  }

  interface CollapseOptions {
    toggle: boolean;
  }

  interface OffcanvasOptions {
    backdrop: boolean | "static";
    keyboard: boolean;
    scroll: boolean;
  }

  const bootstrap: {
    Modal: ComponentClass<ModalOptions>;
    Toast: ComponentClass<ToastOptions>;
    Collapse: ComponentClass<CollapseOptions>;
    Offcanvas: ComponentClass<OffcanvasOptions>;
  };
  export default bootstrap;
}
