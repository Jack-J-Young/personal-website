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
		server: lan ? { proxy: {} } : undefined,

		test: {
			include: ['src/**/*.test.ts']
		}
	};
});
