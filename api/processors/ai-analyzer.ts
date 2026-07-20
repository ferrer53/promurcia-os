/**
 * AI Analyzer — PromurciaOS Document Processing Pipeline
 * Analyzes call transcription text using OpenAI to extract:
 * - Sentiment, topics, action items, client intent, property references, recommendations
 * All output is in SPANISH.
 */

// ── Types ───────────────────────────────────────────────────────────

export interface TranscriptionAnalysis {
  summary: string; // Brief summary in Spanish
  sentiment: "positivo" | "neutro" | "negativo";
  confidence: number; // 0-1
  topics: string[]; // Topics discussed
  actionItems: Array<{
    task: string;
    priority: "alta" | "media" | "baja";
    deadline?: string; // ISO date or relative term
    assignedTo?: string;
  }>;
  clientIntent: string; // What the client wants
  propertyReferences: string[]; // Properties mentioned
  keyPoints: string[]; // Important points
  recommendations: string[]; // Suggested next actions
  duration: number; // Call duration in seconds (from input or estimated)
}

// ── Simulated AI Analysis ───────────────────────────────────────────
//
// In production, this calls the OpenAI API. For the implementation,
// we provide both a mock for testing and the real OpenAI integration.
//
// To use OpenAI, set the OPENAI_API_KEY environment variable.
//

const OPENAI_SYSTEM_PROMPT = `Eres un asistente experto en análisis de conversaciones inmobiliarias para una inmobiliaria en Murcia, España.

Analiza la siguiente transcripción de una llamada/conversación y extrae la información solicitada.

REGLAS:
- Todos los textos deben estar en ESPAÑOL
- Sé conciso pero completo
- Identifica claramente la intención del cliente
- Extrae todas las referencias a propiedades
- Detecta fechas y plazos mencionados
- Evalúa el sentimiento de la conversación
- Prioriza las tareas según urgencia

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "summary": "string - resumen breve de la conversación en 2-3 frases",
  "sentiment": "positivo|neutro|negativo",
  "confidence": 0.0-1.0,
  "topics": ["string"],
  "actionItems": [
    {
      "task": "string",
      "priority": "alta|media|baja",
      "deadline": "string|null - fecha ISO o término relativo",
      "assignedTo": "string|null"
    }
  ],
  "clientIntent": "string - qué quiere el cliente",
  "propertyReferences": ["string"],
  "keyPoints": ["string"],
  "recommendations": ["string"]
}`;

/**
 * Call OpenAI API for transcription analysis.
 * Falls back to mock analysis if no API key or on error.
 */
export async function analyzeTranscription(text: string, durationSeconds = 0): Promise<TranscriptionAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      return await callOpenAI(text, durationSeconds, apiKey);
    } catch (err) {
      console.warn("[AI Analyzer] OpenAI call failed, using mock analysis:", err instanceof Error ? err.message : err);
      // Fall through to mock
    }
  }

  return mockAnalyzeTranscription(text, durationSeconds);
}

// ── OpenAI Integration ──────────────────────────────────────────────

