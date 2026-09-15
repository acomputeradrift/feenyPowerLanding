/**
 * Compare worker — the engine, off the main thread.
 *
 * `.apex` files arrive as `File` handles and are mounted with WORKERFS, which
 * gives SQLite read-only block-level access to the bytes without copying them
 * into the WASM heap and without any network request. Nothing in here uploads,
 * and there is no endpoint to upload to.
 *
 * Messages out are {type:"progress"|"result"|"error"}. That shape is the seam
 * between the engine and the UI, and it is deliberately unchanged from the
 * server-sent stream this replaced: the transport moved, the payload did not.
 */

import { loadPyodide } from "./vendor/pyodide/pyodide.mjs";

const PYODIDE_URL = new URL("./vendor/pyodide/", import.meta.url).href;

/**
 * Order matters: et_xmlfile before openpyxl. These are put on sys.path and
 * imported with zipimport — all three are pure Python, so no package manager
 * runs on the page and there is no code path that could reach PyPI.
 *
 * Engine wheel URL carries ?v= so a prior immutable cache cannot pin a stale
 * engine after ship (keep in sync with sentinel_lite.__version__).
 */
const ENGINE_WHEEL_VERSION = "0.6.8";
const WHEELS = [
  "./vendor/wheels/et_xmlfile-2.0.0-py3-none-any.whl",
  "./vendor/wheels/openpyxl-3.1.5-py2.py3-none-any.whl",
  `./vendor/wheels/sentinel_lite.whl?v=${ENGINE_WHEEL_VERSION}`,
];

const MOUNT = "/apex";
const PREVIOUS_PATH = `${MOUNT}/a.apex`;
const CURRENT_PATH = `${MOUNT}/b.apex`;

const COMPARE_FAILED = "Change summary could not be computed.";
const EXPORT_FAILED = "Change summary could not be exported.";

let pyodide = null;
let engine = null;
let mounted = false;

async function init() {
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  pyodide.FS.mkdirTree("/wheels");
  for (const url of WHEELS) {
    const response = await fetch(new URL(url, import.meta.url));
    if (!response.ok) throw new Error(`wheel ${url}`);
    const name = url.slice(url.lastIndexOf("/") + 1).split("?")[0];
    pyodide.FS.writeFile(`/wheels/${name}`, new Uint8Array(await response.arrayBuffer()));
  }
  const paths = WHEELS.map((url) => {
    const name = url.slice(url.lastIndexOf("/") + 1).split("?")[0];
    return `"/wheels/${name}"`;
  });
  pyodide.runPython(`import sys\nsys.path[:0] = [${paths.join(", ")}]`);
  engine = pyodide.pyimport("sentinel_lite.browser");
  return engine.__version__;
}

/** WORKERFS holds the File handle, so the previous pair must be released first. */
function mount(fileA, fileB) {
  unmount();
  pyodide.FS.mkdirTree(MOUNT);
  pyodide.FS.mount(
    pyodide.FS.filesystems.WORKERFS,
    {
      blobs: [
        { name: "a.apex", data: fileA },
        { name: "b.apex", data: fileB },
      ],
    },
    MOUNT,
  );
  mounted = true;
}

function unmount() {
  if (!mounted) return;
  try {
    pyodide.FS.unmount(MOUNT);
  } finally {
    mounted = false;
  }
}

function heapBytes() {
  return pyodide && pyodide._module ? pyodide._module.HEAP8.length : 0;
}

function compare({ fileA, fileB }) {
  const progress = (text) => self.postMessage({ type: "progress", text });
  let json = "";
  try {
    mount(fileA, fileB);
    json = engine.compare_to_json.callKwargs(PREVIOUS_PATH, CURRENT_PATH, {
      previous_name: fileA.name,
      current_name: fileB.name,
      on_progress: progress,
    });
  } finally {
    unmount();
    pyodide.runPython("import gc\ngc.collect()");
  }
  // app.js stores this unchanged; `payload.py` is the only definition of the shape.
  self.postMessage(JSON.parse(json));
  const heap = heapBytes();
  console.debug(`sentinel-lite: wasm heap ${Math.round(heap / 1048576)} MB after compare`);
  self.postMessage({ type: "idle", heapBytes: heap });
}

function exportXlsx(payload) {
  const proxy = engine.changelog_xlsx_bytes(JSON.stringify(payload));
  try {
    const bytes = proxy.toJs();
    self.postMessage({ type: "xlsx", bytes }, [bytes.buffer]);
  } finally {
    proxy.destroy();
  }
}

self.onmessage = async (event) => {
  const { cmd } = event.data || {};
  try {
    if (cmd === "init") {
      self.postMessage({ type: "ready", version: await init() });
      return;
    }
    if (cmd === "compare") {
      compare(event.data);
      return;
    }
    if (cmd === "exportXlsx") {
      exportXlsx(event.data.payload);
      return;
    }
  } catch (error) {
    // Locked copy. Detail goes to the console only:
    // an engine traceback can name rooms, sources, and drivers.
    console.error(error);
    self.postMessage({
      type: "error",
      message: cmd === "exportXlsx" ? EXPORT_FAILED : COMPARE_FAILED,
    });
  }
};
