<script lang="ts">
    import { page } from '$app/stores';
    import type { Page } from '@sveltejs/kit';
    import { Separator } from 'bits-ui';

    // Get the `id` param from the route
    $: id = ($page.params as { id: string }).id;// id param from url

    // Options
    let preview = true;
    let loading = false;

    let useTransparent = false;
    let useDarkMode = false;

    let editorImage: HTMLImageElement;

    function updateOptions() {
        preview = true;
        loading = true;

        // form data with tansparent = useTransparent and dark_mode = useDarkMode
        const formData = new FormData();
        formData.append('transparent', useTransparent ? 'true' : 'false');
        formData.append('dark_mode', useDarkMode ? 'true' : 'false');

        // POST localhost:3046/s/{id}/options with form data

        fetch(`https://api.jackyoung.xyz/whiteboard/s/${id}/options`, {
            method: 'POST',
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to update options');
            }

            // Reload preview (url is already preview url)
            let lastUrl = editorImage.src;

            editorImage.src = `https://api.jackyoung.xyz/whiteboard/${id}/preview?${Date.now()}`;

            URL.revokeObjectURL(lastUrl);
            loading = false;
        }).catch(error => {
            console.error(error);
            loading = false;
        });
    }

    let processedBlob: Blob;
    async function processImage() {
        loading = true;
        preview = false;
        // POST localhost:3046/s/{id}/process

        let response = await fetch(`https://api.jackyoung.xyz/whiteboard/${id}/process`, {
            method: 'GET'
        });

        processedBlob = await response.blob();
        let url = URL.createObjectURL(processedBlob);

        editorImage.src = url;
        loading = false;
    }

    function clipImage() {
        // Copy editor image to clipboard
        let item = new ClipboardItem({ 'image/png': processedBlob });
        navigator.clipboard.write([item]);
    }

    function downloadImage() {
        // Download editor image
        let a = document.createElement('a');
        a.href = editorImage.src;
        a.download = 'processed.png';

        a.click();
    }

    // Tools
    const Tools = {
        MOVE: 0,
        ZOOM: 1,
        TRANSFORM: 2,
    }

    let tool = Tools.MOVE;

    let dragging = false;

    let zoom = 1;
    let zoomPercent = "100";

    let camX = 10;
    let camY = 10;

    let imgW = 0;
    let imgH = 0;
    
    let editor: HTMLDivElement;

    // $: imgW = boxSize.width;
    // $: imgH = boxSize.height;

    $: zoom = Math.max(0.1, zoom)
    $: zoomPercent = `${Math.round(zoom * 100)}`;
    $: editorCursor = dragging ?
        "grabbing-cursor":
        tool === Tools.MOVE ?
            "move-cursor":
            tool === Tools.TRANSFORM ?
                "transform-cursor":
                "";

    let buttonDown = -1;
    function startDrag(event: MouseEvent) {
        // check if not moving and the button is left click
        if ((tool !== Tools.MOVE && event.button == 0) || event.button == 2 || dragging) return;
        buttonDown = event.button;
        dragging = true;
    }

    function stopDrag(event: MouseEvent) {
        dragging = false;
    }

    function cancelDrag() {
        dragging = false;
    }

    let editorMouseX = 0;
    let editorMouseY = 0;
    function editorMouseMove(event: MouseEvent) {
        let editorRect = editor.getBoundingClientRect();

        editorMouseX = (event.clientX - editorRect.left);
        editorMouseY = (event.clientY - editorRect.top);

        if (!dragging) return;

        camX -= event.movementX / zoom;
        camY -= event.movementY / zoom;
    }

    function fancyZoom(delta: number) {
        camX += editorMouseX * (1 - delta) / zoom;
        camY += editorMouseY * (1 - delta) / zoom;
        zoom /= delta;
    }

    function handleZoom(event: WheelEvent) {
        let delta = 1 + event.deltaY / 1000;

        if (zoom / delta < 0.1) {
            delta = zoom / 0.1;
        }

        fancyZoom(delta);
    }

    function optionZoom(zoomPercent: string) {
        let newZoom = parseInt(zoomPercent) / 100;
        editorMouseX = 0.5;
        editorMouseY = 0.5;

        let delta = zoom / newZoom;
        fancyZoom(delta);
    }

    function centerCamera() {
        let editorRect = editor.getBoundingClientRect();
        
        zoom = Math.min(editorRect.width / imgW, editorRect.height / imgH);
        camX = -(editorRect.width/2) / zoom + imgW/2;
        camY = -(editorRect.height/2) / zoom + imgH/2;
    }
