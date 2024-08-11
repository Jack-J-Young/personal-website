<script>
	// No specific script logic required for this example
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="My personal website for my projects" />
</svelte:head>

<section class="flex flex-col md:flex-row max-w-5xl mx-auto my-8 p-4">
	<div
		class="md:w-1/2 flex flex-col justify-center items-center mb-8 md:mb-0"
	>
		<a href="/whiteboard">
			<img
				src="whiteboard_processor_example.png"
				alt="Processed example."
				class="scale-90"
			/>
		</a>
	</div>
	<div class="md:w-1/2 flex flex-col justify-around items">
		<div>
			<h1 class="text-white mx-auto font-arial text-3xl">
				Whiteboard processor
			</h1>
			<p class="text-white text-center font-arial text-2xl">
				A web app for processing pictures of whiteboards
			</p>
			<p class="text-white text-center font-arial text-2xl">
				<a href="/whiteboard">Try it out</a>
			</p>
		</div>
	</div>
</section>
