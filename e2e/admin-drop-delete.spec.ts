import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// ADM-4: only the owner gets a delete control, and deleting a drop removes it.
function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing from env and .env.local`);
  return line.slice(name.length + 1).trim();
}

const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

test("only the owner can delete a drop", async ({ page }) => {
  await clearInbox();
  const id = crypto.randomUUID();
  const name = `E2E Delete ${id.slice(0, 8)}`;
  await admin.from("drops").insert({
    id,
    name,
    slug: `e2e-delete-${id.slice(0, 8)}`,
    vip_opens_at: new Date(Date.now() + 86_400_000).toISOString(),
    public_opens_at: new Date(Date.now() + 172_800_000).toISOString(),
  });
  try {
    await signIn(page, "manager@xarina.test");
    await page.goto(`/admin/drops/${id}`);
    await expect(page.getByRole("heading", { name: "Delete drop" })).toHaveCount(0);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/admin\/login$/);

    await signIn(page, "owner@xarina.test");
    await page.goto(`/admin/drops/${id}`);
    const button = page.getByRole("button", { name: "Delete drop" });
    await expect(button).toBeDisabled();
    await page.getByLabel("Type the drop name to confirm").fill(name);
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page).toHaveURL(/\/admin\/drops\?deleted=1/);
    await expect(page.getByRole("status").filter({ hasText: /deleted/i })).toBeVisible();

    const { data } = await admin.from("drops").select("id").eq("id", id);
    expect(data).toEqual([]);
  } finally {
    await admin.from("drops").delete().eq("id", id);
  }
});
