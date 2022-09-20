import type { Database } from "better-sqlite3";

export interface DbVersion {
  execute(db: Database): void;
}

export const notebookVersions: DbVersion[] = [
  {
    execute(db) {
      db.exec(`CREATE TABLE document(
        id TEXT PRIMARY KEY,
        title TEXT,
        snapshot TEXT,
        snapshot_version INTEGER NOT NULL,
        trashed_at INTEGER,
        accessed_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL)`);
      db.exec(`CREATE TABLE changeset(
        id TEXT PRIMARY KEY,
        version_num INTEGER NOT NULL,
        document_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`);
      db.exec(`CREATE TABLE blob_storage(
        id TEXT PRIMARY KEY,
        content BLOB,
        size INTEGER NOT NULL,
        owner_id TEXT,
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL)`);
    },
  },
];

export const appVersions: DbVersion[] = [
  {
    execute(db) {
      db.exec(`CREATE TABLE recent_notebooks(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          local_path TEXT,
          last_opened_at INTEGER NOT NULL)`);
    },
  },
];
