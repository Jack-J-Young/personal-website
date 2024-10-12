<script lang="ts">
    export let text: string = "Editor Button";

    export let icon: string | null = null;

    export let disabled = false;

    export let click: () => void = () => {};
</script>

<button class="editor-button" on:click={click} disabled={disabled} >
    <h1>{text}</h1>
    {#if icon}
        <img src={icon} alt="icon" />
    {/if}
</button>

<style>
    .editor-button {
        display: flex;

        align-items: center;

        border-radius: 1rem;
        padding: 0.35rem 1rem 0.35rem 1rem;
        gap: 1rem;

        box-shadow: inset 0 0px 0px rgba(0, 0, 0, 0.5);
        background: #7979FF linear-gradient(
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.0) 60%,
            rgba(0, 0, 0, 0.2)
        );
        border-radius: 0.6rem;

        transition: box-shadow 0.25s;
        /* transition: box-shadow 0.25s; */
        /* animation: background 0.5s; */
    }

    .editor-button * {
        transition: transform 0.25s;
        transform: translate(0, 0);
    }

    .editor-button:enabled:hover {
        /* animation: background 0.5s; */

        box-shadow: inset 0 2px 0px rgba(0, 0, 0, 0.5);
        background: #7979FF linear-gradient(
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.0) 60%,
            rgba(0, 0, 0, 0.2)
        );

        transition: box-shadow 0s;
    }

    .editor-button:enabled:hover * {
        transform: translate(0, 2px);

        transition: transform 0s;
    }

    .editor-button:disabled {
        background: #6565d3 linear-gradient(
                0deg,
                rgba(255, 255, 255, 0.2),
                rgba(255, 255, 255, 0.0) 8px,
                rgba(0, 0, 0, 0.3));
        box-shadow: inset 0 0px 10px rgba(0, 0, 0, 0.8);

        transition: box-shadow 0s;
    }

    .editor-button:disabled * {
        transform: translate(0, 2px);

        transition: transform 0s;
    }

    .editor-button h1 {
        color: transparent;
        font-size: 1rem;
        font-weight: bold;
        /* vertical allign */
        line-height: 2rem;

        background: #2A2B2D
            linear-gradient(
                rgba(255, 255, 255, 0.1),
                rgba(255, 255, 255, 0.0)
            );
        
        background-clip: text;
        -webkit-background-clip: text;
    }

    .editor-button img {
        height: 1rem;
    }
</style>