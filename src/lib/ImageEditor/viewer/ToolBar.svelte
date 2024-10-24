<script lang="ts">
    import { Separator } from "bits-ui";
    import ToolIcon from "../components/ToolIcon.svelte";
    import { type Tool } from "../tools/Tool";
    import { Pan } from "../tools/Pan";
    import { get, writable, type Writable } from "svelte/store";
    import { ViewerState, type ViewerPropertiesStore } from "./ViewerProperties";
    import { Transform } from "../tools/Transform";
    import EditorButton from "../components/EditorButton.svelte";

    // import pan from "$lib/ImageEditor/icons/pan.svg";
    // import transform from "$lib/ImageEditor/icons/transform.svg";
    import zoom_icon from "$lib/ImageEditor/icons/zoom.svg";
    import zoomOut_icon from "$lib/ImageEditor/icons/zoomOut.svg";
    import zoomIn_icon from "$lib/ImageEditor/icons/zoomIn.svg";
    import help_icon from "$lib/ImageEditor/icons/help.svg";
    import chev_icon from "$lib/ImageEditor/icons/chev-right.svg";
    import { Settings } from "../tools/Settings";
    import { Upload } from "../tools/Upload";

    export let infoText: string = "";
    export let vps: ViewerPropertiesStore;

    $: vp = vps ? vps.ref() : null;

    let changesMade: boolean = false;
    
    let uploadTool: Tool = new Upload();
    let settingsTool: Tool = new Settings();
    let panTool: Tool = new Pan();
    let transformTool: Tool = new Transform();

    export let tool: Writable<Tool>;
    let hoverTool: Tool | null = null;

    let tools: Writable<Tool[][]> = writable([]);

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
                    icon: zoom_icon,
                    name: "Zoom",
                    hoverText: "Click and drag to zoom in and out.",
                    selectable: true,
                    disabled: true,
                },
                {
                    icon: zoomOut_icon,
                    name: "Zoom Out",
                    hoverText: "Zoom out the image.",
                    selectable: true,
                    disabled: true,
                },
                {
                    icon: zoomIn_icon,
                    name: "Zoom In",
                    hoverText: "Zoom in the image.",
                    selectable: true,
                    disabled: true,
                },
            ],
            [
                {
                    icon: help_icon,
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

        tool.set(panTool);

        console.log("loaded tools");
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
            // Set options
            vp.sessionApi?.setOptions([
                { key: "transparent", value: (vp.settings.transparent ? "true" : "false") },
                { key: "dark_mode", value: (vp.settings.darkMode ? "true" : "false") },
            ]).then(() => {
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

        vp.sessionApi?.process().then((processedUrl) => {
            vps.set({
                image: processedUrl,
                state: ViewerState.Processed,
            });
        });
    }

    function copyToClipboard() {
        let vp = vps.get();
        if (vp.image) {
            navigator.clipboard.writeText(vp.image);
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
</script>

<div class="tool-bar">
    {#if vp}
    <div class="tools-left">
        <!-- icon from static/favicon.png -->
        <div class="tools-home-logo">
            <img src="/favicon.png" alt="home"/>
        </div>
        {#if $tools.length > 0}
            {#each $tools[0] as _tool}
                <ToolIcon bind:tool={_tool} bind:selectedTool={tool} on:selectTool={selectTool} on:hoverTool={updateHoverTool} />
            {/each}
        {/if}
        {#if $tools.length > 1}
            {#each $tools.slice(1) as toolGroup}
                <Separator.Root orientation='vertical' class="h-6"
                    style="background-color: #ADAFB2; 
                    box-shadow: inset 0 1px 4px rgba(0,0,0,0.3);
                    width: 2px;
                    border-radius: 2px;" />
                {#each toolGroup as _tool}
                    <ToolIcon bind:tool={_tool} bind:selectedTool={tool} on:selectTool={selectTool} on:hoverTool={updateHoverTool} />
                {/each}
            {/each}
        {/if}
    </div>
    <div class="tools-right">
        {#if $vp?.state == ViewerState.Editing}
            <EditorButton text="Preview" icon={chev_icon} disabled={!$vp?.image || $vp?.loading} click={startPreview}/>
        {:else if $vp?.state == ViewerState.Preview}
            <EditorButton text="Process" icon={chev_icon} disabled={$vp?.loading} click={process}/>
        {:else}
            <EditorButton text="Clipboard" click={copyToClipboard}/>
            <EditorButton text="Download" click={downloadImage}/>
        {/if}
    </div>
    {/if}
</div>

<style>
    .tool-bar {
        height: 3.5rem;

        display: flex;
        flex-direction: row;
        justify-content: left;
        align-items: center;
        padding: 0.5rem;
        padding-left: 1rem;

        /* horizontal gradient */
        background: #2A2B2D
            linear-gradient(
                rgba(255, 255, 255, 0.1),
                rgba(255, 255, 255, 0.0)
            );
        border-bottom: 1px solid #5E5E5E;
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
        padding: 0;
    }

    .tools-home-logo img {
        width: 2.5rem;
        height: 2.5rem;
    }
</style>