<script lang="ts">
    import BeforeAfterImageSlider from "$lib/BeforeAfterImageSlider.svelte";
    let innerWidth = 0
    let innerHeight = 0

    $: mobileSite = innerWidth < innerHeight * 1.3
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="flex flex-col h-full w-full relative {mobileSite ? "pl-2 pr-2" : "pl-20 pr-20"}">
    <h1 class="text-6xl text-center m-12 text-white"><b>Whiteboard processor</b></h1>
    <div class="grow flex flex-col">
        <div class="flex max-h-full {mobileSite ? "flex-col" : ""}">
            <div class="grow flex flex-col items-center m-4">
                <div class="w-full pl-20 pr-20">
                    <BeforeAfterImageSlider />
                </div>
                <h2 class="text-2xl text-white m-2">Before and After</h2>
            </div>
            <div class="grow flex flex-col justify-center items-center">
                <a class="bg-white text-black rounded-md p-8 text-3xl" href="/whiteboard/s/">Start</a>
            </div>
        </div>
        <div class="pl-20 pr-20 pt-10">
            <h2 class="text-2xl text-white">About</h2>
            <p class="text-white">This is a image processor for whiteboards and pages, I'm currently rolling out a new UI so there are bugs and lots of the assests and styling is placeholder. 
                However the functionality is all there and the UX is a huge improvement over the previous version.
            </p>
        </div>
        <div class="pl-20 pr-20 pt-10">
            <h2 class="text-2xl text-white">Changes</h2>
            <!-- bullet points -->
            <list class="change-list">
                <ul>You can now chose not to perspective transform the image before uploading</ul>
                <ul>Selecting more than 4 points no longer resets all points</ul>
                <ul>If you select more than 4 points, the closes point will be moved instead</ul>
                <ul>Added an option to manually reset transform points</ul>
                <ul>Added image viewer with zooming and panning with mouse and ui controlls</ul>
                <ul>In the session you can change the processing options</ul>
                <ul>In the session a low-res preview is show and updated from options</ul>
                <ul>Added option: transparent mode</ul>
                <ul>Added option: dark mode (invert and hue-shift)</ul>
                <ul>Added download and copy to clipboard buttons after processing image</ul>
            </list>
        </div>
        <div class="pl-20 pr-20 pt-10 pb-20">
            <h2 class="text-2xl text-white">Privacy</h2>
            <p class="text-white">Current files are stored until I delete them, this will be changes so after a period of inactivity on you session it will auto-delete aswell as options to delete the session manually</p>
        </div>
    </div>
</div>

<style>
    .change-list {
        color: white;
    }

    .change-list ul::before {
        content: "•";
        color: white;
        font-size: 1.5em;
        margin-right: 0.5em;
    }
</style>