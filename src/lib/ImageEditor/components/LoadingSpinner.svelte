<script>
  export let size = '24px';
  export let color = '#fff';
</script>

<style>
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    width: var(--spinner-size);
    height: var(--spinner-size);
    animation: spin 1s linear infinite;
  }
</style>

<div
  class="spinner"
  style="
    --spinner-size: {size};
    --spinner-color: {color};
  "
></div>


<!-- <script>
    export let size = "24px";
    export let color = "#000";
</script>

<div
    class="spinner"
    style="
      --spinner-size: {size};
      --spinner-color: {color};
    "
></div>

<style>
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    } 

    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top-color: var(--spinner-color);
        border-radius: 50%;
        width: var(--spinner-size);
        height: var(--spinner-size);
        animation: spin 1s linear infinite;
    }
</style> -->