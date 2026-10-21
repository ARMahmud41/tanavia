import type { PrismaClient } from '@prisma/client';

export interface SpecialOffer {
  id: string;
  label: string;
  slug: string;
}

export interface FooterLink {
  id: string;
  href: string;
  label: string;
}

export interface AboutPage {
  title: string;
  subtitle: string;
  content: string;
}

export interface TermsPage {
  title: string;
  subtitle: string;
  content: string;
}

export interface SiteContent {
  banners: Array<{
    id: string;
    url: string;
    link: string;
    alt: string;
    active: boolean;
    position: number;
  }>;
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
  specialOffers: SpecialOffer[];
  pages: {
    about: AboutPage;
    terms: TermsPage;
  };
}

const DEFAULT_CONTENT: SiteContent = {
  banners: [
    {
      id: 'banner-1',
      url: '/banners/hero-banner.jpg',
      link: '/products',
      alt: 'TANAVIA — Style in Every Step',
      active: true,
      position: 0,
    },
  ],
  socials: {
    facebook: 'https://www.facebook.com/profile.php?id=61594727540694',
    instagram: 'https://instagram.com/tanavia',
    youtube: 'https://youtube.com/@tanavia',
    tiktok: 'https://tiktok.com/@tanavia',
    whatsapp: '+8801880659448',
    x: 'https://x.com/tanavia',
    pinterest: 'https://pinterest.com/tanavia',
  },
  contact: {
    phone: '+8801880659448',
    email: 'tanaviabd1.com',
    address: 'chattogram, Bangladesh',
  },
  announcements: [
    '🚚 Free delivery over ৳5,000',
    '💵 Cash on Delivery Available',
    '↩️ 7-day easy return',
  ],
  specialOffers: [
    { id: 'so-1', label: 'Mega Deal', slug: 'mega-deal' },
    { id: 'so-2', label: 'New Arrival', slug: 'new-arrival' },
    { id: 'so-3', label: 'Top Selling', slug: 'top-selling' },
    { id: 'so-4', label: 'Free Delivery', slug: 'free-delivery' },
    { id: 'so-5', label: 'Merchandise', slug: 'merchandise' },
    { id: 'so-6', label: 'Womens-Collection-Puja-Sale', slug: 'puja-sale' },
  ],
  footerLinks: [
    { id: 'fl-1', href: '/about', label: 'About TANAVIA' },
    { id: 'fl-2', href: '/terms', label: 'Terms & Conditions' },
    { id: 'fl-3', href: '/privacy', label: 'Privacy Policy' },
    { id: 'fl-4', href: '/return-refund', label: 'Cancellation & Return Policy' },
    { id: 'fl-5', href: '/faqs', label: 'FAQs' },
    { id: 'fl-6', href: '/contact', label: 'Contact Us' },
  ],
  pages: {
    about: {
      title: 'About TANAVIA',
      subtitle: 'Our Story',
      content: `TANAVIA is a Bangladeshi fashion brand built on one simple idea — fashion, lifestyle, you. We believe everyone deserves premium quality without the premium price tag.

From handcrafted bags and elegant shoes to everyday apparel, our collection is curated for people who want to look good and feel confident every single day.

What We Offer:
• Shoes — sneakers, formals, sandals and more
• Bags — handbags, backpacks, totes and travel bags
• Apparel — shirts, tees, kurtis and dresses for men, women and kids
• Accessories — watches, wallets, belts and sunglasses

Why Shop With Us:
✓ 100% authentic products — no replicas, no compromises
✓ 7-day easy return policy — no questions asked
✓ Multiple payment options — bKash, Nagad, Rocket, Card and COD
✓ Friendly customer support on WhatsApp, every day

Our Mission:
To make premium fashion accessible to every household in Bangladesh — delivered fast, priced fair, and backed by service that actually cares.`,
    },
    terms: {
      title: 'Terms & Conditions',
      subtitle: 'Legal',
      content: `Welcome to TANAVIA. Please read these Terms & Conditions carefully before using our website or placing an order. By accessing or using any part of our service, you confirm that you have read, understood, and agreed to be bound by these terms. If you do not agree, please do not use our website or services.

1. Introduction
TANAVIA is a Bangladeshi fashion brand offering shoes, bags, apparel, and accessories through our online store. These Terms govern your use of our website, products, and all related services. We may update these Terms at any time without prior notice. Changes take effect immediately when posted, and your continued use of the site means you accept the updated Terms. Please review this page regularly.

2. User Account, Password & Security
When you register, you receive a unique username and password. You are fully responsible for keeping these credentials safe and for all activity under your account. If you suspect unauthorized access or a security breach, notify TANAVIA immediately. Always log out after each session, especially on shared devices. TANAVIA is not liable for losses caused by your failure to protect your account.

3. Services
TANAVIA provides a range of online services — browsing, purchasing, order tracking, and customer support. Products may be purchased through Cash on Delivery, bKash, Nagad, Rocket, or Card. Once you place an order, we arrange shipment, and you are responsible for paying the agreed price. These services are collectively referred to as "Services" and the items offered as "Products".

4. Privacy
By using our services, you acknowledge that you have read and accepted our Privacy Policy. Your personal information (name, phone, address, email) is collected only for order processing, delivery, and support. We never sell or share your data with third parties, except courier partners and payment processors who help complete your order.

5. User Conduct and Rules
You agree to use TANAVIA responsibly. While using our services, you will not:
• Defame, abuse, harass, stalk, threaten, or violate the legal rights of others
• Upload or share inappropriate, obscene, defamatory, or unlawful content
• Upload files containing viruses, malware, or damaging software
• Conduct or forward spam, chain letters, pyramid schemes, or fraud
• Falsify authorship, notices, or ownership information
• Violate any local, national, or international law
• Abuse, manipulate, or unethically exploit these Terms or our services

6. Discount Policy
Only one discount type can be applied per order — free delivery, coupon discount, or payment gateway discount.
• If your cart contains a free-delivery product, coupon discounts apply only to the remaining items.
• If you pay with a payment gateway that offers its own discount, coupon discounts will not apply.

7. Product Description
TANAVIA strives to display every product as accurately as possible — colors, sizes, materials, and details. However, slight variations may occur due to screen settings and photography. We do not warrant that product descriptions or site content are always accurate, complete, or error-free. If an item you receive is significantly different from its description, you may return it unused as per our Return Policy.

8. Abusing TANAVIA
Users are solely responsible for the content they upload to our website — reviews, comments, images, or any other material. You may be held legally liable if your content is defamatory, infringing, or violates third-party rights. Please report offensive content, abuse, or policy violations to our team. We investigate every report and act on verified issues.

9. Order Acceptance and Pricing
We reserve the right to refuse or cancel any order at any time — for reasons including stock unavailability, pricing errors, or suspected fraud. We may request additional verification (phone, address, or ID) before confirming an order. Prices are subject to change without notice; the price shown at the time of order placement applies. All posted prices include applicable taxes.

10. Trademarks and Copyrights
All content on this website — logos, product images, text, layout, source code, and design — belongs to TANAVIA and is protected by copyright and trademark law. You may not copy, reproduce, distribute, or use any content without written permission. Any content you upload (reviews, photos, comments) remains yours, but by posting it publicly, you grant TANAVIA a non-exclusive, royalty-free license to display and share it.

11. Return & Replacement Policy
We want you to love your purchase. If something goes wrong, you may return an item within 7 days of delivery, provided:
• The item is unused and in original condition with tags and packaging intact
• Free promotional items (if any) are returned together
• The item was damaged, defective, wrong, or not as described

Reasons accepted for return:
• Damaged, defective, or wrong product shipped
• Size mismatch for clothing
• Color mismatch from what was ordered

How to return:
• Contact our Customer Care team via WhatsApp or email within 7 days of receiving your order.
• Once we receive and inspect the item, we will replace it or issue a refund as applicable.
• Replacement is subject to stock availability. If out of stock, a full refund will be issued.

Note: Delivery and COD convenience charges are non-refundable.

12. Refund Policy
Refunds are processed after we complete inspection of the returned item.
• If you chose Cash on Delivery (COD), there is no refund as no advance payment was made.
• For bKash, Nagad, Rocket, Card, or Bank Transfer payments, refunds are issued to the original payment method.
• Refunds are typically completed within 7-10 business days. If you do not receive your refund within this time, contact us and we will investigate.
• Delivery and COD charges are non-refundable.

13. Order Cancellation
After you place an order, we will send a confirmation (via WhatsApp, SMS, or call). You may cancel your order before shipment by contacting us directly. Once shipped, cancellation is no longer possible — you may use our Return Policy instead.
• For COD orders, no refund applies (nothing was paid).
• For prepaid orders, the full amount is refunded to your original payment method after cancellation.

14. Unauthorized Charges on Card
If you notice charges on your card for a TANAVIA order you did not place, first check with family members or colleagues who may have used your card. If you still do not recognize the charge, report it within 60 days so we can begin an investigation. TANAVIA takes every report seriously and will assist with your bank or payment provider.

15. Fraudulent Order Cancellation
To provide a safe shopping experience, we continuously monitor transactions for suspicious activity. We reserve the right to cancel any past, pending, or future order if fraud is suspected — without any liability. A customer may be considered fraudulent if:
• They do not respond to payment verification requests
• They provide false, insufficient, or forged information
• They misuse another person's phone, email, or card
• They refuse to pay for a delivered order
• They return a different product than what was shipped
If an order is cancelled after a card has been charged, the amount is refunded to the original payment method. Promotional vouchers used on cancelled orders may not be refundable.

16. Payment & Shipping
We accept Cash on Delivery (COD), bKash, Nagad, Rocket, and Card payments.
• We arrange shipment to your provided address.
• Delivery timelines are estimates — actual times may vary due to weather, courier delays, or other factors beyond our control.
• Risk of loss or damage passes to you once the item is delivered. Report any transit damage within 24 hours with photo evidence.
• Title and ownership of goods pass to you upon delivery.

17. Fraud Protection Policy
TANAVIA takes fraud protection seriously. We and our payment partners continuously monitor transactions for suspicious activity. In rare cases, we may place a transaction on hold and request identification to verify the purchase. This protects both you and TANAVIA. We apologize for any inconvenience and appreciate your patience in helping us keep our platform secure.

18. Term and Policy Updates
We reserve the right to change or update these Terms and policies at any time by posting a notice on our site. Such changes are effective immediately upon posting. It is your responsibility to review these Terms periodically. Your continued use of the website after changes are posted constitutes acceptance of the updated Terms.

Last updated: October 2026
Questions? Contact us at hello@tanavia.com or WhatsApp +880 1880-659448.`,
    },
  },
};

