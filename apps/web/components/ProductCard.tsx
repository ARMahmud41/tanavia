import Link from 'next/link';
import { tk, sellPrice } from '@/lib/format';

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  discount: number;
  category: string | null;
  images: string[];
  variants?: ProductVariant[];
  soldCount?: number;
}

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const finalPrice = sellPrice(product.price, product.discount);
  const hasDiscount = product.discount > 0;

  // Total stock from variants
  const totalStock =
    product.variants?.reduce((sum, v) => sum + v.qty, 0) ?? 0;
  const outOfStock = totalStock === 0;

  // First image
  const imageUrl = product.images?.[0] || null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block bg-white rounded border border-line overflow-hidden hover:shadow-card transition"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-sand overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">
            No image
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-wine text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            -{product.discount}%
          </span>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              Stock Out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.category && (
          <div className="text-xs text-muted uppercase tracking-wide mb-1">
            {product.category}
          </div>
        )}
        <h3 className="font-medium text-ink mb-2 line-clamp-2 group-hover:text-wine transition">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-wine font-semibold text-lg">
            {tk(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-muted text-sm line-through">
              {tk(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}