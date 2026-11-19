import { coreTablesSql } from "./initial-schema-core";
import { salesTablesSql } from "./initial-schema-sales";

export const initialSchema = `${coreTablesSql}${salesTablesSql}`;
