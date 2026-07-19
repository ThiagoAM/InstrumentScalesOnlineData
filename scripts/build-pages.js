#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, "legacy", "v1", "data"), path.join(dist, "v1"), { recursive: true });
fs.cpSync(path.join(root, "v2"), path.join(dist, "v2"), { recursive: true });
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
console.log("Built dist/v1 from legacy/v1/data and dist/v2 from v2.");
