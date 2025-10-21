// app/products/[sku]/page.tsx
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

type ProductRow = Record<string, unknown> & {
  出品者SKU: string;
  商品名?: string;
  ASIN?: string;
};

// 静的生成するSKU一覧
export async function generateStaticParams(): Promise<Array<{ sku: string }>> {
  const dir = path.join(process.cwd(), 'public', 'data', 'products');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ sku: decodeURIComponent(f.replace(/\.json$/, '')) }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;

  const filePath = path.join(
    process.cwd(),
    'public',
    'data',
    'products',
    `${encodeURIComponent(sku)}.json`
  );

  if (!fs.existsSync(filePath)) {
    notFound(); // 404 ページへ
  }

  const json = fs.readFileSync(filePath, 'utf8');
  const product = JSON.parse(json) as ProductRow;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">商品詳細 / {product.出品者SKU}</h1>

      <div className="rounded-xl border p-4 space-y-2">
        <p>
          <span className="font-semibold">商品名:</span>{' '}
          {String(product.商品名 ?? '—')}
        </p>
        <p>
          <span className="font-semibold">ASIN:</span>{' '}
          {String(product.ASIN ?? '—')}
        </p>
      </div>
    </div>
  );
}
