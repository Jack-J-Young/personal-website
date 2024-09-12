<script lang="ts">
    import Monaco from 'svelte-monaco';
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import Console from '$lib/Console.svelte';
    import { Tabs } from 'bits-ui';
    import { Pane, Splitpanes } from 'svelte-splitpanes';
    import WorldView from '$lib/WorldView.svelte';
    import { Block } from '$lib/types/blocks';
    import { onMount } from 'svelte';


    // Access the dynamic `id` from the route
    let id = $page.params.id;

    // WV bindings
    let blocks: Block[] = [
        new Block(0, 0, 0, "minecraft:stone")
    ];
    let turtlePos = { x: 0, y: 0, z: 0 };

    // Monaco editor options
    let value = `-- Write your code here
local exists, data = turtle.inspect()
return {
    exists = exists,
    data = data
}`;

    // Debug refrash

    onMount(() => {
        async function fetchData() {
            let response = await fetch(
                `http://localhost:8080/deploy/${id}/debug`,
                {
                    method: "GET",
                }
            );
            
            if (response.status == 200) {
                let responseJson = await response.json();
                for (let key in responseJson) {
                    let debug = responseJson[key];

                    if (debug.type == "wv") {
                        let wvData  = debug.data;
                        if (wvData.type == "inspect") {
                            let blockData = wvData.data;

                            for (let block of blockData) {
                                if (blocks.filter(b => b.x == block.x && b.y == block.y && b.z == block.z && b.name == block.name).length == 0) {
                                    blocks = [
                                        ...blocks,
                                        new Block(
                                            block.x,
                                            block.y,
                                            block.z,
                                            block.data.name
                                        )
                                    ]
                                }
                            }
                        } else if (wvData.type == "pos") {
                            let posData = wvData.data;
                            turtlePos.x = posData.x;
                            turtlePos.y = posData.y;
                            turtlePos.z = posData.z;
                            // turtlePos = {
                            //     x: posData.x,
                            //     y: posData.y,
                            //     z: posData.z
                            // }
                        }
                    }
                }
            }
        }
        
        const interval = setInterval(fetchData, 3000);
        fetchData();

        return () => clearInterval(interval);
    });

    // async function refreshDebug() {
    //     while (true) {
    //         if (id == undefined) {
    //             return;
    //         }



    //     let response = await fetch(
    //         `http://localhost:8080/deploy/${id}/debug`,
    //         {
    //             method: "GET",
    //         }
    //     );
        
    //     if (response.status == 200) {
    //         let responseJson = await response.json();
    //         for (let key in responseJson) {
    //             let debug = responseJson[key];

    //             if (debug.type == "wv") {
    //                 let wvData  = debug.data;
    //                 if (wvData.type == "inspect") {
    //                     let blockData = wvData.data;

    //                     for (let block of blockData) {
    //                         if (blocks.filter(b => b.x == block.x && b.y == block.y && b.z == block.z && b.name == block.name).length == 0) {
    //                             blocks = [
    //                                 ...blocks,
    //                                 new Block(
    //                                     block.x,
    //                                     block.y,
    //                                     block.z,
    //                                     block.data.name
    //                                 )
    //                             ]
    //                         }
    //                     }
    //                 } else if (wvData.type == "pos") {
    //                     let posData = wvData.data;
    //                     turtlePos.x = posData.x;
    //                     turtlePos.y = posData.y;
    //                     turtlePos.z = posData.z;
    //                 }
    //             }
    //         }
    //     }

    //     await new Promise(r => setTimeout(r, 1000));
    //     refreshDebug();
    // }


    // Turtle API Mappings
    let consoleOutput: Object[] = [];

    let codeCallbacks: {
        [hash: string]: (data: String) => void
    } = {}

    let listening = false;
    async function listenForReturn() {
        listening = true;
        let response = await fetch(
            `http://localhost:8080/deploy/${id}/return`,
            {
                method: "GET",
            }
        );

        let responseJson: {
            [hash: string]: String
        } = await response.json();

        let timestamps = Object.keys(responseJson);
        timestamps.sort((a, b) => parseInt(a) - parseInt(b));
        

        for (let ts of timestamps) {
            if (codeCallbacks[ts]) {
                let returnData: any = responseJson[ts];
                if ("result" in returnData) {
                    codeCallbacks[ts](returnData.result);
                } else if ("error" in returnData) {
                    consoleOutput = [
                        ...consoleOutput,
                        returnData.error
                    ]
                }

                delete codeCallbacks[ts];
            }
        }

        await new Promise(r => setTimeout(r, 1000));
        
        if (Object.keys(codeCallbacks).length > 0) {
            await listenForReturn();
        }

        listening = false;
    }

    function runCode(code: string, returnCallback: (data: String) => void) {
        fetch(`http://localhost:8080/deploy/${id}/code`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            // as raw text
            body: code
        }).then(async (response) => {
            if (response.status == 512) {
                consoleOutput = [
                    ...consoleOutput,
                    "Error: 512"
                ]
            }

            let hash = await response.text();
            codeCallbacks[hash] = returnCallback;
            if (!listening)
                listenForReturn();
        });
    }

    async function runLine() {
        const codeRunner = document.querySelector("#code-runner");
        if (codeRunner) {
            runCode(codeRunner.value, (data) => {
                consoleOutput = [
                    ...consoleOutput,
                    data
                ]
            });   
        }
    }

    async function executeCode() {
        runCode(value, (data) => {
            console.log(data);
            consoleOutput = [
                ...consoleOutput,
                data
            ]
        });
    }

    function shutdown() {
        fetch(`http://localhost:8080/deploy/${id}/shutdown`, {
            method: "GET",
        });
        fetch(`http://localhost:8080/deploy/${id}/code`, {
            method: "DELETE",
        });
    }

    function back() {
        goto(`/minescreeps/${id}`);
    }
