declare module "better-sqlite3" {
  const Database: any;
  export default Database;
}

declare module "csv-parse/sync" {
  export function parse(input: string | Buffer, options?: Record<string, unknown>): Array<Record<string, unknown>>;
}

declare module "pdf-parse" {
  const parsePDF: (buffer: Buffer, options?: { max?: number }) => Promise<{
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }>;
  export default parsePDF;
}
