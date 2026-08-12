<script lang="ts">
    import ChevronUpIcon from "./icons/ChevronUpIcon.svelte";

    let scrollY = 0;

    $: visible = scrollY > 0;

    // Read at click time rather than on mount: the preference can change while
    // the page is open, and a load handler would miss it entirely on a
    // client-side navigation, where load has already fired.
    function toTop() {
        let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
</script>

<svelte:window bind:scrollY />

<!-- Sticky and zero-height, sitting in flow directly above the footer. It floats
     at the bottom of the viewport while there is page left, then comes to rest on
     the footer's top edge instead of covering it — no scroll maths required. -->
<div class="dock">
    <!-- Fixed size and never moves, so the button can grow from its centre; that
         fixed centre is what keeps the icon visually static. -->
    <div class="cradle" class:visible>
        <button
            type="button"
            class="button"
            aria-label="Back to top"
            title="Back to top"
            tabindex={visible ? 0 : -1}
            aria-hidden={!visible}
            on:click={toTop}>
            <ChevronUpIcon />
        </button>
    </div>
</div>

<style>
    .dock {
        position: sticky;
        bottom: 1.5rem;
        z-index: 0;

        align-self: flex-end;
        margin-right: 1.5rem;

        /* Zero height so it adds nothing to the page's layout. */
        height: 0;
    }

    .cradle {
        position: absolute;
        right: 0;
        bottom: 0.75rem;

        display: grid;
        place-items: center;
        height: 3rem;
        width: 3rem;

        /* Far enough to sit entirely below the dock line, which is where the
           footer begins — so it hides behind the footer rather than beside it. */
        transform: translateY(calc(100% + 1.5rem));
        opacity: 0;
        pointer-events: none;

        transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
    }

    .cradle.visible {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
    }

    .button {
        position: relative;

        /* Grows from nothing. Because the cradle centres it at a fixed size, it
           expands symmetrically and its centre never moves. */
        height: 0;
        width: 0;
        border-radius: 0;

        /* The icon keeps its own size and stays on that unmoving centre, so it
           is revealed by the expansion rather than scaling with it. */
        overflow: hidden;

        background-color: var(--accent);
        color: var(--accent-contrast);
        box-shadow: var(--shadow);

        transition: height 320ms cubic-bezier(0.22, 1, 0.36, 1),
            width 320ms cubic-bezier(0.22, 1, 0.36, 1),
            border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 150ms ease;
    }

    .cradle.visible .button {
        height: 3rem;
        width: 3rem;
        border-radius: 999px;
    }

    .button:hover {
        background-color: var(--accent-hover);
    }

    /* Centred by absolute offsets rather than by grid or flex alignment: an
       overflow-hidden box is a scroll container, and browsers clamp centred
       alignment to the start edge there to keep overflow reachable, which drags
       the icon off centre while the button is small. */
    .button :global(svg) {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    @media (prefers-reduced-motion: reduce) {
        .cradle,
        .button {
            transition: none;
        }
    }
</style>
