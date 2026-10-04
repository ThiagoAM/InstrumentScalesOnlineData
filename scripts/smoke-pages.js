#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./audit-swift-parser");
const { treeManifest } = require("./editorial-pipeline");
function expectedFiles(root) {
  return require("./source-inventory").publishedInventory(root);
}
async function verifyAll(baseURL, manifest, fetcher) {
  const queue = Object.entries(manifest.files);
  let next = 0,
    failed = false;
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, async () => {
      while (!failed && next < queue.length) {
        const [file, digest] = queue[next++];
        try {
          const response = await fetcher(
            `${baseURL}/${file}?snapshot=${manifest.snapshotSHA256}`,
            {
              headers: { "Cache-Control": "no-cache" },
              signal: AbortSignal.timeout(15000),
            },
          );
          if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
          if (sha(Buffer.from(await response.arrayBuffer())) !== digest)
            throw new Error(
              `${file}: served bytes differ from committed snapshot`,
            );
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    }),
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
}
async function smokePages(
  baseURL,
  {
    files,
    commit,
    fetcher = fetch,
    retries = 6,
    delayMs = 5000,
    onRetry = console.warn,
  } = {},
) {
  baseURL = baseURL.replace(/\/$/, "");
  for (let attempt = 1; attempt <= retries; attempt++)
    try {
      const response = await fetcher(
        `${baseURL}/snapshot.json?deploy-check=${Date.now()}`,
        {
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok)
        throw new Error(`snapshot.json: HTTP ${response.status}`);
      const rawManifest =
        typeof response.text === "function" ? await response.text() : null;
      const manifest =
        rawManifest === null ? await response.json() : JSON.parse(rawManifest);
      if (manifest.publicationStatus !== "approved")
        throw new Error("Served snapshot has not passed publication approval.");
      if (commit && manifest.commit !== commit)
        throw new Error("Deployment is not serving the expected commit yet.");
      if (files) {
        const expected = Object.entries(files).sort();
        const served = Object.entries(manifest.files).sort();
        if (JSON.stringify(expected) !== JSON.stringify(served))
          throw new Error(
            "Served snapshot file inventory differs from the expected commit.",
          );
      }
      await verifyAll(baseURL, manifest, fetcher);
      return {
        commit: manifest.commit,
        snapshotSHA256: manifest.snapshotSHA256,
        artifactSHA256:
          rawManifest === null
            ? null
            : sha(
                JSON.stringify(
                  Object.fromEntries(
                    Object.entries({
                      ...manifest.files,
                      "snapshot.json": sha(rawManifest),
                    }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
                  ),
                ),
              ),
        snapshotHashKinds: {
          snapshotSHA256: "content-without-manifest",
          artifactSHA256: "artifact-tree-with-manifest",
        },
        verifiedFiles: Object.keys(manifest.files).length,
      };
    } catch (error) {
      if (attempt === retries) throw error;
      onRetry(
        `CDN/deployment not ready (attempt ${attempt}): ${error.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
}
if (require.main === module) {
  const root =
    process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, "..");
  smokePages(
    process.argv[2] || "https://thiagoam.github.io/InstrumentScalesOnlineData",
    { files: expectedFiles(root), commit: process.env.GITHUB_SHA },
  )
    .then((result) =>
      console.log(
        `Verified ${result.verifiedFiles} served files for commit ${result.commit}.`,
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
module.exports = { expectedFiles, smokePages, verifyAll };
