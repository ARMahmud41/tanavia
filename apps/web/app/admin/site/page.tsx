'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Banner {
  id: string;
  url: string;
  link: string;
  alt: string;
  active: boolean;
  position: number;
}

interface FooterLink {
  id: string;
  href: string;
  label: string;
}

interface AboutPage {
  title: string;
  subtitle: string;
  content: string;
}

interface SiteContent {
  banners: Banner[];
  socials: {
    facebook: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    whatsapp: string;
    x: string;
    pinterest: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  announcements: string[];
  footerLinks: FooterLink[];
  specialOffers: Array<{ id: string; label: string; slug: string }>;
  pages: {
    about: AboutPage;
  };
}

type Tab = 'banners' | 'socials' | 'contact' | 'announcements' | 'footerLinks' | 'specialOffers' | 'pages';

const DEFAULT_ABOUT: AboutPage = {
  title: 'About TANAVIA',
  subtitle: 'Our Story',
  content: '',
};

export default function AdminSitePage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('banners');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<SiteContent>('/api/site/content', { token });
      const data = res.data;
      // Normalize — ensure every expected key exists so tabs don't crash
      setContent(
        data
          ? {
              banners: data.banners ?? [],
              socials: data.socials,
              contact: data.contact,
              announcements: data.announcements ?? [],
              footerLinks: data.footerLinks ?? [],
              specialOffers: data.specialOffers ?? [],
              pages: {
                about: {
                  ...DEFAULT_ABOUT,
                  ...(data.pages?.about ?? {}),
                },
              },
            }
          : null
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const token = getToken() || undefined;
      await api.patch('/api/site/content', content, { token });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // Banner actions
  // ============================================
  function addBanner() {
    if (!content) return;
    const newBanner: Banner = {
      id: `banner-${Date.now()}`,
      url: '',
      link: '/products',
      alt: '',
      active: true,
      position: content.banners.length,
    };
    setContent({ ...content, banners: [...content.banners, newBanner] });
  }

  function updateBanner(id: string, patch: Partial<Banner>) {
    if (!content) return;
    setContent({
      ...content,
      banners: content.banners.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    });
  }

  function removeBanner(id: string) {
    if (!content) return;
    if (!confirm('Delete this banner?')) return;
    setContent({
      ...content,
      banners: content.banners.filter((b) => b.id !== id),
    });
  }

  // ============================================
  // Announcement actions
  // ============================================
  function addAnnouncement() {
    if (!content) return;
    setContent({
      ...content,
      announcements: [...content.announcements, ''],
    });
  }

  function updateAnnouncement(index: number, value: string) {
    if (!content) return;
    const next = [...content.announcements];
    next[index] = value;
    setContent({ ...content, announcements: next });
  }

  function removeAnnouncement(index: number) {
    if (!content) return;
    setContent({
      ...content,
      announcements: content.announcements.filter((_, i) => i !== index),
    });
  }

  if (loading || !content) {
    return (
      <div className="p-6 text-center text-sm text-[#8A8F98]">Loading...</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">🎨</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Site Content
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Banners, socials, contact, announcements
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Saving...' : '💾 Save all'}
        </button>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          ✅ Saved successfully
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {(
            [
              { key: 'banners', label: '🖼️ Hero Banners' },
              { key: 'socials', label: '📱 Social Links' },
              { key: 'contact', label: '📞 Contact Info' },
              { key: 'announcements', label: '📢 Announcements' },
              { key: 'footerLinks', label: '🔗 Footer Links' },
              { key: 'specialOffers', label: '⭐ Special Offers' },
              { key: 'pages', label: '📄 Pages' },
            ] as Array<{ key: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                tab === t.key
                  ? 'bg-[#0F2A5C] text-white font-semibold'
                  : 'text-[#5A6270] hover:bg-[#F1F3F6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* BANNERS TAB */}
      {/* ============================================ */}
      {tab === 'banners' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            ⓘ Multiple banners will rotate/stack on the homepage hero. Top-most
            active banner shows first.
          </div>

          {content.banners.length === 0 && (
            <div className="rounded-lg bg-white border border-[#E8EBF0] p-10 text-center">
              <div className="text-3xl mb-2">🖼️</div>
              <p className="text-sm font-medium text-[#0F2A5C]">
                No banners yet
              </p>
              <p className="text-xs text-[#8A8F98] mt-1">
                Add your first hero banner below
              </p>
            </div>
          )}

          {content.banners.map((banner, idx) => (
            <div
              key={banner.id}
              className="rounded-lg bg-white border border-[#E8EBF0] p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#8A8F98] uppercase">
                    Banner #{idx + 1}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={banner.active}
                      onChange={(e) =>
                        updateBanner(banner.id, { active: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span
                      className={
                        banner.active
                          ? 'text-emerald-700 font-semibold'
                          : 'text-[#8A8F98]'
                      }
                    >
                      {banner.active ? 'Active' : 'Hidden'}
                    </span>
                  </label>
                </div>
                <button
                  onClick={() => removeBanner(banner.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                    Image URL / Path
                  </label>
                  <input
                    type="text"
                    value={banner.url}
                    onChange={(e) =>
                      updateBanner(banner.id, { url: e.target.value })
                    }
                    placeholder="/banners/hero.jpg or https://..."
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                    Click link
                  </label>
                  <input
                    type="text"
                    value={banner.link}
                    onChange={(e) =>
                      updateBanner(banner.id, { link: e.target.value })
                    }
                    placeholder="/products"
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                    Alt text
                  </label>
                  <input
                    type="text"
                    value={banner.alt}
                    onChange={(e) =>
                      updateBanner(banner.id, { alt: e.target.value })
                    }
                    placeholder="Description for SEO"
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
                  />
                </div>
              </div>

              {/* Preview */}
              {banner.url && (
                <div className="mt-3 border border-[#E8EBF0] rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.url}
                    alt={banner.alt}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addBanner}
            className="w-full py-3 rounded-lg border-2 border-dashed border-[#E8EBF0] text-sm font-semibold text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
          >
            + Add banner
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* SOCIALS TAB */}
      {/* ============================================ */}
      {tab === 'socials' && (
        <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
            Social Media Links
          </h2>
          <div className="space-y-3">
            {(
              [
                { key: 'facebook', label: '📘 Facebook', ph: 'https://facebook.com/...' },
                { key: 'instagram', label: '📷 Instagram', ph: 'https://instagram.com/...' },
                { key: 'youtube', label: '▶️ YouTube', ph: 'https://youtube.com/@...' },
                { key: 'tiktok', label: '🎵 TikTok', ph: 'https://tiktok.com/@...' },
                { key: 'x', label: '🐦 X (Twitter)', ph: 'https://x.com/...' },
                { key: 'pinterest', label: '📌 Pinterest', ph: 'https://pinterest.com/...' },
                { key: 'whatsapp', label: '💬 WhatsApp', ph: '+8801XXXXXXXXX' },
              ] as Array<{ key: keyof SiteContent['socials']; label: string; ph: string }>
            ).map((s) => (
              <div key={s.key}>
                <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                  {s.label}
                </label>
                <input
                  type="text"
                  value={content.socials[s.key]}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      socials: { ...content.socials, [s.key]: e.target.value },
                    })
                  }
                  placeholder={s.ph}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] font-mono min-h-[44px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CONTACT TAB */}
      {/* ============================================ */}
      {tab === 'contact' && (
        <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
            Contact Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                📞 Phone
              </label>
              <input
                type="text"
                value={content.contact.phone}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, phone: e.target.value },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                ✉️ Email
              </label>
              <input
                type="email"
                value={content.contact.email}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, email: e.target.value },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                📍 Address
              </label>
              <input
                type="text"
                value={content.contact.address}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, address: e.target.value },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ANNOUNCEMENTS TAB */}
      {/* ============================================ */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            ⓘ These messages rotate in the top bar (marquee). Each one shows
            for 30 seconds.
          </div>

          <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Announcement Messages
            </h2>
            <div className="space-y-3">
              {content.announcements.map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => updateAnnouncement(i, e.target.value)}
                    placeholder="🚚 Free delivery over ৳5,000"
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
                  />
                  <button
                    onClick={() => removeAnnouncement(i)}
                    className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addAnnouncement}
              className="w-full mt-4 py-3 rounded-lg border-2 border-dashed border-[#E8EBF0] text-sm font-semibold text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
            >
              + Add announcement
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* FOOTER LINKS TAB */}
      {/* ============================================ */}
      {tab === 'footerLinks' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            ⓘ These links appear in the footer&apos;s left column. Drag order
            not supported — delete and re-add to reorder.
          </div>

          <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Footer Links
            </h2>
            <div className="space-y-3">
              {content.footerLinks.map((link, idx) => (
                <div
                  key={link.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-3 border-b border-[#F1F3F6] last:border-0"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-[#8A8F98] uppercase mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...content.footerLinks];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setContent({ ...content, footerLinks: next });
                      }}
                      placeholder="About TANAVIA"
                      className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] min-h-[40px]"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-semibold text-[#8A8F98] uppercase mb-1">
                      Link (URL)
                    </label>
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => {
                        const next = [...content.footerLinks];
                        next[idx] = { ...next[idx], href: e.target.value };
                        setContent({ ...content, footerLinks: next });
                      }}
                      placeholder="/about"
                      className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      onClick={() => {
                        setContent({
                          ...content,
                          footerLinks: content.footerLinks.filter(
                            (l) => l.id !== link.id
                          ),
                        });
                      }}
                      className="w-full py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm min-h-[40px]"
                      title="Delete link"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setContent({
                  ...content,
                  footerLinks: [
                    ...content.footerLinks,
                    {
                      id: `fl-${Date.now()}`,
                      href: '',
                      label: '',
                    },
                  ],
                });
              }}
              className="w-full mt-4 py-3 rounded-lg border-2 border-dashed border-[#E8EBF0] text-sm font-semibold text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
            >
              + Add footer link
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SPECIAL OFFERS TAB */}
      {/* ============================================ */}
      {tab === 'specialOffers' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            ⓘ These offers appear in the products page sidebar. Each one links
            to a filtered view (e.g. <code>/products?offer=mega-deal</code>).
          </div>

          <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Special Offers
            </h2>

            <div className="space-y-3">
              {content.specialOffers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-3 border-b border-[#F1F3F6] last:border-0"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-[#8A8F98] uppercase mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={offer.label}
                      onChange={(e) => {
                        const next = [...content.specialOffers];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setContent({ ...content, specialOffers: next });
                      }}
                      placeholder="Mega Deal"
                      className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] min-h-[40px]"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-semibold text-[#8A8F98] uppercase mb-1">
                      Slug (URL key)
                    </label>
                    <input
                      type="text"
                      value={offer.slug}
                      onChange={(e) => {
                        const next = [...content.specialOffers];
                        next[idx] = { ...next[idx], slug: e.target.value };
                        setContent({ ...content, specialOffers: next });
                      }}
                      placeholder="mega-deal"
                      className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      onClick={() => {
                        setContent({
                          ...content,
                          specialOffers: content.specialOffers.filter(
                            (o) => o.id !== offer.id
                          ),
                        });
                      }}
                      className="w-full py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm min-h-[40px]"
                      title="Delete offer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setContent({
                  ...content,
                  specialOffers: [
                    ...content.specialOffers,
                    { id: `so-${Date.now()}`, label: '', slug: '' },
                  ],
                });
              }}
              className="w-full mt-4 py-3 rounded-lg border-2 border-dashed border-[#E8EBF0] text-sm font-semibold text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
            >
              + Add special offer
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PAGES TAB */}
      {/* ============================================ */}
      {tab === 'pages' && (
        <div className="space-y-5">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            ⓘ Content for static pages (About, etc.). Write plain text —
            separate paragraphs with a blank line.
          </div>

          <div className="rounded-lg bg-white border border-[#E8EBF0] p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              📄 About Page
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={content.pages.about.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        pages: {
                          ...content.pages,
                          about: {
                            ...content.pages.about,
                            title: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="About TANAVIA"
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                    Subtitle (above title)
                  </label>
                  <input
                    type="text"
                    value={content.pages.about.subtitle}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        pages: {
                          ...content.pages,
                          about: {
                            ...content.pages.about,
                            subtitle: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Our Story"
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                  Content (blank line between paragraphs)
                </label>
                <textarea
                  value={content.pages.about.content}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      pages: {
                        ...content.pages,
                        about: {
                          ...content.pages.about,
                          content: e.target.value,
                        },
                      },
                    })
                  }
                  rows={18}
                  placeholder="Write your About page content here..."
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] resize-y font-mono leading-relaxed"
                />
                <p className="text-[10px] text-[#8A8F98] mt-2">
                  💡 Tip: Use blank line between paragraphs. Lines starting
                  with • or ✓ or → will render nicely as lists.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}