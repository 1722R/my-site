import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.mjs";

let pyodide = null;

async function initPyodide() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  self.postMessage({ type: "status", message: "ready" });
}

self.onmessage = async (event) => {
  const { id, action, code } = event.data;

  if (action === "init") {
    self.postMessage({ type: "status", message: "loading" });
    try {
      await initPyodide();
    } catch (e) {
      self.postMessage({ type: "status", message: "error", error: e.message });
    }
    return;
  }

  if (action === "run") {
    if (!pyodide) {
      self.postMessage({ id, error: "Python 运行时尚未加载完成，请稍候..." });
      return;
    }

    let stdout = "";
    let stderr = "";

    pyodide.setStdout({ batched: (text) => { stdout += text + "\n"; } });
    pyodide.setStderr({ batched: (text) => { stderr += text + "\n"; } });

    try {
      await pyodide.loadPackagesFromImports(code);
      const result = await pyodide.runPythonAsync(code);
      self.postMessage({
        id,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        result: result === undefined || result === null ? null : String(result),
      });
    } catch (error) {
      self.postMessage({
        id,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        error: error.message,
      });
    }
  }
};
