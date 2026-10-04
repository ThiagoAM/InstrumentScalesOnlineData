const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./audit-swift-parser");

// Fail closed for unsupported visual references. This is an asset boundary,
// not a replacement for the real Swift Markdown/exercise parser.
function imageReferences(markdown) {
  if (/<img\b/i.test(markdown) || /^```image\b/m.test(markdown)) {
    throw new Error(
      "Promotion supports local Markdown images with hash-bound approval; HTML/image-fence visuals require a separate reviewed contract.",
    );
  }
  const definitions = new Map(
    [...markdown.matchAll(/^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm)].map(
      (match) => [match[1].toLowerCase(), match[2].replace(/^<|>$/g, "")],
    ),
  );
  const references = [];
  for (const match of markdown.matchAll(
    /!\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g,
  )) {
    references.push(match[1].replace(/^<|>$/g, ""));
  }
  for (const match of markdown.matchAll(/!\[([^\]]+)\]\[([^\]]*)\]/g)) {
    const key = (match[2] || match[1]).toLowerCase();
    if (!definitions.has(key))
      throw new Error("Unresolved image reference: " + key);
    references.push(definitions.get(key));
  }
  const imageMarkers = (markdown.match(/!\[/g) || []).length;
  if (imageMarkers !== references.length)
    throw new Error(
      "Unsupported/ambiguous Markdown image syntax; normalize the reference before promotion.",
    );
  return [...new Set(references)];
}

function assertPathDocumentCompatible(markdown) {
  // Scan the complete source, including every localized region. The current
  // APP approval contract does not bind visual bytes; no promotion override
  // can make an image-bearing path safe for that client.
  if (/!\[|<img\b|^```image\b/im.test(markdown))
    throw new Error(
      "Image-bearing paths cannot be promoted: the current APP approval contract does not include asset hashes. Keep this content in isolated preview until a coordinated contract update.",
    );
}

function approvedAssets(markdown, lessonDirectory, contentKey, approval) {
  const assets = [];
  const root = path.resolve(lessonDirectory);
  for (const reference of imageReferences(markdown)) {
    const decoded = decodeURIComponent(reference);
    if (
      /^[a-z][a-z0-9+.-]*:/i.test(decoded) ||
      decoded.startsWith("/") ||
      decoded.includes("\\") ||
      decoded.includes("?") ||
      decoded.includes("#")
    ) {
      throw new Error(
        "Visual assets must be local relative files with explicit approved hashes: " +
          reference,
      );
    }
    const source = path.resolve(root, decoded);
    if (!source.startsWith(root + path.sep))
      throw new Error("Image escapes its lesson directory: " + reference);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile())
      throw new Error("Missing approved visual asset: " + reference);
    if (!fs.realpathSync(source).startsWith(fs.realpathSync(root) + path.sep))
      throw new Error("Visual asset symlink escapes its lesson directory.");
    const digest = sha(fs.readFileSync(source));
    const key = `${contentKey}:${reference}`;
    if (approval.assetSHA256?.[key] !== digest)
      throw new Error(
        "Visual asset missing from approval or changed after review: " +
          reference,
      );
    assets.push({
      reference,
      relativePath: decoded,
      source,
      sha256: digest,
      approvalKey: key,
    });
  }
  return assets;
}

function copyApprovedAssets(assets, destinationDirectory) {
  fs.mkdirSync(destinationDirectory, { recursive: true });
  for (const asset of assets) {
    const file = path.resolve(destinationDirectory, asset.relativePath);
    if (!file.startsWith(path.resolve(destinationDirectory) + path.sep))
      throw new Error("Unsafe asset destination");
    let ancestor = path.dirname(file);
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    const realRoot = fs.realpathSync(destinationDirectory);
    const realAncestor = fs.realpathSync(ancestor);
    if (
      realAncestor !== realRoot &&
      !realAncestor.startsWith(realRoot + path.sep)
    )
      throw new Error("Asset destination symlink escapes the approved lesson.");
    if (
      fs.existsSync(file) &&
      (fs.lstatSync(file).isSymbolicLink() ||
        sha(fs.readFileSync(file)) !== asset.sha256)
    )
      throw new Error(
        "Existing released visual differs; use a new reviewed revision/reference rather than overwriting.",
      );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(asset.source, file);
    if (sha(fs.readFileSync(file)) !== asset.sha256)
      throw new Error("Copied asset integrity mismatch");
  }
}

module.exports = {
  imageReferences,
  approvedAssets,
  copyApprovedAssets,
  assertPathDocumentCompatible,
};
