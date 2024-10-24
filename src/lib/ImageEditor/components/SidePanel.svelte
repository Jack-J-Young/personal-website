<script lang="ts">
    import { ViewerState, type ViewerPropertiesStore } from "../viewer/ViewerProperties";

    export let vps: ViewerPropertiesStore;
    export let closed: boolean = false;

    let transparent: boolean = false;
    let darkMode: boolean = false;

    let rect: ResizeObserverSize[];
    let panelWidth: number = 300;

    function updateOptions() {
        if (!vps) return;
        let vp = vps.get();
        if (vp.state == ViewerState.Preview) {
            vps.set({
                loading: true,
            });
            vps.get().sessionApi?.setOptions([
                { key: "transparent", value: (transparent ? "true" : "false") },
                { key: "dark_mode", value: (darkMode ? "true" : "false") },
            ]).then(() => {
                vps.set({
                    image: vps.get().sessionApi?.getPreviewUrl() + `?${Date.now()}`,
                });
            });
        } else {
            vps.set({
                settings: {
                    transparent,
                    darkMode,
                }
            });
        }

    }
</script>

<div class="side-panel {closed? "closed" : ""}"
    bind:clientWidth={panelWidth}
    style="--side-panel-width: calc({panelWidth}px + 1px)">

    <h2 class="panel-heading"> Processor Settings</h2>

    <label class="option" for="transparent-option">
        <span>Transparent</span>
        <input id="transparent-option" type="checkbox" bind:checked={transparent} on:change={updateOptions}/>
    </label>  
    <label class="option" for="transparent-option">
        <span>Dark mode</span>
        <input id="transparent-option" type="checkbox" bind:checked={darkMode} on:change={updateOptions} />
    </label>  
</div>

<style>
    .side-panel {
        position: absolute;
        left: 0;
        top: 0;
        width: auto;
        height: 100%;
        background-color: #232326;
        border-right: 1px solid #ADAFB2;
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
        color: #ADAFB2;
        flex-grow: 1;
    }

    .option input {
        margin: 0.3rem 1rem 0.3rem 1rem; 
    }

    .panel-heading {
        color: #ADAFB2;
        font-weight: 600;
        padding: 0.5rem 1rem 0.5rem 1rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
        border-bottom: 1px solid #ADAFB2;
    }
</style>