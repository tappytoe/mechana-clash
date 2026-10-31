// Copies the static site into dist/ and exports the card art alongside it.
import { rm, mkdir, cp, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const out = 'dist';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ['index.html', 'css', 'js', 'assets']) await cp(f, `${out}/${f}`, { recursive: true });
await writeFile(`${out}/.nojekyll`, '');
execFileSync(process.execPath, ['tools/export-art.mjs', `${out}/assets/cards`], { stdio: 'inherit' });
console.log('✅ Site built in dist/');