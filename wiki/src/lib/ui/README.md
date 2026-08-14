# ui/

The design system. Every visual decision on the site — colour, type, spacing, radius — is made
here, so pages compose components instead of restating styles.

The [editor](../ImageEditor/README.md) predates this and was once excluded, but no longer: it
draws from these tokens, shares `buttonClasses`, and themes with the rest of the site. It still
keeps its own components, because a toolbar over an image is a genuinely different problem from a
marketing page — but they are built from the same vocabulary.

## Tokens

Tokens are CSS custom properties declared in [`src/app.css`](../../../../src/app.css), and
`tailwind.config.ts` maps them to utility names. `bg-surface` and `var(--surface)` are therefore
always the same colour, and a theme change touches one file.

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0E0F13` | `#FBFBFD` |
| `--surface` | `#16181D` | `#FFFFFF` |
| `--surface-raised` | `#1D2027` | `#F4F5F8` |
| `--border` | `#262A33` | `#E2E4EA` |
| `--text` | `#E6E8EC` | `#16181D` |
| `--text-muted` | `#9BA1AE` | `#5B6270` |
| `--accent` | `#7C7CFF` | `#5B5BE6` |
| `--accent-contrast` | `#0E0F13` | `#FFFFFF` |

Plus `--accent-hover`, `--accent-subtle`, `--bg-translucent`, `--shadow`, the radius scale, and
`--font-sans` / `--font-mono`.

Two more exist for the [editor](../ImageEditor/README.md), which has needs no page has:

| Token | Why it isn't an existing one |
|---|---|
| `--editor-canvas` | The backdrop *behind* the user's photograph. A surface colour is too close to a near-white processed image to read against, so it is deliberately darker than `--surface-raised` in light and darker than `--bg` in dark. |
| `--overlay-scrim` | The translucent wash under the loading state. Tailwind 3 drops opacity modifiers on `var()` colours, so this cannot be `bg-bg/72`. |

Three more exist for the [guitar tools](../guitar/README.md):

| Token | Why it isn't an existing one |
|---|---|
| `--in-tune` | A tuner has to say "yes, that one" in a way the accent colour cannot — the accent already means "interactive" everywhere else on the site. |
| `--out-of-tune` | Amber rather than red. Being out of tune is the normal state while tuning, not an error, and red would make the tool feel like it was scolding you. |
| `--caution` | A setting that has been moved somewhere it will misbehave. The same amber, for the same reason it is amber, but it is not about tuning and a token named for the tuner would be the wrong thing to reach for from anywhere else. |

`--caution` and `--out-of-tune` hold the same value in dark and differ only in light, where the
caution amber is darker still — it carries small body text, which the tuner's readout does not.
**If a fourth amber is ever wanted, it is one of these two**, not a new one.

All three are darkened in light mode for contrast on white, the same way the accent is.

And two that are **not** themed at all, declared once in a separate `:root` block:

```css
--marker: #ff4438;
--marker-soft: rgba(255, 68, 56, 0.25);
```

These draw the transform quad on top of the user's photograph. They deliberately ignore the theme
— what they have to contrast with is an arbitrary image, not the page. A token that changed with
the theme would be the wrong answer twice.

The dark accent is the editor's `#7979FF` nudged, so moving between the site and the editor
feels continuous. The light accent is darkened for contrast on white.

## Theming

Dark and light, defaulting to the OS setting, with a manual override that persists.

Tokens are declared four times: `:root` and `:root[data-theme="light"]` for light,
`@media (prefers-color-scheme: dark) :root` and `:root[data-theme="dark"]` for dark. The media
query is the no-JavaScript path; the attribute is how the toggle overrides the OS.

A blocking script in `src/app.html` reads `localStorage.theme` and sets `data-theme` before first
paint, so an explicit choice never flashes the wrong theme.
[`src/lib/theme.ts`](../../../../src/lib/theme.ts) holds the store — `"system" | "light" | "dark"`, where
`system` means *no* attribute is set and the media query decides.

### Two rules that are easy to get wrong

**Don't use Tailwind `dark:` variants.** With no stored choice there is no `data-theme`
attribute, so `dark:` never matches even though the page is rendering dark via the media query.
Anything that must change between themes has to go through a token.

This is also why icons are inline SVG components under `icons/` drawn with `currentColor`, rather
than image assets: they inherit their colour from the button around them and theme themselves,
with no per-theme handling at all. An imported white PNG would need a filter token to stay
visible on a light surface.

The editor's icons follow the same rule, in `ImageEditor/icons/`. They were image assets with the
old palette baked into their `fill`, which is why `ToolIcon` used to fake its states with
`brightness()` filters — the icon's colour was not something CSS could reach.

