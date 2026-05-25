/**
 * Writes apps/web/public/data/paytm-runner-options.json from vendored TP_PAYTM*.py files.
 * Run from repo root: node scripts/generate-paytm-runner-manifest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const EXEC = path.join(REPO, 'integrations/b_auto_bot/tp_127_executabes');
const OUT = path.join(REPO, 'apps/web/public/data/paytm-runner-options.json');

function main() {
  if (!fs.existsSync(EXEC)) {
    console.error('Missing', EXEC);
    process.exit(1);
  }
  const files = fs
    .readdirSync(EXEC)
    .filter((f) => f.startsWith('TP_PAYTM') && f.endsWith('.py'))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const options = files.map((fname) => {
    const rel = `tp_127_executabes/${fname}`;
    const u = fname.toUpperCase();
    const coreGuess =
      u.includes('_NAME_') || /^TP_PAYTM_NAME_/i.test(fname)
        ? 'main'
        : fname.startsWith('TP_PAYTM_TXN_') || u.includes('_TXN_')
          ? 'trj'
          : 'unknown';
    const kind = fname.includes('_NAME_')
      ? 'name'
      : fname.startsWith('TP_PAYTM_TXN_') || fname.includes('_TXN_')
        ? 'txn'
        : 'other';
    const short = fname.replace(/\.py$/, '');
    const label =
      kind === 'name'
        ? `Customer list — ${short}`
        : kind === 'txn'
          ? `Transactions — ${short}`
          : short;
    return { path: rel, file: fname, kind, coreGuess, label };
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ generated: true, options }, null, 2)}\n`);
  console.log('Wrote', OUT, `(${options.length} scripts)`);
}

main();
