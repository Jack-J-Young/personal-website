<script lang="ts">
    import GithubIcon from "./icons/GithubIcon.svelte";
    import MailIcon from "./icons/MailIcon.svelte";
    import SocialLink from "./SocialLink.svelte";
    import type { IconButtonSize } from "./iconButtonClasses";

    export let size: IconButtonSize = "md";
</script>

<div class="flex items-center gap-3">
    <SocialLink href="mailto:jackjordanyoung@gmail.com" label="Email" {size}>
        <MailIcon />
    </SocialLink>
    <SocialLink href="https://github.com/jack-j-young" label="GitHub" {size}>
        <GithubIcon />
    </SocialLink>
</div>
