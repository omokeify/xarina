import type { Metadata } from "next";
import Demo from "@/components/ui/demo";

export const metadata: Metadata = {
  title: "Expanding Search Dock Demo · Xarina",
  description: "Interactive preview of the expanding search dock component.",
};

export default function SearchDockDemoPage() {
  return <Demo />;
}
