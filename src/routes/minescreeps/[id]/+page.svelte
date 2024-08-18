<script>
    import { page } from "$app/stores";

    // Access the dynamic `id` from the route
    let id = $page.params.id;

    function runLine() {
        const codeRunner = document.querySelector("#code-runner");
        if (codeRunner) {
            fetch(`http://localhost:8080/deploy/${id}/code.lua`, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                // as raw text
                body: codeRunner.value
            });
        }   
    }

    function executeCode() {
        const textEditor = document.querySelector("#text-editor");
        if (textEditor) {
            fetch(`http://localhost:8080/deploy/${id}/code.lua`, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                // as raw text
                body: textEditor.value
            });
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
            <div class="grow bg-slate-900 flex">
                <textarea
                    name="Text1" 
                    id= "text-editor"
                    class="w-full grow p-4 m-4 resize-none"
                    cols="40"
                    rows="5"
                ></textarea>
            </div>
            <div class="buttons-panel flex flex-col" style="width:100px">
                <button class="bg-white m-2 p-2" on:click={executeCode}>Execute</button>
                <button class="bg-red-700 text-white m-2 p-2" on:click={shutdown}>Shutdown</button>
            </div>
        </div>
    </div>
</div>
