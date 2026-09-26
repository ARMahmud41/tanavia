import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold mb-6">Admin Panel</h1>
      <p className="text-muted mb-6">Welcome to TANAVIA admin. Choose a section:</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/admin/dashboard" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Dashboard</div>
          <div className="text-sm text-muted mt-1">Sales, profit, KPIs</div>
        </Link>
        <Link href="/admin/products" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Products</div>
          <div className="text-sm text-muted mt-1">Manage catalog</div>
        </Link>
        <Link href="/admin/orders" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Orders</div>
          <div className="text-sm text-muted mt-1">Online + offline</div>
        </Link>
        <Link href="/admin/stock" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Stock</div>
          <div className="text-sm text-muted mt-1">Inventory + movements</div>
        </Link>
        <Link href="/admin/finance" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Finance</div>
          <div className="text-sm text-muted mt-1">Profit, expenses</div>
        </Link>
        <Link href="/admin/staff" className="bg-white p-5 rounded border border-line hover:shadow-card transition">
          <div className="font-semibold text-wine">Staff</div>
          <div className="text-sm text-muted mt-1">Team + shifts</div>
        </Link>
      </div>
    </div>
  );
}