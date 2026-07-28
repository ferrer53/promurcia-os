import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
//  CORE TABLES (already in DB)
// ═══════════════════════════════════════════════════════════

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().default(sql`(lower(hex(randomblob(16))))`).unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", ["user", "admin", "superCEO", "operaciones", "comercial", "agente", "solo_lectura"]).default("comercial").notNull(),
  status: text("status", ["active", "inactive", "suspended"]).default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const authCredentials = sqliteTable("auth_credentials", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type AuthCredential = typeof authCredentials.$inferSelect;
export type InsertAuthCredential = typeof authCredentials.$inferInsert;

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", ["lead", "property", "task", "system", "offer", "reservation"]).default("system").notNull(),
  severity: text("severity", ["info", "warning", "critical"]).default("info").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  entityType: text("entity_type", ["lead", "property", "operation", "task", "system"]).default("system"),
  entityId: integer("entity_id"),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Alert = typeof alerts.$inferSelect;

export const cerebroSessions = sqliteTable("cerebro_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title"),
  userId: integer("user_id"),
  context: text("context"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type CerebroSession = typeof cerebroSessions.$inferSelect;

export const cerebroMessages = sqliteTable("cerebro_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  role: text("role", ["user", "assistant", "system"]).default("user").notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type CerebroMessage = typeof cerebroMessages.$inferSelect;

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", ["contract", "invoice", "report", "photo", "identity", "other"]).default("other").notNull(),
  entityType: text("entity_type", ["lead", "property", "operation"]),
  entityId: integer("entity_id"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Document = typeof documents.$inferSelect;

export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", ["call", "email", "visit", "note", "whatsapp", "sms"]).default("note").notNull(),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  operationId: integer("operation_id"),
  content: text("content"),
  direction: text("direction", ["inbound", "outbound"]).default("inbound"),
  duration: integer("duration"),
  createdBy: integer("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Interaction = typeof interactions.$inferSelect;

export const knowledgeArticles = sqliteTable("knowledge_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").unique(),
  content: text("content"),
  category: text("category"),
  tags: text("tags"),
  template: text("template"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export const leadProperties = sqliteTable("lead_properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  propertyId: integer("property_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type LeadProperty = typeof leadProperties.$inferSelect;

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source", ["manual", "idealista", "fotocasa", "pisos", "habitaclia", "milanuncios", "yaencontre", "email", "whatsapp", "webhook", "phone", "referral", "web", "import"]).default("manual"),
  status: text("status", ["nuevo", "contactado", "calificado", "en_seguimiento", "descartado", "convertido"]).default("nuevo"),
  tier: text("tier", ["hot", "warm", "cold"]).default("warm"),
  persona: text("persona", ["inversor", "familia", "joven", "extranjero", "empresa", "particular"]),
  score: integer("score").default(0),
  tags: text("tags"),
  operationType: text("operation_type", ["compra", "alquiler", "venta"]),
  zone: text("zone"),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareMeters: integer("square_meters"),
  urgency: text("urgency", ["alta", "media", "baja"]).default("media"),
  notes: text("notes"),
  assignedTo: integer("assigned_to"),
  aiClassification: text("ai_classification"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", ["purchase", "rental"]).default("purchase"),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  status: text("status", ["pending", "accepted", "rejected", "negotiating"]).default("pending"),
  amount: real("amount"),
  conditions: text("conditions"),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  content: text("content"),
  createdBy: integer("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Offer = typeof offers.$inferSelect;

export const operationChecklist = sqliteTable("operation_checklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operationId: integer("operation_id").notNull(),
  label: text("label").notNull(),
  checked: integer("checked", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type OperationChecklistItem = typeof operationChecklist.$inferSelect;

export const operationTimeline = sqliteTable("operation_timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operationId: integer("operation_id").notNull(),
  stage: text("stage"),
  action: text("action"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type OperationTimelineEvent = typeof operationTimeline.$inferSelect;

export const operations = sqliteTable("operations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", ["compra", "alquiler", "venta"]).default("compra"),
  status: text("status", ["activa", "cerrada", "cancelada", "pendiente"]).default("pendiente"),
  stage: text("stage"),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  agentId: integer("agent_id"),
  title: text("title"),
  description: text("description"),
  estimatedValue: real("estimated_value"),
  finalValue: real("final_value"),
  commission: real("commission"),
  startDate: integer("start_date", { mode: "timestamp" }),
  closeDate: integer("close_date", { mode: "timestamp" }),
  estimatedCloseDate: integer("estimated_close_date", { mode: "timestamp" }),
  closeReason: text("close_reason"),
  isSuccess: integer("is_success", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Operation = typeof operations.$inferSelect;

export const prequalifications = sqliteTable("prequalifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  monthlyIncome: real("monthly_income"),
  employmentStatus: text("employment_status"),
  contractType: text("contract_type"),
  hasGuarantor: integer("has_guarantor", { mode: "boolean" }).default(false),
  pets: integer("pets", { mode: "boolean" }).default(false),
  smoker: integer("smoker", { mode: "boolean" }).default(false),
  numOccupants: integer("num_occupants"),
  preferredEntryDate: integer("preferred_entry_date", { mode: "timestamp" }),
  maxBudget: real("max_budget"),
  score: integer("score"),
  status: text("status", ["pending", "approved", "rejected"]).default("pending"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Prequalification = typeof prequalifications.$inferSelect;

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").unique(),
  title: text("title"),
  description: text("description"),
  type: text("type", ["piso", "casa", "atico", "duplex", "estudio", "local", "oficina", "nave", "terreno", "garaje", "trastero"]).default("piso"),
  status: text("status", ["disponible", "reservado", "vendido", "alquilado", "inactivo"]).default("disponible"),
  operation: text("operation", ["venta", "alquiler", "venta_alquiler"]).default("venta"),
  price: real("price"),
  priceSale: real("price_sale"),
  zone: text("zone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareMeters: integer("square_meters"),
  squareMetersUseful: integer("square_meters_useful"),
  floor: integer("floor"),
  hasElevator: integer("has_elevator", { mode: "boolean" }).default(false),
  hasTerrace: integer("has_terrace", { mode: "boolean" }).default(false),
  hasParking: integer("has_parking", { mode: "boolean" }).default(false),
  hasStorage: integer("has_storage", { mode: "boolean" }).default(false),
  hasPool: integer("has_pool", { mode: "boolean" }).default(false),
  hasGarden: integer("has_garden", { mode: "boolean" }).default(false),
  hasAirConditioning: integer("has_air_conditioning", { mode: "boolean" }).default(false),
  hasHeating: integer("has_heating", { mode: "boolean" }).default(false),
  hasFurniture: integer("has_furniture", { mode: "boolean" }).default(false),
  yearBuilt: integer("year_built"),
  condition: text("condition"),
  energyRating: text("energy_rating"),
  lat: real("lat"),
  lng: real("lng"),
  images: text("images"),
  videoUrl: text("video_url"),
  virtualTourUrl: text("virtual_tour_url"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  ibi: real("ibi"),
  communityFees: real("community_fees"),
  monthlyRent: real("monthly_rent"),
  profitability: real("profitability"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Property = typeof properties.$inferSelect;

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  status: text("status", ["active", "cancelled", "expired", "converted"]).default("active"),
  amount: real("amount"),
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Reservation = typeof reservations.$inferSelect;

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Setting = typeof settings.$inferSelect;

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: text("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: integer("assigned_to"),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  operationId: integer("operation_id"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Task = typeof tasks.$inferSelect;

export const visits = sqliteTable("visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  agentId: integer("agent_id"),
  status: text("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  feedback: text("feedback"),
  rating: integer("rating"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Visit = typeof visits.$inferSelect;

// ═══════════════════════════════════════════════════════════
//  GOOGLE INTEGRATION TABLES (new)
// ═══════════════════════════════════════════════════════════

export const transcriptions = sqliteTable("crm_transcriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("fileName").notNull(),
  fileSize: text("fileSize").default("0"),
  duration: real("duration").default(0),
  driveFileId: text("driveFileId"),
  driveFileUrl: text("driveFileUrl"),
  driveFolderId: text("driveFolderId"),
  mimeType: text("mimeType"),

  transcript: text("transcript"),
  confidence: real("confidence").default(0),
  speakerCount: integer("speakerCount").default(2),
  languageCode: text("languageCode").default("es-ES"),
  wordCount: integer("wordCount").default(0),
  wordsJson: text("wordsJson"),
  speakersJson: text("speakersJson"),

  leadId: integer("leadId"),
  propertyId: integer("propertyId"),
  notes: text("notes"),

  processingStatus: text("processingStatus", [
    "pending",
    "downloading",
    "transcribing",
    "analyzing",
    "completed",
    "error",
  ])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  processedBy: integer("processedBy"),
  processedAt: integer("processedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

export const transcriptionAnalysis = sqliteTable("crm_transcriptionAnalysis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transcriptionId: integer("transcriptionId").notNull(),

  sentiment: text("sentiment"),
  sentimentScore: real("sentimentScore"),
  emotionsJson: text("emotionsJson"),

  topicsJson: text("topicsJson"),
  actionItemsJson: text("actionItemsJson"),
  summary: text("summary"),
  keyPointsJson: text("keyPointsJson"),
  recommendationsJson: text("recommendationsJson"),

  speakerRatioJson: text("speakerRatioJson"),
  talkTimeSeconds: real("talkTimeSeconds"),

  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type TranscriptionAnalysis = typeof transcriptionAnalysis.$inferSelect;
export type InsertTranscriptionAnalysis = typeof transcriptionAnalysis.$inferInsert;

export const driveSyncLog = sqliteTable("crm_driveSyncLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  folderId: text("folderId").notNull(),
  folderName: text("folderName"),
  fileId: text("fileId").notNull(),
  fileName: text("fileName").notNull(),
  action: text("action", [
    "discovered",
    "transcribed",
    "imported",
    "skipped_duplicate",
    "skipped_format",
    "error",
  ])
    .default("discovered")
    .notNull(),
  details: text("details"),
  mimeType: text("mimeType"),
  fileSize: text("fileSize"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type DriveSyncLog = typeof driveSyncLog.$inferSelect;
export type InsertDriveSyncLog = typeof driveSyncLog.$inferInsert;

export const documentImports = sqliteTable("crm_documentImports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("fileName").notNull(),
  fileType: text("fileType", ["excel", "csv", "pdf", "docx", "other"]).notNull(),
  source: text("source", ["drive", "upload"]).default("drive").notNull(),
  driveFileId: text("driveFileId"),
  driveFileUrl: text("driveFileUrl"),

  extractedDataJson: text("extractedDataJson"),
  schemaDetected: text("schemaDetected"),
  rowCount: integer("rowCount").default(0),
  importedCount: integer("importedCount").default(0),
  duplicateCount: integer("duplicateCount").default(0),
  errorCount: integer("errorCount").default(0),

  mappingJson: text("mappingJson"),
  importTarget: text("importTarget", [
    "leads",
    "properties",
    "operations",
    "contacts",
    "none",
  ]).default("none"),

  status: text("status", ["pending", "processing", "completed", "error", "cancelled"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),

  createdBy: integer("createdBy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
});

export type DocumentImport = typeof documentImports.$inferSelect;
export type InsertDocumentImport = typeof documentImports.$inferInsert;


// ═══════════════════════════════════════════════════════════
//  IMPORT PIPELINE TABLES
// ═══════════════════════════════════════════════════════════

export const importJobs = sqliteTable("crm_importJobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("fileName").notNull(),
  fileType: text("fileType", ["xlsx", "csv", "pdf"]).notNull(),
  detectedType: text("detectedType", ["contacts", "properties", "mixed", "unknown"]).default("unknown"),
  status: text("status", ["pending", "parsing", "importing", "processing", "completed", "error", "cancelled"]).default("pending").notNull(),
  totalRows: integer("totalRows").default(0),
  fileSize: integer("fileSize").default(0),
  imported: integer("imported").default(0),
  duplicates: integer("duplicates").default(0),
  linked: integer("linked").default(0),
  errors: integer("errors").default(0),
  confidence: real("confidence").default(0),
  config: text("config"),
  errorLog: text("errorLog"),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  createdBy: integer("createdBy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = typeof importJobs.$inferInsert;

export const importRows = sqliteTable("crm_importRows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  importId: integer("importId").notNull(),
  rowNumber: integer("rowNumber").notNull(),
  rawData: text("rawData"),
  normalizedData: text("normalizedData"),
  status: text("status", ["pending", "created", "imported", "duplicate", "error", "skipped"]).default("pending"),
  errorMessage: text("errorMessage"),
  entityType: text("entityType", ["lead", "property", "mixed", "operation", "none"]).default("none"),
  entityId: integer("entityId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ImportRow = typeof importRows.$inferSelect;
export type InsertImportRow = typeof importRows.$inferInsert;
