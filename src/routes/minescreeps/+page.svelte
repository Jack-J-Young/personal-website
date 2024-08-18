<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  let loading = false;
  let error = null;

  async function handleClick() {
    loading = true;
    error = null;

    try {
      const response = await fetch("http://localhost:8080/deploy", {
        method: "GET", // or 'POST' depending on your API
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const id = data.deployId; // Replace 'id' with the correct key from the response JSON

      goto(`/minescreeps/${id}`);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col justify-center h-full">
  <div class="flex justify-center">
  <button class="bg-white p-4 m-4" on:click={handleClick} disabled={loading}>
    {#if loading}
      Loading...
    {/if}
    {#if !loading}
      Deploy!
    {/if}
  </button>
  </div>

  {#if error}
    <p style="color: red;">{error}</p>
  {/if}
</div>
