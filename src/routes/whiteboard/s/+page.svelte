
<script lang="ts">
    import { goto } from "$app/navigation";
    import TransformPoint from "$lib/TransformPoint.svelte";
    import TransformRegion from "$lib/TransformRegion.svelte";
    import { pan, pinch, type GestureCustomEvent, type PinchPointerEventDetail } from 'svelte-gestures';

    let imageRaw: File;
    let image = "";

    function handleFileChange(event: Event) {
        let input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            let reader = new FileReader();
            reader.onload = (e) => {
                image = e.target?.result as string;
            }
            imageRaw = input.files[0];
            reader.readAsDataURL(imageRaw);
        }
    }

    const Tools = {
        MOVE: 0,
        ZOOM: 1,
        TRANSFORM: 2,
    }

    function calculateAngleFromReference(
        p: { x: number; y: number },
        cx: number,
        cy: number,
    ): number {
        // Calculate angle from reference point (cx, cy) to point p
        return Math.atan2(p.y - cy, p.x - cx);
    }

    function sortQuadPointsClockwiseFromTopLeft(
        quadPoints: { x: number, y: number }[],
    ): { x: number, y: number }[] {
        // Find centroid as reference point
        let cx = 0,
            cy = 0;
        for (let point of quadPoints) {
            cx += point.x;
            cy += point.y;
        }
        cx /= quadPoints.length;
        cy /= quadPoints.length;

        // Calculate angles from centroid to each point
        let angles: { point: { x: number, y: number }; angle: number }[] = quadPoints.map(
            (point) => {
                let angle = calculateAngleFromReference(point, cx, cy);
                return { point, angle };
            },
        );

        // Sort points based on angle from reference point (centroid)
        angles.sort((a, b) => a.angle - b.angle);

        // Extract sorted points
        let sortedQuadPoints = angles.map((item) => item.point);

        return sortedQuadPoints;
    }

    let tool = Tools.MOVE;

    let dragging = false;

    let zoom = 1;
    let zoomPercent = "100";

    let transformPoints: {x: number, y: number}[] = [];

    let camX = 10;
    let camY = 10;

    let imgW = 0;
    let imgH = 0;

    let editor: HTMLDivElement;

    $: zoom = Math.max(0.1, zoom)
    $: zoomPercent = `${Math.round(zoom * 100)}`;
    $: editorCursor = dragging ?
        "grabbing-cursor":
        tool === Tools.MOVE ?
            "move-cursor":
            tool === Tools.TRANSFORM ?
                "transform-cursor":
                "";

    let loading = false;

    function zoomIn() {
        zoom *= 1.1;
    }

    function zoomOut() {
        zoom /= 1.1;
    }

    function moveX(amount: number) {
        camX += amount/zoom;
    }

    function moveY(amount: number) {
        camY += amount/zoom;
    }

    let startPanX = 0;
    let startPanY = 0;
    let startPanDetailX = 0;
    let startPanDetailY = 0;
    function panDown(event: GestureCustomEvent) {
        if (event.detail.event.pointerType === "mouse" && event.detail.event.button === 0) {
            if (tool !== Tools.MOVE) return;
        }

        startPanX = camX;
        startPanY = camY;
        startPanDetailX = event.detail.x;
        startPanDetailY = event.detail.y;
        dragging = true;
    }

    function panUp(event: GestureCustomEvent) {
        // if (tool !== Tools.MOVE) return;
        dragging = false;
    }

    function panMove(event: GestureCustomEvent) {
        // if (tool !== Tools.MOVE || !dragging) return;
        if (!dragging) return;
        camX = startPanX + startPanDetailX/zoom - event.detail.x/zoom;
        camY = startPanY + startPanDetailY/zoom - event.detail.y/zoom;
    }

    let editorMouseX = 0;
    let editorMouseY = 0;
    function fancyZoom(delta: number) {
        camX += editorMouseX * (1 - delta) / zoom;
        camY += editorMouseY * (1 - delta) / zoom;
        zoom /= delta;
    }

    function handleZoom(event: WheelEvent) {
        if (!editor) return;
        let rect = editor.getBoundingClientRect();
        
        if (dragging) {
            camX = startPanX + startPanDetailX/zoom - (event.x - rect.left)/zoom;
            camY = startPanY + startPanDetailY/zoom - (event.y - rect.top)/zoom;
            dragging = false;
        }

        let delta = 1 + event.deltaY / 1000;

        if (zoom / delta < 0.1) {
            delta = zoom / 0.1;
        }

        editorMouseX = event.x - rect.left;
        editorMouseY = event.y - rect.top;

        fancyZoom(delta);
    }

    let lastPinch = -1;
    function startPinch() {
        lastPinch = -1;
    }

    function onPinch(event: CustomEvent<PinchPointerEventDetail>) {
        if (dragging) {
            camX = startPanX + startPanDetailX/zoom - event.detail.center.x/zoom;
            camY = startPanY + startPanDetailY/zoom - event.detail.center.y/zoom;
            dragging = false;
        }
        lastPinch = event.detail.scale;
        editorMouseX = event.detail.center.x;
        editorMouseY = event.detail.center.y;
    }

    function handlePinch(event: CustomEvent<PinchPointerEventDetail>) {
        if (lastPinch == -1) {
            onPinch(event);
            return;
        }
        let delta = lastPinch / event.detail.scale;

        // let delta = (event.detail.scale - 1) / 10000;

        // if (zoom / delta < 0.1) {
        //     delta = zoom / 0.1;
        // }

        fancyZoom(delta);

        lastPinch = event.detail.scale;
    }

    function onZoomInput() {
        let newZoom = parseInt(zoomPercent) / 100;
        editorMouseX = 0.5;
        editorMouseY = 0.5;

        let delta = zoom / newZoom;
        fancyZoom(delta);
    }

    function setTransform(event: MouseEvent) {
        if (tool !== Tools.TRANSFORM) return;


        if (transformPoints.length < 4) {
            transformPoints = [
                ...transformPoints,
                {x: event.offsetX, y: event.offsetY}
            ]
        } else {
            // find nearest point and set it
            let nearest = transformPoints.reduce((prev, curr) => {
                let prevDist = Math.sqrt((prev.x - event.offsetX) ** 2 + (prev.y - event.offsetY) ** 2);
                let currDist = Math.sqrt((curr.x - event.offsetX) ** 2 + (curr.y - event.offsetY) ** 2);

                return prevDist < currDist ? prev : curr;
            });

            nearest.x = event.offsetX;
            nearest.y = event.offsetY;

            transformPoints = [...transformPoints];
        }

        if (transformPoints.length == 4) {
            transformPoints = sortQuadPointsClockwiseFromTopLeft(transformPoints);
        }
    }

    function startProcess() {
        loading = true;
        // api call to POST localhost:3046/start
        // multipart form data
        // store result (text) in a variable

        let formData = new FormData();

        // image from URL
        formData.append("image", imageRaw);

        if (transformPoints.length == 4) {
            let pointsStr = "";
            for (let point of transformPoints) {
                // scale point to natural image size

                pointsStr += `,${point.x},${point.y}`;
            }
            pointsStr = pointsStr.slice(1);

            formData.append("quad_points", pointsStr);
        }

        fetch("https://api.jackyoung.xyz/whiteboard/start", {
            method: "POST",
            body: formData,
        })
        .then(async (response) => {
            //navigate to /whiteboard/s/+page

            // store result in a variable
            loading = false;
            goto(`/whiteboard/s/${await response.text()}`);
        });
    }

    function centerCamera() {
        let editorRect = editor.getBoundingClientRect();
        
        zoom = Math.min(editorRect.width / imgW, editorRect.height / imgH);
        camX = -(editorRect.width/2) / zoom + imgW/2;
        camY = -(editorRect.height/2) / zoom + imgH/2;
    }
