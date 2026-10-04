import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const storagePath = path.join(/* turbopackIgnore: true */ process.cwd(), ".harbour-data");
const globalStore = globalThis as typeof globalThis & { harbourPool?: Pool; harbourPoolInit?: Promise<Pool>; harbourSchema?: Promise<unknown>; harbourKey?: Promise<Buffer> };

async function encryptionKey() {
  const configured = process.env.DATA_ENCRYPTION_KEY;
  if (configured) {
    if (!/^[a-f0-9]{64}$/i.test(configured)) throw new Error("DATA_ENCRYPTION_KEY must be 64 hexadecimal characters.");
    return Buffer.from(configured, "hex");
  }
  if (process.env.NODE_ENV === "production") throw new Error("Configure DATA_ENCRYPTION_KEY before deployment.");
  globalStore.harbourKey ??= (async () => {
    await mkdir(storagePath, { recursive: true });
    const keyPath = path.join(storagePath, "local.key");
    try { await writeFile(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 }); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    return readFile(/* turbopackIgnore: true */ keyPath);
  })();
  return globalStore.harbourKey;
}

async function encode(scope: string, key: string, value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`${scope}:${key}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

async function decode<T>(scope: string, key: string, payload: string): Promise<T> {
  const bytes = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", await encryptionKey(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(`${scope}:${key}`));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")) as T;
}

async function database() {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("Configure PostgreSQL DATABASE_URL before deployment.");
    return null;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!globalStore.harbourPool) {
    globalStore.harbourPoolInit ??= (async () => {
    const connection = new URL(databaseUrl);
    const isSupabase = connection.hostname.endsWith(".pooler.supabase.com") || connection.hostname.endsWith(".supabase.co");
    const ssl = isSupabase ? {
      ca: await readFile(path.join(process.cwd(), "certs/supabase-ca.crt"), "utf8"),
      rejectUnauthorized: true,
    } : undefined;
    if (isSupabase) {
      for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) connection.searchParams.delete(parameter);
    }
    return new Pool({ connectionString: connection.toString(), ssl, max: 4, connectionTimeoutMillis: 10000 });
    })().catch((error) => { globalStore.harbourPoolInit = undefined; throw error; });
    globalStore.harbourPool = await globalStore.harbourPoolInit;
  }
  globalStore.harbourSchema ??= globalStore.harbourPool.query(`CREATE TABLE IF NOT EXISTS harbour_records (
    scope text NOT NULL, key text NOT NULL, payload text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(scope, key)
  );
    ALTER TABLE harbour_records ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE harbour_records FROM PUBLIC;
    DO $$ DECLARE api_role text; BEGIN
      FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL ON TABLE harbour_records FROM %I', api_role);
        END IF;
      END LOOP;
    END $$;
  `).catch((error) => { globalStore.harbourSchema = undefined; throw error; });
  await globalStore.harbourSchema;
  return globalStore.harbourPool;
}

function directory(scope: string) {
  return path.join(/* turbopackIgnore: true */ storagePath, createHash("sha256").update(scope).digest("hex"));
}

export async function readRecords<T>(scope: string, prefix: string): Promise<Array<{ key: string; value: T }>> {
  const db = await database();
  let rows: Array<{ key: string; payload: string }>;
  if (db) {
    const result = await db.query("SELECT key, payload FROM harbour_records WHERE scope=$1 AND starts_with(key, $2)", [scope, prefix]);
    rows = result.rows;
  } else {
    const dir = directory(scope);
    await mkdir(dir, { recursive: true });
    const files = (await readdir(/* turbopackIgnore: true */ dir)).filter((name) => name.endsWith(".json"));
    rows = await Promise.all(files.map(async (file) => JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ dir, file), "utf8")) as { key: string; payload: string }));
    rows = rows.filter((row) => row.key.startsWith(prefix));
  }
  return Promise.all(rows.map(async (row) => ({ key: row.key, value: await decode<T>(scope, row.key, row.payload) })));
}

export async function writeRecord(scope: string, key: string, value: unknown, actor: string) {
  const payload = await encode(scope, key, value);
  const auditKey = `audit:${new Date().toISOString()}:${randomUUID()}`;
  const auditPayload = await encode(scope, auditKey, { key, actor, at: new Date().toISOString(), value });
  const db = await database();
  if (db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO harbour_records(scope,key,payload) VALUES($1,$2,$3) ON CONFLICT(scope,key) DO UPDATE SET payload=excluded.payload, updated_at=now()", [scope, key, payload]);
      await client.query("INSERT INTO harbour_records(scope,key,payload) VALUES($1,$2,$3)", [scope, auditKey, auditPayload]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } else {
    const dir = directory(scope);
    await mkdir(dir, { recursive: true });
    for (const row of [{ key, payload }, { key: auditKey, payload: auditPayload }]) {
      const filename = path.join(dir, `${createHash("sha256").update(row.key).digest("hex")}.json`);
      const temporary = `${filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(row), { mode: 0o600 });
      await rename(temporary, filename);
    }
  }
}
