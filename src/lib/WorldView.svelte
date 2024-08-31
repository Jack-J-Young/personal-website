<script lang="ts">
    import type { PageData } from './$types';
    import { T, Canvas } from '@threlte/core'
	import { Grid, OrbitControls, TransformControls } from '@threlte/extras'
    import type { Block } from './types/blocks';
    
    export let data: PageData;

    export let turtlePos = { x: 0, y: 0, z: 0 };
    export let blocks: Block[] = [];

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