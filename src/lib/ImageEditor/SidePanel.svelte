<script lang="ts">
    import { ViewerState, type ProcessorSettings, type ViewerPropertiesStore } from "./ViewerProperties";

    export let vps: ViewerPropertiesStore;
    export let closed: boolean = false;

    $: vp = vps.ref();

    let panelWidth: number = 300;

    function setOption(key: keyof ProcessorSettings, value: boolean) {
        let settings = { ...vps.get().settings, [key]: value };
        vps.set({ settings });

        if (vps.get().state != ViewerState.Editing) refreshPreview(settings);
    }

    /**
     * Re-renders the preview, returning to `Preview` from `Processed` if that is where we were.
     *
     * A processed image is only valid for the settings it was made with, and Clipboard and
     * Download read it straight out of the store — so leaving it in place after a setting
     * changes would show one thing and hand the user another.
     */
    function refreshPreview(settings: ProcessorSettings) {
        let stale = vps.get().state == ViewerState.Processed ? vps.get().image : null;

        vps.set({ loading: true, state: ViewerState.Preview, imageBlob: null });

        vps.get().sessionApi?.setOptions(settings).then(() => {
            // Each refresh yields a distinct URL, so the <img> reloads and clears `loading`
            // itself; the old fixed remote URL had to be cache-busted here instead.
            vps.set({
                image: vps.get().sessionApi?.getPreviewUrl(),
            });

            // Released only once it has been replaced on screen, not when it went stale.
            if (stale) URL.revokeObjectURL(stale);
        });
    }
</script>

<div class="side-panel {closed? "closed" : ""}"
    bind:clientWidth={panelWidth}
    style="--side-panel-width: calc({panelWidth}px + 1px)">

    <h2 class="panel-heading"> Processor Settings</h2>

    <label class="option" for="transparent-option">
        <span>Transparent</span>
        <input id="transparent-option" type="checkbox"
            checked={$vp.settings.transparent}
            on:change={(e) => setOption("transparent", e.currentTarget.checked)} />
    </label>
    <label class="option" for="dark-mode-option">
        <span>Dark mode</span>
        <input id="dark-mode-option" type="checkbox"
            checked={$vp.settings.darkMode}
            on:change={(e) => setOption("darkMode", e.currentTarget.checked)} />
    </label>
</div>

<style>
    .side-panel {
        position: absolute;
        left: 0;
        top: 0;
        width: auto;
        height: 100%;
        background-color: var(--surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: start;

        padding: .5rem;

        overflow-x: hidden;
        overflow-y: auto;

        transition: left 0.3s;

        z-index: 20;
    }

    .side-panel.closed {
        left: calc(-1 * var(--side-panel-width));
    }

    .option {
        display: flex;
        align-items: center;
        width: 100%;
    }

    .option span {
        padding: 0.3rem 1rem 0.3rem 1rem;
        height: min-content;
        color: var(--text);
        flex-grow: 1;
    }

    .option input {
        margin: 0.3rem 1rem 0.3rem 1rem;
        accent-color: var(--accent);
    }

    .panel-heading {
        color: var(--text-muted);
        font-size: 0.75rem;
        font-family: var(--font-mono);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
        padding: 0.5rem 1rem 0.5rem 1rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
        border-bottom: 1px solid var(--border);
    }
</style>