
<script lang="ts">
    import ImageViewer from "$lib/ImageEditor/ImageViewer.svelte";
    import InfoBar from "$lib/ImageEditor/InfoBar.svelte";
    import type { Tool } from "$lib/ImageEditor/Tool";
    import ToolBar from "$lib/ImageEditor/ToolBar.svelte";
    import { ViewerPropertiesStore } from "$lib/ImageEditor/ViewerProperties";
    import { get, writable, type Writable } from "svelte/store";

    // -- // Icons begin // -- //


    // -- // Icons end // -- //

    let toolBar: ToolBar;

    let infoText = "This is a test message...";

    let vps: ViewerPropertiesStore;

    let tool: Writable<Tool> = writable();
    
    function zoom(event: WheelEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.zoom) return;
        _tool.zoom(event);
    }

    function loadTools() {
        toolBar.loadTools();
    }
</script>

<svelte:window on:wheel={zoom} />
<div class="session-editor">
    <svg style="position: absolute; width: 0; height: 0;">
        <defs>
             <filter id='inset-shadow'>
                <!-- Shadow offset -->
                <feOffset
                    dx='0'
                    dy='2' />
                <!-- Shadow blur -->
                <feGaussianBlur
                    stdDeviation='1'
                    result='offset-blur' />
                <!-- Invert drop shadow to make an inset shadow-->
                <feComposite
                    operator='out'
                    in='SourceGraphic'
                    in2='offset-blur'
                    result='inverse' />
                <!-- Cut colour inside shadow -->
                <feFlood
                    flood-color='black'
                    flood-opacity='.7'
                    result='color' />
                <feComposite
                    operator='in'
                    in='color'
                    in2='inverse'
                    result='shadow' />
                <!-- Placing shadow over element -->
                <feComposite
                    operator='over'
                    in='shadow'
                    in2='SourceGraphic' /> 
            </filter>
        </defs>
    </svg>
    <ToolBar bind:this={toolBar} bind:infoText={infoText} bind:tool={tool} vps={vps}/>
    <ImageViewer tool={tool} bind:vps={vps} on:firstLoad={loadTools}/>
    <InfoBar bind:infoText={infoText} />
</div>

<style>
    .session-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;

        border: 1px solid #232326;
        overflow: hidden;
    }
</style>