**Don't use opacity modifiers on token colours.** Tailwind 3 cannot apply `/50` to a colour
defined as `var(--x)`; the utility is silently dropped. Add an explicit token instead, which is
why `--bg-translucent` and `--accent-subtle` exist rather than `bg-bg/85`.

## Components

| Component | Role |
|---|---|
| `Container` | Max-width wrapper, `size="narrow" \| "default" \| "wide"` |
| `Section` | Vertical rhythm block |
| `Stack` | Flex column with a `gap` prop |
| `Heading` | `level` 1–3 for semantics, `size` for appearance |
| `Text` | Body copy, `muted` variant |
| `Eyebrow` | Small mono uppercase label |
| `Link` | Inline text link, `external` adds target and rel |
| `NavLink` | Nav item, active state from `$page.url.pathname` |
| `Button` | `<button>`, `variant="primary" \| "ghost"` |
| `ButtonLink` | `<a>` styled identically |
| `IconButton` | Square icon-only `<button>`, requires `label` |
| `SocialLink` | Square icon-only `<a>`, same look as `IconButton` |
| `SocialLinks` | The site's contact row — email and GitHub |
| `icons/` | Inline SVG icon components drawn with `currentColor` |
| `Card` | Surface panel, `padded` and `interactive` |
| `ConfirmDialog` | Modal "are you sure", opened with `show()`, emits `confirm`/`cancel` |
| `ThemeToggle` | Sun/moon toggle |
| `Nav` | Site header |
| `Footer` | Site footer |
| `ScrollToTop` | Floating back-to-top button, shown once the page is scrolled |

`Heading` splits `level` from `size` on purpose: a page can keep a correct heading outline
without being forced into a type scale.

`ConfirmDialog` is opened by calling `show()` on the component, rather than by setting an `open`
prop. It wraps a native `<dialog>`, so focus trapping, Escape and the backdrop come from the
browser — and the element's own state is then the only source of truth. A boolean prop would have
to be written back whenever the browser dismissed the dialog itself, and one missed `close` event
leaves the prop stuck at `true`; asking again would then do nothing, because assigning `true` to
something already `true` changes nothing and the dialog would never reopen. That is not
hypothetical — it is exactly what the first version did.

## Variant, or new component?

Add a **variant** when it's the same element in a different skin — `Button` is one `<button>`
with two looks.

Write a **new component** when the element or the semantics differ. `ButtonLink` is separate from
`Button` because an `<a>` is not a `<button>`, and `SocialLink` is separate from `IconButton` for
the same reason. Each pair shares its classes through a function —
[`buttonClasses.ts`](buttonClasses.ts.md) and `iconButtonClasses.ts` — so the two halves can't
drift apart. That is the pattern to copy: extract the shared classes into a named function rather
than duplicating a class string across components.

`SocialLinks` sits a level above: it's the site's actual contact row, used by both the about page
and the footer, so the set of links is defined once. Changing where you can be reached is a
one-file edit.

## ScrollToTop

Rendered once in the layout, on every route except the editor. It appears as soon as the window
is scrolled at all, sliding up from off screen while the button grows from nothing to a 3rem
circle.

Three things about it are less obvious than they look:

- **It is sticky in flow, not fixed.** The outer `.dock` is a zero-height `position: sticky`
  element sitting between `<main>` and the footer. While there is page left it floats at the
  bottom of the viewport; once the footer scrolls in, the dock reaches its natural flow position
  and comes to rest on the footer's top edge. That keeps the button off the footer with no scroll
  maths and no observer. Being zero-height, it adds nothing to page layout.
- **The button expands around a centre that never moves.** The `.cradle` inside the dock is a
  fixed 3rem box that handles the slide and fade, so growing the button from `0` to `3rem` is
  symmetric about a stationary point. That is what lets the icon stay put and be *revealed* by
  the expansion rather than scaling with it.
- **The icon is centred with absolute offsets, not grid or flex alignment.** `overflow: hidden`
  makes the button a scroll container, and browsers clamp centred alignment to the start edge in
  scroll containers so overflowing content stays reachable. With `place-items: center` the icon
  drifts half its own width off centre while the button is small; `position: absolute` with
  `top/left: 50%` and a `-50%` translate is immune to that clamping.

> **`Footer` is coupled to this.** It carries `relative z-10 bg-bg` specifically so it paints
> above the dock with an opaque background, letting the button slide out from *behind* the footer
> rather than over it. Removing the background or the z-index breaks that effect.

Hidden state is a class toggle rather than an `{#if}` so the transition can play in both
directions; `tabindex` and `aria-hidden` keep it off the keyboard path while it's out of view.

Forking a component for a genuinely different look is expected and fine. What isn't fine is
overriding a component's styling from outside it — if the caller has to know the internals, the
component isn't earning its place.
