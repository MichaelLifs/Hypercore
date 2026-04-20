#!/usr/bin/env node
/**
 * Post-build step: copy GraphQL schema files from src/ to dist/ so the
 * compiled server can read them at runtime via
 * `fs.readFileSync(path.join(__dirname, 'graphql', '*.graphql'))`.
 *
 * tsc only compiles .ts files; non-TS assets must be copied explicitly.
 * Without this step, `node dist/index.js` crashes on startup with an
 * ENOENT for schema.graphql.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'graphql');
const destDir = path.resolve(__dirname, '..', 'dist', 'graphql');

fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.graphql')) continue;
  fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
  copied += 1;
}

console.log(`[copy-schemas] copied ${copied} .graphql file(s) from src/graphql → dist/graphql`);
