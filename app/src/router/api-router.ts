import { apiNotFound, route } from "../lib/http";
import { getAppInfoHandler, shutdownAppHandler } from "../modules/app/app.controller";
import {
  changePasswordHandler,
  getAuthStatusHandler,
  loginHandler,
  logoutHandler,
  resetHandler,
  setupHandler,
} from "../modules/auth/auth.controller";
import { protectedRoute, protectedWebSocketRoute } from "../modules/auth/auth.guard";
import {
  downloadBackupFileHandler,
  downloadBackupHandler,
  listBackupsHandler,
  restoreBackupHandler,
} from "../modules/backup/backup.controller";
import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from "../modules/customers/customers.controller";
import { getDashboardHandler } from "../modules/dashboard/dashboard.controller";
import {
  getExchangeRateHandler,
  getRateHistoryHandler,
  putManualRateHandler,
  putRateModeHandler,
  refreshExchangeRateHandler,
} from "../modules/exchange-rates/exchange-rates.controller";
import { getHealth } from "../modules/health/health.controller";
import {
  createInvoiceHandler,
  getInvoiceHandler,
  listInvoicesHandler,
  voidInvoiceHandler,
} from "../modules/invoices/invoices.controller";
import {
  createCustomerPaymentHandler,
  createInvoicePaymentHandler,
  deletePaymentHandler,
  getCustomerStatementHandler,
} from "../modules/payments/payments.controller";
import {
  cancelPairingHandler,
  createPairingHandler,
  deletePairingHandler,
  deletePhoneHandler,
  getPhoneStatusHandler,
  phoneEventsHandler,
} from "../modules/phone/phone.controller";
import {
  adjustStockHandler,
  createProductHandler,
  deleteProductHandler,
  getProductByCodeHandler,
  getProductHandler,
  listProductsHandler,
  listStockMovementsHandler,
  updateProductHandler,
} from "../modules/products/products.controller";
import { getSettingsHandler, putSettingsHandler } from "../modules/settings/settings.controller";

const unmatchedApiRoutes = {
  "/api": apiNotFound,
  "/api/*": apiNotFound,
};

export const apiRoutes = {
  "/api/v1/health": route({ GET: getHealth }),
  "/api/v1/auth/status": route({ GET: getAuthStatusHandler }),
  "/api/v1/auth/setup": route({ POST: setupHandler }),
  "/api/v1/auth/login": route({ POST: loginHandler }),
  "/api/v1/auth/reset": route({ POST: resetHandler }),
  "/api/v1/auth/logout": route({ POST: logoutHandler }),
  "/api/v1/auth/password": protectedRoute({ POST: changePasswordHandler }),
  "/api/v1/app": route({ GET: getAppInfoHandler }),
  "/api/v1/app/shutdown": protectedRoute({ POST: shutdownAppHandler }),
  "/api/v1/backup": protectedRoute({ GET: downloadBackupHandler }),
  "/api/v1/backup/files": protectedRoute({ GET: listBackupsHandler }),
  "/api/v1/backup/files/:name": protectedRoute({ GET: downloadBackupFileHandler }),
  "/api/v1/backup/restore": protectedRoute({ POST: restoreBackupHandler }),
  "/api/v1/dashboard": protectedRoute({ GET: getDashboardHandler }),
  "/api/v1/settings": protectedRoute({ GET: getSettingsHandler, PUT: putSettingsHandler }),
  "/api/v1/exchange-rate": protectedRoute({ GET: getExchangeRateHandler }),
  "/api/v1/exchange-rate/refresh": protectedRoute({ POST: refreshExchangeRateHandler }),
  "/api/v1/exchange-rate/manual": protectedRoute({ PUT: putManualRateHandler }),
  "/api/v1/exchange-rate/mode": protectedRoute({ PUT: putRateModeHandler }),
  "/api/v1/exchange-rate/history": protectedRoute({ GET: getRateHistoryHandler }),
  "/api/v1/customers": protectedRoute({ GET: listCustomersHandler, POST: createCustomerHandler }),
  "/api/v1/customers/:id": protectedRoute({
    GET: getCustomerHandler,
    PUT: updateCustomerHandler,
    DELETE: deleteCustomerHandler,
  }),
  "/api/v1/customers/:id/payments": protectedRoute({ POST: createCustomerPaymentHandler }),
  "/api/v1/customers/:id/statement": protectedRoute({ GET: getCustomerStatementHandler }),
  "/api/v1/products": protectedRoute({ GET: listProductsHandler, POST: createProductHandler }),
  "/api/v1/products/:id": protectedRoute({
    GET: getProductHandler,
    PUT: updateProductHandler,
    DELETE: deleteProductHandler,
  }),
  "/api/v1/products/by-code": protectedRoute({ GET: getProductByCodeHandler }),
  "/api/v1/products/:id/stock": protectedRoute({ PATCH: adjustStockHandler }),
  "/api/v1/products/:id/stock-movements": protectedRoute({ GET: listStockMovementsHandler }),
  "/api/v1/invoices": protectedRoute({ GET: listInvoicesHandler, POST: createInvoiceHandler }),
  "/api/v1/invoices/:id": protectedRoute({ GET: getInvoiceHandler }),
  "/api/v1/invoices/:id/void": protectedRoute({ POST: voidInvoiceHandler }),
  "/api/v1/invoices/:id/payments": protectedRoute({ POST: createInvoicePaymentHandler }),
  "/api/v1/payments/:id": protectedRoute({ DELETE: deletePaymentHandler }),
  "/api/v1/phone/pairing": protectedRoute({ POST: createPairingHandler, DELETE: deletePairingHandler }),
  "/api/v1/phone/pairing/cancel": protectedRoute({ POST: cancelPairingHandler }),
  "/api/v1/phone/status": protectedRoute({ GET: getPhoneStatusHandler }),
  "/api/v1/phone/phones/:id": protectedRoute({ DELETE: deletePhoneHandler }),
  "/api/v1/phone/events": protectedWebSocketRoute(phoneEventsHandler),
  ...unmatchedApiRoutes,
};
