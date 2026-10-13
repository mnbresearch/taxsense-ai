"use client";

/** Page-view beacon: fires once per route, path only (see ./track.ts for privacy rules). */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "./track";

export default function PageBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);
  return null;
}
