"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { sendStaffMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(sendStaffMagicLink, initial);

  if (state.status === "sent") {
    return (
      <p role="status" className="text-body text-ink">
        Check your inbox. If this address belongs to a Xarina team member, a sign-in link is on its
        way.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-space-3" noValidate>
      <div className="flex flex-col gap-space-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? "email-error" : undefined}
        />
        {state.status === "error" && (
          <p id="email-error" className="text-body-s text-critical">
            {state.message}
          </p>
        )}
      </div>
      <Button type="submit" block disabled={pending}>
        {pending ? "Sending" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
