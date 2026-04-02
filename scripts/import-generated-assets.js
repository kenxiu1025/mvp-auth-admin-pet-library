const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : "true";
    args[key] = value;
    if (value !== "true") {
      index += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = args.manifest;
  const sourcePath = args.source;
  const force = args.force === "true";

  if (!manifestPath && !sourcePath) {
    console.error("Usage: npm run assets:import -- --manifest <result.json> [--source <file>] [--force]");
    process.exit(2);
  }

  let sourceFile = sourcePath;
  let targetOutputPath = null;

  if (manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), "utf8"));
    sourceFile = sourceFile || manifest.outputFiles?.[0];
    targetOutputPath = manifest.targetOutputPath ?? null;
  }

  if (!sourceFile) {
    console.error("No source file found.");
    process.exit(2);
  }

  if (!targetOutputPath) {
    console.error("No target output path found. Provide --manifest or extend the script.");
    process.exit(2);
  }

  const absoluteSource = path.resolve(sourceFile);
  const absoluteTarget = path.resolve(targetOutputPath);
  const targetExisted = fs.existsSync(absoluteTarget);

  if (!fs.existsSync(absoluteSource)) {
    console.error(`Source file not found: ${absoluteSource}`);
    process.exit(1);
  }

  if (fs.existsSync(absoluteTarget) && !force) {
    console.error(`Target already exists: ${absoluteTarget}. Use --force to overwrite.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
  fs.copyFileSync(absoluteSource, absoluteTarget);

  console.log(JSON.stringify({
    ok: true,
    source: absoluteSource,
    target: absoluteTarget,
    overwritten: targetExisted,
  }, null, 2));
}

main();
