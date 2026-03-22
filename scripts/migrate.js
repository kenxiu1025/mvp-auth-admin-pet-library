const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(process.cwd(), "data", "pet-task.db");
const migrationsDir = path.join(process.cwd(), "migrations");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  const alreadyApplied = db
    .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
    .get(file);

  if (alreadyApplied) {
    console.log(`Skipped ${file}`);
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const transaction = db.transaction(() => {
    db.exec(sql);
    db.prepare(
      `
        INSERT INTO schema_migrations (filename, applied_at)
        VALUES (?, ?)
      `,
    ).run(file, new Date().toISOString());
  });

  transaction();
  console.log(`Applied ${file}`);
}

db.close();
