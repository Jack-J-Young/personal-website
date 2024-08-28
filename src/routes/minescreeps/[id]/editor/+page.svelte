<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    // Access the dynamic `id` from the route
    let id = $page.params.id;

    let consoleOutput: String[] = [];

    let codeCallbacks: {
        [hash: string]: (data: String) => void
    } = {}

    let listening = false;
    async function listenForReturn() {
        listening = true;
        fetch(`http://localhost:8080/deploy/${id}/return`, {
            method: "GET",
        }).then(async (response) => {
            let responseJson: {
                [hash: string]: String
            } = await response.json();

            let timestamps = Object.keys(responseJson);
            timestamps.sort((a, b) => parseInt(a) - parseInt(b));
            

            for (let ts of timestamps) {
                if (codeCallbacks[ts]) {
                    let returnData: any = responseJson[ts];
                    if ("result" in returnData) {
                        consoleOutput = [
                            ...consoleOutput,
                            returnData.result
                        ]
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
        });

        await new Promise(r => setTimeout(r, 5000));
        
        if (Object.keys(codeCallbacks).length > 0) {
            listenForReturn();
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
                console.log(consoleOutput);
            });   
        }
    }

    async function executeCode() {
        const textEditor = document.querySelector("#text-editor");
        if (textEditor) {
            runCode(textEditor.value, (data) => {
                consoleOutput = [
                    ...consoleOutput,
                    data
                ]
                console.log(consoleOutput);
            });
        }
    }

    function shutdown() {
        fetch(`http://localhost:8080/deploy/${id}/shutdown`, {
            method: "GET",
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
    <div class="grow flex">
        <div class="files-panel bg-slate-500 w-full h-100" style="width:100px">
            files-panel
        </div>
        <div class="editor-panel grow flex">
            <div class="fles flex-col grow">
                <div class="grow bg-yellow-200 flex">
                    <textarea
                        name="Text1" 
                        id= "text-editor"
                        class="w-full grow p-4 m-4 resize-none border-2 border-black bg-slate-800 text-white"
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
