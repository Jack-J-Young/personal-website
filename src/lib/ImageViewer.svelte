<script lang="ts">
    import type { Vector2D, DrawArgs } from "./types";
    
    export let imageSrc = "";
    let overlayCanvas: HTMLCanvasElement;

    let quadPoints: Vector2D[] = [];

    export function hasQuads() {
        return quadPoints.length >= 4;
    }

    export function getQuadPoints() {
        return quadPoints;
    }

    export function loadImageFromSrc(src: string) {
        quadPoints = [];
        imageSrc = src;
        if (!overlayCanvas)
            overlayCanvas = document.createElement("canvas");
        loadImageIntoCanvas();
    }

    function loadImageIntoCanvas() {
        if (!imageSrc || !overlayCanvas) return;
        const img = new Image();

        img.onload = () => {
            const ctx = overlayCanvas.getContext("2d");
            if (ctx) {
                overlayCanvas.width = img.width;
                overlayCanvas.height = img.height;
                ctx.drawImage(img, 0, 0); // Draw image onto canvas at (0,0)
                console.log("Image loaded into canvas");
            }
        };
        img.src = imageSrc;
    }

    function calculateAngleFromReference(
        p: Vector2D,
        cx: number,
        cy: number,
    ): number {
        // Calculate angle from reference point (cx, cy) to point p
        return Math.atan2(p.y - cy, p.x - cx);
    }

    function sortQuadPointsClockwiseFromTopLeft(
        quadPoints: Vector2D[],
    ): Vector2D[] {
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
        let angles: { point: Vector2D; angle: number }[] = quadPoints.map(
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
    function handleImageClick(event: MouseEvent) {
        if (!overlayCanvas) {
            console.error("Overlay canvas is not initialized.");
            return;
        }
        const imgElement = event.target as HTMLCanvasElement;
        const imgRect = imgElement.getBoundingClientRect();

        // Calculate the click coordinates relative to the image
        const scaleX = imgElement.width / imgRect.width;
        const scaleY = imgElement.height / imgRect.height;

        const x = (event.clientX - imgRect.left) * scaleX;
        const y = (event.clientY - imgRect.top) * scaleY;

        console.log(`Clicked coordinates on image: (${x}, ${y})`);

        if (quadPoints.length >= 4) {
            quadPoints = [];
            drawQuadPreview(quadPoints);
            return;
        }
        quadPoints.push({ x, y });

        if (quadPoints.length >= 4) {
            quadPoints = sortQuadPointsClockwiseFromTopLeft(quadPoints);
        }

        drawQuadPreview(quadPoints);
        // drawCross(x, y);
    }

    function drawQuadPreview(
        quadPoints: Vector2D[],
        drawConfig: DrawArgs = {
            crossLength: 20,
            crossThickness: 8,
            lineThickness: 8,
            color: "red",
            topleftColor: "green",
        },
    ) {
        if (!overlayCanvas) {
            console.error("Overlay canvas is not initialized.");
            return;
        }

        const ctx = overlayCanvas.getContext("2d");
        if (ctx) {
            // Clear previous drawings
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            // Draw the image on the canvas first (assuming imageSrc is set properly)
            if (imageSrc) {
                const img = new Image();
                img.onload = () => {
                    overlayCanvas.width = img.width; // Set canvas width to image width
                    overlayCanvas.height = img.height; // Set canvas height to image height
                    ctx.drawImage(img, 0, 0); // Draw image at (0, 0)

                    // Draw the quad preview over the image
                    ctx.strokeStyle = drawConfig.color;
                    ctx.lineWidth = drawConfig.lineThickness/1000 * img.width;
                    
                    if (quadPoints.length >= 4) {
                        // Draw the lines
                        ctx.beginPath();
                        ctx.moveTo(quadPoints[0].x, quadPoints[0].y);
                        ctx.lineTo(quadPoints[1].x, quadPoints[1].y);
                        ctx.lineTo(quadPoints[2].x, quadPoints[2].y);
                        ctx.lineTo(quadPoints[3].x, quadPoints[3].y);
                        ctx.lineTo(quadPoints[0].x, quadPoints[0].y);
                        ctx.stroke();
                    }

                    // Draw the cross over the image
                    // ctx.strokeStyle = drawConfig.color;
                    ctx.lineWidth = drawConfig.crossThickness/1000 * img.width;
                    
                    let relLength = drawConfig.crossLength/1000 * img.width;

                    // Draw the crosses
                    for (const point of quadPoints) {

                        if (quadPoints.indexOf(point) === 0 && quadPoints.length === 4)
                            ctx.strokeStyle = drawConfig.topleftColor;
                        else
                            ctx.strokeStyle = drawConfig.color;
                        // Horizontal line
                        ctx.beginPath();
                        ctx.moveTo(point.x - relLength, point.y);
                        ctx.lineTo(point.x + relLength, point.y);
                        ctx.stroke();

                        // Vertical line
                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y - relLength);
                        ctx.lineTo(point.x, point.y + relLength);
                        ctx.stroke();
                    }

                    // console.log(`Drawn quad preview at coordinates: (${quadPoints[0].x}, ${quadPoints[0].y}), (${quadPoints[1].x}, ${quadPoints[1].y}), (${quadPoints[2].x}, ${quadPoints[2].y}), (${quadPoints[3
                    // ].x}, ${quadPoints[3].y})`);
                };
                img.src = imageSrc; // Set the image source
            } else {
                console.error("Image source is not set.");
            }
        } else {
            console.error("Could not get 2D context from overlay canvas.");
        }
    }

    function drawCross(x: number, y: number) {
        if (!overlayCanvas) {
            console.error("Overlay canvas is not initialized.");
            return;
        }

        const ctx = overlayCanvas.getContext("2d");
        if (ctx) {
            // Clear previous drawings
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            // Draw the image on the canvas first (assuming imageSrc is set properly)
            if (imageSrc) {
                const img = new Image();
                img.onload = () => {
                    overlayCanvas.width = img.width; // Set canvas width to image width
                    overlayCanvas.height = img.height; // Set canvas height to image height
                    ctx.drawImage(img, 0, 0); // Draw image at (0, 0)

                    // Draw the cross over the image
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 2;

                    // Horizontal line
                    ctx.beginPath();
                    ctx.moveTo(x - 10, y);
                    ctx.lineTo(x + 10, y);
                    ctx.stroke();

                    // Vertical line
                    ctx.beginPath();
                    ctx.moveTo(x, y - 10);
                    ctx.lineTo(x, y + 10);
                    ctx.stroke();

                    console.log(`Drawn cross at coordinates: (${x}, ${y})`);
                };
                img.src = imageSrc; // Set the image source
            } else {
                console.error("Image source is not set.");
            }
        } else {
            console.error("Could not get 2D context from overlay canvas.");
        }
    }
</script>

{#if imageSrc}
    <div class="parent-div">
        <!-- <input type="file" accept="image/*" on:change="{handleFileChange}" /> -->
        <!-- {#if imageSrc} -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div class="image-container">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <!-- svelte-ignore a11y-img-redundant-alt -->
            <img src={imageSrc} alt="Error unable to render image" />
            <canvas
                bind:this={overlayCanvas}
                on:click={handleImageClick}
                tabindex="0"
            />
        </div>
        <!-- {/if} -->
    </div>
{/if}

<style>
    /* .parent-div {
        height: 100%;
        width: 100%;
    }

    .image-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: inherit;
        width: inherit;
    } */

    img {
        display: none;
    }

    canvas {
        object-fit: contain; /* Ensure the image is fully visible within the container */
        cursor: crosshair;
    }
</style>
