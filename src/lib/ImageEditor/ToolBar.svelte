<script lang="ts">
    import { Separator } from "bits-ui";
    import ToolIcon from "./ToolIcon.svelte";
    import { type Tool } from "./Tool";
    import { Pan } from "./tools/Pan";
    import { Upload } from "./tools/Upload";
    import { get, writable, type Writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { goto } from "$app/navigation";
    import ConfirmDialog from "$lib/ui/ConfirmDialog.svelte";
    import ThemeToggle from "$lib/ui/ThemeToggle.svelte";
    import { hasWorkInProgress, ViewerState, type ViewerPropertiesStore } from "./ViewerProperties";
    import { Transform } from "./tools/Transform";
    import EditorButton from "./EditorButton.svelte";

    import ZoomIcon from "./icons/ZoomIcon.svelte";
    import ZoomOutIcon from "./icons/ZoomOutIcon.svelte";
    import ZoomInIcon from "./icons/ZoomInIcon.svelte";
    import HelpIcon from "./icons/HelpIcon.svelte";
    import ChevronRightIcon from "./icons/ChevronRightIcon.svelte";
    import { Settings } from "./tools/Settings";

    export let infoText: string = "";
    export let vps: ViewerPropertiesStore;

    const dispatch = createEventDispatcher<{ requestUpload: null }>();

    $: vp = vps ? vps.ref() : null;

    let uploadTool: Tool = new Upload(() => dispatch("requestUpload"));
    let settingsTool: Tool = new Settings();
    let panTool: Tool = new Pan();
    let transformTool: Tool = new Transform();

    export let tool: Writable<Tool>;
    let hoverTool: Tool | null = null;

    let tools: Writable<Tool[][]> = writable([]);

    /**
     * Builds the toolbar from scratch. Called on every image load, not just the first, because
     * `startPreview` removes the Transform tool for the rest of that session — a new image has to
     * get it back.
     */
    export function loadTools() {
        // list of list of tools
        let newTools = [
            [
                uploadTool,
                settingsTool,
            ],
            [
                panTool,
                transformTool,
            ],
            [
                {
                    icon: ZoomIcon,
                    name: "Zoom",
                    hoverText: "Click and drag to zoom in and out.",
                    selectable: true,
                    disabled: true,
                },
                {
                    icon: ZoomOutIcon,
                    name: "Zoom Out",
                    hoverText: "Zoom out the image.",
                    selectable: true,
                    disabled: true,
                },
                {
                    icon: ZoomInIcon,
                    name: "Zoom In",
                    hoverText: "Zoom in the image.",
                    selectable: true,
                    disabled: true,
                },
            ],
            [
                {
                    icon: HelpIcon,
                    name: "Tour",
                    hoverText: "Get a tour of the image processor.",
                    disabled: true,
                },
            ],
        ] as Tool[][];
        

        for (let toolGroup of newTools) {
            for (let _tool of toolGroup) {
                if (!_tool.setVps) continue;
                _tool.setVps(vps);
            }
        }

        tools.set(newTools);

        // The tools outlive the rebuild, so whichever was selected has to be told it no longer is
        // — otherwise its icon stays lit while Pan is the tool actually receiving gestures.
        get(tool)?.onDeselect();
        tool.set(panTool);
        panTool.onSelect();
    }

    // panTool.vps = vps;

        
    function selectTool(event: CustomEvent<Tool | null>) {
        let _tool = get(tool);
        let newTool = event.detail;
        if (newTool?.selectable) {
            if (_tool == newTool) {
                newTool.onDeselect();
                tool.set(panTool);
                infoText = panTool.hoverText;
                panTool.onSelect();
            } else {
                _tool?.onDeselect();
                tool.set(newTool);
                if (newTool)
                    infoText = newTool.hoverText;
                newTool.onSelect();
            }
        } else {
            if (newTool?.onSelect) {
                newTool.onSelect();
            }
        }
    }

    function updateHoverTool(event: CustomEvent<Tool | null>) {
        hoverTool = event.detail;

        if (hoverTool) {
            infoText = hoverTool.name;
        } else {
            if (tool) {
                let _tool = get(tool);
                if (!_tool) return;
                infoText = _tool.hoverText;
            } else {
                infoText = "";
            }
        }
    }

    function startPreview() {
        vps.set({
            loading: true,
        });
        let vp = vps.get();

        vp.sessionApi?.startSession(vp.imageRaw!, vp.transformPoints).then(() => {
            vp.sessionApi?.setOptions(vp.settings).then(() => {
                vps.set({
                    preview: true,
                    image: vp.sessionApi?.getPreviewUrl(),
                    state: ViewerState.Preview,
                });
            });
        });

        let _tools = get(tools);

        _tools[1] = [panTool];

        tool.set(panTool);
        tools.set(_tools);
    }

    function process() {
        vps.set({
            loading: true,
        });
        let vp = vps.get();

        vp.sessionApi?.process().then((blob) => {
            vps.set({
                imageBlob: blob,
                image: URL.createObjectURL(blob),
                state: ViewerState.Processed,
            });
        });
    }

    async function copyToClipboard() {
        let blob = vps.get().imageBlob;

        // Browsers only reliably accept PNG on the clipboard, and write() rejects
        // outside a secure context. Downloading is the honest fallback either way.
        if (!blob || blob.type !== "image/png") {
            downloadImage();
            return;
        }

        try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            infoText = "Copied image to clipboard.";
        } catch {
            downloadImage();
        }
    }

    function downloadImage() {
        let vp = vps.get();
        if (vp.image) {
            let a = document.createElement("a");
            a.href = vp.image;
            a.download = "processed-image.png";
            a.click();
        }
    }

    function testFunc() {
        let setting = vps.get().setting;
        vps.set({
            setting: !setting,
        });
    }

    let leaveDialog: ConfirmDialog;

    /**
     * Guards the trip home. A modified click opens a new tab and leaves the editor exactly where
     * it is, so there is nothing to confirm and the browser should handle it untouched.
     */
    function requestLeave(event: MouseEvent) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!hasWorkInProgress(vps.get())) return;

        event.preventDefault();
        leaveDialog.show();
    }
