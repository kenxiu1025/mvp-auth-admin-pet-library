const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const jobsPath = path.join(cwd, "data", "pet-asset-jobs.json");
const outDir = path.join(cwd, "data", "sd-export");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(input) {
  return input.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatMarkdownJob(job) {
  return [
    `## ${job.assetKey} / ${job.state}`,
    "",
    `- asset: \`${job.assetKey}\``,
    `- state: \`${job.state}\``,
    `- base image: \`${job.baseImage}\``,
    `- output: \`${job.outputPath}\``,
    `- mode: \`${job.sdDefaults.mode}\``,
    `- denoise: \`${job.sdDefaults.denoiseStrength}\``,
    `- cfg: \`${job.sdDefaults.cfgScale}\``,
    `- steps: \`${job.sdDefaults.steps}\``,
    `- sampler: \`${job.sdDefaults.sampler}\``,
    `- size: \`${job.sdDefaults.width}x${job.sdDefaults.height}\``,
    "",
    "### Prompt",
    "",
    "```text",
    job.prompt,
    "```",
    "",
    "### Negative Prompt",
    "",
    "```text",
    job.negativePrompt,
    "```",
    "",
  ].join("\n");
}

function main() {
  const payload = readJson(jobsPath);
  const jobs = payload.jobs ?? [];

  ensureDir(outDir);

  const grouped = new Map();

  for (const job of jobs) {
    if (!grouped.has(job.assetKey)) {
      grouped.set(job.assetKey, []);
    }
    grouped.get(job.assetKey).push(job);
  }

  for (const [assetKey, assetJobs] of grouped.entries()) {
    const assetDir = path.join(outDir, assetKey);
    ensureDir(assetDir);

    const markdownSections = [
      `# SD Prompt Pack: ${assetKey}`,
      "",
      `Generated at: ${payload.generatedAt ?? new Date().toISOString()}`,
      "",
      `Total jobs: ${assetJobs.length}`,
      "",
    ];

    for (const job of assetJobs) {
      const jobSlug = `${slugify(job.assetKey)}-${slugify(job.state)}`;
      const jobJsonPath = path.join(assetDir, `${jobSlug}.json`);
      fs.writeFileSync(jobJsonPath, JSON.stringify(job, null, 2));
      markdownSections.push(formatMarkdownJob(job));
    }

    const markdownPath = path.join(assetDir, `${assetKey}-prompt-pack.md`);
    fs.writeFileSync(markdownPath, markdownSections.join("\n"));
  }

  const summaryPath = path.join(outDir, "summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: path.relative(cwd, jobsPath),
        totalJobs: jobs.length,
        assets: Array.from(grouped.keys()),
      },
      null,
      2,
    ),
  );

  console.log(`Exported SD prompt packs for ${grouped.size} assets.`);
  console.log(`Output directory: ${path.relative(cwd, outDir)}`);
}

main();
