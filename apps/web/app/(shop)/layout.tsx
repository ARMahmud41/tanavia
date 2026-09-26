import { CartIcon } from '@/components/CartIcon';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white sticky top-0 z-50">
        <div className="container-wrap py-4 flex items-center justify-between">
          <a href="/" className="font-serif text-2xl font-semibold text-wine">
            TANAVIA
          </a>
          <nav className="flex gap-6 text-sm items-center">
            <a href="/products" className="hover:text-wine">
              Shop
            </a>
            <CartIcon />
            <a href="/login" className="hover:text-wine">
              Login
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-white mt-12">
        <div className="container-wrap py-6 text-sm text-muted text-center">
          © 2026 TANAVIA. All rights reserved.
        </div>
      </footer>
    </div>
  );
}