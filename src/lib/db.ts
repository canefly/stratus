import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export interface DocumentState {
  docHash: string;
  checklistJson: string;
  customNotesJson: string;
  deletedAt: string | null;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:stratus.db');
    
    // Create tables
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY,
        lifetime_seconds INT,
        total_aroll INT,
        total_duration_logged INT,
        last_used_date TEXT
      );
    `);
    
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS document_states (
        doc_hash TEXT PRIMARY KEY,
        checklist_json TEXT,
        custom_notes_json TEXT,
        deleted_at DATETIME
      );
    `);
    
    // Ensure stats row exists
    const statsResult = await dbInstance.select<any[]>('SELECT id FROM stats WHERE id = 1');
    if (!statsResult || statsResult.length === 0) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await dbInstance.execute(
        `INSERT INTO stats (id, lifetime_seconds, total_aroll, total_duration_logged, last_used_date) VALUES (1, 0, 0, 0, $1)`,
        [today]
      );
    }

    // Auto cleanup of old recycle bin items (older than 30 days)
    await dbInstance.execute(`
      DELETE FROM document_states 
      WHERE deleted_at IS NOT NULL 
      AND datetime(deleted_at) <= datetime('now', '-30 days');
    `);
  }
  return dbInstance;
}

// Helpers for Settings
export async function getDbSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const res = await db.select<any[]>("SELECT value FROM settings WHERE key = $1", [key]);
  return res.length > 0 ? res[0].value : null;
}

export async function setDbSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2`,
    [key, value]
  );
}

// Helpers for Document States
export async function saveDocumentState(docHash: string, checklistJson: string, customNotesJson: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO document_states (doc_hash, checklist_json, custom_notes_json, deleted_at) 
     VALUES ($1, $2, $3, NULL) 
     ON CONFLICT(doc_hash) DO UPDATE SET checklist_json = $2, custom_notes_json = $3, deleted_at = NULL`,
    [docHash, checklistJson, customNotesJson]
  );
}

export async function getDocumentState(docHash: string): Promise<DocumentState | null> {
  const db = await getDb();
  const res = await db.select<any[]>("SELECT doc_hash, checklist_json, custom_notes_json, deleted_at FROM document_states WHERE doc_hash = $1", [docHash]);
  if (res.length > 0) {
    return {
      docHash: res[0].doc_hash,
      checklistJson: res[0].checklist_json,
      customNotesJson: res[0].custom_notes_json,
      deletedAt: res[0].deleted_at,
    };
  }
  return null;
}

export async function softDeleteDocumentState(docHash: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE document_states SET deleted_at = datetime('now') WHERE doc_hash = $1`,
    [docHash]
  );
}

export async function restoreDocumentState(docHash: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE document_states SET deleted_at = NULL WHERE doc_hash = $1`,
    [docHash]
  );
}

export async function getActiveDocuments(): Promise<DocumentState[]> {
  const db = await getDb();
  return await db.select<DocumentState[]>('SELECT * FROM document_states WHERE deleted_at IS NULL ORDER BY rowid DESC');
}

export async function getDeletedDocuments(): Promise<DocumentState[]> {
  const db = await getDb();
  const res = await db.select<any[]>("SELECT doc_hash, checklist_json, custom_notes_json, deleted_at FROM document_states WHERE deleted_at IS NOT NULL");
  return res.map(r => ({
    docHash: r.doc_hash,
    checklistJson: r.checklist_json,
    customNotesJson: r.custom_notes_json,
    deletedAt: r.deleted_at,
  }));
}

// Helpers for Stats
export async function getDbStats(): Promise<{ lifetimeSeconds: number; totalARollCount: number; totalDurationLogged: number; lastUsedDate: string }> {
  const db = await getDb();
  const res = await db.select<any[]>("SELECT lifetime_seconds, total_aroll, total_duration_logged, last_used_date FROM stats WHERE id = 1");
  if (res.length > 0) {
    return {
      lifetimeSeconds: res[0].lifetime_seconds,
      totalARollCount: res[0].total_aroll,
      totalDurationLogged: res[0].total_duration_logged,
      lastUsedDate: res[0].last_used_date,
    };
  }
  return { lifetimeSeconds: 0, totalARollCount: 0, totalDurationLogged: 0, lastUsedDate: "" };
}

export async function saveDbStats(lifetimeSeconds: number, totalARollCount: number, totalDurationLogged: number, lastUsedDate: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE stats SET lifetime_seconds = $1, total_aroll = $2, total_duration_logged = $3, last_used_date = $4 WHERE id = 1`,
    [lifetimeSeconds, totalARollCount, totalDurationLogged, lastUsedDate]
  );
}

export async function resetDbStats(): Promise<void> {
  const db = await getDb();
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  await db.execute(
    `UPDATE stats SET lifetime_seconds = 0, total_aroll = 0, total_duration_logged = 0, last_used_date = $1 WHERE id = 1`,
    [today]
  );
}

