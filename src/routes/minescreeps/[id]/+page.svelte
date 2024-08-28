<script lang="ts">
    import type { PageData } from "../client/$types";
    import { T, Canvas } from '@threlte/core'
	import { Grid, OrbitControls, TransformControls } from '@threlte/extras'
	import * as Three from 'three'
    import { Block } from '$lib/types/blocks'
    import { get } from "svelte/store";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    export let data: PageData;

    let id = $page.params.id;

    let waiting = false;
    let background = "bg-indigo-900";

    let codeCallbacks: {
        [hash: string]: (data: any) => void
    } = {}

    let listening = false;
    async function listenForReturn() {
        listening = true;
        fetch(`http://localhost:8080/deploy/${id}/return`, {
            method: "GET",
        }).then(async (response) => {
            let responseJson: {
                [hash: string]: {result: string} | {error: string}
            } = await response.json();

            let timestamps = Object.keys(responseJson);
            timestamps.sort((a, b) => parseInt(a) - parseInt(b));

            for (let ts of timestamps) {
                if (codeCallbacks[ts]) {
                    let returnData: any = responseJson[ts];
                    if ("result" in returnData) {
                        codeCallbacks[ts](returnData.result);
                    } else if ("error" in returnData) {
                        // TODO: handle error
                        print(returnData.error);
                    }

                    delete codeCallbacks[ts];
                }
            }
        });

        await new Promise(r => setTimeout(r, 1000));
        
        if (Object.keys(codeCallbacks).length > 0) {
            listenForReturn();
        }
        listening = false;
    }

    let codeQueue: Array<[string, (data: any) => void]> = [];
    let codeQueueRunning = false;

    function runCode(code: string, returnCallback: (data: any) => void) {
        codeQueue.push([code, returnCallback]);

        if (!codeQueueRunning) {
            runCodeQueue();
        }
    }

    async function runCodeQueue() {
        codeQueueRunning = true;
        let tuple = codeQueue.shift();
        if (!tuple) {
            codeQueueRunning = false;
            return;
        }

        let code = tuple[0];
        let returnCallback = tuple[1];

        let response = await fetch(`http://localhost:8080/deploy/${id}/code`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            // as raw text
            body: code
        });

        let hash = await response.text();
        codeCallbacks[hash] = returnCallback;
        if (!listening)
            listenForReturn();
        
        runCodeQueue();
    }

    let blocks: Array<Block> = [
        // {x: 0, y: 0, z: 0, name: 'dirt'},
    ];

    let turtleDir: {
        x: number,
        y: number
    } = {x: 1, y: 0};

    let turtlePos: {
        x: number,
        y: number,
        z: number
    } = {x: 0, y: 0, z: 0};

    function removeBlock(x: number, y: number, z: number) {
        blocks = blocks.filter(block => block.x != x || block.y != y || block.z != z);
    }

    function addBlock(x: number, y: number, z: number, name: string) {
        blocks = [...blocks, new Block(x, y, z, name)];
    }

    function inspect(pos: {x: number, y: number, z: number}, dir: {x: number, y: number}) {
        // add blocks above and below and in front
        //blocks = [...blocks, new Block(x, y, z, hashStringToHex(`(${x},${y},${z})`))];


        runCode(`require("player-link")\nreturn Inspect()`, (inspect) => {
                // to jsonx
                if (inspect.data) {
                    addBlock(
                        pos.x + dir.x,
                        pos.y,
                        pos.z + dir.y,
                        hashStringToHex(inspect.data.name)
                    )
                }
                if (inspect.dataUp) {
                    addBlock(
                        pos.x,
                        pos.y + 1,
                        pos.z,
                        hashStringToHex(inspect.dataUp.name)
                    )
                }
                if (inspect.dataDown) {
                    addBlock(
                        pos.x,
                        pos.y - 1,
                        pos.z,
                        hashStringToHex(inspect.dataDown.name)
                    )
                }
            }
        );
    }

    function turnLeft() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.turnLeft()`, (succ) => {
            if (succ == "false") {
                turtleDir = {x: turtleDir.y, y: -turtleDir.x};
            }
        });
        inspect(pos, dir);
    }

    function turnRight() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.turnRight()`, (succ) => {
            if (succ != "false") {
                turtleDir = {x: -turtleDir.y, y: turtleDir.x};
            }
        });
        inspect(pos, dir);
    }

    function forward() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.forward()`, (succ) => {
            if (succ != "false") {
                turtlePos.x += turtleDir.x;
                turtlePos.z += turtleDir.y;
            }
        });
        inspect(pos, dir);
    }

    function back() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.back()`, (succ) => {
            if (succ != "false") {
                turtlePos.x -= turtleDir.x;
                turtlePos.z -= turtleDir.y;
            }
        });
        inspect(pos, dir);
    }

    function down() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.down()`, (succ) => {
            if (succ != "false") {
                turtlePos.y -= 1;
            }
        });
        inspect(pos, dir);
    }

    function up() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.up()`, (succ) => {
            if (succ != "false") {
                turtlePos.y += 1;
            }
        });
        inspect(pos, dir);
    }
    
    function hashStringToHex(str: string): string {
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Convert hash to hexadecimal and ensure it's 6 digits
        let hex = (hash & 0xFFFFFF).toString(16).toUpperCase();

        // Pad with leading zeros if necessary
        while (hex.length < 6) {
            hex = '0' + hex;
        }

        return hex;
    }

    function dig() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.dig()`, (succ) => {
            if (succ != "false") {
                removeBlock(turtlePos.x + turtleDir.x, turtlePos.y, turtlePos.z + turtleDir.y);
            }
        });
        inspect(pos, dir);
    }

    function digUp() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.digUp()`, (succ) => {
            if (succ != "false") {
                removeBlock(turtlePos.x, turtlePos.y + 1, turtlePos.z);
            }
        });
        inspect(pos, dir);
    }

    function digDown() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.digDown()`, (succ) => {
            if (succ != "false") {
                removeBlock(turtlePos.x, turtlePos.y - 1, turtlePos.z);
            }
        });

        inspect(pos, dir);
    }

    function place() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.place()`, _ => {
        });
        inspect(pos, dir);
    }

    function placeUp() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.placeUp()`, _ => {
        });
        inspect(pos, dir);
    }

    function placeDown() {
        let pos = turtlePos;
        let dir = turtleDir;

        runCode(`return turtle.placeDown()`, _ => {
        });
        inspect(pos, dir);
    }

    function editor() {
        goto(`/minescreeps/${$page.params.id}/editor`);
    }

</script>

<div class="flex h-full w-full flex-col">
    <div class="w-full flex">
        <div class="flex flex-col mt-2 ml-2 mr-2 items-start">
            <p class="flex-grow text-white">Move</p>
            <div class="flex flex-col shadow-lg shadow-black">
                <div class="flex flex-row">
                    <button title="Turn left" class="-rotate-90 text-lg border-black border-2 bg-indigo-500 size-14" on:click={turnLeft}>⤴</button>
                    <button title="Move forward" class="-rotate-90 text-lg border-zinc-600 border-2  bg-gray-500 size-14" on:click={forward}>→</button>
                    <button title="Turn right" class="-rotate-90 text-lg border-black border-2  bg-indigo-500 size-14" on:click={turnRight}>⤵</button>
                </div>
                <div class="flex flex-row">
                    <button title="Move up" class=" text-lg border-stone-800 border-2 bg-stone-400 size-14" on:click={up}>▢↑</button>
                    <button title="Move back" class="-rotate-90 text-lg border-zinc-600 border-2 bg-gray-500 size-14" on:click={back}>←</button>
                    <button title="Move down" class=" text-lg border-stone-800 border-2 bg-stone-400 size-14" on:click={down}>▢↓</button>
                </div>
            </div>
        </div>
        <div class="flex flex-col mt-2 ml-2 mr-2 items-start">
            <p class="flex-grow text-white">Blocks</p>
            <div class="flex flex-col shadow-lg shadow-black">
                <div class="flex flex-row">
                    <button title="Dig" class="text-lg border-orange-800 border-2 bg-orange-400 size-14" on:click={dig}>▢▨</button>
                    <button title="Dig up" class="-rotate-90 text-lg border-orange-800 border-2  bg-orange-400 size-14" on:click={digUp}>▢▨</button>
                    <button title="Dig down" class="rotate-90 text-lg border-orange-800 border-2  bg-orange-400 size-14" on:click={digDown}>▢▨</button>
                </div>
                <div class="flex flex-row">
                    <button title="Place" class="text-lg border-teal-900 border-2 bg-teal-600 size-14" on:click={place}>▢▣</button>
                    <button title="Place up" class="-rotate-90 text-lg border-teal-900 border-2 bg-teal-600 size-14" on:click={placeUp}>▢▣</button>
                    <button title="Place down" class="rotate-90 text-lg border-teal-900 border-2 bg-teal-600 size-14" on:click={placeDown}>▢▣</button>
                </div>
            </div>
        </div>
        <div class="flex flex-col mt-2 ml-2 mr-2 items-start">
            <p class="flex-grow text-white">Editor</p>
            <div class="flex bg-yellow-200 border-2 border-black size-28">
                <button class="m-2 flex-grow text-center bg-black text-white" on:click={editor}>&gt; edit</button>
            </div>
        </div>
    </div>
    <div class="{background} transition-colors flex-grow shadow-lg shadow-black drop-shadow-lg">
        <Canvas>
            <!-- Camera -->
            <T.PerspectiveCamera position={[20, 20, 20]} fov={50} makeDefault>
                <!-- Controls -->
                <OrbitControls enableDamping />
            </T.PerspectiveCamera>

            <!-- Lights the scene equally -->
            <T.AmbientLight color="#ffffff" intensity={0.2} />

            <!-- Light that casts a shadow -->
            <T.DirectionalLight
                color="#ffffff"
                intensity={2}
                position={[10, 10, 0]}
                shadow.camera.top={8}
                castShadow
            />
            
            <T.Mesh
                position.x={turtlePos.x}
                position.y={turtlePos.y}
                position.z={turtlePos.z}
                castShadow
            >
                <T.BoxGeometry args={[1, 1, 1]} />
                <T.MeshStandardMaterial color="#ffff00" />
            </T.Mesh>

            <!-- Blocks -->
            {#each blocks as block}
                <T.Mesh
                    position.x={block.x}
                    position.y={block.y}
                    position.z={block.z}
                    castShadow
                >
                    <T.BoxGeometry args={[1, 1, 1]} />
                    <T.MeshStandardMaterial color=#{hashStringToHex(block.name)} />
                </T.Mesh>
            {/each}
        </Canvas>
    </div>
</div>