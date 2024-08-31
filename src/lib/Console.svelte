<script lang="ts">
    import ObjectInspector from "./ObjectInspector.svelte";

    export let consoleOutput: Object[];
</script>

<div class="console">
    {#each consoleOutput as line}
        <div class="console-line">
            <ObjectInspector data={line} />
        </div>
    {/each}
</div>

<style>
    .console {
        background-color: #0f0f0f;
        width: 100%;
        height:100%;
        overflow-y: scroll;
        padding: 0;
    }

    /* CREDIT TO: https://codepen.io/alandunning/pen/RWRrEW */
    .console-line {
        padding: 0.2em 0.6em 0.2em 0.6em;
        width:100%;
        background-color: #1b1b1c;
        border-bottom: solid 1px #58585c;
        position: relative;
        display: block;
        font-family: monospace !important;
        line-height: 12px;
        font-size: 12px;
        color: white;
        overflow-wrap: anywhere;
        top: 0;
    }

    /* .console-line:last-child:after {
        content: "_";
        
        -webkit-animation: blink 1s step-end infinite;
        animation: blink 1s step-end infinite;
    } */

    @-webkit-keyframes blink {
        0% { opacity: 1.0; }
        50% { opacity: 0.0; }
        100% { opacity: 1.0; }
    }

    @keyframes blink {
        0% { opacity: 1.0; }
        50% { opacity: 0.0; }
        100% { opacity: 1.0; }
    }
</style>