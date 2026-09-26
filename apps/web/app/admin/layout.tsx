export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-sand">
      <aside className="w-56 bg-wine-dark text-white p-4 hidden md:flex md:flex-col">
        <div className="font-serif text-xl mb-6">TANAVIA</div>
        <nav className="flex flex-col gap-1 text-sm">
          <a href="/admin/dashboard" className="px-3 py-2 rounded hover:bg-white/10">
            Dashboard
          </a>
          <a href="/admin/products" className="px-3 py-2 rounded hover:bg-white/10">
            Products
          </a>
          <a href="/admin/orders" className="px-3 py-2 rounded hover:bg-white/10">
            Orders
          </a>
          <a href="/admin/stock" className="px-3 py-2 rounded hover:bg-white/10">
            Stock
          </a>
          <a href="/admin/finance" className="px-3 py-2 rounded hover:bg-white/10">
            Finance
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}