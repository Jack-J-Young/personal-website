<script lang="ts">
    import { onDestroy } from "svelte";

    import Button from "$lib/ui/Button.svelte";
    import Text from "$lib/ui/Text.svelte";
    import { describeMicrophoneError, startCapture, type AudioCapture } from "$lib/audio";
    import { perceivedLevel } from "./loudness";

    export let minWindowSeconds: number | undefined = undefined;
    export let maxBinWidth: number | undefined = undefined;
    export let startLabel = "Start listening";

    /** Called once per animation frame while listening. */
    export let read: (capture: AudioCapture) => void;

    /**
     * Called when listening begins, after permission has been granted. Anything timing the user
     * needs this rather than component setup: the gap between the page loading and the microphone
     * opening is however long it took to find the Allow button.
     */
    export let begin: () => void = () => {};

    /** Called when listening stops, so the display can clear rather than freeze on a stale value. */
    export let reset: () => void = () => {};

    /**
     * The meter reads the tail of the window rather than all of it. A window long enough to
     * resolve chords spans three quarters of a second, and averaging a meter over that much audio
     * makes it lag far enough behind the playing to look broken.
     */
    const METER_SECONDS = 0.05;

    let state: "idle" | "starting" | "listening" | "error" = "idle";
    let message = "";
    let level = 0;
    let capture: AudioCapture | null = null;
    let frame = 0;

    async function start() {
        state = "starting";

        try {
            capture = await startCapture({ minWindowSeconds, maxBinWidth });
            state = "listening";
            begin();
            listen();
        } catch (error) {
            message = describeMicrophoneError(error);
            state = "error";
        }
    }

    function listen() {
        frame = requestAnimationFrame(listen);
        if (!capture) return;

        level = capture.readLevel(METER_SECONDS);
        read(capture);
    }

    function stop() {
        // Guarded because onDestroy also runs during server rendering, where there is no frame to
        // cancel and no such function to call.
        if (frame) cancelAnimationFrame(frame);

        capture?.stop();
        capture = null;
        level = 0;
        state = "idle";
        reset();
    }

    // Leaving the page has to release the microphone: the browser's recording indicator stays lit
    // otherwise, which reads as the site still listening after you have left it.
    onDestroy(stop);
</script>

<div class="gate">
    {#if state === "listening"}
        <slot />

        <div class="footer">
            <div
                class="level"
                role="meter"
                aria-label="Input level"
                aria-valuenow={Math.round(level * 100)}>
                <div class="level-fill" style="--filled: {perceivedLevel(level)}"></div>
            </div>
            <Button variant="ghost" size="sm" on:click={stop}>Stop</Button>
        </div>

        {#if capture && capture.unwantedProcessing.length > 0}
            <Text size="sm" muted>
                Your browser is still applying {capture.unwantedProcessing.join(" and ")} to the
                microphone, which will make readings jump around. Turning it off in the browser's
                microphone settings will help.
            </Text>
        {/if}
    {:else}
        <div class="start">
            <Button size="lg" disabled={state === "starting"} on:click={start}>
                {state === "starting" ? "Waiting for permission…" : startLabel}
            </Button>

            {#if state === "error"}
                <Text size="sm" muted>{message}</Text>
            {:else}
                <Text size="sm" muted>
                    The audio is analysed on this device and never leaves it.
                </Text>
            {/if}
        </div>
    {/if}
</div>

<style>
    .gate {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .start {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem 0;
        text-align: center;
    }

    .footer {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .level {
        flex-grow: 1;
        height: 0.5rem;
        overflow: hidden;

        border-radius: var(--radius-sm);
        background-color: var(--surface-raised);
    }

    .level-fill {
        height: 100%;
        width: calc(var(--filled) * 100%);

        background-color: var(--accent);
        transition: width 80ms linear;
    }
</style>
