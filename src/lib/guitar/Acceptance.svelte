<script lang="ts">
    import {
        DEFAULT_ACCEPTANCE,
        LOOSEST_ACCEPTANCE,
        STRICTEST_ACCEPTANCE,
        leadBarFor,
    } from "./practice";

    /** The bar a chord has to clear when something else matched better. */
    export let value = DEFAULT_ACCEPTANCE;

    export let id = "acceptance";

    /** The value at which leniency stops being forgiving and starts being wrong. */
    const RELIABLE = 0.7;

    $: percent = Math.round(value * 100);
    $: lead = Math.round(leadBarFor(value) * 100);
</script>

<div class="acceptance">
    <label for={id}>Acceptance</label>
    <input
        {id}
        type="range"
        min={LOOSEST_ACCEPTANCE}
        max={STRICTEST_ACCEPTANCE}
        step="0.01"
        bind:value />
    <output class="value" class:loose={value < RELIABLE} for={id}>{percent}%</output>

    <p class="hint">
        How close a strum has to be to count, or {lead}% when it is also the best match found. Drop
        it if a quiet guitar or a poor microphone is failing chords you know you played.
        {#if value < RELIABLE}
            <span class="warn">
                Below 70% it starts accepting a minor where you asked for a major.
            </span>
        {/if}
    </p>
</div>

<style>
    .acceptance {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.5rem 0.75rem;
        width: 100%;
    }

    label {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
    }

    input {
        width: 100%;
        accent-color: var(--accent);
        cursor: pointer;
    }

    /* The number is the setting. A confidence slider with no readout would be asking the player to
       guess where they had put a threshold they are meant to be reasoning about. */
    .value {
        min-width: 2.5rem;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text);
    }

    .value.loose {
        color: var(--caution);
    }

    .hint {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .warn {
        color: var(--caution);
    }
</style>
