import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/plans", label: "Plans & Packages" },
  { href: "/admin/members", label: "Members & Payments" },
  { href: "/admin/personal-training", label: "Personal Training" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold mb-1">Admin</h1>
      <p className="text-muted mb-8">Manage plans, members, trainers and bookings.</p>

      <nav className="flex flex-wrap gap-2 mb-10 border-b border-border pb-4">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
