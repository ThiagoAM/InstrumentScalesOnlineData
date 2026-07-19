#!/usr/bin/env node

const baseURL = (process.argv[2] || "https://thiagoam.github.io/InstrumentScalesOnlineData")
  .replace(/\/$/, "");

const probes = [
  { path: "v1/education/free/courses.json", type: "application/json", json: true },
  { path: "v1/education/max/courses.json", type: "application/json", json: true },
  { path: "v1/home/home.json", type: "application/json", json: true },
  { path: "v1/toggles/feature-toggles.json", type: "application/json", json: true },
  { path: "v1/education/free/images/guitar-free.jpg", type: "image/jpeg" },
  {
    path: "v2/education/courses/instrument-scales/catalog.json",
    type: "application/json",
    json: true,
  },
];

const retryCount = 6;
const retryDelayMilliseconds = 5_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function probe(specification, attempt) {
  const separator = specification.path.includes("?") ? "&" : "?";
  const url = `${baseURL}/${specification.path}${separator}deploy-check=${Date.now()}`;
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
  });
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(`${specification.path} returned HTTP ${response.status}`);
  }
  if (!contentType.includes(specification.type)) {
    throw new Error(
      `${specification.path} returned ${contentType || "no content type"}, expected ${specification.type}`,
    );
  }
  if (specification.json) {
    await response.json();
  } else {
    await response.arrayBuffer();
  }

  console.log(`OK ${specification.path} (attempt ${attempt})`);
}

async function main() {
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      for (const specification of probes) {
        await probe(specification, attempt);
      }
      return;
    } catch (error) {
      if (attempt === retryCount) {
        throw error;
      }
      console.warn(`Deployment not ready: ${error.message}`);
      await delay(retryDelayMilliseconds);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
