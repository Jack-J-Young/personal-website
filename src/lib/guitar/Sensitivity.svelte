<script lang="ts">
    /** 0 is the least sensitive, 1 the most. */
    export let value = 0.5;

    export let id = "sensitivity";
</script>

<div class="sensitivity">
    <label for={id}>Sensitivity</label>
    <input {id} type="range" min="0" max="1" step="0.01" bind:value />
    <p class="hint">
        The dashed band on the timeline is what counts as too quiet to be a strum. Move this until
        your playing clears it.
    </p>
</div>

<style>
    .sensitivity {
        display: grid;
        grid-template-columns: auto 1fr;
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

    /* Rather than rebuilding the track and thumb per browser, which is three vendor prefixes to
       say one thing. */
    input {
        width: 100%;
        accent-color: var(--accent);
        cursor: pointer;
    }

    .hint {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-muted);
    }
</style>
