import { Fragment } from "react";
import { Column, Hr, Img, Link, Row, Section, Text } from "@react-email/components";
import { brandColour, DISPLAY_FONT, LABEL_STYLE, type EmailTheme } from "./brand";

type Themed = { theme?: EmailTheme };
const col = (name: string, theme: EmailTheme = "light") => brandColour(name, theme);

/** Small uppercase label. `critical` is for payment failures only. */
export function EmailEyebrow({
  theme = "light",
  critical,
  align = "center",
  children,
}: Themed & { critical?: boolean; align?: "center" | "left"; children: React.ReactNode }) {
  return (
    <Text
      style={{
        ...LABEL_STYLE,
        margin: "0 0 16px",
        textAlign: align,
        color: col(critical ? "critical" : "ink-muted", theme),
      }}
    >
      {children}
    </Text>
  );
}

export function EmailHeading({
  theme = "light",
  size = 46,
  align = "center",
  children,
}: Themed & { size?: number; align?: "center" | "left"; children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        textAlign: align,
        fontFamily: DISPLAY_FONT,
        fontSize: size,
        lineHeight: 1.05,
        fontWeight: 500,
        color: col("ink", theme),
      }}
    >
      {children}
    </Text>
  );
}

/** Short champagne rule under a heading. Decoration only. */
export function EmailRule({ theme = "light" }: Themed) {
  return (
    <Hr
      style={{
        width: 48,
        margin: "0 auto 20px",
        border: 0,
        borderTop: `2px solid ${col("accent", theme)}`,
      }}
    />
  );
}

export function EmailText({
  theme = "light",
  muted,
  align = "center",
  children,
}: Themed & { muted?: boolean; align?: "center" | "left"; children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        textAlign: align,
        fontSize: muted ? 14 : 16,
        lineHeight: muted ? "22px" : "26px",
        color: col(muted ? "ink-muted" : "ink", theme),
      }}
    >
      {children}
    </Text>
  );
}

/** Pull-quote / pitch line in italic display type. */
export function EmailPitch({ theme = "light", children }: Themed & { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 20px",
        textAlign: "center",
        fontFamily: DISPLAY_FONT,
        fontStyle: "italic",
        fontSize: 20,
        lineHeight: "28px",
        color: col("ink-muted", theme),
      }}
    >
      {children}
    </Text>
  );
}

export function EmailStrong({ children }: { children: React.ReactNode }) {
  return <strong style={{ fontWeight: 600 }}>{children}</strong>;
}

/** Inline link in body copy. */
export function EmailLink({
  theme = "light",
  href,
  children,
}: Themed & { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: col(theme === "dark" ? "accent" : "ink", theme), textDecoration: "underline" }}
    >
      {children}
    </Link>
  );
}

/**
 * Full-width square-cornered action. `solid` uses the action tokens, `outline`
 * is the quiet secondary, `link` is an underlined text action.
 */
export function EmailButton({
  theme = "light",
  variant = "solid",
  href,
  children,
}: Themed & { variant?: "solid" | "outline" | "link"; href: string; children: React.ReactNode }) {
  const base = { ...LABEL_STYLE, display: "block", textAlign: "center", textDecoration: "none" } as const;
  const style =
    variant === "solid"
      ? { ...base, padding: "18px 0", backgroundColor: col("action", theme), color: col("on-action", theme) }
      : variant === "outline"
        ? { ...base, padding: "17px 0", border: `1px solid ${col("ink", theme)}`, color: col("ink", theme) }
        : { ...base, padding: "6px 0", color: col("ink", theme), textDecoration: "underline" };
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

/** Padded block for buttons and closing notes. Children are stacked with a gap. */
export function EmailActions({ children, top = 28 }: { children: React.ReactNode; top?: number }) {
  return <Section style={{ padding: `${top}px 48px 24px` }}>{children}</Section>;
}

export function EmailGap({ size = 14 }: { size?: number }) {
  return <div style={{ height: size, lineHeight: `${size}px`, fontSize: 1 }}>&nbsp;</div>;
}

/** Centred intro block: eyebrow, heading, rule, copy. */
export function EmailHero({
  theme = "light",
  eyebrow,
  critical,
  title,
  titleSize,
  rule = true,
  top = 24,
  children,
}: Themed & {
  eyebrow?: React.ReactNode;
  critical?: boolean;
  title: React.ReactNode;
  titleSize?: number;
  rule?: boolean;
  top?: number;
  children?: React.ReactNode;
}) {
  return (
    <Section style={{ padding: `${top}px 48px 24px`, textAlign: "center" }}>
      {eyebrow && (
        <EmailEyebrow theme={theme} critical={critical}>
          {eyebrow}
        </EmailEyebrow>
      )}
      <EmailHeading theme={theme} size={titleSize}>
        {title}
      </EmailHeading>
      {rule && <EmailRule theme={theme} />}
      {children}
    </Section>
  );
}

/** Full-bleed photograph. Renders nothing without a URL, so no empty boxes ship. */
export function EmailPhoto({
  src,
  alt,
  height,
  inset = 0,
  theme = "light",
}: Themed & { src?: string; alt: string; height: number; inset?: number }) {
  if (!src) return null;
  return (
    <Section style={{ padding: `0 ${inset}px`, backgroundColor: col("surface", theme) }}>
      <Img
        src={src}
        alt={alt}
        width={600 - inset * 2}
        height={height}
        style={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }}
      />
    </Section>
  );
}

