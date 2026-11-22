"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Previous-year events no longer have their own page. Old links continue to the Previous Year Memories. */
export function RedirectToRecap() {
  const router = useRouter();
  useEffect(() => { router.replace("/events/#previous-year-recap"); }, [router]);
  return null;
}
