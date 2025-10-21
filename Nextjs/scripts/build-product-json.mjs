import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const csvPath = path.join(process.cwd(), 'public', 'data', 'items.csv');
const outDir  = path.join(process.cwd(), 'public', 'data', 'products');

fs.mkdirSync(outDir, { recursive: true });

const csv = fs.readFileSync(csvPath, 'utf8');
const { data } = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
});

// SKUごとに JSON 出力
let count = 0;
for (const row of data) {
  const sku = typeof row['出品者SKU'] === 'string' ? row['出品者SKU'].trim() : '';
  if (!sku) continue;
  fs.writeFileSync(
    path.join(outDir, `${encodeURIComponent(sku)}.json`),
    JSON.stringify(row, null, 2),
    'utf8'
  );
  count++;
}
console.log(`Generated ${count} product JSON(s) in ${outDir}`);
