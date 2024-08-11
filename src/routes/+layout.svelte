<script>import "../app.css";
import { Separator } from "bits-ui";</script>

<div class="flex flex-col h-screen">
	<nav class="flex h-5 items-center space-x-4 text-sm p-10 back bg-navBar">
		<div class="text-white">
			<a href="/">
				<img src="favicon.png" alt="Processed example." class="w-32 h-32 p-4 transform scale-75">
			</a>
		</div>
		<Separator.Root orientation="vertical" class="my-4 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[1px]"></Separator.Root>
		<div class="text-white"><a href="/about">About</a></div>
		<Separator.Root orientation="vertical" class="my-4 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[1px]"></Separator.Root>
		<div class="text-white"><a href="/whiteboard">Whiteboard processor</a></div>
		<!-- <Separator.Root orientation="vertical" class="my-4 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[1px]"></Separator.Root> -->
		<!-- <div>Whiteboard processor</div> -->
	</nav>
	<main class="h-0 flex-grow box-border">
		<slot />
	</main>
</div>