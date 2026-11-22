"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCartAction } from "@/lib/checkout/actions";

/** Empties the bag once an order is confirmed paid. */
export function ClearCart() {
  const router = useRouter();
  useEffect(() => {
    void clearCartAction().then(() => router.refresh());
  }, [router]);
  return null;
}
