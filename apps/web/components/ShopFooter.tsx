'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SiteSocials {
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
  x: string;
  pinterest: string;
}

interface SiteContact {
  phone: string;
  email: string;
  address: string;
}

interface FooterLink {
  id: string;
  href: string;
  label: string;
}

interface SiteContent {
  socials: SiteSocials;
  contact: SiteContact;
  footerLinks: FooterLink[];
}

const DEFAULT_SOCIALS: SiteSocials = {
  facebook: 'https://www.facebook.com/profile.php?id=61594727540694',
  instagram: 'https://instagram.com/tanavia',
  youtube: 'https://youtube.com/@tanavia',
  tiktok: 'https://tiktok.com/@tanavia',
  whatsapp: '+8801700000000',
  x: 'https://x.com/tanavia',
  pinterest: 'https://pinterest.com/tanavia',
};

const DEFAULT_CONTACT: SiteContact = {
  phone: '+880 9612-345678',
  email: 'hello@tanavia.com',
  address: 'Dhaka, Bangladesh',
};

export function ShopFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [socials, setSocials] = useState<SiteSocials>(DEFAULT_SOCIALS);
  const [contact, setContact] = useState<SiteContact>(DEFAULT_CONTACT);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([
    { id: 'fl-1', href: '/about', label: 'About TANAVIA' },
    { id: 'fl-2', href: '/terms', label: 'Terms & Conditions' },
    { id: 'fl-3', href: '/privacy', label: 'Privacy Policy' },
    { id: 'fl-4', href: '/return-refund', label: 'Cancellation & Return Policy' },
    { id: 'fl-5', href: '/faqs', label: 'FAQs' },
    { id: 'fl-6', href: '/contact', label: 'Contact Us' },
  ]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<SiteContent>('/api/site/content');
        if (res.data?.socials) {
          setSocials({ ...DEFAULT_SOCIALS, ...res.data.socials });
        }
        if (res.data?.contact) {
          setContact({ ...DEFAULT_CONTACT, ...res.data.contact });
        }
        if (res.data?.footerLinks?.length) {
          setFooterLinks(res.data.footerLinks);
        }
      } catch {
        // Keep defaults on error
      }
    }
    load();
  }, []);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  }

  const socialLinks = [
    {
      href: socials.instagram,
      label: 'Instagram',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      href: socials.tiktok,
      label: 'TikTok',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 3h-3v12.5a3 3 0 1 1-3-3v-3a6 6 0 1 0 6 6V8.5c1 .8 2.2 1.3 3.5 1.3V6.8c-1.9 0-3.5-1.6-3.5-3.5V3z" />
        </svg>
      ),
    },
    {
      href: socials.facebook,
      label: 'Facebook',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.6v8h3.3z" />
        </svg>
      ),
    },
    {
      href: socials.x,
      label: 'X',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.1 8.1L22.6 22h-6.9l-5.4-7.1L4 22H1l7.6-8.7L1.4 2h7l4.8 6.4L18.9 2zm-1.1 18h1.9L7.3 4H5.3l12.5 16z" />
        </svg>
      ),
    },
    {
      href: socials.pinterest,
      label: 'Pinterest',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.5s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-1 3.9-.3 1.1.6 2.1 1.7 2.1 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.7-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 .8 2.6.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.7 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.3 1-.9 2.3-1.4 3A10 10 0 1 0 12 2z" />
        </svg>
      ),
    },
    {
      href: socials.youtube,
      label: 'YouTube',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23 12s0-3.5-.4-5.2c-.2-.9-1-1.7-1.9-1.9C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.7.4c-.9.2-1.7 1-1.9 1.9C1 8.5 1 12 1 12s0 3.5.4 5.2c.2.9 1 1.7 1.9 1.9 1.8.4 8.7.4 8.7.4s6.9 0 8.7-.4c.9-.2 1.7-1 1.9-1.9.4-1.7.4-5.2.4-5.2zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
        </svg>
      ),
    },
  ].filter((s) => s.href);

  const whatsappHref = socials.whatsapp
    ? `https://wa.me/${socials.whatsapp.replace(/[^0-9]/g, '')}`
    : '';

  return (
    <footer className="bg-wine text-white/85 mt-16">
      <div className="container-wrap px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-10">
          <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white tracking-wide mb-1">
            TANAVIA
          </h3>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-md">
            Fashion, lifestyle, you. Premium quality with fast delivery across
            Bangladesh.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-3">
            <ul className="space-y-2.5">
              {footerLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                  Get special discounts in your inbox
                </h4>
              </div>
              <form onSubmit={handleSubscribe} className="max-w-lg">
                <div className="flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email to get offers, discounts and more."
                    className="flex-1 bg-transparent border-b border-white/40 focus:border-white text-sm text-white placeholder-white/50 outline-none py-2.5 px-0 min-w-0"
                    required
                  />
                  <button
                    type="submit"
                    className="flex-shrink-0 bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-semibold px-5 py-2.5 ml-3 rounded transition whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </div>
                {subscribed && (
                  <p className="text-xs text-emerald-300 mt-2">
                    ✅ Thanks! You&apos;re subscribed.
                  </p>
                )}
              </form>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                </svg>
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                  For any help you may call us at
                </h4>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                    className="text-white/85 hover:text-white transition font-medium"
                  >
                    {contact.phone}
                  </a>
                </li>
                <li className="text-white/70">Customer Service</li>
                <li className="text-white/70 max-w-md">
                  Track your order or get help returning an order
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F59E0B] flex-shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h4 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                Follow Us
              </h4>
            </div>

            <p className="text-sm text-white/70 leading-relaxed mb-5">
              Stay updated on our latest arrivals, exclusive promotions and
              events.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white/85 hover:text-white hover:border-white/60 hover:bg-white/5 transition"
                >
                  {s.icon}
                </a>
              ))}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white/85 hover:text-white hover:border-white/60 hover:bg-white/5 transition"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4 0-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
                  </svg>
                </a>
              )}
            </div>

            {socials.facebook && (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-white text-[#0F172A] rounded-lg px-3 py-2.5 max-w-[260px] hover:shadow-lg transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.6v8h3.3z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold truncate">
                      TANAVIA
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    Follow us
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#1877F2] flex-shrink-0">
                  Follow
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container-wrap px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/55">
          <div>© 2026 TANAVIA. All rights reserved.</div>
          <div className="flex items-center gap-1.5">
            Made in
            <span className="inline-block w-4 h-3 bg-green-600 rounded-sm relative overflow-hidden">
              <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-red-600" />
            </span>
            Bangladesh
          </div>
        </div>
      </div>
    </footer>
  );
}