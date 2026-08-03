import {
  pgTable,
  serial,
  integer,
  text,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
//  CORE TABLES (already in DB)
// ═══════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: text("unionId").notNull().default(sql`lower(gen_random_uuid()::text)`).unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin", "superCEO", "operaciones", "comercial", "agente", "solo_lectura"] }).default("comercial").notNull(),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const authCredentials = pgTable("auth_credentials", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AuthCredential = typeof authCredentials.$inferSelect;
export type InsertAuthCredential = typeof authCredentials.$inferInsert;

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["lead", "property", "task", "system", "offer", "reservation"] }).default("system").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).default("info").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  entityType: text("entity_type", { enum: ["lead", "property", "operation", "task", "system"] }).default("system"),
  entityId: integer("entity_id"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;

export const cerebroSessions = pgTable("cerebro_sessions", {
  id: serial("id").primaryKey(),
  title: text("title"),
  userId: integer("user_id"),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CerebroSession = typeof cerebroSessions.$inferSelect;

export const cerebroMessages = pgTable("cerebro_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).default("user").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CerebroMessage = typeof cerebroMessages.$inferSelect;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["contract", "invoice", "report", "photo", "identity", "other"] }).default("other").notNull(),
  entityType: text("entity_type", { enum: ["lead", "property", "operation"] }),
  entityId: integer("entity_id"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  driveFileId: text("drive_file_id"),
  driveFileUrl: text("drive_file_url"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["call", "email", "visit", "note", "whatsapp", "sms"] }).default("note").notNull(),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  operationId: integer("operation_id"),
  content: text("content"),
  direction: text("direction", { enum: ["inbound", "outbound", "entrante", "saliente"] }).default("inbound"),
  duration: integer("duration"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Interaction = typeof interactions.$inferSelect;

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique(),
  content: text("content"),
  category: text("category"),
  tags: text("tags"),
  template: text("template"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export const leadProperties = pgTable("lead_properties", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  propertyId: integer("property_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LeadProperty = typeof leadProperties.$inferSelect;

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source", { enum: ["manual", "idealista", "fotocasa", "pisos", "habitaclia", "milanuncios", "yaencontre", "email", "whatsapp", "webhook", "phone", "referral", "web", "import"] }).default("manual"),
  status: text("status", { enum: ["nuevo", "contactado", "calificado", "en_seguimiento", "en_segimiento", "descartado", "convertido"] }).default("nuevo"),
  tier: text("tier", { enum: ["hot", "warm", "cold"] }).default("warm"),
  persona: text("persona", { enum: ["inversor", "familia", "joven", "extranjero", "empresa", "particular"] }),
  score: integer("score").default(0),
  tags: text("tags"),
  operationType: text("operation_type", { enum: ["compra", "alquiler", "venta"] }),
  zone: text("zone"),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareMeters: integer("square_meters"),
  urgency: text("urgency", { enum: ["alta", "media", "baja"] }).default("media"),
  notes: text("notes"),
  assignedTo: integer("assigned_to"),
  aiClassification: text("ai_classification"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["purchase", "rental", "alquiler", "venta"] }).default("purchase"),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  status: text("status", { enum: ["pending", "accepted", "rejected", "negotiating", "expired", "draft", "sent"] }).default("pending"),
  amount: real("amount"),
  conditions: text("conditions"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  content: text("content"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;

export const operationChecklist = pgTable("operation_checklist", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").notNull(),
  label: text("label").notNull(),
  checked: boolean("checked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OperationChecklistItem = typeof operationChecklist.$inferSelect;

export const operationTimeline = pgTable("operation_timeline", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").notNull(),
  stage: text("stage"),
  action: text("action"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OperationTimelineEvent = typeof operationTimeline.$inferSelect;

export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["compra", "alquiler", "venta", "pre_alquiler", "renovacion"] }).default("compra"),
  status: text("status", { enum: ["activa", "cerrada", "cancelada", "pendiente", "pausada"] }).default("pendiente"),
  stage: text("stage"),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  agentId: integer("agent_id"),
  title: text("title"),
  description: text("description"),
  estimatedValue: real("estimated_value"),
  finalValue: real("final_value"),
  commission: real("commission"),
  startDate: timestamp("start_date", { withTimezone: true }),
  closeDate: timestamp("close_date", { withTimezone: true }),
  estimatedCloseDate: timestamp("estimated_close_date", { withTimezone: true }),
  closeReason: text("close_reason"),
  isSuccess: boolean("is_success").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Operation = typeof operations.$inferSelect;

export const prequalifications = pgTable("prequalifications", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  monthlyIncome: real("monthly_income"),
  employmentStatus: text("employment_status"),
  contractType: text("contract_type"),
  hasGuarantor: boolean("has_guarantor").default(false),
  pets: boolean("pets").default(false),
  smoker: boolean("smoker").default(false),
  numOccupants: integer("num_occupants"),
  preferredEntryDate: timestamp("preferred_entry_date", { withTimezone: true }),
  maxBudget: real("max_budget"),
  score: integer("score"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Prequalification = typeof prequalifications.$inferSelect;

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  reference: text("reference").unique(),
  title: text("title"),
  description: text("description"),
  type: text("type", { enum: ["piso", "casa", "atico", "duplex", "estudio", "local", "oficina", "nave", "terreno", "garaje", "trastero", "parking", "apartamento"] }).default("piso"),
  status: text("status", { enum: ["disponible", "reservado", "vendido", "alquilado", "inactivo"] }).default("disponible"),
  operation: text("operation", { enum: ["venta", "alquiler", "venta_alquiler", "ambos"] }).default("venta"),
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
  hasElevator: boolean("has_elevator").default(false),
  hasTerrace: boolean("has_terrace").default(false),
  hasParking: boolean("has_parking").default(false),
  hasStorage: boolean("has_storage").default(false),
  hasPool: boolean("has_pool").default(false),
  hasGarden: boolean("has_garden").default(false),
  hasAirConditioning: boolean("has_air_conditioning").default(false),
  hasHeating: boolean("has_heating").default(false),
  hasFurniture: boolean("has_furniture").default(false),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  status: text("status", { enum: ["active", "cancelled", "expired", "converted", "pending", "confirmed"] }).default("active"),
  amount: real("amount"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  assignedTo: integer("assigned_to"),
  leadId: integer("lead_id"),
  propertyId: integer("property_id"),
  operationId: integer("operation_id"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  leadId: integer("lead_id"),
  agentId: integer("agent_id"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled", "no_show"] }).default("scheduled"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  feedback: text("feedback"),
  rating: integer("rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;

// ═══════════════════════════════════════════════════════════
//  GOOGLE INTEGRATION TABLES (new)
// ═══════════════════════════════════════════════════════════

export const transcriptions = pgTable("crm_transcriptions", {
  id: serial("id").primaryKey(),
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

  processingStatus: text("processingStatus", { enum: [
    "pending",
    "downloading",
    "transcribing",
    "analyzing",
    "completed",
    "error",
  ] })
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  processedBy: integer("processedBy"),
  processedAt: timestamp("processedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

export const transcriptionAnalysis = pgTable("crm_transcriptionAnalysis", {
  id: serial("id").primaryKey(),
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

  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type TranscriptionAnalysis = typeof transcriptionAnalysis.$inferSelect;
export type InsertTranscriptionAnalysis = typeof transcriptionAnalysis.$inferInsert;

export const driveSyncLog = pgTable("crm_driveSyncLog", {
  id: serial("id").primaryKey(),
  folderId: text("folderId").notNull(),
  folderName: text("folderName"),
  fileId: text("fileId").notNull(),
  fileName: text("fileName").notNull(),
  action: text("action", { enum: [
    "discovered",
    "transcribed",
    "imported",
    "skipped_duplicate",
    "skipped_format",
    "error",
  ] })
    .default("discovered")
    .notNull(),
  details: text("details"),
  mimeType: text("mimeType"),
  fileSize: text("fileSize"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type DriveSyncLog = typeof driveSyncLog.$inferSelect;
export type InsertDriveSyncLog = typeof driveSyncLog.$inferInsert;

export const documentImports = pgTable("crm_documentImports", {
  id: serial("id").primaryKey(),
  fileName: text("fileName").notNull(),
  fileType: text("fileType", { enum: ["excel", "csv", "pdf", "docx", "other"] }).notNull(),
  source: text("source", { enum: ["drive", "upload"] }).default("drive").notNull(),
  driveFileId: text("driveFileId"),
  driveFileUrl: text("driveFileUrl"),

  extractedDataJson: text("extractedDataJson"),
  schemaDetected: text("schemaDetected"),
  rowCount: integer("rowCount").default(0),
  importedCount: integer("importedCount").default(0),
  duplicateCount: integer("duplicateCount").default(0),
  errorCount: integer("errorCount").default(0),

  mappingJson: text("mappingJson"),
  importTarget: text("importTarget", { enum: [
    "leads",
    "properties",
    "operations",
    "contacts",
    "none",
  ] }).default("none"),

  status: text("status", { enum: ["pending", "processing", "completed", "error", "cancelled"] })
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),

  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
});

export type DocumentImport = typeof documentImports.$inferSelect;
export type InsertDocumentImport = typeof documentImports.$inferInsert;


// ═══════════════════════════════════════════════════════════
//  IMPORT PIPELINE TABLES
// ═══════════════════════════════════════════════════════════

export const importJobs = pgTable("crm_importJobs", {
  id: serial("id").primaryKey(),
  fileName: text("fileName").notNull(),
  fileType: text("fileType", { enum: ["xlsx", "csv", "pdf"] }).notNull(),
  detectedType: text("detectedType", { enum: ["contacts", "properties", "mixed", "unknown"] }).default("unknown"),
  status: text("status", { enum: ["pending", "parsing", "importing", "processing", "completed", "error", "cancelled"] }).default("pending").notNull(),
  totalRows: integer("totalRows").default(0),
  fileSize: integer("fileSize").default(0),
  imported: integer("imported").default(0),
  duplicates: integer("duplicates").default(0),
  linked: integer("linked").default(0),
  errors: integer("errors").default(0),
  confidence: real("confidence").default(0),
  config: text("config"),
  errorLog: text("errorLog"),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = typeof importJobs.$inferInsert;

export const importRows = pgTable("crm_importRows", {
  id: serial("id").primaryKey(),
  importId: integer("importId").notNull(),
  rowNumber: integer("rowNumber").notNull(),
  rawData: text("rawData"),
  normalizedData: text("normalizedData"),
  status: text("status", { enum: ["pending", "created", "imported", "duplicate", "error", "skipped"] }).default("pending"),
  errorMessage: text("errorMessage"),
  entityType: text("entityType", { enum: ["lead", "property", "mixed", "operation", "none", "unknown"] }).default("none"),
  entityId: integer("entityId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ImportRow = typeof importRows.$inferSelect;
export type InsertImportRow = typeof importRows.$inferInsert;

// ═══════════════════════════════════════════════════════════
//  DRIVE IMPORT QUEUE (new)
//  Tracks every Drive file through discovery → analysis → import
// ═══════════════════════════════════════════════════════════

export const driveImportQueue = pgTable("crm_driveImportQueue", {
  id: serial("id").primaryKey(),
  driveFileId: text("driveFileId").notNull().unique(),
  name: text("name").notNull(),
  mimeType: text("mimeType").notNull(),
  size: text("size").default("0"),
  folderId: text("folderId"),
  folderName: text("folderName"),
  webViewLink: text("webViewLink"),
  status: text("status", {
    enum: ["pending", "analyzing", "analyzed", "importing", "imported", "error", "skipped"],
  })
    .default("pending")
    .notNull(),
  detectedCategory: text("detectedCategory", {
    enum: ["lead", "property", "interaction", "document", "audio", "image", "mixed", "unknown"],
  }).default("unknown"),
  extractedText: text("extractedText"),
  aiAnalysisJson: text("aiAnalysisJson"),
  entitiesCreatedJson: text("entitiesCreatedJson"),
  retryCount: integer("retryCount").default(0),
  lastError: text("lastError"),
  driveModifiedAt: timestamp("driveModifiedAt", { withTimezone: true }),
  processedAt: timestamp("processedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type DriveImportQueue = typeof driveImportQueue.$inferSelect;
export type InsertDriveImportQueue = typeof driveImportQueue.$inferInsert;