/** White card (surface-raised) inset from the edges. */
export function EmailCard({ theme = "light", children }: Themed & { children: React.ReactNode }) {
  return (
    <Section
      style={{ margin: "0 48px", width: "auto", backgroundColor: col("surface-raised", theme), padding: 24 }}
    >
      {children}
    </Section>
  );
}

/** Label / value pairs. */
export function EmailRows({
  theme = "light",
  rows,
  boxed,
}: Themed & {
  rows: { label: string; value: React.ReactNode; strong?: boolean; divider?: boolean }[];
  boxed?: boolean;
}) {
  const line = col("line", theme);
  return (
    <Section
      style={
        boxed
          ? { borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, padding: "12px 0" }
          : { padding: 0 }
      }
    >
      {rows.map((r) => (
        <Row key={r.label} style={r.divider ? { borderTop: `1px solid ${line}` } : undefined}>
          <Column
            style={{
              padding: "5px 12px 5px 0",
              fontSize: r.strong ? 16 : 14,
              fontWeight: r.strong ? 600 : 400,
              color: col(r.strong ? "ink" : "ink-muted", theme),
              verticalAlign: "top",
            }}
          >
            {r.label}
          </Column>
          <Column
            align="right"
            style={{
              padding: "5px 0",
              fontSize: r.strong ? 16 : 14,
              fontWeight: r.strong ? 600 : 400,
              color: col("ink", theme),
              textAlign: "right",
              verticalAlign: "top",
            }}
          >
            {r.value}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

export type EmailItem = {
  name: string;
  detail?: string;
  /** Already formatted with formatMoney from minor units. */
  price?: string;
  imageUrl?: string;
};

/** Order line: thumbnail, name, detail, price. */
export function EmailItemRow({
  theme = "light",
  item,
  thumb = 88,
  divider,
}: Themed & { item: EmailItem; thumb?: number; divider?: boolean }) {
  return (
    <Row style={divider ? { borderTop: `1px solid ${col("surface-sunk", theme)}` } : undefined}>
      {item.imageUrl && (
        <Column
          style={{ width: thumb + 16, padding: divider ? "16px 0" : "0 0 16px", verticalAlign: "middle" }}
        >
          <Img
            src={item.imageUrl}
            alt={item.name}
            width={thumb}
            height={Math.round(thumb * 1.25)}
            style={{ display: "block" }}
          />
        </Column>
      )}
      <Column style={{ padding: divider ? "16px 0" : "0 0 16px", verticalAlign: "middle" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: DISPLAY_FONT,
            fontWeight: 600,
            fontSize: 20,
            lineHeight: "24px",
            color: col("ink", theme),
          }}
        >
          {item.name}
        </Text>
        {item.detail && (
          <Text
            style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "20px", color: col("ink-muted", theme) }}
          >
            {item.detail}
          </Text>
        )}
      </Column>
      {item.price && (
        <Column
          align="right"
          style={{
            padding: divider ? "16px 0" : "0 0 16px",
            verticalAlign: "middle",
            fontSize: 15,
            color: col("ink", theme),
            textAlign: "right",
          }}
        >
          {item.price}
        </Column>
      )}
    </Row>
  );
}

/** Numbered (roman) list: I, II, III. Hairline-separated on `ruled`. */
export function EmailSteps({
  theme = "light",
  items,
  ruled,
  numeralSize = 28,
}: Themed & { items: { title: string; body: string }[]; ruled?: boolean; numeralSize?: number }) {
  const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
  const line = col("line", theme);
  return (
    <Section
      style={{ margin: "0 48px", width: "auto", ...(ruled ? { borderTop: `1px solid ${line}` } : {}) }}
    >
      {items.map((s, i) => (
        <Row key={s.title} style={ruled ? { borderBottom: `1px solid ${line}` } : undefined}>
          <Column
            style={{
              width: 48,
              padding: "18px 0",
              verticalAlign: "top",
              fontFamily: DISPLAY_FONT,
              fontSize: numeralSize,
              lineHeight: 1,
              color: col("accent", theme),
            }}
          >
            {ROMAN[i]}
          </Column>
          <Column style={{ padding: "18px 0", verticalAlign: "top" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: "22px",
                fontWeight: 600,
                color: col("ink", theme),
              }}
            >
              {s.title}
            </Text>
            <Text
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                lineHeight: "22px",
                color: col(theme === "dark" ? "ink-muted" : "ink-muted", theme),
              }}
            >
              {s.body}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** Countdown boxes (DAYS / HRS / MIN). Values are computed by the sender. */
export function EmailCountdown({
  theme = "light",
  units,
}: Themed & { units: { value: string; label: string }[] }) {
  const border = col(theme === "dark" ? "line" : "ink", theme);
  return (
    <table
      role="presentation"
      align="center"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: "0 auto 24px" }}
    >
      <tbody>
        <tr>
          {units.map((u, i) => (
            <Fragment key={u.label}>
              {i > 0 && (
                <td style={{ padding: "0 8px", color: col("accent", theme), textAlign: "center" }}>·</td>
              )}
              <td
                style={{ width: 72, border: `1px solid ${border}`, padding: "12px 0", textAlign: "center" }}
              >
                <div
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontSize: 30,
                    lineHeight: "30px",
                    color: col("ink", theme),
                  }}
                >
                  {u.value}
                </div>
                <div
                  style={{
                    ...LABEL_STYLE,
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    marginTop: 4,
                    color: col("ink-muted", theme),
                  }}
                >
                  {u.label}
                </div>
              </td>
            </Fragment>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export type EmailProduct = { name: string; price?: string; imageUrl?: string; href?: string; note?: string };

/** Two-up product grid. Odd counts leave the last cell empty. */
export function EmailProductGrid({
  theme = "light",
  products,
  imageHeight = 300,
  inset = 48,
}: Themed & { products: EmailProduct[]; imageHeight?: number; inset?: number }) {
  const rows: EmailProduct[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <Section style={{ padding: `0 ${inset}px` }}>
      {rows.map((pair) => (
        <Row key={pair.map((p) => p.name).join("|")}>
          {[0, 1].map((i) => {
            const p = pair[i];
            return (
              <Column
                key={i}
                style={{
                  width: "50%",
                  padding: i === 0 ? "0 8px 24px 0" : "0 0 24px 8px",
                  verticalAlign: "top",
                }}
              >
                {p && (
                  <>
                    {p.imageUrl && (
                      <Img
                        src={p.imageUrl}
                        alt={p.name}
                        width={(600 - inset * 2) / 2 - 8}
                        height={imageHeight}
                        style={{ display: "block", width: "100%", height: imageHeight, objectFit: "cover" }}
                      />
                    )}
                    <Text
                      style={{
                        margin: "8px 0 0",
                        fontFamily: DISPLAY_FONT,
                        fontWeight: 600,
                        fontSize: 19,
                        lineHeight: "24px",
                        color: col("ink", theme),
                      }}
                    >
                      {p.href ? (
                        <Link href={p.href} style={{ color: "inherit", textDecoration: "none" }}>
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </Text>
                    {(p.note || p.price) && (
                      <Text style={{ margin: "2px 0 0", fontSize: 14, color: col("ink-muted", theme) }}>
                        {[p.note, p.price].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </>
                )}
              </Column>
            );
          })}
        </Row>
      ))}
    </Section>
  );
}

/** Vertical stage tracker used by preorder updates. */
export function EmailTimeline({
  theme = "light",
  stages,
}: Themed & { stages: { title: string; note: string; state: "done" | "current" | "upcoming" }[] }) {
  const ink = col("ink", theme);
  const line = col("line", theme);
  return (
    <Section>
      {stages.map((s, i) => {
        const filled = s.state !== "upcoming";
        const last = i === stages.length - 1;
        return (
          <Row key={s.title}>
            <Column style={{ width: 30, verticalAlign: "top" }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 9999,
                  boxSizing: "border-box",
                  backgroundColor: filled ? ink : "transparent",
                  border: filled ? "none" : `2px solid ${line}`,
                }}
              />
            </Column>
            <Column style={{ paddingBottom: last ? 0 : 24, verticalAlign: "top" }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: "18px",
                  fontWeight: filled ? 600 : 400,
                  color: col(filled ? "ink" : "ink-muted", theme),
                }}
              >
                {s.title}
              </Text>
              <Text
                style={{
                  margin: "2px 0 0",
                  fontSize: 13,
                  lineHeight: "18px",
                  color: col("ink-muted", theme),
                }}
              >
                {s.note}
              </Text>
            </Column>
          </Row>
        );
      })}
    </Section>
  );
}

/** Small muted centred note, e.g. fine print under a button. */
export function EmailNote({ theme = "light", children }: Themed & { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "14px 0 0",
        textAlign: "center",
        fontSize: 14,
        lineHeight: "22px",
        color: col("ink-muted", theme),
      }}
    >
      {children}
    </Text>
  );
}

/** Sunk band with a short promo, used on sold-out mail. */
export function EmailBand({ theme = "light", children }: Themed & { children: React.ReactNode }) {
  return (
    <Section
      style={{
        margin: "16px 48px 32px",
        width: "auto",
        backgroundColor: col("surface-sunk", theme),
        padding: 28,
        textAlign: "center",
      }}
    >
      {children}
    </Section>
  );
}
