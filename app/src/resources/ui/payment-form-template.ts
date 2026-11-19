const AMOUNT_MAX_LENGTH = 20;
const NOTES_MAX_LENGTH = 200;

function balanceSection(): string {
  return `
    <p class="small text-body-secondary mb-2 text-break" data-role="context"></p>
    <div class="payment-balance mb-3">
      <span class="text-body-secondary">Saldo pendiente</span>
      <strong class="amount-cell text-danger" data-role="balance"></strong>
    </div>`;
}

function currencySection(prefix: string): string {
  return `
    <fieldset class="mb-3">
      <legend class="form-label fs-6 mb-1">Moneda del abono</legend>
      <div class="btn-group w-100" role="group">
        <input type="radio" class="btn-check" name="currency" id="${prefix}-currency-usd" value="USD" autocomplete="off">
        <label class="btn btn-outline-primary" for="${prefix}-currency-usd">Dólares ($)</label>
        <input type="radio" class="btn-check" name="currency" id="${prefix}-currency-ves" value="VES" autocomplete="off">
        <label class="btn btn-outline-primary" for="${prefix}-currency-ves">Bolívares (Bs)</label>
      </div>
    </fieldset>`;
}

function amountSection(prefix: string): string {
  return `
    <div class="mb-3">
      <label for="${prefix}-amount" class="form-label">Monto <span class="text-danger" aria-hidden="true">*</span></label>
      <div class="input-group">
        <span class="input-group-text payment-symbol" data-role="symbol">$</span>
        <input type="text" class="form-control amount-cell" id="${prefix}-amount" name="amount" inputmode="decimal"
          maxlength="${AMOUNT_MAX_LENGTH}" placeholder="0,00" autocomplete="off" aria-describedby="${prefix}-preview">
        <button type="button" class="btn btn-outline-secondary" data-role="settle">Saldar todo</button>
      </div>
      <div id="${prefix}-preview" class="form-text payment-preview" data-role="preview" aria-live="polite"></div>
    </div>`;
}

function noRateSection(): string {
  return `
    <div class="alert alert-warning small mb-3 d-none" role="alert" data-role="no-rate">
      No hay tasa de cambio vigente: no se pueden registrar abonos.
      <a href="/configuracion#tasa" class="alert-link">Fija una tasa manual</a>.
    </div>`;
}

function notesSection(prefix: string): string {
  return `
    <div>
      <label for="${prefix}-notes" class="form-label">Nota <span class="text-body-secondary small">(opcional)</span></label>
      <input type="text" class="form-control" id="${prefix}-notes" name="notes" maxlength="${NOTES_MAX_LENGTH}"
        placeholder="Ej.: pago móvil, transferencia, efectivo">
    </div>`;
}

/** HTML interno del formulario de abono; `prefix` forma los ids de sus campos. */
export function paymentFormTemplate(prefix: string): string {
  return [balanceSection(), currencySection(prefix), amountSection(prefix), noRateSection(), notesSection(prefix)].join(
    "",
  );
}
