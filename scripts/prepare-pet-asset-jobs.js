const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const manifestPath = path.join(cwd, "data", "pet-asset-manifest.json");
const promptsPath = path.join(cwd, "prompts", "pet-prompts.json");
const outputPath = path.join(cwd, "data", "pet-asset-jobs.json");
const statusOnly = process.argv.includes("--status");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(cwd, relativePath));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildPrompt(promptConfig, assetKey, state) {
  const assetPrompt = promptConfig.assets[assetKey];

  if (!assetPrompt) {
    throw new Error(`Missing prompt config for asset: ${assetKey}`);
  }

  const statePrompt = assetPrompt.states[state];

  if (!statePrompt) {
    throw new Error(`Missing state prompt for asset: ${assetKey}, state: ${state}`);
  }

  return [
    promptConfig.globalStylePrompt,
    assetPrompt.identityPrompt,
    promptConfig.globalConstraintPrompt,
    statePrompt,
  ].join(", ");
}

function main() {
  const manifest = readJson(manifestPath);
  const promptConfig = readJson(promptsPath);
  const states = [...manifest.requiredStates, ...manifest.recommendedStates];
  const jobs = [];

  for (const asset of manifest.assets) {
    for (const state of states) {
      const outputRelativePath = path.join(manifest.outputRoot, asset.key, `${state}.png`);
      const exists = fileExists(outputRelativePath);
      const prompt = buildPrompt(promptConfig, asset.key, state);

      jobs.push({
        assetKey: asset.key,
        assetName: asset.name,
        state,
        baseImage: asset.baseImage,
        outputPath: outputRelativePath,
        exists,
        prompt,
        negativePrompt: promptConfig.negativePrompt,
        sdDefaults: promptConfig.sdDefaults,
      });
    }
  }

  const summary = jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      if (job.exists) {
        acc.ready += 1;
      } else {
        acc.missing += 1;
      }
      return acc;
    },
    { total: 0, ready: 0, missing: 0 },
  );

  if (statusOnly) {
    console.log(JSON.stringify({ summary, jobs }, null, 2));
    return;
  }

  ensureDir(outputPath);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        jobs,
      },
      null,
      2,
    ),
  );

  console.log(`Prepared ${jobs.length} asset jobs.`);
  console.log(`Ready: ${summary.ready}, Missing: ${summary.missing}`);
  console.log(`Output: ${path.relative(cwd, outputPath)}`);
}

main();
