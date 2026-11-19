const HELP_QR_MOCK = `<svg class="phone-mock-qr" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#1f2a37"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#1f2a37"/><rect x="14" y="0" width="7" height="7" fill="#1f2a37"/><rect x="15" y="1" width="5" height="5" fill="#fff"/><rect x="16" y="2" width="3" height="3" fill="#1f2a37"/><rect x="0" y="14" width="7" height="7" fill="#1f2a37"/><rect x="1" y="15" width="5" height="5" fill="#fff"/><rect x="2" y="16" width="3" height="3" fill="#1f2a37"/><rect x="9" y="1" width="1" height="1" fill="#1f2a37"/><rect x="11" y="2" width="1" height="1" fill="#1f2a37"/><rect x="9" y="4" width="1" height="1" fill="#1f2a37"/><rect x="12" y="5" width="1" height="1" fill="#1f2a37"/><rect x="10" y="7" width="1" height="1" fill="#1f2a37"/><rect x="1" y="9" width="1" height="1" fill="#1f2a37"/><rect x="3" y="10" width="1" height="1" fill="#1f2a37"/><rect x="5" y="9" width="1" height="1" fill="#1f2a37"/><rect x="7" y="11" width="1" height="1" fill="#1f2a37"/><rect x="9" y="9" width="1" height="1" fill="#1f2a37"/><rect x="11" y="10" width="1" height="1" fill="#1f2a37"/><rect x="13" y="9" width="1" height="1" fill="#1f2a37"/><rect x="15" y="11" width="1" height="1" fill="#1f2a37"/><rect x="17" y="9" width="1" height="1" fill="#1f2a37"/><rect x="19" y="10" width="1" height="1" fill="#1f2a37"/><rect x="10" y="12" width="1" height="1" fill="#1f2a37"/><rect x="12" y="13" width="1" height="1" fill="#1f2a37"/><rect x="14" y="14" width="1" height="1" fill="#1f2a37"/><rect x="16" y="13" width="1" height="1" fill="#1f2a37"/><rect x="18" y="15" width="1" height="1" fill="#1f2a37"/><rect x="9" y="15" width="1" height="1" fill="#1f2a37"/><rect x="11" y="17" width="1" height="1" fill="#1f2a37"/><rect x="13" y="18" width="1" height="1" fill="#1f2a37"/><rect x="15" y="16" width="1" height="1" fill="#1f2a37"/><rect x="17" y="18" width="1" height="1" fill="#1f2a37"/><rect x="19" y="17" width="1" height="1" fill="#1f2a37"/><rect x="10" y="19" width="1" height="1" fill="#1f2a37"/><rect x="14" y="20" width="1" height="1" fill="#1f2a37"/><rect x="18" y="20" width="1" height="1" fill="#1f2a37"/><rect x="2" y="12" width="1" height="1" fill="#1f2a37"/><rect x="4" y="11" width="1" height="1" fill="#1f2a37"/></svg>`;

export const HELP_GUIDE_TEMPLATE = `<details class="phone-help" data-role="help">
          <summary>Ver la guía paso a paso</summary>
          <p class="phone-help-note">El aviso de Chrome sale solo la primera vez en cada teléfono. Es normal: la conexión va directo de tu teléfono a esta computadora, sin pasar por internet.</p>
          <div class="phone-help-steps">
            <figure class="phone-help-step">
              <div class="phone-mock phone-mock-camera" aria-hidden="true">
                ${HELP_QR_MOCK}
                <div class="phone-mock-chip is-target"><span data-role="help-ip">192.168.1.10</span></div>
              </div>
              <figcaption><strong>1.</strong> Con la cámara apuntando al código, toca el enlace que aparece.</figcaption>
            </figure>
            <figure class="phone-help-step">
              <div class="phone-mock phone-mock-warning" aria-hidden="true">
                <div class="phone-mock-alert-icon">!</div>
                <div class="phone-mock-title">Tu conexión no es privada</div>
                <div class="phone-mock-lines"><span></span><span></span></div>
                <div class="phone-mock-button is-target">Configuración avanzada</div>
                <div class="phone-mock-link is-target">Acceder a <span data-role="help-ip">192.168.1.10</span></div>
              </div>
              <figcaption><strong>2.</strong> Toca <strong>Configuración avanzada</strong> y después el enlace <strong>Acceder a…</strong> que sale abajo.</figcaption>
            </figure>
            <figure class="phone-help-step">
              <div class="phone-mock phone-mock-permission" aria-hidden="true">
                <div class="phone-mock-app"><span class="phone-mock-logo"></span>MiniCajero</div>
                <div class="phone-mock-dialog">
                  <div class="phone-mock-dialog-title">¿Usar la cámara?</div>
                  <div class="phone-mock-option is-target">Permitir</div>
                  <div class="phone-mock-option">No permitir</div>
                </div>
              </div>
              <figcaption><strong>3.</strong> Toca <strong>Activar cámara</strong> y elige <strong>Permitir</strong>. Listo: apunta a un código de barras.</figcaption>
            </figure>
          </div>
        </details>`;
