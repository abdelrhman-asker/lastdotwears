import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTextModule } from 'node:vm';

const output = fileURLToPath(new URL('../dist/', import.meta.url));
const files = readdirSync(output, { recursive: true, withFileTypes: true }).filter(
  (entry) => entry.isFile() && entry.name.endsWith('.js'),
);

for (const entry of files) {
  const filename = join(entry.parentPath, entry.name);
  const source = readFileSync(filename, 'utf8');
  // TypeScript's scoped createRequire helper is valid. Bare requires in ESM are not.
  if (/(?<![\w$.])require\s*\(/u.test(source)) {
    throw new Error(`Unscoped require() in compiled API ES module: ${filename}`);
  }
  // Parse using Node's ESM grammar without executing imports or connecting to services.
  new SourceTextModule(source, { identifier: filename });
}

console.log(`Checked ${files.length} compiled API ES modules.`);
