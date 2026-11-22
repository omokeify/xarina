# Xarina

Wearable statement dressing. Xarina's brand is quiet so the clothes can be loud: an ivory and ink interface, a sculptural custom mark, editorial serif headlines and generous space. Colour comes from the garments and photography, never from the interface.

This system has two themes. **Ivory & Ink** (`light`) is the main site. **Privé · Noir & Champagne** (`dark`) is for Xarina Privé pages, VIP invites, packaging and evening campaign moments.

## Logo

- **The mark** is a single custom letter that reads as both *a* and *A*, the letters at the heart of the name. It has one heavy, flared stroke and a teardrop counter. Files are in the Logos asset group: ink, ivory and champagne.
- **The wordmark** is XARINA in Cormorant Garamond 600, all capitals, letter-spaced 0.4em (`wordmark` text style).
- **Lockups:** the mark alone (avatars, favicon, labels, packaging); the mark beside the wordmark with a hairline divider in `line`; the wordmark alone in the header on mobile.
- **Colour:** the ink mark on `surface` (light), the ivory mark on ink, the champagne mark on noir for Privé. Never place the mark on a photo without a solid band behind it, never outline it, stretch it or recolour it outside these three.
- **Clear space:** at least the width of the counter (the teardrop) on every side. Minimum size 16px tall; below 24px drop the wordmark.
- The mark is a first drawing; a designer should refine the curves before trademarking it.

## Colour

Use `surface` for the page, `ink` for text and the mark, `ink-muted` for secondary text and `line` for hairlines. `action`/`on-action` fill primary buttons. `accent` (champagne) is decoration only: a short rule under a headline, the Privé badge, countdown separators. It never carries small text on the light theme. `critical` is reserved for errors and failed payments. Sold-out states use `ink-muted`, not red, to stay calm.

## Type

- **Display:** Cormorant Garamond (Google Fonts) for drop names, headlines and the wordmark. Use italic for one-line pitches ("Two layers. One entrance.").
- **Text:** Inter (Google Fonts) for body, prices, forms and checkout.
- **Labels:** Inter 600, 12px, uppercase, letter-spaced 0.22em (`label`), for buttons, navigation, dates and countdown units.

## Layout and shape

- Mobile first. Full-bleed photography, a single column on phones, generous `space-5`/`space-6` padding.
- Square corners everywhere (`radius-none`); only inputs take `radius-xs` and avatars/swatches `radius-full`.
- Separate sections with space and a hairline `line` rule, never with shadows or boxes.
- Homepage order: announcement bar → wordmark header (currency switcher, bag) → drop hero with countdown and one primary action → Available Now → Privé band → trust strip → footer.

## Components (to build in code)

- **Primary button:** `action` fill, `on-action` label in `label` style, 52px tall, square, full width on mobile.
- **Secondary button:** transparent, 1px `ink` border, same label style.
- **Countdown:** numerals in `display-m`, units in `label`/`ink-muted`, separated by an `accent` dot.
- **Product card:** image at 4:5, name in `title`, price in `body`, a state badge (Upcoming, Privé, Sold Out) in `label`.
- **Privé band:** `dark` theme section with the champagne mark and one action.

## Approved exceptions (owner decisions, 2026-11-21)

The storefront follows the Xarina concept build (xarina-remote). Where it differs from the rules above, these exceptions apply:

- **Homepage order:** hero → Upcoming drops (join the waitlist) → Available Now → Privé band → numbered-runs editorial band (`dark`) → trust strip → footer.
- **Text over photography:** hero and Privé-band text may sit directly on a photo over a solid-to-transparent `surface` gradient scrim. The hero scrim follows the staff-chosen hero theme (Ivory & Ink by default, Noir & Champagne when staff choose Privé); the Privé band is always Noir. The scrim must be fully opaque behind small text so 4.5:1 holds. The mark still never sits on a photo without a solid band.
- **State badges:** every product card carries a state label, including "Available".
- **Dark mode:** visitors may switch the whole site to the Noir & Champagne palette.

## Voice

Confident, warm, brief. Short sentences, no exclamation marks, no emoji. Talk about how the piece makes an entrance, not about discounts. Examples: "Join the waitlist.", "Privé members shop first.", "Sold out in this size. Tell me when it's back."

## Accessibility

All text pairs meet 4.5:1 in both themes (3:1 for text 24px and larger). Every control has a visible `focus` ring. Touch targets are at least 44px.
