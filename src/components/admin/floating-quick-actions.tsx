import Link from "next/link";
import { MonitorSmartphone, PackagePlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    href: "/admin/pos",
    label: "Abrir POS",
    icon: MonitorSmartphone,
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    href: "/admin/productos",
    label: "Nuevo producto",
    icon: PackagePlus,
    iconClass: "bg-slate-100 text-slate-700",
  },
];

export function FloatingQuickActions() {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="group/qa relative flex justify-end">
        {/* Popover hover visible al hacer hover (se abre hacia arriba y a la izquierda) */}
        <div
          className={cn(
            "pointer-events-none absolute bottom-full right-0 z-50 mb-3 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 opacity-0 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.2)] transition-all duration-200",
            "group-hover/qa:pointer-events-auto group-hover/qa:opacity-100 group-hover/qa:translate-y-0",
            "translate-y-2",
            // Un puente invisible en la parte inferior para que no se cierre el hover al mover el ratón hacia abajo
            "after:absolute after:-bottom-4 after:left-0 after:h-4 after:w-full after:content-['']"
          )}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/50 text-slate-500",
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.5} />
                </span>
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Botón flotante */}
        <button
          className="group flex size-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 active:scale-95"
          type="button"
          title="Acciones rápidas"
        >
          <Plus className="size-6 transition-transform duration-300 group-hover/qa:rotate-45" />
        </button>
      </div>
    </div>
  );
}