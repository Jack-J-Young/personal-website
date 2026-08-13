<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import Button from "./Button.svelte";

    export let title: string;
    export let confirmLabel = "Continue";
    export let cancelLabel = "Cancel";

    const dispatch = createEventDispatcher<{ confirm: null; cancel: null }>();

    let dialog: HTMLDialogElement;

    /**
     * Opens the dialog. Asking again while it is already open is a no-op rather than an error.
     *
     * Deliberately a method and not an `open` prop: a confirmation is a question being asked
     * once, not a state worth mirroring. A boolean has to be written back when the browser
     * dismisses the dialog itself, and a single missed `close` event would leave the prop
     * disagreeing with the element — after which asking again does nothing, because setting
     * `true` on something already `true` changes nothing. Reading the element instead cannot
     * drift.
     */
    export function show(): void {
        if (!dialog.open) dialog.showModal();
    }

    function settle(outcome: "confirm" | "cancel") {
        if (dialog.open) dialog.close();
        dispatch(outcome);
    }
</script>

<dialog
    bind:this={dialog}
    on:cancel|preventDefault={() => settle("cancel")}
    aria-labelledby="confirm-dialog-title">

    <h2 id="confirm-dialog-title">{title}</h2>

    <div class="body">
        <slot />
    </div>

    <div class="actions">
        <Button variant="ghost" size="sm" on:click={() => settle("cancel")}>{cancelLabel}</Button>
        <Button size="sm" on:click={() => settle("confirm")}>{confirmLabel}</Button>
    </div>
</dialog>

<style>
    dialog {
        max-width: 24rem;
        padding: 1.5rem;

        border: 1px solid var(--border);
        border-radius: var(--radius);
        background-color: var(--surface);
        color: var(--text);
        box-shadow: var(--shadow);
    }

    dialog::backdrop {
        background-color: var(--overlay-scrim);
    }

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .body {
        margin-top: 0.5rem;
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1.5rem;
    }
</style>
