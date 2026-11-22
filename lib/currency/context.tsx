"use client";

// CUR-3: the selected currency persists for the session. The cookie is the
// source of truth; the server reads it too (see server.ts).

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Currency } from "@/lib/money";
import { CURRENCY_COOKIE } from "./constants";

type CurrencyContextValue = { currency: Currency; setCurrency: (c: Currency) => void };

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function CurrencyProvider({ initial, children }: { initial: Currency; children: ReactNode }) {
  const router = useRouter();
  const [currency, setCurrencyState] = useState<Currency>(initial);

  const setCurrency = useCallback(
    (next: Currency) => {
      document.cookie = `${CURRENCY_COOKIE}=${next}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
      setCurrencyState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
