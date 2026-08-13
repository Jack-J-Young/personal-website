<script lang="ts">
    import { createEventDispatcher, onMount, tick } from "svelte";

    import Button from "$lib/ui/Button.svelte";
    import ConfirmDialog from "$lib/ui/ConfirmDialog.svelte";
    import UploadIcon from "./icons/UploadIcon.svelte";
    import { hasWorkInProgress, ViewerState, type ViewerPropertiesStore } from "./ViewerProperties";

    export let vps: ViewerPropertiesStore;

    const dispatch = createEventDispatcher<{ load: File }>();

    $: vp = vps ? vps.ref() : null;

    let dialog: HTMLDialogElement;
    let confirmDialog: ConfirmDialog;
    let fileInput: HTMLInputElement;

    let error = "";
    let pending: File | null = null;

    /**
     * Counted rather than a flag, because `dragleave` fires every time the pointer crosses into a
     * child element on the way across the page.
     */
    let dragDepth = 0;

    /**
     * With no image loaded the dialog is the empty state, and there is nothing behind it to go
     * back to — the toolbar carries no tools until the first image arrives, so dismissing it
     * would strand the user in an empty editor.
     */
    $: dismissable = $vp != null && hasWorkInProgress($vp);

    export function show(): void {
        error = "";
        if (!dialog.open) dialog.showModal();
    }

    /**
     * The store is created by `ImageViewer` and reaches this component the long way round —
     * bound up into the page and passed back down — so it is still undefined on mount. One tick
     * is what it takes for that to arrive.
     */
    onMount(async () => {
        await tick();
        if (!hasWorkInProgress(vps.get())) show();
    });

    function dismiss() {
        if (!dismissable) return;
        if (dialog.open) dialog.close();
    }

    function onPicked(event: Event) {
        let input = event.target as HTMLInputElement;
        request(input.files?.[0]);

        // Cleared so that picking the same file twice still fires `change`.
        input.value = "";
    }

    /**
     * The single way in for both the file picker and a drop, so neither can skip the checks the
     * other makes.
     */
    function request(file: File | null | undefined) {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            error = `"${file.name}" is not an image.`;
            if (!dialog.open) dialog.showModal();
            return;
        }

        // A pass already running would finish against the old image and write its result over the
        // new one, so the request is dropped rather than queued.
        if (vps.get().loading) return;

        error = "";

        if (hasWorkInProgress(vps.get())) {
            pending = file;
            confirmDialog.show();
            return;
        }

        load(file);
    }

    /**
     * Rewinds the whole session, not just the picture: the corner points, the processed result
     * and the state all belong to the image being replaced.
     *
     * The session itself is reused rather than replaced — `startSession` overwrites its source on
     * the next Preview, and it owns the lifetime of the preview URL either way.
     */
    function load(file: File) {
        let previous = vps.get();

        // The processed result is ours to release. The preview URL belongs to the session, which
        // revokes its own when it renders the next one.
        if (previous.state == ViewerState.Processed && previous.image)
            URL.revokeObjectURL(previous.image);

        let reader = new FileReader();
        reader.onload = (event) => {
            vps.set({
                imageRaw: file,
                image: event.target?.result as string,
                imageBlob: null,
                transformPoints: [],
                preview: false,
                loading: false,
                state: ViewerState.Editing,
            });

            dispatch("load", file);
        };
        reader.readAsDataURL(file);

        pending = null;
        if (dialog.open) dialog.close();
    }

    function carriesFiles(event: DragEvent): boolean {
        return event.dataTransfer?.types.includes("Files") ?? false;
    }

    function onDragEnter(event: DragEvent) {
        if (carriesFiles(event)) dragDepth++;
    }

    function onDragLeave(event: DragEvent) {
        if (carriesFiles(event) && dragDepth > 0) dragDepth--;
    }

    /**
     * Accepting the drag is what stops the browser treating the drop as navigation and replacing
     * the editor with the file itself. Anything that isn't a file is left alone, so dragging text
     * around still behaves normally.
     */
    function onDragOver(event: DragEvent) {
        if (carriesFiles(event)) event.preventDefault();
    }

    function onDrop(event: DragEvent) {
        if (!carriesFiles(event)) return;

        event.preventDefault();
        dragDepth = 0;
        request(event.dataTransfer?.files?.[0]);
    }
