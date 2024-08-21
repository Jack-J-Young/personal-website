<script lang="ts">
    import { page } from "$app/stores";

    // Access the dynamic `id` from the route
    let id = $page.params.id;

    let consoleOutput: Array<String> = [];
    
    async function waitForReturn(): Promise<Array<String>> {
        // if error 512, then wait for 1 second and try again if succesful return data
        let response = await fetch(`http://localhost:8080/deploy/${id}/return`, {
            method: "GET",
        })

        // if error 512
        if (response.status == 512) {
            await new Promise(r => setTimeout(r, 1000));
            return await waitForReturn()
        }

        // response .bodt readable stream as text
        let responseText = await response.text();
        return responseText.split("\n");
    }

    async function runLine() {
        const codeRunner = document.querySelector("#code-runner");
        if (codeRunner) {
            let response = await fetch(`http://localhost:8080/deploy/${id}/code.lua`, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                // as raw text
                body: codeRunner.value
            });

            if (response.status == 512) {
                consoleOutput = [
                    ...consoleOutput,
                    "Error: 512"
                ]
            }

            consoleOutput = [
                ...consoleOutput,
                ...await waitForReturn()
            ]
        }   
    }

    async function executeCode() {
        const textEditor = document.querySelector("#text-editor");
        if (textEditor) {
            let response = await fetch(`http://localhost:8080/deploy/${id}/code.lua`, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                // as raw text
                body: textEditor.value
            });

            if (response.status == 512) {
                consoleOutput = [
                    ...consoleOutput,
                    "Error: 512"
                ]
            }

            consoleOutput = [
                ...consoleOutput,
                ...await waitForReturn()
            ]
        }
    }

    function shutdown() {
        fetch(`http://localhost:8080/deploy/${id}/shutdown`, {
            method: "GET",
        });
    }
</script>

<div class="flex flex-col h-full">
    <div class="top-bar flex justify-around">
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
    <div class="grow flex">
        <div class="files-panel bg-slate-500 w-full h-100" style="width:100px">
            files-panel
        </div>
        <div class="editor-panel grow flex">
            <div class="fles flex-col grow">
                <div class="grow bg-slate-900 flex">
                    <textarea
                        name="Text1" 
                        id= "text-editor"
                        class="w-full grow p-4 m-4 resize-none"
                        cols="40"
                        rows="20"
                    ></textarea>
                </div>
                <div style="height:250px" class="w-full overflow-scroll">
                    {#each consoleOutput as line}
                        <p>{line}</p>
                    {/each}
                </div>
            </div>
            <div class="buttons-panel flex flex-col" style="width:100px">
                <button class="bg-white m-2 p-2" on:click={executeCode}>Execute</button>
                <button class="bg-red-700 text-white m-2 p-2" on:click={shutdown}>Shutdown</button>
            </div>
        </div>
    </div>
</div>
