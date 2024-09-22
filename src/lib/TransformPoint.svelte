<script>
    export let x = 0;
    export let y = 0;
</script>

<div class="transform-point-area" style="transform: translate({x}px, {y}px)">
    <div class="transform-point"></div>
</div>

<style>
    .transform-point-area {
        width: 50px;
        height: 50px;

        /* circle border 2px red */
        border: 2px solid red;
        border-radius: 50%;
        position: absolute;
        left: -25px;
        top: -25px;
        padding: 0;
        margin: 0;

        /* center children horizontally and vertically */

        display: flex;
        justify-content: center;
        align-items: center;
    }

    .transform-point {
        width: 2px;
        height: 2px;

        /* circle 1px black */
        background-color: red;

        border-radius: 50%;
    }
</style>