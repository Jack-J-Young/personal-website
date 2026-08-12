<script lang="ts">
    export let before: string;
    export let after: string;
    export let beforeAlt = "Before";
    export let afterAlt = "After";
    export let beforeLabel = "Before";
    export let afterLabel = "After";
    export let position = 50;
</script>

<figure class="compare" style="--position: {position}%">
    <!-- The base image is in flow, so the figure inherits its aspect ratio and
         no hardcoded ratio has to be kept in sync with the assets. -->
    <img class="layer" src={before} alt={beforeAlt} />
    <span class="badge badge-before">{beforeLabel}</span>

    <!-- Clipping the overlay rather than resizing it keeps both layers at
         identical scale, so they stay registered at every position. -->
    <div class="overlay">
        <img class="layer" src={after} alt={afterAlt} />
        <span class="badge badge-after">{afterLabel}</span>
    </div>

    <!-- Ordered before the line and handle so they paint on top of it and so
         the sibling selectors below can react to its hover and focus states. -->
    <input
        class="slider"
        type="range"
        min="0"
        max="100"
        bind:value={position}
        aria-label="Reveal the processed version"
        aria-valuetext="{Math.round(position)}% processed" />

    <div class="line" aria-hidden="true"></div>
    <div class="handle" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 7.5 10 12l4.5 4.5M9.5 7.5 14 12l-4.5 4.5" />
        </svg>
    </div>
</figure>

<style>
    .compare {
        position: relative;
        display: block;
        margin: 0;
        overflow: hidden;
        background-color: var(--surface-raised);
        touch-action: pan-y;
    }

    .layer {
        display: block;
        width: 100%;
        height: auto;
    }

    .overlay {
        position: absolute;
        inset: 0;
        clip-path: inset(0 calc(100% - var(--position)) 0 0);
    }

    .overlay .layer {
        height: 100%;
        object-fit: cover;
        object-position: left top;
    }

    .badge {
        position: absolute;
        top: 0.75rem;
        padding: 0.2rem 0.5rem;
        border-radius: var(--radius-sm);
        background-color: var(--bg-translucent);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        pointer-events: none;
    }

    /* Sitting inside the clipped overlay, this is revealed and hidden with it. */
    .badge-after {
        left: 0.75rem;
    }

    .badge-before {
        right: 0.75rem;
    }

    .line {
        position: absolute;
        inset-block: 0;
        left: var(--position);
        width: 2px;
        background-color: var(--accent);
        transform: translateX(-50%);
        pointer-events: none;
    }

    .handle {
        position: absolute;
        top: 50%;
        left: var(--position);
        display: grid;
        place-items: center;
        height: 2.25rem;
        width: 2.25rem;
        border-radius: 999px;
        background-color: var(--accent);
        color: var(--accent-contrast);
        box-shadow: var(--shadow);
        transform: translate(-50%, -50%);
        transition: transform 120ms ease;
        pointer-events: none;
    }

    .handle svg {
        height: 1.1rem;
        width: 1.1rem;
    }

    .slider {
        position: absolute;
        inset: 0;
        height: 100%;
        width: 100%;
        margin: 0;
        cursor: ew-resize;
        opacity: 0;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
    }

    /* A zero-width thumb makes the value map exactly edge to edge; the default
       thumb insets the usable track by half its width at each end. */
    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 100%;
        width: 0;
    }

    .slider::-moz-range-thumb {
        height: 100%;
        width: 0;
        border: 0;
    }

    .slider:hover ~ .handle,
    .slider:active ~ .handle {
        transform: translate(-50%, -50%) scale(1.08);
    }

    .slider:focus-visible ~ .handle {
        outline: 2px solid var(--text);
        outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
        .handle {
            transition: none;
        }
    }
</style>
