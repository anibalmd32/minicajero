import { type ApiClient, connectApi } from "./api-client";
import {
  DEMO_CREDENTIALS,
  DEMO_CUSTOMERS,
  DEMO_PRODUCTS,
  DEMO_RATE,
  DEMO_SALES,
  DEMO_SETTINGS,
  type DemoSale,
} from "./demo-data";

type Created = { id: number };

async function createAll(api: ApiClient, path: string, records: object[]): Promise<number[]> {
  const ids: number[] = [];
  for (const record of records) ids.push(((await api.send("POST", path, record)) as Created).id);
  return ids;
}

function idAt(ids: number[], index: number): number {
  const id = ids[index];
  if (id === undefined) throw new Error(`No existe el registro de demo ${index}`);
  return id;
}

async function createSale(api: ApiClient, sale: DemoSale, productIds: number[], customerIds: number[]): Promise<void> {
  const invoice = (await api.send("POST", "/invoices", {
    payment_type: sale.payment_type,
    customer_id: sale.customer_index === undefined ? undefined : idAt(customerIds, sale.customer_index),
    items: sale.items.map((item) => ({ product_id: idAt(productIds, item.product_index), quantity: item.quantity })),
  })) as Created;
  if (sale.payment_usd) {
    await api.send("POST", `/invoices/${invoice.id}/payments`, { amount: sale.payment_usd, currency: "USD" });
  }
  if (sale.void) await api.send("POST", `/invoices/${invoice.id}/void`, { reason: "Error de cantidad" });
}

async function seed(origin: string): Promise<void> {
  const api = await connectApi(origin, DEMO_CREDENTIALS);
  await api.send("PUT", "/settings", DEMO_SETTINGS);
  await api.send("PUT", "/exchange-rate/manual", { rate: DEMO_RATE });
  await api.send("PUT", "/exchange-rate/mode", { mode: "manual" });
  const productIds = await createAll(api, "/products", DEMO_PRODUCTS);
  const customerIds = await createAll(api, "/customers", DEMO_CUSTOMERS);
  for (const sale of DEMO_SALES) await createSale(api, sale, productIds, customerIds);
  console.log(
    `Demo lista: ${productIds.length} productos, ${customerIds.length} clientes, ${DEMO_SALES.length} ventas`,
  );
}

await seed(new URL(process.argv[2] ?? "http://127.0.0.1:4000").origin);
