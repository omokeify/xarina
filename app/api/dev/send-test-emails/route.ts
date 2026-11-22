import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { EMAIL_TEMPLATES } from "@/emails/registry";
import { sendEmail } from "@/lib/email/client";
import { publicEnv } from "@/lib/env";

// Development only: sends every email template, filled with its sample data, to
// one inbox so the designs can be checked in a real mail client.
//   /api/dev/send-test-emails?to=you@example.com            all templates
//   /api/dev/send-test-emails?to=you@example.com&only=Teaser,Welcome
// Disabled in production.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  const params = request.nextUrl.searchParams;
  const to = z.email().safeParse(params.get("to"));
  if (!to.success) return NextResponse.json({ error: "Pass ?to=<your email address>" }, { status: 400 });

  const only = params.get("only")?.split(",").map((s) => s.trim());
  const names = Object.keys(EMAIL_TEMPLATES).filter((n) => !only || only.includes(n));
  if (names.length === 0) {
    return NextResponse.json({ error: "No such template", available: Object.keys(EMAIL_TEMPLATES) }, { status: 400 });
  }

  const results: Record<string, string> = {};
  for (const name of names) {
    const template = EMAIL_TEMPLATES[name] as unknown as ((p: unknown) => React.ReactElement) & {
      PreviewProps: { site?: Record<string, unknown> };
    };
    // Point the footer and logo at this site; the logo must be a public URL for mail clients to load it.
    const props = {
      ...template.PreviewProps,
      ...(template.PreviewProps.site && {
        site: { ...template.PreviewProps.site, siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL },
      }),
    };
    const result = await sendEmail({ to: to.data, subject: `[Test] ${name}`, react: template(props) });
    results[name] = result.status === "failed" ? `failed: ${result.error}` : result.status;
    // Resend allows 2 requests a second by default.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return NextResponse.json({ to: to.data, results });
}
