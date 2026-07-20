import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  json,
  decimal,
  real,
  // bigint,
} from "drizzle-orm/mysql-core";

// ═══════════════════════════════════════════════════════════
//  CORE TABLES (already in DB)
// ═══════════════════════════════════════════════════════════

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin", "superCEO", "operaciones", "comercial", "agente", "solo_lectura"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const alerts = mysqlTable("alerts", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["lead", "property", "task", "system", "offer", "reservation"]).default("system").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  entityType: mysqlEnum("entity_type", ["lead", "property", "operation", "task", "system"]).default("system"),
  entityId: int("entity_id"),
  read: int("read").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;

export const cerebroSessions = mysqlTable("cerebro_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  userId: int("user_id"),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CerebroSession = typeof cerebroSessions.$inferSelect;

export const cerebroMessages = mysqlTable("cerebro_messages", {
  id: serial("id").primaryKey(),
  sessionId: int("session_id").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).default("user").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CerebroMessage = typeof cerebroMessages.$inferSelect;

export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["contract", "invoice", "report", "photo", "identity", "other"]).default("other").notNull(),
  entityType: mysqlEnum("entity_type", ["lead", "property", "operation"]),
  entityId: int("entity_id"),
  filePath: text("file_path"),
  fileSize: int("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: int("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;

export const interactions = mysqlTable("interactions", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["call", "email", "visit", "note", "whatsapp", "sms"]).default("note").notNull(),
  leadId: int("lead_id"),
  propertyId: int("property_id"),
  operationId: int("operation_id"),
  content: text("content"),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).default("inbound"),
  duration: int("duration"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Interaction = typeof interactions.$inferSelect;

export const knowledgeArticles = mysqlTable("knowledge_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  content: text("content"),
  category: varchar("category", { length: 100 }),
  tags: text("tags"),
  template: text("template"),
  isPublic: int("is_public").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export const leadProperties = mysqlTable("lead_properties", {
  id: serial("id").primaryKey(),
  leadId: int("lead_id").notNull(),
  propertyId: int("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LeadProperty = typeof leadProperties.$inferSelect;

export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  source: mysqlEnum("source", ["manual", "idealista", "fotocasa", "pisos", "habitaclia", "milanuncios", "yaencontre", "email", "whatsapp", "webhook", "phone", "referral", "web", "import"]).default("manual"),
  status: mysqlEnum("status", ["nuevo", "contactado", "calificado", "en_seguimiento", "descartado", "convertido"]).default("nuevo"),
  tier: mysqlEnum("tier", ["hot", "warm", "cold"]).default("warm"),
  persona: mysqlEnum("persona", ["inversor", "familia", "joven", "extranjero", "empresa", "particular"]),
  score: int("score").default(0),
  tags: text("tags"),
  operationType: mysqlEnum("operation_type", ["compra", "alquiler", "venta"]),
  zone: varchar("zone", { length: 255 }),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  squareMeters: int("square_meters"),
  urgency: mysqlEnum("urgency", ["alta", "media", "baja"]).default("media"),
  notes: text("notes"),
  assignedTo: int("assigned_to"),
  aiClassification: text("ai_classification"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const offers = mysqlTable("offers", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["purchase", "rental"]).default("purchase"),
  propertyId: int("property_id"),
  leadId: int("lead_id"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "negotiating"]).default("pending"),
  amount: real("amount"),
  conditions: text("conditions"),
  validUntil: timestamp("valid_until"),
  content: text("content"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;

export const operationChecklist = mysqlTable("operation_checklist", {
  id: serial("id").primaryKey(),
  operationId: int("operation_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  checked: int("checked").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OperationChecklistItem = typeof operationChecklist.$inferSelect;

export const operationTimeline = mysqlTable("operation_timeline", {
  id: serial("id").primaryKey(),
  operationId: int("operation_id").notNull(),
  stage: varchar("stage", { length: 100 }),
  action: varchar("action", { length: 255 }),
  notes: text("notes"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OperationTimelineEvent = typeof operationTimeline.$inferSelect;

export const operations = mysqlTable("operations", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["compra", "alquiler", "venta"]).default("compra"),
  status: mysqlEnum("status", ["activa", "cerrada", "cancelada", "pendiente"]).default("pendiente"),
  stage: varchar("stage", { length: 100 }),
  leadId: int("lead_id"),
  propertyId: int("property_id"),
  agentId: int("agent_id"),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  estimatedValue: real("estimated_value"),
  finalValue: real("final_value"),
  commission: real("commission"),
  startDate: timestamp("start_date"),
  closeDate: timestamp("close_date"),
  estimatedCloseDate: timestamp("estimated_close_date"),
  closeReason: text("close_reason"),
  isSuccess: int("is_success").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Operation = typeof operations.$inferSelect;

export const prequalifications = mysqlTable("prequalifications", {
  id: serial("id").primaryKey(),
  leadId: int("lead_id").notNull(),
  monthlyIncome: real("monthly_income"),
  employmentStatus: varchar("employment_status", { length: 50 }),
  contractType: varchar("contract_type", { length: 50 }),
  hasGuarantor: int("has_guarantor").default(0),
  pets: int("pets").default(0),
  smoker: int("smoker").default(0),
  numOccupants: int("num_occupants"),
  preferredEntryDate: timestamp("preferred_entry_date"),
  maxBudget: real("max_budget"),
  score: int("score"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Prequalification = typeof prequalifications.$inferSelect;

export const properties = mysqlTable("properties", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 50 }).unique(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  type: mysqlEnum("type", ["piso", "casa", "atico", "duplex", "estudio", "local", "oficina", "nave", "terreno", "garaje", "trastero"]).default("piso"),
  status: mysqlEnum("status", ["disponible", "reservado", "vendido", "alquilado", "inactivo"]).default("disponible"),
  operation: mysqlEnum("operation", ["venta", "alquiler", "venta_alquiler"]).default("venta"),
  price: real("price"),
  priceSale: real("price_sale"),
  zone: varchar("zone", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 255 }),
  postalCode: varchar("postal_code", { length: 20 }),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  squareMeters: int("square_meters"),
  squareMetersUseful: int("square_meters_useful"),
  floor: int("floor"),
  hasElevator: int("has_elevator").default(0),
  hasTerrace: int("has_terrace").default(0),
  hasParking: int("has_parking").default(0),
  hasStorage: int("has_storage").default(0),
  hasPool: int("has_pool").default(0),
  hasGarden: int("has_garden").default(0),
  hasAirConditioning: int("has_air_conditioning").default(0),
  hasHeating: int("has_heating").default(0),
  hasFurniture: int("has_furniture").default(0),
  yearBuilt: int("year_built"),
  condition: varchar("condition", { length: 50 }),
  energyRating: varchar("energy_rating", { length: 10 }),
  lat: real("lat"),
  lng: real("lng"),
  images: text("images"),
  videoUrl: text("video_url"),
  virtualTourUrl: text("virtual_tour_url"),
  ownerName: varchar("owner_name", { length: 255 }),
  ownerPhone: varchar("owner_phone", { length: 50 }),
  ownerEmail: varchar("owner_email", { length: 320 }),
  ibi: real("ibi"),
  communityFees: real("community_fees"),
  monthlyRent: real("monthly_rent"),
  profitability: real("profitability"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;

export const reservations = mysqlTable("reservations", {
  id: serial("id").primaryKey(),
  propertyId: int("property_id"),
  leadId: int("lead_id"),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "converted"]).default("active"),
  amount: real("amount"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;

export const settings = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  category: varchar("category", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;

export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: int("assigned_to"),
  leadId: int("lead_id"),
  propertyId: int("property_id"),
  operationId: int("operation_id"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

export const visits = mysqlTable("visits", {
  id: serial("id").primaryKey(),
  propertyId: int("property_id"),
  leadId: int("lead_id"),
  agentId: int("agent_id"),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  feedback: text("feedback"),
  rating: int("rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;

// ═══════════════════════════════════════════════════════════
//  GOOGLE INTEGRATION TABLES (new)
// ═══════════════════════════════════════════════════════════

export const transcriptions = mysqlTable("crm_transcriptions", {
  id: serial("id").primaryKey(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileSize: varchar("fileSize", { length: 50 }).default("0"),
  duration: decimal("duration", { precision: 10, scale: 2 }).default("0"),
  driveFileId: varchar("driveFileId", { length: 100 }),
  driveFileUrl: varchar("driveFileUrl", { length: 500 }),
  driveFolderId: varchar("driveFolderId", { length: 100 }),
  mimeType: varchar("mimeType", { length: 100 }),

  transcript: text("transcript"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).default("0"),
  speakerCount: int("speakerCount").default(2),
  languageCode: varchar("languageCode", { length: 10 }).default("es-ES"),
  wordCount: int("wordCount").default(0),
  wordsJson: text("wordsJson"),
  speakersJson: text("speakersJson"),

  leadId: int("leadId"),
  propertyId: int("propertyId"),
  notes: text("notes"),

  processingStatus: mysqlEnum("processingStatus", [
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
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

export const transcriptionAnalysis = mysqlTable("crm_transcriptionAnalysis", {
  id: serial("id").primaryKey(),
  transcriptionId: int("transcriptionId").notNull(),

  sentiment: varchar("sentiment", { length: 20 }),
  sentimentScore: decimal("sentimentScore", { precision: 5, scale: 4 }),
  emotionsJson: text("emotionsJson"),

  topicsJson: text("topicsJson"),
  actionItemsJson: text("actionItemsJson"),
  summary: text("summary"),
  keyPointsJson: text("keyPointsJson"),
  recommendationsJson: text("recommendationsJson"),

  speakerRatioJson: text("speakerRatioJson"),
  talkTimeSeconds: decimal("talkTimeSeconds", { precision: 10, scale: 2 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TranscriptionAnalysis = typeof transcriptionAnalysis.$inferSelect;
export type InsertTranscriptionAnalysis = typeof transcriptionAnalysis.$inferInsert;

export const driveSyncLog = mysqlTable("crm_driveSyncLog", {
  id: serial("id").primaryKey(),
  folderId: varchar("folderId", { length: 100 }).notNull(),
  folderName: varchar("folderName", { length: 255 }),
  fileId: varchar("fileId", { length: 100 }).notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  action: mysqlEnum("action", [
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
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: varchar("fileSize", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriveSyncLog = typeof driveSyncLog.$inferSelect;
export type InsertDriveSyncLog = typeof driveSyncLog.$inferInsert;

export const documentImports = mysqlTable("crm_documentImports", {
  id: serial("id").primaryKey(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileType: mysqlEnum("fileType", ["excel", "csv", "pdf", "docx", "other"]).notNull(),
  source: mysqlEnum("source", ["drive", "upload"]).default("drive").notNull(),
  driveFileId: varchar("driveFileId", { length: 100 }),
  driveFileUrl: varchar("driveFileUrl", { length: 500 }),

  extractedDataJson: text("extractedDataJson"),
  schemaDetected: varchar("schemaDetected", { length: 100 }),
  rowCount: int("rowCount").default(0),
  importedCount: int("importedCount").default(0),
  duplicateCount: int("duplicateCount").default(0),
  errorCount: int("errorCount").default(0),

  mappingJson: text("mappingJson"),
  importTarget: mysqlEnum("importTarget", [
    "leads",
    "properties",
    "operations",
    "contacts",
    "none",
  ]).default("none"),

  status: mysqlEnum("status", ["pending", "processing", "completed", "error", "cancelled"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),

  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DocumentImport = typeof documentImports.$inferSelect;
export type InsertDocumentImport = typeof documentImports.$inferInsert;
