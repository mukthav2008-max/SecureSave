import base64
import os

def generate_js_loader(wasm_path, js_path):
    with open(wasm_path, "rb") as f:
        wasm_bytes = f.read()

    b64_str = base64.b64encode(wasm_bytes).decode('ascii')

    js_content = f'''/**
 * SecureSave - WebAssembly Loader and Glue Module
 * Supports both standalone WebAssembly binary streaming and inline embedded instantiation
 * for maximum browser compatibility (including local file:// protocol and GitHub Pages).
 */

(function (root, factory) {{
    if (typeof define === 'function' && define.amd) {{
        define([], factory);
    }} else if (typeof module === 'object' && module.exports) {{
        module.exports = factory();
    }} else {{
        root.SecureSaveWasm = factory();
    }}
}}(typeof self !== 'undefined' ? self : this, function () {{
    'use strict';

    const EMBEDDED_WASM_BASE64 = "{b64_str}";

    let wasmInstance = null;
    let wasmExports = null;
    let isInitialized = false;

    /**
     * Normalizes exports so that both c_func and _c_func can be called safely
     * across different Emscripten optimization levels and linker flags.
     */
    function wrapExports(rawExports) {{
        if (!rawExports) return rawExports;
        const wrapped = Object.assign({{}}, rawExports);
        for (const key of Object.keys(rawExports)) {{
            if (key.startsWith('_c_') && !wrapped[key.substring(1)]) {{
                wrapped[key.substring(1)] = rawExports[key];
            }} else if (key.startsWith('c_') && !wrapped['_' + key]) {{
                wrapped['_' + key] = rawExports[key];
            }}
        }}
        return wrapped;
    }}

    /**
     * Converts base64 string to Uint8Array buffer safely across environments.
     */
    function base64ToUint8Array(base64) {{
        if (typeof Buffer !== 'undefined') {{
            return new Uint8Array(Buffer.from(base64, 'base64'));
        }}
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {{
            bytes[i] = binaryString.charCodeAt(i);
        }}
        return bytes;
    }}

    /**
     * Initializes the WebAssembly Module.
     * Prefers streaming fetch if available, falls back to embedded bytecode.
     */
    async function init(options = {{}}) {{
        if (isInitialized) return wasmExports;

        const importObject = options.importObject || {{}};
        let wasmUrl = options.wasmUrl || 'wasm/securesave.wasm';

        // Resolve relative URL safely against document base URI for subpaths (e.g. /SecureSave/)
        if (typeof document !== 'undefined' && document.baseURI) {{
            try {{
                wasmUrl = new URL(wasmUrl, document.baseURI).href;
            }} catch (e) {{
                // Keep original relative URL if URL constructor fails
            }}
        }}

        // 1. Try streaming instantiation if on HTTP/HTTPS
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') && typeof WebAssembly.instantiateStreaming === 'function') {{
            try {{
                const response = await fetch(wasmUrl);
                if (response.ok) {{
                    const result = await WebAssembly.instantiateStreaming(response, importObject);
                    wasmInstance = result.instance;
                    wasmExports = wrapExports(wasmInstance.exports);
                    isInitialized = true;
                    console.info("[SecureSave] WebAssembly initialized via instantiateStreaming (Network/HTTP).");
                    return wasmExports;
                }}
            }} catch (e) {{
                console.warn("[SecureSave] Streaming fetch failed, falling back to embedded bytecode:", e.message);
            }}
        }}

        // 2. Instantiate from Embedded Bytecode (works offline & file://)
        try {{
            const bytes = base64ToUint8Array(EMBEDDED_WASM_BASE64);
            const result = await WebAssembly.instantiate(bytes, importObject);
            wasmInstance = result.instance;
            wasmExports = wrapExports(wasmInstance.exports);
            isInitialized = true;
            console.info("[SecureSave] WebAssembly initialized via Embedded Bytecode Buffer.");
            return wasmExports;
        }} catch (err) {{
            console.error("[SecureSave] Critical error initializing WebAssembly:", err);
            throw err;
        }}
    }}

    return {{
        init,
        getInstance: () => wasmInstance,
        getExports: () => wasmExports,
        isLoaded: () => isInitialized
    }};
}}));
'''

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Generated {js_path} ({len(js_content)} chars)")

if __name__ == "__main__":
    wasm_p = os.path.join("wasm", "securesave.wasm")
    js_p = os.path.join("wasm", "securesave.js")
    generate_js_loader(wasm_p, js_p)