</script>

<div class="tool-bar">
    {#if vp}
    <div class="tools-left">
        <!-- A real link, so middle-click and ctrl-click still open a new tab; the confirmation
             only intercepts the plain click that would actually leave the editor. -->
        <a class="tools-home-logo" href="/" on:click={requestLeave}>
            <img src="/favicon.png" alt="Home"/>
        </a>
        {#if $tools.length > 0}
            {#each $tools[0] as _tool}
                <ToolIcon bind:tool={_tool} on:selectTool={selectTool} on:hoverTool={updateHoverTool} />
            {/each}
        {/if}
        {#if $tools.length > 1}
            {#each $tools.slice(1) as toolGroup}
                <Separator.Root orientation='vertical' class="h-6 w-px rounded-sm bg-border" />
                {#each toolGroup as _tool}
                    <ToolIcon bind:tool={_tool} on:selectTool={selectTool} on:hoverTool={updateHoverTool} />
                {/each}
            {/each}
        {/if}
    </div>
    <div class="tools-right">
        <!-- Ahead of the contextual action, so the primary button stays pinned to the right edge
             instead of shifting as the session advances. -->
        <ThemeToggle />
        <Separator.Root orientation='vertical' class="h-6 w-px rounded-sm bg-border" />
        {#if $vp?.state == ViewerState.Editing}
            <EditorButton text="Preview" icon={ChevronRightIcon} disabled={!$vp?.image || $vp?.loading} click={startPreview}/>
        {:else if $vp?.state == ViewerState.Preview}
            <EditorButton text="Process" icon={ChevronRightIcon} disabled={$vp?.loading} click={process}/>
        {:else}
            <EditorButton text="Clipboard" click={copyToClipboard}/>
            <EditorButton text="Download" click={downloadImage}/>
        {/if}
    </div>
    {/if}
</div>

<ConfirmDialog
    bind:this={leaveDialog}
    title="Leave the editor?"
    confirmLabel="Leave"
    cancelLabel="Stay"
    on:confirm={() => goto("/")}>
    Your image and any processing will be discarded. Nothing has been uploaded anywhere, so it
    cannot be recovered.
</ConfirmDialog>

<style>
    .tool-bar {
        height: 3.5rem;

        display: flex;
        flex-direction: row;
        justify-content: left;
        align-items: center;
        padding: 0.5rem;
        padding-left: 1rem;

        background-color: var(--surface);
        border-bottom: 1px solid var(--border);
    }

    .tools-left {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        justify-content: left;
        gap: 0.5rem;
        align-items: center;
    }

    .tools-right {
        display: flex;
        flex-direction: row;
        justify-content: right;
        gap: 0.5rem;
        align-items: center;
    }

    .tools-home-logo {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        padding: 0.125rem;

        border-radius: var(--radius-sm);
        transition: background-color 150ms ease;
    }

    .tools-home-logo:hover {
        background-color: var(--surface-raised);
    }

    .tools-home-logo img {
        width: 2.5rem;
        height: 2.5rem;
    }
</style>