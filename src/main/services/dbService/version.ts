import type { Database } from "sqlite3";

export interface DbVersion {
  execute(db: Database): void;
}

export const versions: DbVersion[] = [
  {
    execute(db) {
      db.serialize(() => {
        db.run(`CREATE TABLE document(
          id TEXT PRIMARY KEY,
          title TEXT,
          snapshot TEXT,
          snapshot_version INTEGER NOT NULL,
          trashed_at INTEGER,
          accessed_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          modified_at INTEGER NOT NULL)`);
        db.run(`CREATE TABLE changeset(
          id TEXT PRIMARY KEY,
          version_num INTEGER NOT NULL,
          document_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )`);
        db.run(`CREATE TABLE blob_storage(
          id TEXT PRIMARY KEY,
          content BLOB,
          size INTEGER NOT NULL,
          owner_id TEXT,
          created_at INTEGER NOT NULL,
          accessed_at INTEGER NOT NULL,
          modified_at INTEGER NOT NULL)`);
      });
    },
  },
];