</script>

<svelte:window on:mousemove={editorMouseMove} on:wheel={handleZoom} />
<div class="w-full h-full flex justify-center items-center" style="--camX: {camX}px; --camY: {camY}px; --zoom: {zoom}">
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="image-editor {editorCursor}" role="application" aria-label="Image editor" bind:this={editor} on:mousedown={startDrag} on:mouseup={stopDrag} on:mouseleave={cancelDrag}>
        <div class="editor-image-container">
            <img bind:this={editorImage} draggable="false" id="input-file" src="https://api.jackyoung.xyz/whiteboard/{id}/preview" alt="processor preview" class="editor-image" bind:naturalWidth={imgW} bind:naturalHeight={imgH} on:load={centerCamera}/>
        </div>
        {#if loading}
            <div class="loading-overlay">
                <h2 class="loading-text" ><b>Loading...</b></h2>
            </div>
        {/if}
        <div class="options-pane">
            <div class="options-section">
                <h2 class="w-full text-center px-2 pb-2">Zoom</h2>
                <button on:click={centerCamera} class="w-full">Center camera</button>
                <p>Zoom: {zoomPercent}%</p>
                <input type="range" min="10" max="200" step="10" bind:value={zoomPercent} on:input={() => {optionZoom(zoomPercent)}} />
            </div>
            <Separator.Root orientation="horizontal" class="my-2 shrink-0 bg-border h-px w-full bg-white"></Separator.Root>
            <div class="options-section">
                <h2 class="w-full text-center px-2 pb-2">Options</h2>
                <label class="option" for="transparent-option">
                    <span>Transparent</span>
                    <input id="transparent-option" type="checkbox" bind:checked={useTransparent} on:change={updateOptions}/>
                </label>  
                <label class="option" for="transparent-option">
                    <span>Dark mode</span>
                    <input id="transparent-option" type="checkbox" bind:checked={useDarkMode} on:change={updateOptions} />
                </label>    
            </div>
            <Separator.Root orientation="horizontal" class="my-2 shrink-0 bg-border h-px w-full bg-white"></Separator.Root>
            <div class="options-section">
                <h2 class="w-full text-center px-2 pb-2">Save</h2>
                <div class="flex justify-center">
                    {#if loading}
                            <h2 class="text-center">Processing...</h2>
                    {:else if preview}
                        <button class="grow" on:click={processImage} >Process</button>
                    {:else}
                        <button class="grow" on:click={clipImage} >Clipboard</button>
                        <button class="grow" on:click={downloadImage} >Download</button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
    <!-- <img src="https://api.jackyoung.xyz/whiteboard/{id}/preview" alt="before" class="w-1/2 h-full object-cover"> -->
</div>

<style>
    /* Loading overlay */
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2;
    }

    .loading-text {
        color: white;
        font-size: 1.875rem;
        line-height: 2.25rem;

        padding: 3rem;

        background: rgba(0, 0, 0, 0.3);
        border-radius: 2rem;
    }

    /* Options */
    .options-pane {
        cursor: default;
        position: absolute;
        top: 0;
        right: 0;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.5);
        border-radius: .5rem;
        color: white;

        z-index: 2;
        margin: 1rem;
    }

    .options-section {
        padding: .1rem;
        display: flex;
        flex-direction: column;
    }

    .option {
        display: grid;
        grid-template-columns: 1fr min-content;
    }

    .option input {
        margin: 0.25rem;    
    }

    /* Editor */
    .image-editor {
        user-select: none;
        width: 100%;
        height: 100%;
        position: relative;
        /* background: black; */
        overflow: hidden;

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

        /* transform: scale(var(--zoom)); */
        /* left: var(--camX); */
        
        transform-origin: 0 0;
        /* transform-origin: var(--midX) var(--midY); */

        transform: 
            translate(calc(-1 * var(--camX) * var(--zoom)), calc(-1 * var(--camY) * var(--zoom)))
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
        /* max-height: 80vh; */
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        
        z-index: 1;
    }

    
</style>