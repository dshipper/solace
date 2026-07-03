import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each vitest worker gets an isolated data dir before any lib module loads.
process.env.SOLACE_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "solace-unit-"));
process.env.SOLACE_BASE_URL = "http://127.0.0.1:4863";
