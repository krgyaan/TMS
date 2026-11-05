import { relations } from "drizzle-orm";
import { paymentCategory } from "./payment-category.schema";

export const paymentCategoryRelations = relations(paymentCategory, () => ({}));
