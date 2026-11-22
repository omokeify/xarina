import type { EmailSite } from "./layout";
import DropLive from "./drop-live";
import PriveEarlyAccess from "./prive-early-access";
import { previewSite } from "./preview-data";

export type DropNotificationProps = {
  site: EmailSite;
  kind: "vip_invite" | "public_launch";
  dropName: string;
  pitch: string;
  /** When the drop opens to everyone, preformatted. Used by Privé invites. */
  publicOpensAt: string;
  /** When Privé opens, preformatted. Used by Privé invites. */
  vipOpensAt?: string;
  /** Personal single-use link for Privé invites, otherwise the shop link. */
  url: string;
  imageUrl?: string;
};

/** DROP-4: Privé invite at VIP open, launch alert at public open. */
export default function DropNotification({
  kind,
  dropName,
  pitch,
  publicOpensAt,
  vipOpensAt,
  url,
  imageUrl,
  site,
}: DropNotificationProps) {
  return kind === "vip_invite" ? (
    <PriveEarlyAccess
      site={site}
      dropName={dropName}
      pitch={pitch || undefined}
      imageUrl={imageUrl}
      vipOpensAt={vipOpensAt}
      publicOpensAt={publicOpensAt}
      accessUrl={url}
    />
  ) : (
    <DropLive site={site} dropName={dropName} pitch={pitch || undefined} imageUrl={imageUrl} shopUrl={url} />
  );
}

DropNotification.PreviewProps = {
  site: previewSite,
  kind: "vip_invite",
  dropName: "Autumn Edit",
  pitch: "Sculpted silhouettes, made to make an entrance.",
  vipOpensAt: "2 December 2026 at 09:00 WAT",
  publicOpensAt: "4 December 2026 at 09:00 WAT",
  url: "https://example.com/access/token",
} satisfies DropNotificationProps;
