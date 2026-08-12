# buttonClasses.ts

`buttonClasses(variant, size)` returns the full class string for a button.

It exists because `Button` and `ButtonLink` render different elements — `<button>` and `<a>` —
but must be visually identical. Without a shared source, the two class strings drift the first
time someone adjusts padding in one and not the other.

```ts
buttonClasses("primary", "lg");
```

Variants are `primary` (accent fill) and `ghost` (bordered surface). Sizes are `sm`, `md`, `lg`.

To restyle every button on the site, change `BASE`, `VARIANTS`, or `SIZES` here. To add a third
variant, add a key to `VARIANTS` and widen `ButtonVariant` — both components pick it up with no
further change.
