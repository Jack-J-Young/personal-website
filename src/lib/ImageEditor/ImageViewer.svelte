<script lang="ts">
    import { pan, pinch } from 'svelte-gestures';
    import type { Tool } from "./Tool";
    import { ViewerPropertiesStore, ViewerState } from "./ViewerProperties";
    import type { GestureCustomEvent } from "svelte-gestures/src/shared";
    import { centerCamera } from './CameraControls';
    import { get, type Writable } from 'svelte/store';
    import TransformPoint from './TransformPoint.svelte';
    import TransformRegion from './TransformRegion.svelte';
    import { LocalWhiteboardSession } from './LocalWhiteboardSession';
    import SidePanel from './SidePanel.svelte';

    export let tool: Writable<Tool>;

    export let vps = new ViewerPropertiesStore({
        camX: 100,
        camY: 100,
        zoom: 1,
        imageWidth: 10,
        imageHeight: 10,
        mouseX: 10,
        mouseY: 10, 
        editor: null,
        transformPoints: [],
        loading: false,
        preview: false,
        imageRaw: null,
        image: null,
        imageBlob: null,
        sessionApi: new LocalWhiteboardSession(),
        state: ViewerState.Editing,
        setting: false,
        settings: {
            transparent: false,
            darkMode: false,
        },
    });

    $: vp = vps.ref();
    let editor: HTMLDivElement;

    // let editor: HTMLDivElement;
    // $: editor = vp.editor;

    function onImageLoad(event: Event) {
        vps.set({
            imageWidth: (event.target as HTMLImageElement).naturalWidth,
            imageHeight: (event.target as HTMLImageElement).naturalHeight,
            loading: false,
            editor,
        });
        centerCamera(vps);
    }
    
    function onClick(event: MouseEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.onClick) return;
        _tool.onClick(event);
    }

    function panOn(event: GestureCustomEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.panOn) return;
        _tool.panOn(event);
    }

    function panOff(event: GestureCustomEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.panOff) return;
        _tool.panOff(event);
    }

    function panMove(event: GestureCustomEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.pan) return;
        _tool.pan(event);
    }
</script>

<!-- Empty until an image is loaded: the upload dialog is the empty state, so there is nothing to
     draw here but the canvas it will appear over. -->
<div class="viewer w-full grow relative overflow-hidden min-w-0"
    style="--camX: {$vp.camX}px; --camY: {$vp.camY}px; --zoom: {$vp.zoom};">

    {#if $vp.loading}
        <div class="viewer-overlay">
            <h1>Loading...</h1>
        </div>
    {/if}
    <SidePanel closed={!$vp.setting} vps={vps} />
    {#if $vp.image}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div class="image-editor"
            role="application"
            aria-label="Image editor"

            bind:this={editor}

            use:pan
            on:pandown={panOn}
            on:panup={panOff}
            on:panmove={panMove}
            >
            <!-- on:pinchdown={tool.pinchOn}
            use:pinch
            on:pinch={tool.zoom}
            > -->

            <div class="editor-image-container">
                <img draggable="false"
                    id="input-file"
                    class="editor-image"

                    src="{$vp.image}"
                    alt="uploaded in editor"

                    on:load={onImageLoad}
                    />
                {#if !$vp.preview}
                    <div class="image-overlay">
                        <div id="overlay-container">
                            {#each $vp.transformPoints as point}
                                <TransformPoint x={point.x} y={point.y} />
                            {/each}
                            {#if ($vp.transformPoints.length == 4)}
                                <TransformRegion
                                points={$vp.transformPoints}
                                imgWidth={$vp.imageWidth}
                                imgHeight={$vp.imageHeight} />
                            {/if}
                        </div>
                    </div>
                {/if}
                <button class="image-click-handler" on:click={onClick} />
            </div>
        </div>
    {/if}
</div>

<style>
    /* Its own token rather than a surface: this sits behind the user's photograph, so it has to
       stay a neutral backdrop that a near-white processed image reads against. */
    .viewer {
        background-color: var(--editor-canvas);
    }

    .viewer-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;

        display: flex;
        justify-content: center;
        align-items: center;

        background: var(--overlay-scrim);
        backdrop-filter: blur(2px);

        z-index: 100;
    }

    .viewer-overlay h1 {
        color: var(--text);
        font-size: 1.125rem;
        font-weight: 600;
    }

    .image-editor {
        user-select: none;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
    }

    .editor-image-container {
        user-select: none;
        object-fit: contain;

        position: absolute;

        /* transform: scale(var(--vp.zoom)); */
        /* left: var(--camX); */
        
        transform-origin: 0 0;

        transform:
            translate(
                calc(
                    1 * var(--camX) * var(--zoom)),
                    calc(-1 * var(--camY) * var(--zoom)))
            scale(var(--zoom));

        box-shadow: 0 0 100px 100px rgba(0, 0, 0, .2);
        
        /* The chequerboard that shows through a transparent result. Built from surface tokens so
           it stays a quiet "nothing is here" texture in both themes rather than a white glare. */
        background-color: var(--surface);
        background-image:
            linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%, var(--border)),
            linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%, var(--border));
        background-size: 40px 40px;
        background-position: 0 0, 20px 20px;

        display: grid;
        z-index: 1;
    }

    .editor-image-container > * {
        grid-row: 1 / 2;
    }

    .editor-image {
        user-select: none;
        object-fit: contain;

        max-width: unset;

        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        
        z-index: 1;
    }

    .image-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;

        z-index: 2;
    }

    .image-click-handler {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;

        z-index: 3;
    }

    #overlay-container {
        position: relative;
        width: 100%;
        height: 100%;

        margin: 0;
        padding: 0;
    }
</style>