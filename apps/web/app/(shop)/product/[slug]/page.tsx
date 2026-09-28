import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { tk, sellPrice } from '@/lib/format';
import { AddToCartButton } from '@/components/AddToCartButton';

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface Product {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  category: string | null;
  brand?: string | null;
  sku: string;
  price: number | string;
  discount: number;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  tryable: boolean;
  shape: string;
  variants: Variant[];
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await api.get<Product>(`/api/products/slug/${slug}`);
    return res.data || null;
  } catch {
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const finalPrice = sellPrice(product.price, product.discount);
  const hasDiscount = product.discount > 0;
  const totalStock = product.variants.reduce((s, v) => s + v.qty, 0);
  const inStock = totalStock > 0;

  const discountAmount = Number(product.price) - finalPrice;

  return (
    <div className="container-wrap py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-6">
        <Link href="/" className="hover:text-wine">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-wine">
          Products
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/products?category=${product.category.toLowerCase()}`}
              className="hover:text-wine"
            >
              {product.category}
            </Link>
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* LEFT — Image (fixed, square-ish) */}
        <div>
          <div className="relative aspect-square max-w-md mx-auto md:mx-0 rounded-xl overflow-hidden bg-sand border border-line">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                No image
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-wine text-white text-sm font-semibold px-3 py-1 rounded-full">
                -{product.discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails (if multiple images) */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-4 max-w-md mx-auto md:mx-0">
              {product.images.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg overflow-hidden bg-sand border-2 ${
                    i === 0 ? 'border-wine' : 'border-line'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Info */}
        <div className="max-w-xl">
          {/* Brand + category */}
          <div className="flex items-center gap-3 text-xs text-muted uppercase tracking-wider mb-2">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.category && <span>•</span>}
            {product.category && <span>{product.category}</span>}
          </div>

          {/* Name */}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-3">
            {product.name}
          </h1>
          {product.nameBn && (
            <p className="text-muted mb-3">{product.nameBn}</p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-4 text-sm text-muted mb-5">
            <span>⭐ {product.rating.toFixed(1)} ({product.reviewCount})</span>
            <span>•</span>
            <span>{product.soldCount} sold</span>
          </div>

          {/* Price block */}
          <div className="bg-sand/60 rounded-lg p-4 mb-6">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-wine font-semibold text-3xl">
                {tk(finalPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-muted text-lg line-through">
                    {tk(product.price)}
                  </span>
                  <span className="bg-wine text-white text-xs font-semibold px-2 py-1 rounded">
                    -{product.discount}%
                  </span>
                </>
              )}
            </div>
            {hasDiscount && (
              <p className="text-sm text-leaf mt-1">
                You save {tk(discountAmount)}
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted mb-6 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Variant selector + Add to Cart + Buy Now */}
          <AddToCartButton product={product} />

          {/* SKU */}
          <div className="text-xs text-muted border-t border-line pt-4 mt-2">
            SKU: {product.sku}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-line">
            <div className="text-center">
              <div className="text-2xl mb-1">🚚</div>
              <div className="text-xs text-muted leading-tight">
                Fast delivery
                <br />
                all over BD
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-xs text-muted leading-tight">
                Secure
                <br />
                payment
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">↩️</div>
              <div className="text-xs text-muted leading-tight">
                7 day easy
                <br />
                return
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}