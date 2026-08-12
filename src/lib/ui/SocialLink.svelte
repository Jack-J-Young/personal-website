<script lang="ts">
    import { iconButtonClasses, type IconButtonSize } from "./iconButtonClasses";

    export let href: string;
    export let label: string;
    export let size: IconButtonSize = "md";

    // mailto: and tel: links should stay in the current tab, so this is derived
    // from the protocol rather than left to the caller to set correctly.
    $: external = /^https?:/i.test(href);
</script>

<a
    {href}
    aria-label={label}
    title={label}
    target={external ? "_blank" : null}
    rel={external ? "noreferrer noopener" : null}
    class={iconButtonClasses(size)}>
    <slot />
</a>
