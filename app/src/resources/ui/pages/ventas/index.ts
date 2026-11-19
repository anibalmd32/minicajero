import "../../layout";
import { registerScanHandler } from "../../phone-events";
import { bindCartEvents } from "./cart-events";
import { renderCart } from "./cart-render";
import { elements } from "./elements";
import { bindGlobalEvents } from "./global-events";
import { setPaymentType } from "./payment";
import { refreshCartProducts, refreshCustomer, refreshSettings } from "./refresh-cart";
import { bindSaleEvents } from "./sale-events";
import { onPhoneScan } from "./scan-handler";
import { bindSearchEvents } from "./search-events";
import { runSearch } from "./search-request";
import { state } from "./state";
import { renderTotals } from "./totals-render";

function bindEvents(): void {
  bindSearchEvents();
  bindCartEvents();
  bindSaleEvents();
  bindGlobalEvents();
}

setPaymentType(state.cart.payment_type);
bindEvents();
registerScanHandler("ventas", onPhoneScan);
renderCart();
void runSearch("");
void refreshSettings().then(renderTotals);
if (state.cart.lines.length > 0) void refreshCartProducts();
void refreshCustomer();
elements.searchInput.focus();