</script>

<div class="flex flex-col h-full">
    <div class="top-bar flex items-start">
        <button class="bg-white m-2 p-2 item" on:click={back}>Back</button>
        <div class="flex flex-grow justify-around">
            <div>
                <input
                    id="code-runner"
                    class="m-2 p-2"
                    type="text"
                    placeholder="turtle.forward()"
                />
                <button class="bg-white m-2 p-2" on:click={runLine}>Run</button>
            </div>
        </div>
    </div>
    <Splitpanes theme="default-theme" class="grow flex h-0">
        <Pane class="files-panel bg-slate-500 w-full h-100" size={20}>
            files-panel
        </Pane>
        <Pane class="editor-panel grow flex r-0">
            <Splitpanes horizontal theme="default-theme" style="width:0 !important" class="grow">
                <Pane class="grow bg-yellow-200 flex">
                    <!-- event.detail is the monaco instance. All options are reactive! -->
                    <Monaco
                        options={{ language: 'lua', automaticLayout: true }}
                        theme="vs-dark"
                        on:ready={(event) => console.log(event.detail)}
                        bind:value
                    />
                </Pane>
                <Pane size={30}>
                    <Tabs.Root value="console" class="bg-slate-950 h-full flex flex-col">
                        <Tabs.List class="pt-1 pl-1 pr-1">
                            <Tabs.Trigger
                                value="console"
                                class="bg-stone-900 data-[state=active]:bg-stone-800 text-white pl-3 pr-3 rounded-t-md">
                                Console
                            </Tabs.Trigger>
                            <Tabs.Trigger
                                value="world-view"
                                class="bg-stone-900 data-[state=active]:bg-stone-800 text-white pl-3 pr-3 rounded-t-md">
                                World View
                            </Tabs.Trigger>
                        </Tabs.List>
                            <Tabs.Content value="console"
                                class="grow h-0">
                                <Console bind:consoleOutput />
                            </Tabs.Content>
                            <Tabs.Content value="world-view"
                                class="grow h-0">
                                <WorldView {blocks} {turtlePos}/>
                            </Tabs.Content>
                    </Tabs.Root>
                </Pane>
	        </Splitpanes>
            <div class="buttons-panel flex flex-col" style="width:100px">
                <button class="bg-white m-2 p-2" on:click={executeCode}>Execute</button>
                <button class="bg-red-700 text-white m-2 p-2" on:click={shutdown}>Shutdown</button>
            </div>
        </Pane>
    </Splitpanes>
</div>