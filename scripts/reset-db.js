const fs = require("fs");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "pet-task.db");

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath, { force: true });
}

console.log("Database removed.");
