"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff/roles";
import { addStaff, updateStaff, type StaffState } from "./actions";

const initial: StaffState = { status: "idle" };
const select = "h-11 w-full rounded-xs border border-line bg-surface-raised px-space-2 text-body-s";
const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  merchandiser: "Merchandiser",
  fulfilment: "Fulfilment",
  support: "Support",
};

function Status({ state }: { state: StaffState }) {
  return (
    <p role="status" aria-live="polite" className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}>
      {state.message ?? ""}
    </p>
  );
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaff, initial);
  return (
    <form action={action} className="flex flex-col gap-space-3">
      <fieldset disabled={pending} className="grid gap-space-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
        <div className="flex flex-col gap-space-2">
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" name="name" required maxLength={80} />
        </div>
        <div className="flex flex-col gap-space-2">
          <Label htmlFor="new-email">Work email</Label>
          <Input id="new-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="flex flex-col gap-space-2">
          <Label htmlFor="new-role">Role</Label>
          <select id="new-role" name="role" defaultValue="support" className={select + " h-12"}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{pending ? "Adding" : "Add"}</Button>
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
    <li className="border-b border-line py-space-3">
      <form action={action} className="grid gap-space-3 sm:grid-cols-[1fr_160px_auto_auto] sm:items-center">
        <div className="flex flex-col">
          <span className={member.active ? "text-body" : "text-body text-ink-muted line-through"}>
            {member.name}
            {isMe && <span className="text-ink-muted"> (you)</span>}
          </span>
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
        <label className="inline-flex min-h-11 items-center gap-space-2 text-body-s">
          <input type="checkbox" name="active" defaultChecked={member.active} disabled={pending || isMe} className="size-5 accent-ink" />
          Active
          {isMe && <input type="hidden" name="active" value="on" />}
        </label>
        <Button type="submit" variant="secondary" size="sm" disabled={pending || isMe}>
          {pending ? "Saving" : "Save"}
        </Button>
      </form>
      <Status state={state} />
    </li>
  );
}
