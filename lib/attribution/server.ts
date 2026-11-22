import "server-only";
import { cookies } from "next/headers";
import { UTM_COOKIE } from "./constants";
import { decodeAttribution, type Attribution } from "./utm";

/** First-touch campaign for this visitor, read by server actions when they save a sign-up or order. */
export async function getAttribution(): Promise<Attribution | null> {
  const cookieStore = await cookies();
  return decodeAttribution(cookieStore.get(UTM_COOKIE)?.value);
}
