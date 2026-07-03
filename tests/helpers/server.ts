import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");

export interface TestServer {
  baseUrl: string;
  dataDir: string;
  stop: () => Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (typeof address === "object" && address) {
        const { port } = address;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("could not allocate a port")));
      }
    });
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Boots the production build (`next start`) on an ephemeral port with a
 * temporary data dir. Requires `next build` to have run (the
 * test:integration script does this). One server per test file.
 */
export async function startServer(): Promise<TestServer> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "solace-int-"));
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(
    "node",
    ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: PROJECT_ROOT,
      env: { ...process.env, SOLACE_DATA_DIR: dataDir, SOLACE_BASE_URL: baseUrl, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout?.on("data", (d) => (output += d));
  child.stderr?.on("data", (d) => (output += d));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return { baseUrl, dataDir, stop: () => stopChild(child) };
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await stopChild(child);
  throw new Error(`Solace test server failed to start.\n${output}`);
}

/**
 * Seeds data by importing lib modules in THIS process pointed at the child's
 * data dir (WAL allows cross-process access). Call before any other lib
 * import in the test file, and only once per file.
 */
export async function libFor(server: TestServer) {
  process.env.SOLACE_DATA_DIR = server.dataDir;
  process.env.SOLACE_BASE_URL = server.baseUrl;
  const staff = await import("../../lib/staff");
  const settings = await import("../../lib/settings");
  const events = await import("../../lib/events");
  const services = await import("../../lib/services");
  const rsvps = await import("../../lib/rsvps");
  const updates = await import("../../lib/updates");
  const organizers = await import("../../lib/organizers");
  const marketing = await import("../../lib/marketing");
  return { staff, settings, events, services, rsvps, updates, organizers, marketing };
}
