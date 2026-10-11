'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { tk } from '@/lib/format';

export interface MegaMenuColumn {
  title: string;
  items: Array<{ label: string; href: string }>;
}

export interface MegaMenuConfig {
  label: string;
  href: string;
  accent: string; // tailwind color class (e.g. 'text-wine', 'text-pink-600')
  underline: string; // underline color
  columns: MegaMenuColumn[];
  categorySlug: string; // for fetching new arrivals
}

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  discount: number;
  productImages?: Array<{ url: string; isPrimary: boolean }>;
}

interface Props {
  config: MegaMenuConfig;
  onClose: () => void;
}

export function MegaMenu({ config, onClose }: Props) {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<Product[]>(
          `/api/products?category=${config.categorySlug}&limit=4&sort=new`
        );
        setNewArrivals(res.data || []);
      } catch {
        setNewArrivals([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [config.categorySlug]);

  return (
    <div
      className="absolute left-0 right-0 top-full bg-white border-t border-line shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-40"
      onMouseLeave={onClose}
    >
      <div className="container-wrap px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Subcategory columns */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-6">
            {config.columns.map((col) => (
              <div key={col.title}>
                <h3
                  className={`text-xs uppercase tracking-[0.15em] font-bold mb-4 ${config.accent}`}
                >
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="text-sm text-ink hover:text-wine transition"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right: New Arrivals */}
          <div className="lg:col-span-1 border-l-0 lg:border-l border-line lg:pl-8">
            <h3
              className={`text-xs uppercase tracking-[0.15em] font-bold mb-4 ${config.accent}`}
            >
              New Arrivals
            </h3>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-[#F1F3F6] rounded animate-pulse"
                  />
                ))}
              </div>
            ) : newArrivals.length === 0 ? (
              <p className="text-xs text-muted">No new arrivals yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {newArrivals.map((p) => {
                  const finalPrice =
                    p.discount > 0
                      ? Math.round(Number(p.price) * (1 - p.discount / 100))
                      : Number(p.price);
                  const img =
                    p.productImages?.find((i) => i.isPrimary)?.url ||
                    p.productImages?.[0]?.url;
                  return (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={onClose}
                      className="group block"
                    >
                      <div className="aspect-square bg-sand rounded overflow-hidden mb-2">
                        {img ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-ink font-medium line-clamp-2 group-hover:text-wine transition">
                        {p.name}
                      </div>
                      <div className="text-xs text-wine font-semibold mt-0.5">
                        {tk(finalPrice)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom — View All */}
        <div className="mt-6 pt-5 border-t border-line">
          <Link
            href={config.href}
            onClick={onClose}
            className={`inline-flex items-center gap-2 text-sm font-semibold ${config.accent} hover:underline`}
          >
            View All {config.label} →
          </Link>
        </div>
      </div>
    </div>
  );
}