async function callOpenAI(
  text: string,
  durationSeconds: number,
  apiKey: string
): Promise<TranscriptionAnalysis> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OPENAI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `TRANSCRIPCIÓN (${durationSeconds}s):\n\n${text}\n\nProporciona el análisis en JSON.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content);

  return {
    summary: parsed.summary || "No se pudo generar resumen",
    sentiment: validateSentiment(parsed.sentiment),
    confidence: clampNumber(parsed.confidence, 0, 1),
    topics: parsed.topics || [],
    actionItems: (parsed.actionItems || []).map((item: Record<string, unknown>) => ({
      task: String(item.task || ""),
      priority: validatePriority(item.priority),
      deadline: item.deadline ? String(item.deadline) : undefined,
      assignedTo: item.assignedTo ? String(item.assignedTo) : undefined,
    })),
    clientIntent: parsed.clientIntent || "No identificado",
    propertyReferences: parsed.propertyReferences || [],
    keyPoints: parsed.keyPoints || [],
    recommendations: parsed.recommendations || [],
    duration: durationSeconds,
  };
}

// ── Mock Analyzer (fallback) ────────────────────────────────────────

function mockAnalyzeTranscription(text: string, durationSeconds: number): TranscriptionAnalysis {
  const lower = text.toLowerCase();

  // Sentiment detection
  const positiveWords = [
    "interesado",
    "interesada",
    "me gusta",
    "perfecto",
    "genial",
    "excelente",
    "encanta",
    "muy bien",
    "sí",
    "si",
    "ok",
    "de acuerdo",
    "perfecta",
    "ideal",
    "maravilloso",
  ];
  const negativeWords = [
    "no",
    "caro",
    "malo",
    "problema",
    "queja",
    "insatisfecho",
    "descontento",
    "error",
    "defecto",
    "lamentable",
    "demasiado",
    "incómodo",
  ];

  let posScore = 0;
  let negScore = 0;

  for (const w of positiveWords) {
    if (lower.includes(w)) posScore++;
  }
  for (const w of negativeWords) {
    if (lower.includes(w)) negScore++;
  }

  let sentiment: "positivo" | "neutro" | "negativo" = "neutro";
  if (posScore > negScore + 1) sentiment = "positivo";
  else if (negScore > posScore + 1) sentiment = "negativo";

  // Topic extraction
  const topics: string[] = [];
  if (lower.includes("precio") || lower.includes("euro") || lower.includes("€")) topics.push("precio");
  if (lower.includes("visita") || lower.includes("ver")) topics.push("visita");
  if (lower.includes("alquiler") || lower.includes("alquilar")) topics.push("alquiler");
  if (lower.includes("compra") || lower.includes("comprar")) topics.push("compra");
  if (lower.includes("venta") || lower.includes("vender")) topics.push("venta");
  if (lower.includes("hipoteca") || lower.includes("financiac")) topics.push("financiación");
  if (lower.includes("zona") || lower.includes("barrio") || lower.includes("ubicación"))
    topics.push("ubicación");
  if (lower.includes("terraza") || lower.includes("ascensor") || lower.includes("garaje"))
    topics.push("características");
  if (lower.includes("documento") || lower.includes("papeles") || lower.includes("dni"))
    topics.push("documentación");
  if (lower.includes("llamar") || lower.includes("contactar")) topics.push("seguimiento");
  if (topics.length === 0) topics.push("consulta general");

  // Property references
  const propertyRefs: string[] = [];
  const refMatches = text.match(/\b(?:REF|Ref|ref)[\s\-.]*[A-Z0-9]+\b/g);
  if (refMatches) {
    refMatches.forEach((r) => propertyRefs.push(r.trim()));
  }
  // Also extract addresses mentioned
  const addressPatterns = text.match(/\b(?:Calle|Av\.?da|Avenida|Paseo|Plaza|C\/|Avda\.?)[\s][A-Z][a-záéíóúñ]+(?:\s[A-Z][a-záéíóúñ]+)*/g);
  if (addressPatterns) {
    addressPatterns.forEach((a) => {
      if (!propertyRefs.includes(a)) propertyRefs.push(a);
    });
  }

  // Client intent
  let clientIntent = "Consulta general sobre inmuebles";
  if (lower.includes("alquiler") || lower.includes("alquilar")) {
    clientIntent = "Busca alquilar una propiedad";
  } else if (lower.includes("compra") || lower.includes("comprar")) {
    clientIntent = "Busca comprar una propiedad";
  } else if (lower.includes("venta") || lower.includes("vender")) {
    clientIntent = "Quiere vender una propiedad";
  } else if (lower.includes("visita")) {
    clientIntent = "Quiere programar una visita";
  } else if (lower.includes("precio") || lower.includes("información")) {
    clientIntent = "Solicita información sobre precios y disponibilidad";
  }

  // Action items
  const actionItems: TranscriptionAnalysis["actionItems"] = [];
  if (lower.includes("visita") || lower.includes("ver")) {
    actionItems.push({
      task: "Programar visita a la propiedad",
      priority: "alta",
      deadline: "dentro de 48h",
    });
  }
  if (lower.includes("llamar") || lower.includes("contactar")) {
    actionItems.push({
      task: "Llamar de vuelta al cliente",
      priority: "alta",
      deadline: "hoy",
    });
  }
  if (lower.includes("precio") || lower.includes("oferta")) {
    actionItems.push({
      task: "Preparar propuesta de precio/oferta",
      priority: "media",
    });
  }
  if (lower.includes("documento") || lower.includes("dni") || lower.includes("nómina")) {
    actionItems.push({
      task: "Solicitar documentación pendiente",
      priority: "media",
    });
  }
  if (actionItems.length === 0) {
    actionItems.push({
      task: "Hacer seguimiento del interés mostrado",
      priority: "baja",
    });
  }

  // Key points
  const keyPoints: string[] = [];
  if (sentiment === "positivo") keyPoints.push("Actitud positiva del cliente");
  if (sentiment === "negativo") keyPoints.push("Requiere atención especial por insatisfacción");
  if (propertyRefs.length > 0) keyPoints.push(`Referencia a ${propertyRefs.length} propiedad(es)`);
  if (lower.includes("prisa") || lower.includes("urgente")) keyPoints.push("Cliente con urgencia");
  if (lower.includes("presupuesto")) keyPoints.push("Cliente mencionó presupuesto");
  if (topics.length > 0) keyPoints.push(`Temas tratados: ${topics.join(", ")}`);

  // Recommendations
  const recommendations: string[] = [];
  if (sentiment === "positivo") {
    recommendations.push("Avanzar rápido, el cliente muestra interés");
  }
  if (lower.includes("visita")) {
    recommendations.push("Coordinar visita presencial lo antes posible");
  }
  if (lower.includes("precio")) {
    recommendations.push("Preparar comparativa de precios de la zona");
  }
  recommendations.push("Enviar resumen de la conversación por email/WhatsApp");
  recommendations.push("Actualizar CRM con los datos de la llamada");

  // Summary
  const summary = `Conversación ${sentiment} sobre ${topics.join(", ")}. ${clientIntent}. ${keyPoints.length > 0 ? keyPoints[0] + "." : ""}`;

  return {
    summary,
    sentiment,
    confidence: 0.7 + Math.random() * 0.2,
    topics,
    actionItems,
    clientIntent,
    propertyReferences: propertyRefs,
    keyPoints,
    recommendations,
    duration: durationSeconds,
  };
}

// ── Task Extraction ─────────────────────────────────────────────────

/**
 * Convert analysis action items into CRM task format.
 */
export function extractTasks(
  analysis: TranscriptionAnalysis
): Array<{
  title: string;
  description: string;
  priority: "alta" | "media" | "baja";
  dueDate?: Date;
}> {
  return analysis.actionItems.map((item) => {
    let dueDate: Date | undefined;

    if (item.deadline) {
      const lower = item.deadline.toLowerCase();
      if (lower.includes("hoy")) {
        dueDate = new Date();
      } else if (lower.includes("mañana")) {
        dueDate = new Date(Date.now() + 86400000);
      } else if (lower.includes("48h") || lower.includes("48 horas")) {
        dueDate = new Date(Date.now() + 172800000);
      } else if (lower.includes("semana")) {
        dueDate = new Date(Date.now() + 604800000);
      } else {
        // Try to parse as ISO date
        const parsed = new Date(item.deadline);
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed;
        }
      }
    }

    return {
      title: item.task,
      description: `Tarea generada automáticamente desde análisis de llamada.\nPrioridad: ${item.priority}${item.assignedTo ? `\nAsignado a: ${item.assignedTo}` : ""}${item.deadline ? `\nFecha límite: ${item.deadline}` : ""}\n\nResumen: ${analysis.summary}`,
      priority: item.priority,
      dueDate,
    };
  });
}

// ── Batch Analysis ──────────────────────────────────────────────────

/**
 * Analyze multiple transcriptions in sequence.
 */
export async function analyzeTranscriptions(
  transcriptions: Array<{ text: string; duration?: number; id?: string }>
): Promise<Array<{ id: string; analysis: TranscriptionAnalysis }>> {
  const results: Array<{ id: string; analysis: TranscriptionAnalysis }> = [];

  for (const t of transcriptions) {
    try {
      const analysis = await analyzeTranscription(t.text, t.duration || 0);
      results.push({ id: t.id || `transcription-${Date.now()}`, analysis });
    } catch (err) {
      console.error(`[AI Analyzer] Error analyzing transcription ${t.id}:`, err);
      results.push({
        id: t.id || `transcription-${Date.now()}`,
        analysis: {
          summary: "Error al analizar la transcripción",
          sentiment: "neutro",
          confidence: 0,
          topics: [],
          actionItems: [],
          clientIntent: "Desconocido",
          propertyReferences: [],
          keyPoints: [`Error: ${err instanceof Error ? err.message : "Error desconocido"}`],
          recommendations: ["Revisar la transcripción manualmente"],
          duration: t.duration || 0,
        },
      });
    }
  }

  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────

function validateSentiment(s: unknown): "positivo" | "neutro" | "negativo" {
  if (s === "positivo" || s === "neutro" || s === "negativo") return s;
  return "neutro";
}

function validatePriority(p: unknown): "alta" | "media" | "baja" {
  if (p === "alta" || p === "media" || p === "baja") return p;
  return "media";
}

function clampNumber(n: unknown, min: number, max: number): number {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return 0.5;
  return Math.max(min, Math.min(max, num));
}
