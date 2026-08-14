import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Runs the dev server, with one flag of our own: `npm run dev -- --no-reload`.
 *
 * This wrapper exists because Vite's CLI refuses options it does not recognise — it parses
 * `--no-reload` as the negation of a `--reload` it has never heard of and exits. So the flag is
 * taken out here and passed on as an environment variable, which `vite.config.ts` reads.
 *
 * Everything else is forwarded untouched, so `--host`, `--port` and `--mode lan` all still work.
 */
const FLAG = "--no-reload";

let args = process.argv.slice(2);
let vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

let child = spawn(
    process.execPath,
    [vite, "dev", ...args.filter((arg) => arg !== FLAG)],
    {
        stdio: "inherit",
        env: { ...process.env, VITE_NO_RELOAD: args.includes(FLAG) ? "1" : "" },
    },
);

// Reporting the signal as a failing status rather than swallowing it, so Ctrl-C reads as a stop
// and not as a clean finish to whatever is watching.
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
