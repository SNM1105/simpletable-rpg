import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT || "3001";
const url = `http://localhost:${port}`;

function openBrowser(targetUrl) {
  if (process.platform === "win32") {
    // Use PowerShell to open the default browser (more reliable than cmd/start from Node).
    spawn(
      "powershell.exe",
      ["-NoProfile", "-Command", `Start-Process '${targetUrl}'`],
      { stdio: "ignore", detached: true }
    ).unref();
    return;
  }

  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [targetUrl], { stdio: "ignore", detached: true }).unref();
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...process.env,
  NEXT_DISABLE_TURBOPACK: "1",
};

const child = spawn(npmCmd, ["run", "dev", "--", "-p", port], {
  stdio: ["inherit", "pipe", "pipe"],
  cwd: projectRoot,
  env,
});

let opened = false;
const tryOpen = (chunk) => {
  if (opened) return;
  const s = chunk.toString();
  // Next dev prints "Ready" when server is up.
  if (s.includes("Ready")) {
    opened = true;
    openBrowser(url);
  }
};

child.stdout.on("data", (c) => {
  process.stdout.write(c);
  tryOpen(c);
});

child.stderr.on("data", (c) => {
  process.stderr.write(c);
  tryOpen(c);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
