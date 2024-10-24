<script lang="ts">
    import { pan, pinch } from 'svelte-gestures';
    import type { Tool } from "../tools/Tool";
    import { ViewerPropertiesStore, ViewerState } from "./ViewerProperties";
    import type { GestureCustomEvent } from "svelte-gestures/src/shared";
    import { createEventDispatcher, SvelteComponent } from 'svelte';
    import { centerCamera } from './CameraControls';
    import { get, type Writable } from 'svelte/store';
    import TransformPoint from '../TransformPoint.svelte';
    import TransformRegion from '../TransformRegion.svelte';
    import { WhiteboardSession } from '../WhiteboardSession';
    import SidePanel from '../components/SidePanel.svelte';
    import type { PinchPointerEventDetail } from 'svelte-gestures/src/pinch';

    
    let dispatch = createEventDispatcher();

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
        sessionApi: new WhiteboardSession(),
        state: ViewerState.Editing,
        setting: false,
        settings: {
            transparent: false,
            darkMode: false,
        },
        alert: false,
        alertBody: null,
    });

    $: vp = vps.ref();
    let editor: HTMLDivElement;

    // let editor: HTMLDivElement;
    // $: editor = vp.editor;

    function handleFileChange(event: Event) {
        let vp = vps.get();

        if (vp.preview) return;
        let input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            let reader = new FileReader();
            let imageRaw = input.files[0];
            reader.onload = (e) => {
                // set image to img src
                let image = e.target?.result as string;
                vps.set({
                    imageRaw,
                    image,
                });
            }
            reader.readAsDataURL(imageRaw);
        }
    }

    function onImageLoad(event: Event) {
        let firstLoad = vps.get().editor == null;

        vps.set({
            imageWidth: (event.target as HTMLImageElement).naturalWidth,
            imageHeight: (event.target as HTMLImageElement).naturalHeight,
            loading: false,
            editor,
        });
        centerCamera(vps);

        if (firstLoad)
            dispatch('firstLoad', true);
    }
    
    // $: zoomPercent = `${Math.round(vp.zoom * 100)}`;
    // $: editorCursor = "none"; // TODO: implement cursor logic with new tool interfaces
        // "grabbing-cursor":
        // tool === Tools.MOVE ?
        //     "move-cursor":
        //     tool === Tools.TRANSFORM ?
        //         "transform-cursor":
        //         "";

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

    function pinchOn(event: GestureCustomEvent) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.pinchOn) return;
        _tool.pinchOn(event);
    }

    function zoom(event: CustomEvent<PinchPointerEventDetail>) {
        let _tool = get(tool);
        if (!_tool) return;
        if (!_tool.zoom) return;
        _tool.zoom(event);
    }
</script>

<div class="w-full grow relative overflow-hidden min-w-0"
    style="--camX: {$vp.camX}px; --camY: {$vp.camY}px; --zoom: {$vp.zoom};">

    <label class="flex flex-col w-full h-full" for="input-image">
        <input disabled={$vp.image != null}
            type="file"
            id="input-image"
            accept="image/*"

            hidden
            style="user-select: none"
            
            on:change={handleFileChange}/>

        {#if $vp.loading}
            <div class="viewer-overlay">
                <h1>Loading...</h1>
            </div>
        {/if}
        {#if $vp.alert}
            <div class="viewer-overlay">
                {#if $vp.alertBody}
                    <svelte:component this={$vp.alertBody} />
                {/if}
            </div>
        {/if}
        <SidePanel closed={!$vp.setting} vps={vps} />
        {#if $vp.image}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div class="image-editor cursor-here"
                role="application"
                aria-label="Image editor"
                
                bind:this={editor}

                use:pan
                on:pandown={panOn}
                on:panup={panOff}
                on:panmove={panMove}
                
                use:pinch
                on:pinchdown={pinchOn}
                on:pinch={zoom}
                >

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
        {:else}
            <div class="flex flex-col items-center justify-center h-full w-full">
                <div class="upload-graphic flex flex-col items-center justify-center gap-4">
                    <div class="up"></div>
                    <h1>Upload and edit</h1>
                    <p>Drag and drop or click here to upload an image</p>
                </div>
            </div>
        {/if}
    </label>
</div>

<style>
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

        background: rgba(0, 0, 0, 0.5);

        z-index: 100;
    }

    .viewer-overlay h1 {
        color: white;
    }

    .disabled-tools {
        pointer-events: none;
        opacity: 0.5;
    }

    .up {
        width: 40%;
        height: 40%;
        background-color: slateblue;
        border-radius: 50%;
    }

    .upload-graphic {
        max-width: 60%;
        max-height: 60%;
        aspect-ratio: 1;
        
        flex-grow: 1;

        /* dashed border with rounded edges */
        border: .4rem dashed #000;
        border-radius: 3rem;
    }

    .editor-button {
        background-color: white;
        color: black;
        border-radius: 0.5rem;
        padding: 0.5rem;
    }

    .editor-button:disabled {
        background: blue;
    }

    .editor-button {
        flex-grow: 1;
        background-color: white;
        border-radius: 0.5rem;
        padding: 0.5rem;
    }

    .image-editor {
        user-select: none;
        width: 100%;
        height: 100%;
        position: relative;
        /* background: black; */
        overflow: hidden;

        background-color: #262629;

        /* click through */
    }

    .image-editor.move-cursor {
        cursor: grab;
    }

    .image-editor.grabbing-cursor {
        cursor: grabbing;
    }

    .image-editor.transform-cursor > .editor-image-container {
        cursor: crosshair
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
        
        background-color: white;
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                        linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
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