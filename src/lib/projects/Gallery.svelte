<script lang="ts">
    /**
     * Every photo in a project, including the ones no note put in its prose.
     *
     * Each opens the full file in a new tab rather than a lightbox, which is honest about what
     * this does today: the images are published at their original size, so "open" is the only
     * larger view there is to offer.
     */
    export let images: string[];
    export let title: string;
</script>

{#if images.length > 0}
    <ul class="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {#each images as image, index}
            <li>
                <a
                    href={image}
                    target="_blank"
                    rel="noreferrer noopener"
                    class="block overflow-hidden rounded border border-border transition-colors
                           hover:border-accent">
                    <img
                        src={image}
                        alt="{title}, photo {index + 1} of {images.length}"
                        loading="lazy"
                        class="aspect-[4/3] w-full object-cover" />
                </a>
            </li>
        {/each}
    </ul>
{/if}
