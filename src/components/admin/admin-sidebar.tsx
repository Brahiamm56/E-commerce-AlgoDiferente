"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Image as ImageIcon,
  LayoutTemplate,
  LogOut,
  MonitorSmartphone,
  PackageSearch,
  Settings,
  Shapes,
  Truck,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutTemplate },
  { href: "/admin/pedidos", label: "Pedidos", icon: PackageSearch },
  { href: "/admin/pos", label: "POS", icon: MonitorSmartphone },
  { href: "/admin/productos", label: "Productos", icon: Boxes },
  { href: "/admin/variantes", label: "Variantes", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
  { href: "/admin/compras", label: "Compras", icon: ClipboardList },
  { href: "/admin/categorias", label: "Categorias", icon: Shapes },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

type AdminSidebarProps = {
  userLabel: string;
  logoUrl?: string;
  storeName?: string;
};

export function AdminSidebar({ userLabel, logoUrl, storeName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="group/sidebar sticky top-0 flex h-screen w-[72px] shrink-0 flex-col overflow-visible border-r border-[var(--border)] bg-white transition-[width] duration-300 ease-in-out hover:w-[240px]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        {logoUrl ? (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] shadow-sm">
            <Image
              alt={storeName ?? "Store"}
              className="object-cover"
              fill
              sizes="36px"
              src={logoUrl}
            />
          </div>
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
            {storeName ? storeName.slice(0, 2) : "SC"}
          </div>
        )}
        <div className="overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          <p className="whitespace-nowrap text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
            Admin
          </p>
          <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-[var(--foreground)]">
            {userLabel}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-3 mt-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-colors duration-150",
                isActive
                  ? "bg-slate-100/80 font-semibold text-slate-900 border border-slate-200/50 shadow-sm"
                  : "font-medium text-[var(--muted-foreground)] hover:bg-slate-50 hover:text-[var(--foreground)]",
              )}
              href={link.href}
              title={link.label}
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="whitespace-nowrap overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-[var(--muted-foreground)] transition-colors hover:bg-rose-50 hover:text-rose-600"
          onClick={() => signOut({ callbackUrl: "/" })}
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <LogOut className="size-[18px]" />
          </span>
          <span className="whitespace-nowrap overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Cerrar sesion
          </span>
        </button>
      </div>
    </aside>
  );
}