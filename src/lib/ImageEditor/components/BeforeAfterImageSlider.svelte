<script lang="ts">
    import { AspectRatio } from "bits-ui";

    let beforeAfterPosition = 75;
</script>

<!-- <div class="flex h-full w-full justify-center relative"> -->
<AspectRatio.Root ratio={589 / 457}>
    <div style="--position: {beforeAfterPosition}%" class="container">
            <img alt="before" src="wb-before.png" class="slider-image image-before">
            <img alt="after" src="wb-after.png" class="slider-image image-after">
        <input type="range" min="0" max="100" bind:value={beforeAfterPosition} class="slider" id="myRange" aria-label="before after slider">
        <div class="slider-line"></div>
        <div class="slider-button"></div>
    </div>
</AspectRatio.Root>
<!-- </div> -->


<style>
*,
*::after,
*::before {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

    img {
        display: block;
        max-width: 100%;
    }

    .container {
        height: 100%;
        width: 100%;
        /* aspect-ratio: 589/457; */
        display: grid;
        place-content: center;
        position: relative;
        overflow: hidden;
        border-radius: 1rem;
        --position: 50%;
    }
    .slider-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: left;
    }

    .image-before {
        position: absolute;
        inset: 0;
        width: var(--position);
    }

    .slider {
        position: absolute;
        inset: 0;
        cursor: pointer;
        opacity: 0;
        /* For firefox */
        width: 100%;
        height: 100%;   
    }

    .slider-line {
        position: absolute;
        inset: 0;
        width: .2rem;
        height: 100%;
        background-color: #fff;
        z-index: 10;
        left: var(--position);
        transform: translate(-50%);
        pointer-events: none;
    }

    .slider-button {
        position: absolute;
        background-color: #fff;
        color: #000;
        padding: .5rem;
        border-radius: 100vw;
        display: grid;
        place-items: center;
        top: 50%;
        left: var(--position);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 100;
        box-shadow: 1px, 1px, 1px, hsl(0, 50%, 2%, .5);
    }

    /* .image-after {
        position: absolute;
        inset: 0;
        width: calc(100% - var(--position));
    } */
</style>