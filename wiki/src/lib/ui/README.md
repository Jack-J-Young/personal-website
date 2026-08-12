# ui/

The design system. Every visual decision on the site — colour, type, spacing, radius — is made
here, so pages compose components instead of restating styles.

The [editor](../ImageEditor/README.md) predates this and is deliberately excluded: it keeps its
own hardcoded palette and is not built from these components.

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
| `ThemeToggle` | Sun/moon toggle |
| `Nav` | Site header |
| `Footer` | Site footer |

`Heading` splits `level` from `size` on purpose: a page can keep a correct heading outline
without being forced into a type scale.

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

Forking a component for a genuinely different look is expected and fine. What isn't fine is
overriding a component's styling from outside it — if the caller has to know the internals, the
component isn't earning its place.
