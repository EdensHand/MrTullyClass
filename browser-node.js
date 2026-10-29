import { WebContainer } from "@webcontainer/api";

// Each browser tab owns its Node.js runtime. No student source leaves this tab.
export function createBrowserNodeRunner() {
  let containerPromise = null;
  let process = null;
  let stdin = null;
  let epoch = 0;

  async function boot() {
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      throw new Error("Browser Node.js requires COOP/COEP isolation headers. Open the Cloudflare Pages site in Chrome or Edge.");
    }
    if (!containerPromise) {
      containerPromise = WebContainer.boot({ coep: "require-corp" }).catch(error => {
        containerPromise = null;
        throw error;
      });
    }
    return containerPromise;
  }

  function stop() {
    epoch++;
    if (process) {
      try { process.kill(); } catch (error) { /* May have already exited. */ }
      process = null;
    }
    if (stdin) {
      try { stdin.releaseLock(); } catch (error) { /* May have closed. */ }
      stdin = null;
    }
  }

  async function run(code, callbacks) {
    stop();
    const thisRun = epoch;
    let runningProcess = null;
    callbacks.onState("starting");
    try {
      const container = await boot();
      if (thisRun !== epoch) return;
      await container.fs.writeFile("main.js", code);
      if (thisRun !== epoch) return;
      runningProcess = await container.spawn("node", ["main.js"], {
        terminal: { cols: 100, rows: 28 }
      });
      if (thisRun !== epoch) {
        runningProcess.kill();
        return;
      }
      process = runningProcess;
      stdin = runningProcess.input.getWriter();
      callbacks.onState("running");
      const outputTask = runningProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          if (thisRun !== epoch) return;
          const readable = String(chunk).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
          callbacks.onOutput(readable);
        }
      }));
      const codeExit = await runningProcess.exit;
      await outputTask.catch(() => undefined);
      if (thisRun !== epoch) return;
      stop();
      callbacks.onExit(codeExit);
    } catch (error) {
      if (thisRun !== epoch) return;
      stop();
      callbacks.onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function sendInput(value) {
    if (!stdin) throw new Error("No running program is accepting input.");
    // The WebContainer input stream is a pseudoterminal. Enter = \r.
    await stdin.write(String(value).slice(0, 500) + "\r");
  }

  return { boot, run, stop, sendInput };
}
