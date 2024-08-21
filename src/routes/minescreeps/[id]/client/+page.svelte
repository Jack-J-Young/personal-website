<script lang="ts">
    import type { PageData } from "./$types";
    import { T, Canvas } from '@threlte/core'
	import { Grid, OrbitControls, TransformControls } from '@threlte/extras'
	import * as Three from 'three'
    import { Block } from '$lib/types/blocks'
    import { get } from "svelte/store";

    export let data: PageData;

    let blocks: Array<Block> = [
        {x: 0, y: 0, z: 0, name: 'dirt'},
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

    function inspect() {
        // add blocks above and below and in front

        //blocks = [...blocks, new Block(x, y, z, hashStringToHex(`(${x},${y},${z})`))];
        
        blocks = [
            ...blocks,
            new Block(
                turtlePos.x + turtleDir.x,
                turtlePos.y,
                turtlePos.z + turtleDir.y,
                `${turtlePos.x},${turtlePos.y},${turtlePos.z}`),
            new Block(
                turtlePos.x,
                turtlePos.y + 1,
                turtlePos.z,
                `${turtlePos.x},${turtlePos.y},${turtlePos.z}`),
            new Block(
                turtlePos.x,
                turtlePos.y - 1,
                turtlePos.z,
                `${turtlePos.x},${turtlePos.y},${turtlePos.z}`),
        ];
    }

    function turnLeft() {
        turtleDir = {x: turtleDir.y, y: -turtleDir.x};
        inspect();
    }

    function turnRight() {
        turtleDir = {x: -turtleDir.y, y: turtleDir.x};
        inspect();
    }

    function forward() {
        turtlePos.x += turtleDir.x;
        turtlePos.z += turtleDir.y;
        inspect();
    }

    function back() {
        turtlePos.x -= turtleDir.x;
        turtlePos.z -= turtleDir.y;
        inspect();
    }

    function down() {
        turtlePos.y -= 1;
        inspect();
    }

    function up() {
        turtlePos.y += 1;
        inspect();
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
</script>

<div class="flex h-full w-full flex-col">
    <div class="w-full flex">
        <div class="flex flex-col flex-grow">
            <div class="flex flex-row">
                <button class="-rotate-90 text-lg border-black border-2 bg-indigo-500 size-14" on:click={turnLeft}>⤴</button>
                <button class="-rotate-90 text-lg border-zinc-600 border-2  bg-gray-500 size-14" on:click={forward}>→</button>
                <button class="-rotate-90 text-lg border-black border-2  bg-indigo-500 size-14" on:click={turnRight}>⤵</button>
            </div>
            <div class="flex flex-row">
                <button class=" text-lg border-stone-800 border-2 bg-stone-400 size-14" on:click={up}>▢↑</button>
                <button class="-rotate-90 text-lg border-zinc-600 border-2 bg-gray-500 size-14" on:click={back}>←</button>
                <button class=" text-lg border-stone-800 border-2 bg-stone-400 size-14" on:click={down}>▢↓</button>
            </div>
            <!-- forward backward text -->
        </div>
        <div>

        </div>
    </div>
    <div class="flex-grow">
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