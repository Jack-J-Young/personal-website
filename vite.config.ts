import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vitest/config';

/**
 * `--mode lan` serves the dev server over HTTPS with a self-signed certificate.
 *
 * A microphone is only offered to a secure context, which means HTTPS or one of the loopback
 * hosts. Plain `vite dev --host` is neither as far as a phone or tablet on the network is
 * concerned, so the guitar tools cannot open a microphone there at all — `navigator.mediaDevices`
 * is not merely refused, it is absent.
 *
 * It is a mode rather than the default because the certificate is untrusted: every browser shows
 * an interstitial before the page loads, which is not worth paying for on the machine running the
 * server.
 */
/**
 * `npm run dev -- --no-reload` leaves the page alone when a file changes.
 *
 * Hot reloading is the right default and wrong in one situation: anything holding state that took
 * effort to reach. The guitar tools take a microphone permission and a running session to get to,
 * and a save while looking at a scoreboard throws both away — which is most of the time while
 * working on them.
 *
 * An environment variable rather than a mode, because a mode is a build input and this is not: it
 * changes nothing about what is served, only whether the browser is told. `scripts/dev.mjs` sets
 * it, and says there why the flag cannot simply be read from `argv` here.
 */
const HMR_OFF = !!process.env.VITE_NO_RELOAD;

export default defineConfig(({ mode }) => {
	let lan = mode === 'lan';

	return {
		plugins: [sveltekit(), ...(lan ? [basicSsl()] : [])],

		/**
		 * An empty proxy, which adds no middleware, is how Vite is asked for HTTP/1.1.
		 *
		 * Given a certificate and no proxy it reaches for `http2.createSecureServer` instead, and
		 * Node's HTTP/2 compatibility layer hangs a symbol key on the headers object. SvelteKit's
		 * dev server passes those headers straight to `new Request`, where undici walks every own
		 * key including symbols and throws on the first one it cannot read as a string. Every
		 * request 500s with "init.headers is a symbol".
		 */
		server: {
			...(lan ? { proxy: {} } : {}),

			// False rather than a slower poll: the point is that nothing arrives, not that less
			// does. Vite still rebuilds on save, so a manual refresh picks the change up.
			...(HMR_OFF ? { hmr: false as const } : {})
		},

		test: {
			// scripts/ is in scope because the content pipeline's publish filter is the one piece
			// of the codebase whose failure mode is a leak rather than a bug.
			include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs']
		}
	};
});
