import { HELP_GUIDE_TEMPLATE } from "./help-template";

export const MODAL_ID = "phone-modal";

export const MODAL_TEMPLATE = `
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down phone-modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title fs-5" id="${MODAL_ID}-title">Conectar teléfono</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body">
        <div class="phone-pair" data-role="pair">
          <div class="phone-qr-column">
            <div class="phone-qr" data-role="qr"></div>
            <div class="phone-networks d-none" data-role="networks">
              <label class="form-label small text-body-secondary mb-1" for="${MODAL_ID}-network">¿No conecta? Prueba otra red</label>
              <select class="form-select form-select-sm" id="${MODAL_ID}-network" data-role="network"></select>
            </div>
          </div>
          <ol class="phone-steps">
            <li>Abre la cámara de tu Android, apunta a este código y toca el enlace que aparece.</li>
            <li>Si Chrome dice «Tu conexión no es privada», toca <strong>Configuración avanzada</strong> y luego <strong>Acceder a…</strong></li>
            <li>Toca <strong>Activar cámara</strong> y elige <strong>Permitir</strong>.</li>
          </ol>
        </div>
        ${HELP_GUIDE_TEMPLATE}
        <div class="alert alert-danger d-none mb-0" role="alert" data-role="error">
          <p class="mb-2" data-role="error-text"></p>
          <button type="button" class="btn btn-sm btn-outline-danger" data-role="retry">Reintentar</button>
        </div>
        <p class="phone-pair-status" role="status" aria-live="polite" data-role="status"></p>
        <section class="phone-list-section d-none" data-role="phones-section" aria-labelledby="${MODAL_ID}-phones-title">
          <h3 class="fs-6 mb-2" id="${MODAL_ID}-phones-title">Teléfonos conectados</h3>
          <ul class="list-group" data-role="phones"></ul>
        </section>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
      </div>
    </div>
  </div>`;
