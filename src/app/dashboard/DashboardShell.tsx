"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Orders", icon: "🧾" },
  { href: "/dashboard/reports", label: "Sales report", icon: "📊" },
  { href: "/dashboard/promo", label: "Send a promo", icon: "📣" },
  { href: "/dashboard/qr-code", label: "QR code", icon: "🔗" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/dashboard-auth", { method: "DELETE" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="w-60 shrink-0 bg-maroon text-white flex flex-col p-5 print:hidden">
        <div className="flex flex-col items-center text-center mb-8 mt-2">
          <div className="w-20 h-20 rounded-full bg-white p-1 mb-3 shadow-md">
            <Image
              src="/icons/icon-192.png"
              alt="Mariscos Alta Vista"
              width={80}
              height={80}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <p className="font-serif text-lg leading-tight tracking-wide">MARISCOS</p>
          <p className="font-serif text-lg leading-tight tracking-wide -mt-1">ALTA VISTA</p>
          <p className="text-[10px] tracking-[0.25em] text-white/50 mt-1">EST. 1995</p>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white text-maroon"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span>🚪</span>
          Log out
        </button>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
