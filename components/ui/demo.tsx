"use client";

import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock-shadcnui";

export default function Demo() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <ExpandingSearchDock onSearch={(q) => console.log("Searching:", q)} />
    </div>
  );
}
