// Laver dist/artifact.html ud fra dist/index.html: samme app, men uden
// <!doctype>/<html>/<head>/<body>, fordi publiceringsværten selv tilføjer dem.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const head = /<head>([\s\S]*?)<\/head>/i.exec(src)?.[1] ?? '';
const body = /<body>([\s\S]*?)<\/body>/i.exec(src)?.[1] ?? '';
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const title = /<title>[\s\S]*?<\/title>/i.exec(keep)?.[0] ?? '<title>RetailPackPro Demo</title>';
const rest = keep.replace(title, '');
const out = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${rest.trim()}\n${body.trim()}\n`;
writeFileSync(new URL('../dist/artifact.html', import.meta.url), out);
console.log(`artifact.html: ${(out.length / 1024).toFixed(0)} kB`);
