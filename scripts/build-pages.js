#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
require("./education-format-policy").assertCurrentEducationOnly(root);
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, "v1"), path.join(dist, "v1"), { recursive: true });
fs.cpSync(path.join(root, "v2"), path.join(dist, "v2"), { recursive: true });
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
console.log("Built V2 education and retained V1 home/toggles endpoints.");
