#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIKI = join(ROOT, "wiki");

const STATUSES = ["open", "planned", "known", "wontfix", "fixed"];
const SEVERITIES = ["high", "medium", "low"];

// README.md documents its containing directory and issues.md holds that
// directory's issue list, so neither maps to a source file the way every other
// mirror page does.
const DIRECTORY_PAGES = ["README.md", "issues.md"];

const SOURCE_EXTENSIONS = [".ts", ".js", ".svelte", ".css", ".html"];

function toPosix(path) {
    return path.split("\\").join("/");
}

function relativeToRoot(absolutePath) {
    return toPosix(absolutePath.slice(ROOT.length + 1));
}

function isAtOrBelow(path, ancestor) {
    return path === ancestor || path.startsWith(`${ancestor}/`);
}

function walk(directory, predicate) {
    if (!existsSync(directory)) return [];

    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        let full = join(directory, entry.name);
        if (entry.isDirectory()) return walk(full, predicate);
        return predicate(entry.name) ? [full] : [];
    });
}

function subdirectories(directory) {
    if (!existsSync(directory)) return [];

    return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
            let full = join(directory, entry.name);
            return [full, ...subdirectories(full)];
        });
}

// A tag line is the first non-blank line under a heading, and only counts as one
// if it is made up entirely of backticked tokens.
function parseTagLine(line) {
    if (!/^(`[^`]+`\s*)+$/.test(line.trim())) return null;

    let tokens = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    return {
        status: tokens[0],
        severity: tokens[1],
        files: tokens.slice(2),
    };
}

function parseIssues(page) {
    let scope = relativeToRoot(dirname(page)).replace(/^wiki\/?/, "");
    let lines = readFileSync(page, "utf8").split(/\r?\n/);
    let issues = [];

    for (let i = 0; i < lines.length; i++) {
        let heading = lines[i].match(/^##\s+(.*\S)\s*$/);
        if (!heading) continue;

        let next = i + 1;
        while (next < lines.length && lines[next].trim() === "") next++;

        issues.push({
            title: heading[1],
            scope,
            page: relativeToRoot(page),
            line: i + 1,
            ...(parseTagLine(lines[next] ?? "") ?? { status: null, severity: null, files: [] }),
        });
    }

    return issues;
}

function allIssues() {
    return walk(WIKI, (name) => name === "issues.md").flatMap(parseIssues);
}

function matchesPath(issue, path) {
    if (issue.scope !== "" && isAtOrBelow(issue.scope, path)) return true;
    return issue.files.some((file) => isAtOrBelow(file, path));
}

function parseArgs(argv) {
    let options = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith("--")) continue;
        let key = argv[i].slice(2);
        let next = argv[i + 1];
        options[key] = next && !next.startsWith("--") ? (i++, next) : true;
    }
    return options;
}

function commandIssues(argv) {
    let options = parseArgs(argv);
    let issues = allIssues();

    if (options.path) issues = issues.filter((issue) => matchesPath(issue, toPosix(options.path)));
    if (options.status) issues = issues.filter((issue) => issue.status === options.status);
    if (options.severity) issues = issues.filter((issue) => issue.severity === options.severity);

    if (options.json) {
        console.log(JSON.stringify(issues, null, 2));
        return 0;
    }

    let pages = [...new Set(issues.map((issue) => issue.page))].sort();

    for (let page of pages) {
        console.log(`\n${page}`);
        for (let issue of issues.filter((issue) => issue.page === page)) {
            let status = (issue.status ?? "?").padEnd(8);
            let severity = (issue.severity ?? "?").padEnd(7);
            console.log(`  ${status}${severity}${issue.title}`);
        }
    }

    let summary = `${issues.length} issue${issues.length === 1 ? "" : "s"}`;
    console.log(issues.length ? `\n${summary} in ${pages.length} file(s)` : `${summary} found`);
    return 0;
}

// Maps a mirror page back to the source path it documents. Only pages under
// wiki/src/ mirror the tree; wiki/guides/ and the wiki root are free-form.
function mirroredSourcePath(page) {
    let relative = relativeToRoot(page).replace(/^wiki\//, "");
    if (!isAtOrBelow(relative, "src")) return null;

    let name = relative.slice(relative.lastIndexOf("/") + 1);
    return DIRECTORY_PAGES.includes(name)
        ? relative.slice(0, relative.lastIndexOf("/"))
        : relative.replace(/\.md$/, "");
}

function holdsSource(directory) {
    return readdirSync(directory, { withFileTypes: true }).some(
        (entry) => entry.isFile() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)));
}

// A directory with no page of its own is covered by the nearest README above it,
// so only a tree nobody has documented at any level is worth flagging.
function documentedByAncestor(relative) {
    for (let path = relative; path !== ""; path = path.slice(0, Math.max(0, path.lastIndexOf("/")))) {
        if (existsSync(join(WIKI, path, "README.md"))) return true;
    }
    return false;
}

function commandCheck() {
    let errors = [];
    let warnings = [];

    for (let page of walk(WIKI, (name) => name.endsWith(".md"))) {
        let source = mirroredSourcePath(page);
        if (source && !existsSync(join(ROOT, source))) {
            errors.push(`${relativeToRoot(page)} -> ${source} no longer exists`);
        }
    }

    for (let issue of allIssues()) {
        let where = `${issue.page}:${issue.line}`;

        if (!STATUSES.includes(issue.status)) {
            errors.push(`${where} "${issue.title}" has status ${issue.status ?? "(missing)"}, expected one of ${STATUSES.join(", ")}`);
        }
        if (!SEVERITIES.includes(issue.severity)) {
            errors.push(`${where} "${issue.title}" has severity ${issue.severity ?? "(missing)"}, expected one of ${SEVERITIES.join(", ")}`);
        }
        for (let file of issue.files) {
            if (!existsSync(join(ROOT, file))) errors.push(`${where} "${issue.title}" references missing ${file}`);
        }
    }

    for (let directory of [join(ROOT, "src"), ...subdirectories(join(ROOT, "src"))]) {
        if (!holdsSource(directory)) continue;

        let relative = relativeToRoot(directory);
        if (!documentedByAncestor(relative)) warnings.push(`${relative}/ has no wiki page`);
    }

    for (let warning of warnings) console.log(`  warn   ${warning}`);
    for (let error of errors) console.log(`  error  ${error}`);

    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
    return errors.length ? 1 : 0;
}

const USAGE = `Usage:
  node scripts/wiki.mjs issues [--path <src path>] [--status <status>] [--severity <severity>] [--json]
  node scripts/wiki.mjs check

  status:    ${STATUSES.join(" | ")}
  severity:  ${SEVERITIES.join(" | ")}`;

const [command, ...argv] = process.argv.slice(2);

if (command === "issues") process.exit(commandIssues(argv));
else if (command === "check") process.exit(commandCheck());
else {
    console.log(USAGE);
    process.exit(command ? 1 : 0);
}
