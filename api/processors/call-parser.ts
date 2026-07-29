/**
 * Parser para nombres de archivo de llamadas/WhatsApp exportadas a Drive.
 *
 * Formato típico:
 *   "2026-07-29 11-59-38 (phone) Paco Montalbán Prop. 2hab. Vista Alegre Vicente Medina (690 29 53 51) ↙.json"
 *   "2026-07-28 19-25-01 (whatsapp) Marga Cll Capuchinos 350€ 3.json"
 *   "2026-07-28 14-38-36 (phone) Jenifer Inter Ronda Sur (+34 632 22 82 07) ↗.json"
 */

export interface ParsedCallFile {
  callDate: Date;
  channel: "llamada" | "whatsapp";
  direction: "entrante" | "saliente";
  contactName?: string;
  phone?: string;
  role?: "propietario" | "interesado" | "desconocido";
  propertyAddress?: string;
  propertyZone?: string;
  price?: number;
  bedrooms?: number;
  notes?: string;
  durationMs?: number;
  rawFileName: string;
  rawContent?: Record<string, unknown>;
}

function normalizePhoneDigits(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  const nine = digits.slice(-9);
  if (nine.length === 9 && /^[6789]/.test(nine)) {
    return `+34${nine}`;
  }
  return undefined;
}

function extractPhoneFrom(text: string): string | undefined {
  // +34 632 22 82 07, 690 29 53 51, 633885811, etc.
  const patterns = [
    /(\+34\s?\d{3}\s?\d{2}\s?\d{2}\s?\d{2})/,
    /(\d{3}\s\d{2}\s\d{2}\s\d{2})/,
    /(\d{9})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const normalized = normalizePhoneDigits(match[1]);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

function parseDate(dateStr: string): Date {
  // "2026-07-29 11-59-38" -> "2026-07-29T11:59:38"
  const cleaned = dateStr.trim().replace(" ", "T").replace(/-(\d{2})-(\d{2})-(\d{2})$/, ":$1:$2");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function parseDuration(duration: unknown): number | undefined {
  if (typeof duration === "number") return duration;
  if (typeof duration === "string") {
    const n = parseInt(duration, 10);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

export function parseCallFileName(
  fileName: string,
  content?: Record<string, unknown>
): ParsedCallFile {
  const raw = fileName.replace(/\.json$/i, "");

  // Fecha y hora al inicio
  const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2})/);
  const callDate = dateMatch ? parseDate(dateMatch[1]) : new Date();

  // Canal
  const channelMatch = raw.match(/\((phone|whatsapp)\)/i);
  const channel: ParsedCallFile["channel"] =
    channelMatch?.[1].toLowerCase() === "whatsapp" ? "whatsapp" : "llamada";

  // Dirección por flecha o por contenido JSON
  let direction: ParsedCallFile["direction"] = "entrante";
  if (raw.includes("↗")) direction = "saliente";
  else if (raw.includes("↙")) direction = "entrante";
  else if (content?.direction === "Outgoing") direction = "saliente";
  else if (content?.direction === "Incoming") direction = "entrante";

  // Teléfono entre paréntesis al final
  const phoneInParens = raw.match(/\(([\d\s\+]+)\)\s*[↗↙]?$/);
  let phone = phoneInParens ? normalizePhoneDigits(phoneInParens[1]) : undefined;

  // Si no hay teléfono entre paréntesis, buscar en cualquier parte
  if (!phone) {
    phone = extractPhoneFrom(raw);
  }

  // Contenido JSON: callee puede ser teléfono
  if (!phone && typeof content?.callee === "string") {
    phone = normalizePhoneDigits(content.callee as string);
  }

  // Rol: Prop. / Inter
  let role: ParsedCallFile["role"] = "desconocido";
  if (/\bProp\.?\b/i.test(raw)) role = "propietario";
  else if (/\bInter\b/i.test(raw)) role = "interesado";

  // Precio
  const priceMatch = raw.match(/(\d[\d.]*)\s*€/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/\./g, ""), 10) : undefined;

  // Habitaciones
  const bedroomsMatch = raw.match(/(\d)\s*hab\.?/i);
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined;

  // Nombre del contacto y dirección
  // Ejemplo sin teléfono entre paréntesis: "Marga Cll Capuchinos 350€ 3"
  // Ejemplo con teléfono: "Paco Montalbán Prop. 2hab. Vista Alegre Vicente Medina"
  let body = raw;
  if (dateMatch) body = body.slice(dateMatch[0].length).trim();
  if (channelMatch) body = body.replace(channelMatch[0], "").trim();
  body = body.replace(/\([\d\s\+]+\)\s*[↗↙]?$/, "").trim();

  // Separar nombre de dirección/propiedad
  let contactName: string | undefined;
  let propertyAddress: string | undefined;
  let propertyZone: string | undefined;

  // Buscar delimitadores comunes
  const separators = [" Prop. ", " Inter ", " prop. ", " inter "];
  let splitIndex = -1;
  for (const sep of separators) {
    const idx = body.toLowerCase().indexOf(sep.toLowerCase());
    if (idx !== -1) {
      splitIndex = idx;
      break;
    }
  }

  if (splitIndex !== -1) {
    contactName = body.slice(0, splitIndex).trim();
    let rest = body.slice(splitIndex).replace(/^\s*(Prop\.|Inter)\s*/i, "").trim();
    // Quitar datos numéricos del final de la dirección (hab, precio)
    rest = rest.replace(/\d+\s*hab\.?/i, "").trim();
    rest = rest.replace(/\d[\d.]*\s*€/, "").trim();
    rest = rest.replace(/\s+\d+$/, "").trim();
    if (rest) propertyAddress = rest;
  } else {
    // Intentar detectar: nombre al principio, luego dirección
    // Heurística: las primeras 1-3 palabras son el nombre, el resto dirección/propiedad
    const parts = body.split(/\s+/);
    if (parts.length >= 2) {
      contactName = parts.slice(0, 2).join(" ");
      let rest = parts.slice(2).join(" ");
      rest = rest.replace(/\d+\s*hab\.?/i, "").trim();
      rest = rest.replace(/\d[\d.]*\s*€/, "").trim();
      rest = rest.replace(/\s+\d+$/, "").trim();
      if (rest) propertyAddress = rest;
    } else {
      contactName = body;
    }
  }

  // Limpiar nombre de posibles restos
  if (contactName) {
    contactName = contactName.replace(/\s+/g, " ").trim();
    if (contactName.length < 2) contactName = undefined;
  }

  // Notas
  const notesParts: string[] = [];
  if (content?.duration) {
    const ms = parseDuration(content.duration);
    if (ms) notesParts.push(`Duración: ${Math.round(ms / 1000)}s`);
  }
  if (role !== "desconocido") notesParts.push(`Rol detectado: ${role}`);
  const notes = notesParts.length > 0 ? notesParts.join(". ") : undefined;

  return {
    callDate,
    channel,
    direction,
    contactName,
    phone,
    role,
    propertyAddress,
    propertyZone,
    price,
    bedrooms,
    notes,
    durationMs: parseDuration(content?.duration),
    rawFileName: fileName,
    rawContent: content,
  };
}