</script>

<svelte:window
    on:dragenter={onDragEnter}
    on:dragleave={onDragLeave}
    on:dragover={onDragOver}
    on:dragend={() => (dragDepth = 0)}
    on:drop={onDrop} />

<input bind:this={fileInput} type="file" accept="image/*" hidden on:change={onPicked} />

<!-- Never on top of an open dialog: a modal `<dialog>` renders in the top layer, so while the
     upload dialog is showing the highlighted drop zone inside it is the feedback instead. -->
{#if dragDepth > 0}
    <div class="drop-hint">
        <p>Drop to load this image</p>
    </div>
{/if}

<dialog
    bind:this={dialog}
    on:cancel|preventDefault={dismiss}
    aria-labelledby="upload-dialog-title">

    <h2 id="upload-dialog-title">Upload an image</h2>
    <p class="body">A photograph of a whiteboard. It is processed on this device and never
        uploaded anywhere.</p>

    <button class="drop-zone" class:dragging={dragDepth > 0} on:click={() => fileInput.click()}>
        <UploadIcon />
        <span class="choose">Choose a file</span>
        <span class="hint">or drop one anywhere on the page</span>
    </button>

    {#if error}
        <p class="error" role="alert">{error}</p>
    {/if}

    {#if dismissable}
        <div class="actions">
            <Button variant="ghost" size="sm" on:click={dismiss}>Cancel</Button>
        </div>
    {/if}
</dialog>

<ConfirmDialog
    bind:this={confirmDialog}
    title="Replace the current image?"
    confirmLabel="Replace"
    cancelLabel="Keep"
    on:confirm={() => pending && load(pending)}
    on:cancel={() => (pending = null)}>
    The corners you placed and any processing will be discarded. Nothing has been uploaded
    anywhere, so it cannot be recovered.
</ConfirmDialog>

<style>
    dialog {
        width: 24rem;
        max-width: calc(100vw - 2rem);
        padding: 1.5rem;

        border: 1px solid var(--border);
        border-radius: var(--radius);
        background-color: var(--surface);
        color: var(--text);
        box-shadow: var(--shadow);
    }

    dialog::backdrop {
        background-color: var(--overlay-scrim);
        backdrop-filter: blur(2px);
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

    .drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        margin-top: 1.25rem;
        padding: 1.75rem 1rem;

        border: 2px dashed var(--border);
        border-radius: var(--radius);
        background-color: transparent;
        color: var(--text-muted);

        transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    .drop-zone :global(svg) {
        width: 2rem;
        height: 2rem;
    }

    .drop-zone:hover,
    .drop-zone.dragging {
        border-color: var(--accent);
        background-color: var(--accent-subtle);
        color: var(--accent);
    }

    .choose {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
    }

    .hint {
        font-size: 0.75rem;
    }

    .error {
        margin-top: 0.75rem;
        color: var(--marker);
        font-size: 0.875rem;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
    }

    .drop-hint {
        position: fixed;
        inset: 0;
        z-index: 200;

        display: flex;
        align-items: center;
        justify-content: center;

        background-color: var(--overlay-scrim);
        backdrop-filter: blur(2px);

        /* Purely an indicator — the drop is handled on the window, and a target of its own here
           would swallow `dragleave` as it appeared. */
        pointer-events: none;
    }

    .drop-hint p {
        padding: 1rem 1.5rem;

        border: 2px dashed var(--accent);
        border-radius: var(--radius);
        background-color: var(--surface);
        color: var(--text);
        font-weight: 600;
    }
</style>
