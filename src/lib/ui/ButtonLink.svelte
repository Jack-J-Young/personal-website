<script lang="ts">
    import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonClasses";

    export let href: string;
    export let variant: ButtonVariant = "primary";
    export let size: ButtonSize = "md";
    export let external = false;
</script>

<a
    {href}
    target={external ? "_blank" : null}
    rel={external ? "noreferrer noopener" : null}
    class={buttonClasses(variant, size)}>
    <slot />
</a>
