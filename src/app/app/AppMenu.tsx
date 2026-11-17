"use client";

/**
 * One grouped menu instead of a row of loose header links.
 *
 * Built from the live tool catalogue (src/lib/pro.ts), in the same groups the
 * landing page uses, so the menu cannot drift from the product. A <details>
 * element opens without JavaScript — the header's old JS-only controls did
 * nothing when tapped before hydration.
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { PRO_TOOLS } from "@/lib/pro";

const byId = (id: string) => PRO_TOOLS.find((t) => t.id === id);

const GROUPS: { title: string; items: { href: string; label: string; icon?: string }[] }[] = [
  {
    title: "Compute & file",
    items: ["import", "filing", "tds", "notices", "rent-receipts", "calendar"].flatMap((id) => {
      const t = byId(id);
      return t ? [{ href: t.href, label: t.title, icon: t.icon }] : [];
    }),
  },
  {
    title: "Plan & save",
    items: ["take-home", "hra", "80gg", "advance-tax", "harvest", "property", "breakeven", "ctc"].flatMap((id) => {
      const t = byId(id);
      return t ? [{ href: t.href, label: t.title, icon: t.icon }] : [];
    }),
  },
  {
    title: "Learn",
    items: [
      { href: "/guide", label: "60-second Tax Guide", icon: "🧭" },
      { href: "/deadlines", label: "Deadlines & reminders", icon: "⏳" },
      ...["sections", "glossary", "quiz"].flatMap((id) => {
        const t = byId(id);
        return t ? [{ href: t.href, label: t.title, icon: t.icon }] : [];
      }),
    ],
  },
  {
    title: "For professionals",
    items: [
      { href: "/professional", label: "Professional Suite", icon: "⚖️" },
      ...["clients", "interest", "gst", "tds-rates", "audit"].flatMap((id) => {
        const t = byId(id);
        return t ? [{ href: t.href, label: t.title, icon: t.icon }] : [];
      }),
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/pricing", label: "Plans & pricing", icon: "🔑" },
      { href: "/whats-new", label: "What's new", icon: "✨" },
      { href: "/admin", label: "Admin", icon: "🛠️" },
    ],
  },
];

export default function AppMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current) ref.current.open = false; };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-stone-300 px-2.5 py-1 font-semibold text-stone-700 hover:border-brand-600 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
        Menu <span aria-hidden className="text-[10px]">▾</span>
      </summary>
      <div className="absolute right-0 top-8 z-50 grid w-[min(92vw,640px)] grid-cols-2 gap-x-5 gap-y-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">{g.title}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => { if (ref.current) ref.current.open = false; }}
                    className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-stone-700 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <span aria-hidden className="w-4 text-center">{it.icon}</span>
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
