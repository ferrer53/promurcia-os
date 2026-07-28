import { db } from "../db/connection";
import { leads, properties, leadProperties, interactions, transcriptions } from "../db/schema";
import { eq, like, or, inArray, desc } from "drizzle-orm";

const phone = "645678901";
const normalized = `+34${phone}`;
const last9 = phone;

const matchedLeads = await db.query.leads.findMany({
  where: or(
    like(leads.phone, `%${last9}%`),
    eq(leads.phone, normalized),
    eq(leads.phone, normalized.replace("+", ""))
  ),
  orderBy: desc(leads.createdAt),
  limit: 20,
});

console.log("Leads:", matchedLeads);
