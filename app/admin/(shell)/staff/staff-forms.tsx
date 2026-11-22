"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff/roles";
import { addStaff, updateStaff, type StaffState } from "./actions";

const initial: StaffState = { status: "idle" };
const select =
  "h-11 w-full rounded-none border border-line bg-surface px-space-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors";
const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  merchandiser: "Merchandiser",
  fulfilment: "Fulfilment",
  support: "Support",
};

function Status({ state }: { state: StaffState }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={state.status === "error" ? "text-body-s text-critical font-medium" : "text-body-s text-ink-muted"}
    >
      {state.message ?? ""}
    </p>
  );
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaff, initial);
  return (
    <form action={action} className="flex flex-col gap-space-3">
      <fieldset disabled={pending} className="grid gap-space-3 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end">
        <div className="flex flex-col gap-space-1">
          <Label htmlFor="new-name" className="label text-ink-muted">
            Full Name
          </Label>
          <Input id="new-name" name="name" required maxLength={80} placeholder="e.g. Xarina Creative" />
        </div>
        <div className="flex flex-col gap-space-1">
          <Label htmlFor="new-email" className="label text-ink-muted">
            Work Email
          </Label>
          <Input id="new-email" name="email" type="email" required autoComplete="off" placeholder="name@xarina.com" />
        </div>
        <div className="flex flex-col gap-space-1">
          <Label htmlFor="new-role" className="label text-ink-muted">
            Operational Role
          </Label>
          <select id="new-role" name="role" defaultValue="support" className={select}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Adding…" : "Add Staff"}
        </Button>
      </fieldset>
      <Status state={state} />
    </form>
  );
}

export function StaffRow({
  member,
  isMe,
}: {
  member: { id: string; name: string; email: string; role: StaffRole; active: boolean };
  isMe: boolean;
}) {
  const [state, action, pending] = useActionState(updateStaff.bind(null, member.id), initial);
  return (
    <li className="py-space-3 px-space-2 hover:bg-surface-sunk/30 transition-colors">
      <form action={action} className="grid gap-space-3 sm:grid-cols-[1fr_180px_100px_auto] sm:items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-2">
            <span className={member.active ? "text-body font-medium" : "text-body text-ink-muted line-through"}>
              {member.name}
            </span>
            {isMe && (
              <span className="label bg-surface-sunk text-ink-muted px-1.5 py-0.5 border border-line">
                You
              </span>
            )}
            <span
              className={`size-2 rounded-full ${
                member.active ? "bg-accent" : "bg-ink-muted"
              }`}
              title={member.active ? "Active" : "Deactivated"}
            />
          </div>
          <span className="text-caption text-ink-muted">{member.email}</span>
        </div>
        <label className="flex flex-col gap-space-1">
          <span className="sr-only">Role for {member.name}</span>
          <select name="role" defaultValue={member.role} disabled={pending || isMe} className={select}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          {isMe && <input type="hidden" name="role" value={member.role} />}
        </label>
        <label className="inline-flex min-h-11 items-center gap-space-2 text-body-s cursor-pointer select-none">
          <input
            type="checkbox"
            name="active"
            defaultChecked={member.active}
            disabled={pending || isMe}
            className="size-4 accent-ink"
          />
          <span className="label text-ink-muted">Active</span>
          {isMe && <input type="hidden" name="active" value="on" />}
        </label>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending || isMe}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      <Status state={state} />
    </li>
  );
}
