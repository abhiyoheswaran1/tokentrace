import Database from "better-sqlite3";

const ddl = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS tools_provider_name_idx ON tools(provider_id, name);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input_token_price REAL,
  output_token_price REAL,
  cached_input_token_price REAL,
  cache_write_token_price REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_from INTEGER,
  raw_metadata TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS models_provider_name_idx ON models(provider_id, name);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_path_idx ON projects(path);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  started_at INTEGER,
  ended_at INTEGER,
  title TEXT,
  source_file TEXT NOT NULL,
  raw_metadata TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_source_id_idx ON sessions(source_id);
CREATE INDEX IF NOT EXISTS sessions_tool_idx ON sessions(tool_id);
CREATE INDEX IF NOT EXISTS sessions_project_idx ON sessions(project_id);
CREATE INDEX IF NOT EXISTS sessions_started_idx ON sessions(started_at);

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp INTEGER,
  role TEXT NOT NULL,
  model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_tokens INTEGER NOT NULL DEFAULT 0,
  token_confidence TEXT NOT NULL DEFAULT 'unknown',
  cost REAL,
  cost_estimated INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  raw_text_preview TEXT,
  raw_text TEXT,
  raw_metadata TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS interactions_source_id_idx ON interactions(source_id);
CREATE INDEX IF NOT EXISTS interactions_session_idx ON interactions(session_id);
CREATE INDEX IF NOT EXISTS interactions_model_idx ON interactions(model_id);
CREATE INDEX IF NOT EXISTS interactions_timestamp_idx ON interactions(timestamp);

PRAGMA user_version;

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT,
  duration_ms INTEGER,
  raw_metadata TEXT
);
CREATE INDEX IF NOT EXISTS tool_calls_interaction_idx ON tool_calls(interaction_id);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  files_scanned INTEGER NOT NULL DEFAULT 0,
  records_imported INTEGER NOT NULL DEFAULT 0,
  warnings TEXT NOT NULL DEFAULT '[]',
  errors TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS scan_files (
  id TEXT PRIMARY KEY,
  scan_run_id TEXT NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  modified_time INTEGER,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  file_hash TEXT,
  parser TEXT,
  status TEXT NOT NULL,
  records_imported INTEGER NOT NULL DEFAULT 0,
  warnings TEXT NOT NULL DEFAULT '[]',
  errors TEXT NOT NULL DEFAULT '[]',
  raw_metadata TEXT
);
CREATE INDEX IF NOT EXISTS scan_files_path_hash_idx ON scan_files(path, file_hash);
CREATE INDEX IF NOT EXISTS scan_files_run_idx ON scan_files(scan_run_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

export function applyMigrations(sqlite: Database.Database) {
  sqlite.exec(ddl);

  const interactionColumns = sqlite.prepare("PRAGMA table_info(interactions)").all() as Array<{
    name: string;
  }>;
  if (!interactionColumns.some((column) => column.name === "token_confidence")) {
    try {
      sqlite.exec("ALTER TABLE interactions ADD COLUMN token_confidence TEXT NOT NULL DEFAULT 'unknown'");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.toLowerCase().includes("duplicate column")
      ) {
        throw error;
      }
    }
  }

  const modelColumns = sqlite.prepare("PRAGMA table_info(models)").all() as Array<{ name: string }>;
  if (!modelColumns.some((column) => column.name === "cache_write_token_price")) {
    try {
      sqlite.exec("ALTER TABLE models ADD COLUMN cache_write_token_price REAL");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.toLowerCase().includes("duplicate column")
      ) {
        throw error;
      }
    }
  }
}
