<script>
	// You can import an image and the GitHub icon here.
	// Replace the paths with your actual image and GitHub icon paths
	import githubIcon from "./assets/github-mark-white.svg"; // Example path
	import linkedinIcon from "./assets/ln-white.png"; // Example path
	import profilePicture from "./assets/portrait.png"; // Example path
</script>

<svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head>

<section class="flex flex-col md:flex-row max-w-5xl mx-auto my-8 p-4">
	<!-- Left Side: Image and GitHub Link -->
	<div
		class="md:w-1/2 flex flex-col justify-center items-center mb-8 md:mb-0"
	>
		<img
			src={profilePicture}
			alt="Profile Picture"
			class="w-48 h-48 rounded-full mb-6"
		/>
		<div class="flex justify-center">
			<a href="https://github.com/jack-j-young" target="_blank" class="mt-2">
				<img src={githubIcon} alt="GitHub Icon" class="w-14 h-14 p-2" />
			</a>
			<a href="https://www.linkedin.com/in/jack-j-young" target="_blank" class="mt-2">
				<img src={linkedinIcon} alt="Linkedin Icon" class="w-14 h-14 p-2" />
			</a>
		</div>
	</div>

	<!-- Right Side: Paragraphs -->
	<div class="md:w-1/2">
		<h2 class="text-white text-2xl text-center p-4">About jackyoung.xyz</h2>
		<p class="text-white text-lg leading-relaxed mb-6">
			This is my place for my personal projects and whatever else I want to put here
		</p>
		<h2 class="text-white text-2xl text-center p-4">About me</h2>
		<p class="text-white text-lg leading-relaxed">
			Im a computer science graduate currently working as a junior software developer at Arcadis
		</p>
		<h2 class="text-white text-2xl text-center p-4">About me</h2>
		<p class="text-white text-lg leading-relaxed">
			Email: <a href="mailto:jackjordanyoung@gmail.com">jackjordanyoung@gmail.com</a>
		</p>

	</div>
</section>

<style>
	/* Add any additional styling here if needed */
</style>
