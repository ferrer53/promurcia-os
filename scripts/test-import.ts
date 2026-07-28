import { readFileSync } from "fs";
import { runImportPipeline } from "../api/processors/import-pipeline";

const buffer = readFileSync("./scripts/test-import.csv");
const result = await runImportPipeline(buffer, "csv", {
  skipDuplicates: false,
  autoLink: true,
  defaultSource: "test",
  defaultStatus: "nuevo",
});

console.log(JSON.stringify(result, null, 2));
