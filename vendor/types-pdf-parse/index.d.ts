declare function PDFParse(
  dataBuffer: Buffer,
  options?: { max?: number; version?: string }
): Promise<{
  text: string;
  numpages: number;
  numrender: number;
  info: Record<string, unknown>;
  metadata: unknown;
  version: string;
}>;

export = PDFParse;