export class SiteService {
  static async get(prisma: PrismaClient): Promise<SiteContent> {
    const row = await prisma.setting.findUnique({ where: { key: 'site' } });
    if (!row) return DEFAULT_CONTENT;

    const saved = (row.value as Partial<SiteContent>) || {};
    return {
      banners: saved.banners?.length ? saved.banners : DEFAULT_CONTENT.banners,
      socials: { ...DEFAULT_CONTENT.socials, ...(saved.socials || {}) },
      contact: { ...DEFAULT_CONTENT.contact, ...(saved.contact || {}) },
      announcements:
        saved.announcements && saved.announcements.length > 0
          ? saved.announcements
          : DEFAULT_CONTENT.announcements,
      footerLinks:
        saved.footerLinks && saved.footerLinks.length > 0
          ? saved.footerLinks
          : DEFAULT_CONTENT.footerLinks,
      specialOffers:
        saved.specialOffers && saved.specialOffers.length > 0
          ? saved.specialOffers
          : DEFAULT_CONTENT.specialOffers,
      pages: {
        about: {
          ...DEFAULT_CONTENT.pages.about,
          ...(saved.pages?.about || {}),
        },
        terms: {
          ...DEFAULT_CONTENT.pages.terms,
          ...(saved.pages?.terms || {}),
        },
      },
    };
  }

  static async update(
    input: Partial<SiteContent>,
    prisma: PrismaClient
  ): Promise<SiteContent> {
    const current = await this.get(prisma);

    const next: SiteContent = {
      banners: input.banners !== undefined ? input.banners : current.banners,
      socials:
        input.socials !== undefined
          ? { ...current.socials, ...input.socials }
          : current.socials,
      contact:
        input.contact !== undefined
          ? { ...current.contact, ...input.contact }
          : current.contact,
      announcements:
        input.announcements !== undefined
          ? input.announcements
          : current.announcements,
      footerLinks:
        input.footerLinks !== undefined
          ? input.footerLinks
          : current.footerLinks,
      specialOffers:
        input.specialOffers !== undefined
          ? input.specialOffers
          : current.specialOffers,
      pages:
        input.pages !== undefined
          ? {
              about: { ...current.pages.about, ...input.pages.about },
              terms: { ...current.pages.terms, ...input.pages.terms },
            }
          : current.pages,
    };

    await prisma.setting.upsert({
      where: { key: 'site' },
      update: { value: next as any },
      create: { key: 'site', value: next as any },
    });

    return next;
  }
}