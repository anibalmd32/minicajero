import cliente from "../resources/html/cliente.html";
import clientes from "../resources/html/clientes.html";
import configuracion from "../resources/html/configuracion.html";
import estadoCuentaImprimir from "../resources/html/estado-cuenta-imprimir.html";
import facturaImprimir from "../resources/html/factura-imprimir.html";
import facturas from "../resources/html/facturas.html";
import index from "../resources/html/index.html";
import inventario from "../resources/html/inventario.html";
import login from "../resources/html/login.html";
import ventas from "../resources/html/ventas.html";

export const uiRoutes = {
  "/": index,
  "/ventas": ventas,
  "/facturas": facturas,
  "/facturas/:id": facturas,
  "/facturas/:id/imprimir": facturaImprimir,
  "/clientes": clientes,
  "/clientes/:id": cliente,
  "/clientes/:id/imprimir": estadoCuentaImprimir,
  "/inventario": inventario,
  "/configuracion": configuracion,
  "/login": login,
};
