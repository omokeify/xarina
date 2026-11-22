import { redirect } from "next/navigation";

// d0's header and the product page link here; the sign-in form lives on /prive.
export default function PriveSignInPage() {
  redirect("/prive");
}
