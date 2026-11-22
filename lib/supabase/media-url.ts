import { publicEnv } from "@/lib/env";

/** Public URL for an object in the product-media bucket. Safe in client components. */
export function productMediaUrl(storagePath: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
