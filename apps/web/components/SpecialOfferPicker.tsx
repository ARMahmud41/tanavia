'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface SpecialOffer {
  id: string;
  label: string;
  slug: string;
}

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  token?: string;
}

export function SpecialOfferPicker({ value, onChange, token }: Props) {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ specialOffers: SpecialOffer[] }>(
          '/api/site/content',
          { token }
        );
        setOffers(res.data?.specialOffers || []);
      } catch {
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  function toggle(slug: string) {
    if (value.includes(slug)) {
      onChange(value.filter((t) => t !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-[#8A8F98] py-2">Loading offers...</div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-xs text-[#8A8F98] py-2">
        No special offers configured. Add them in{' '}
        <a href="/admin/site" className="text-wine underline font-semibold">
          Site Content
        </a>
        .
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {offers.map((offer) => {
        const selected = value.includes(offer.slug);
        return (
          <button
            key={offer.id}
            type="button"
            onClick={() => toggle(offer.slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border flex items-center gap-1.5 ${
              selected
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-[#5A6270] border-[#E3E6EB] hover:border-amber-500'
            }`}
          >
            <span className="text-[10px]">⚡</span>
            {offer.label}
            {selected && <span>✓</span>}
          </button>
        );
      })}
    </div>
  );
}