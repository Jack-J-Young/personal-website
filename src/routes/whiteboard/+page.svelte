<svelte:head>
    <title>Whiteboard processor</title> 
    <meta name="description" content="Web app for processing pictures of whiteboards" />
</svelte:head>

<script lang="ts">
    import LoadingSpinner from "$lib/LoadingSpinner.svelte";
    import DebugPopup from "../../lib/DebugPopup.svelte";
    import ImageViewer from "../../lib/ImageViewer.svelte";
    import { Separator } from "bits-ui";
    import { onMount } from "svelte";

    // TEMPOPARY
    // TODO: move server
    import { AlertDialog } from "bits-ui";
    let isOpen = false;

    // Trigger the dialog to open on page load
    onMount(() => {
        isOpen = true;
    });

    function closeDialog() {
        isOpen = false;
    }



    // import UIButtons from '../UIButtons.svelte';
    let imageViewer: ImageViewer;

    let imageSrc = "";
    let returnSrc = "";

    let isLoading = false;
    let showPopup = false;

    const processorApiUrl = 'https://api.jackyoung.xyz'
    //const processorApiUrl = 'https://localhost';

    function handleFileChange(event: any) {
        const target = event.target;
        const file = target.files ? target.files[0] : null;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                var result = e.target?.result;
                if (typeof result === "string") {
                    imageSrc = result;
                    imageViewer.loadImageFromSrc(imageSrc);
                }
            };
            reader.readAsDataURL(file);
        }
    }

    // function loadImageIntoCanvas() {
    //     if (!imageSrc || !overlayCanvas) return;

    //     const img = new Image();
    //     img.onload = () => {
    //         const ctx = overlayCanvas.getContext("2d");
    //         if (ctx) {
    //             overlayCanvas.width = img.width;
    //             overlayCanvas.height = img.height;
    //             ctx.drawImage(img, 0, 0); // Draw image onto canvas at (0,0)
    //         }
    //     };
    //     img.src = imageSrc;
    // }

    function triggerFileInput() {
        document.getElementById("fileInput")?.click();
    }

    async function downloadFileFromResponse(response: Response) {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "transformed_image.png"; // Set the download filename
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url); // Clean up
    }

    async function requestTransformedImage() {
        if (!imageSrc) {
            alert("Please upload an image");
            return;
        }

        if (!imageViewer.hasQuads()) {
            alert("Please select a region to transform");
            return;
        }

        isLoading = true;

        let imgResponse = await fetch(imageSrc);
        let blob = await imgResponse.blob();

        // let imageData: ImageData = {
        //     image: new File([blob], 'image.jpg', { type: 'image/jpeg' }),
        //     quadPoints: imageViewer.getQuadPoints(),
        // };

        let formData = new FormData();
        formData.append("image", blob);
        let quadPoints = imageViewer.getQuadPoints();
        let formPoints = "";

        for (let i = 0; i < quadPoints.length; i++) {
            formPoints += `${i == 0 ? '' : ','}${quadPoints[i].x},${quadPoints[i].y}`;
        }

        formData.append("quad_points", formPoints);

        try {
            let response = await fetch(`${processorApiUrl}/whiteboard/process`, {
                method: "POST",
                body: formData,
            });

            isLoading = false;
            // downloadFileFromResponse(response)
            const blobData = await response.blob();
            returnSrc = URL.createObjectURL(blobData);
            showPopup = true;
            
        }
        catch (error) {
            console.error("Error processing image", error);
            alert("Error processing image, more details in developer console");
            isLoading = false;
            return;
        }
    }

    function closePopup() {
        showPopup = false;

        URL.revokeObjectURL(returnSrc);
        returnSrc = "";
    }
</script>

<div class="h-full flex mx-auto flex-col">
    <AlertDialog.Root open={isOpen} >
        <AlertDialog.Trigger>
          <button class="hidden">Trigger</button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            transitionConfig={{ duration: 150 }}
            class="fixed inset-0 z-50 bg-black/80"
          />
          <AlertDialog.Content
            class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-card-lg border bg-background p-7 shadow-popover outline-none sm:max-w-lg md:w-full"
          >
            <div class="flex flex-col gap-4 pb-6">
              <AlertDialog.Title class="text-lg font-semibold tracking-tight"
                >API Down</AlertDialog.Title
              >
              <AlertDialog.Description class="text-sm text-foreground-alt">
                I'm currently moving the API to a new server, please check back later.
              </AlertDialog.Description>
            </div>
            <div class="flex w-full items-center justify-center gap-2">
              <AlertDialog.Cancel
                class="inline-flex h-input w-full items-center justify-center rounded-input bg-muted text-[15px] font-medium shadow-mini transition-all hover:bg-dark-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
                >Close</AlertDialog.Cancel
              >
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    <div class="h-5/6 max-h-5/ p-4">
        <div class="h-full w-full">
            <ImageViewer {imageSrc} bind:this={imageViewer} />
        </div>
        <input
            id="fileInput"
            class="hidden-file-input"
            type="file"
            accept="image/*"
            on:change={handleFileChange}
        />
    </div>
    <div class="h-1/6 max-h-1/6 flex flex-row justify-center overflow-hidden">
        <button class="text-white upload-button p-4" on:click={triggerFileInput}>
            Upload Image</button
        >
		<Separator.Root orientation="vertical" class="my-4 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[4px]"></Separator.Root>
        <button class="text-white generate-button p-4" on:click={requestTransformedImage}>
            {isLoading ? 'Processing...' : 'Process'}
        </button>
		<Separator.Root orientation="vertical" class="my-4 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[4px]"></Separator.Root>
        <div class="flex flex-col justify-center">
            <span class="text-white p-4 overflow-x-hidden overflow-y-auto">Upload an image and click on the corners of the whiteboard, when the corners are correct, click 'Generate...' to process your image</span>
        </div>
    </div>
    <DebugPopup {showPopup} imageSrc={returnSrc} onClose={closePopup} />
</div>


<style>
    .hidden-file-input {
        display: none;
    }

    .image-viewer {
        height: 80%;
        width: 80%;
    }
</style>