</script>

<svelte:window on:wheel={handleZoom} />

<label class="flex flex-col w-full h-full" for="input-image" style="--camX: {camX}px; --camY: {camY}px; --zoom: {zoom};">
    <input disabled={image != ""} type="file" id="input-image" accept="image/*" on:change={handleFileChange} hidden style="user-select: none" />
    <div class="flex {(loading || image == "") ? "disabled-tools" : ""} overflow-x-auto">
        <div class="flex gap-4 items-start grow p-4 w-min">
            <button class="editor-button">Quit</button>
            <div class="w-max h-min">
                <input type="text" bind:value={zoomPercent} on:change={onZoomInput}/>
                <button class="editor-button"on:click={zoomOut}>-</button>
                <button class="editor-button" on:click={zoomIn}>+</button>
                <button class="editor-button" on:click={centerCamera}>Center</button>
            </div>
            <button class="editor-button" disabled={tool == Tools.MOVE}  on:click={() => tool = Tools.MOVE}>Grab</button>
            <div class="flex">
                <button class="editor-button" disabled={tool == Tools.TRANSFORM}  on:click={() => tool = Tools.TRANSFORM}>Transform</button>
                {#if transformPoints.length == 4}
                    <button class="editor-button" on:click={() => transformPoints=[]} >Reset</button>
                {/if}
            </div>
        </div>
        <div class="place-items-end p-4">
            <button class="editor-button" disabled={loading || image == ""} on:click={startProcess}>Start</button>
        </div>
    </div>
    {#if loading}
        <div class="flex flex-col items-center justify-center h-full w-full">
            <div class="flex flex-col items-center justify-center gap-4">
                <div class="up"></div>
                <h1>Loading...</h1>
                <p>Your session is being set up</p>
            </div>
        </div>
    {:else if image}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div class="image-editor {editorCursor}" role="application" aria-label="Image editor"
            bind:this={editor}

            use:pan
            on:pandown={panDown}
            on:panup={panUp}
            on:panmove={panMove}

            on:pinchdown={startPinch}
            use:pinch
            on:pinch={handlePinch}
            >
            <div class="editor-image-container">
                <img draggable="false" id="input-file" src="{image}" alt="uploaded in editor" class="editor-image" bind:naturalWidth={imgW} bind:naturalHeight={imgH} on:load={centerCamera}/>
                <div class="image-overlay">
                    <div id="overlay-container">
                        {#each transformPoints as point}
                            <TransformPoint x={point.x} y={point.y} />
                        {/each}
                        {#if (transformPoints.length == 4)}
                            <TransformRegion points={transformPoints} />
                        {/if}
                    </div>
                </div>
                <button class="image-click-handler" on:click={setTransform} />
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

<style>
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

        transform: 
            translate(calc(-1 * var(--camX) * var(--zoom)), calc(-1 * var(--camY) * var(--zoom)))
            scale(var(--zoom));

        box-shadow: 0 0 100px 100px rgba(0, 0, 0, .2);

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