import { EmailLayout, type EmailSite } from "./layout";
import {
  EmailActions,
  EmailButton,
  EmailCountdown,
  EmailHero,
  EmailPhoto,
  EmailStrong,
  EmailText,
} from "./parts";
import { previewSite } from "./preview-data";

export type DropReminderProps = {
  site: EmailSite;
  dropName: string;
  imageUrl?: string;
  /** Preformatted, e.g. "Wednesday, 2 December at 09:00 WAT (08:00 GMT)". */
  opensAt: string;
  /** Time left, computed by the sender from database time. */
  countdown: { hours: string; minutes: string };
  previewUrl: string;
  /** Link to an .ics file or calendar template. Omit to hide the action. */
  calendarUrl?: string;
};

/** DROP-4: sent 24 hours before public opening to waitlisters who opted into drop alerts. */
export default function DropReminder({
  site,
  dropName,
  imageUrl,
  opensAt,
  countdown,
  previewUrl,
  calendarUrl,
}: DropReminderProps) {
  return (
    <EmailLayout
      preview="A reminder before the doors open."
      site={site}
      reason={`You received this because you joined the waitlist for ${dropName}.`}
    >
      <EmailPhoto src={imageUrl} alt={dropName} height={480} />
      <EmailHero eyebrow="Opens tomorrow" title={dropName} titleSize={48} top={imageUrl ? 44 : 24}>
        <EmailText>
          Doors open <EmailStrong>{opensAt}</EmailStrong>. Be ready: sizes go quickly.
        </EmailText>
        <EmailCountdown
          units={[
            { value: countdown.hours, label: "HRS" },
            { value: countdown.minutes, label: "MIN" },
          ]}
        />
      </EmailHero>
      <EmailActions top={0}>
        <EmailButton href={previewUrl}>Preview the drop</EmailButton>
        {calendarUrl && (
          <>
            <div style={{ height: 14 }} />
            <EmailButton variant="link" href={calendarUrl}>
              Add to calendar
            </EmailButton>
          </>
        )}
        <EmailText muted>
          <br />
          Tip: check your size on the product page today, so checkout takes seconds tomorrow.
        </EmailText>
      </EmailActions>
    </EmailLayout>
  );
}

DropReminder.PreviewProps = {
  site: previewSite,
  dropName: "Autumn Edit",
  opensAt: "Wednesday, 2 December at 09:00 WAT (08:00 GMT)",
  countdown: { hours: "23", minutes: "59" },
  previewUrl: "https://example.com/shop",
  calendarUrl: "https://example.com/calendar/autumn-edit.ics",
} satisfies DropReminderProps;
