/** Credenciales de prueba de la base de demo; nunca se usan fuera de ella. */
export const DEMO_CREDENTIALS = { username: "demo", password: "demo-cajero-2026" };

export const DEMO_RATE = 236.4575;

export const DEMO_SETTINGS = {
  business_name: "Bodega La Esquina",
  business_rif: "J-40123456-7",
  business_address: "Av. Bolívar, local 3, Valencia",
  business_phone: "0412-5551234",
  iva_percent: 0,
  display_currency: "USD",
  low_stock_threshold: 5,
};

export const DEMO_PRODUCTS = [
  { code: "7591234567890", name: "Harina PAN 1 kg", price_usd: 1.35, stock: 3, active: true },
  { code: "LOTE/A B", name: "Café molido", price_usd: 3.2, stock: 0, active: true },
  { code: "ABC-001", name: "Azúcar morena", price_usd: 1.6, stock: 10, active: false },
  { code: "..", name: "Bolsa plástica", price_usd: 0.05, stock: 5, active: true },
  { code: "7590001112223", name: "Arroz Mary 1 kg", price_usd: 1.45, stock: 40, active: true },
  { code: "7590002223334", name: "Aceite Diana 1 L", price_usd: 3.9, stock: 18, active: true },
  { code: "7590003334445", name: "Pasta Capri 500 g", price_usd: 1.1, stock: 32, active: true },
  { code: "7590004445556", name: "Leche en polvo 400 g", price_usd: 6.75, stock: 4, active: true },
  { code: "", name: "Queso blanco (kg)", price_usd: 5.5, stock: 12, active: true },
];

export const DEMO_CUSTOMERS = [
  {
    first_name: "María José",
    last_name: "González Rivas",
    doc_type: "V",
    doc_number: "14567890",
    phone: "04141234567",
  },
  { first_name: "Pedro", last_name: "Ramírez", doc_type: "V", doc_number: "20111222", phone: "" },
  { first_name: "Distribuidora", last_name: "El Llano", doc_type: "J", doc_number: "305551112", phone: "02418889900" },
];

export type DemoSale = {
  payment_type: "cash" | "credit";
  customer_index?: number;
  items: { product_index: number; quantity: number }[];
  payment_usd?: number;
  void?: boolean;
};

export const DEMO_SALES: DemoSale[] = [
  {
    payment_type: "cash",
    items: [
      { product_index: 4, quantity: 2 },
      { product_index: 6, quantity: 3 },
    ],
  },
  { payment_type: "credit", customer_index: 0, items: [{ product_index: 5, quantity: 2 }], payment_usd: 3 },
  { payment_type: "credit", customer_index: 1, items: [{ product_index: 7, quantity: 1 }] },
  { payment_type: "cash", customer_index: 2, items: [{ product_index: 8, quantity: 2 }] },
  { payment_type: "cash", items: [{ product_index: 6, quantity: 1 }], void: true },
];
