/**
 * SecureSave - WebAssembly Loader and Glue Module
 * Supports both standalone WebAssembly binary streaming and inline embedded instantiation
 * for maximum browser compatibility (including local file:// protocol and GitHub Pages).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SecureSaveWasm = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const EMBEDDED_WASM_BASE64 = "AGFzbQEAAAABcA9gBXx8fHx8AXxgAnx8AXxgBnx8fHx8fAF/YAJ8fAF/YAR8fHx/AXxgA3x8fwF8YAR8fHx/AX9gAX4Bf2ACfn4BfmACfn4Bf2ADfn5+AX5gBH5+fn4Bf2AFfHx8fH8BfGAEfHx8fAF8YAR8fHx8AX8DGBcAAQECAwQFBAYHCAgICQgKCgsBBQwNDgeXBBcXY19idWRnZXRfdG90YWxfZXhwZW5zZXMAABBjX2J1ZGdldF9zYXZpbmdzAAEbY19idWRnZXRfc2F2aW5nc19wZXJjZW50YWdlAAIRY19idWRnZXRfdmFsaWRhdGUAAxRjX2J1ZGdldF9zdGF0dXNfY29kZQAEGWNfcHJlZGljdGlvbl9mdXR1cmVfdmFsdWUABR5jX3ByZWRpY3Rpb25fdG90YWxfY29udHJpYnV0ZWQABhxjX3ByZWRpY3Rpb25faW50ZXJlc3RfZWFybmVkAAcVY19wcmVkaWN0aW9uX3ZhbGlkYXRlAAgKY19pc19wcmltZQAJBWNfZ2NkAAoPY19yc2FfY29tcHV0ZV9uAAsVY19yc2FfY29tcHV0ZV90b3RpZW50AAwQY19yc2FfdmFsaWRhdGVfZQAND2NfcnNhX2NvbXB1dGVfZAAOEWNfcnNhX2VuY3J5cHRfbXNnAA8RY19yc2FfZGVjcnlwdF9tc2cAEBJjX3JzYV92YWxpZGF0ZV9hbGwAERtjX3NpbXVsYXRvcl9tb250aGx5X3NhdmluZ3MAEhpjX3NpbXVsYXRvcl9wZXJpb2Rfc2F2aW5ncwATGGNfc2ltdWxhdG9yX3NhdmluZ3NfZGlmZgAUG2Nfc2ltdWxhdG9yX2ltcHJvdmVtZW50X3BjdAAVFGNfc2ltdWxhdG9yX3ZhbGlkYXRlABYKsQkXEAAgACABoCACoCADoCAEoAsHACAAIAGhCyoAIABEAAAAAAAAAABlBHxEAAAAAAAAAAAFIAEgAKNEAAAAAAAAWUCiCwuFAQACQCAARAAAAAAAAAAAYwRAQQEPCyAARAAAAAAAAAAAYQRAQQIPCyABRAAAAAAAAAAAYwRAQQMPCyACRAAAAAAAAAAAYwRAQQMPCyADRAAAAAAAAAAAYwRAQQMPCyAERAAAAAAAAAAAYwRAQQMPCyAFRAAAAAAAAAAAYwRAQQMPCwtBAAteACABRAAAAAAAAAAAYwRAQX8PCyAARAAAAAAAAPA/YwRAQQAPCyAARAAAAAAAACRAYwRAQQEPCyAARAAAAAAAADRAYwRAQQIPCyAARAAAAAAAAElAZQRAQQMPC0EEC1MCAnwBfyADQQBMBEAgAA8LIAJEAAAAAADAkkCjIQUgACEEQQAhBgJAA0AgBiADTg0BIAREAAAAAAAA8D8gBaCiIAGgIQQgBkEBaiEGDAALCyAECwsAIAAgASACt6KgCzIBAXwgACABIAIgAxAFIAAgASADEAahIgREAAAAAAAAAABjBEBEAAAAAAAAAAAPCyAEC1kAIABEAAAAAAAAAABjBEBBAQ8LIAFEAAAAAAAAAABjBEBBAg8LIAJEAAAAAAAAAABjIAJEAAAAAAAAWUBkcgRAQQMPCyADQQBMIANB2ARKcgRAQQQPC0EAC2IBAX4gAEIBVwRAQQAPCyAAQgNXBEBBAQ8LIABCAoFQIABCA4FQcgRAQQAPC0IFIQECQANAIAEgAX4gAFUNASAAIAGBUCAAIAFCAnyBUHIEQEEADwsgAUIGfCEBDAALC0EBCyIBAX4CQANAIAFQDQEgASECIAAgAYEhASACIQAMAAsLIAALBwAgACABfgsNACAAQgF9IAFCAX1+CyQAIABCAVcgACABWXIEQEEADwsgACABEApCAVIEQEEADwtBAQtiAQZ+IAAhAiABIQNCASEEQgAhBQJAA0AgA1ANASACIAN/IQYgAiAGIAN+fSEHIAMhAiAHIQMgBCAGIAV+fSEHIAUhBCAHIQUMAAsLIAJCAVIEQEJ/DwsgBCABgSABfCABgQtUAQN+IAJCAVcEQEJ/DwtCASEDIAAgAoEhBCABIQUCQANAIAVCAFcNASAFQgGDUARABSADIAR+IAKBIQMLIAQgBH4gAoEhBCAFQgGIIQUMAAsLIAMLCgAgACABIAIQDwtUACAAEAlFBEBBAQ8LIAEQCUUEQEECDwsgACABUQRAQQMPCyACIABCAX0gAUIBfX4QDUUEQEEEDwsgA0IAUwRAQQYPCyADIAAgAX5ZBEBBBQ8LQQALBwAgACABoQsLACAAIAGhIAK3ogsRACACIAOhIAAgAaGhIAS3ogs3AQF8IAAgAaEiBEQAAAAAAAAAAGUEQEQAAAAAADiPwA8LIAIgA6EgBKEgBKNEAAAAAAAAWUCiC2EAIABEAAAAAAAAAABjIAJEAAAAAAAAAABjcgRAQQEPCyABRAAAAAAAAAAAYyADRAAAAAAAAAAAY3IEQEECDwsgAEQAAAAAAAAAAGEgAkQAAAAAAAAAAGFyBEBBAw8LQQAL";

    let wasmInstance = null;
    let wasmExports = null;
    let isInitialized = false;

    /**
     * Normalizes exports so that both c_func and _c_func can be called safely
     * across different Emscripten optimization levels and linker flags.
     */
    function wrapExports(rawExports) {
        if (!rawExports) return rawExports;
        const wrapped = Object.assign({}, rawExports);
        for (const key of Object.keys(rawExports)) {
            if (key.startsWith('_c_') && !wrapped[key.substring(1)]) {
                wrapped[key.substring(1)] = rawExports[key];
            } else if (key.startsWith('c_') && !wrapped['_' + key]) {
                wrapped['_' + key] = rawExports[key];
            }
        }
        return wrapped;
    }

    /**
     * Converts base64 string to Uint8Array buffer safely across environments.
     */
    function base64ToUint8Array(base64) {
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(base64, 'base64'));
        }
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Initializes the WebAssembly Module.
     * Prefers streaming fetch if available, falls back to embedded bytecode.
     */
    async function init(options = {}) {
        if (isInitialized) return wasmExports;

        const importObject = options.importObject || {};
        let wasmUrl = options.wasmUrl || 'wasm/securesave.wasm';

        // Resolve relative URL safely against document base URI for subpaths (e.g. /SecureSave/)
        if (typeof document !== 'undefined' && document.baseURI) {
            try {
                wasmUrl = new URL(wasmUrl, document.baseURI).href;
            } catch (e) {
                // Keep original relative URL if URL constructor fails
            }
        }

        // 1. Try streaming instantiation if on HTTP/HTTPS
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') && typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                const response = await fetch(wasmUrl);
                if (response.ok) {
                    const result = await WebAssembly.instantiateStreaming(response, importObject);
                    wasmInstance = result.instance;
                    wasmExports = wrapExports(wasmInstance.exports);
                    isInitialized = true;
                    console.info("[SecureSave] WebAssembly initialized via instantiateStreaming (Network/HTTP).");
                    return wasmExports;
                }
            } catch (e) {
                console.warn("[SecureSave] Streaming fetch failed, falling back to embedded bytecode:", e.message);
            }
        }

        // 2. Instantiate from Embedded Bytecode (works offline & file://)
        try {
            const bytes = base64ToUint8Array(EMBEDDED_WASM_BASE64);
            const result = await WebAssembly.instantiate(bytes, importObject);
            wasmInstance = result.instance;
            wasmExports = wrapExports(wasmInstance.exports);
            isInitialized = true;
            console.info("[SecureSave] WebAssembly initialized via Embedded Bytecode Buffer.");
            return wasmExports;
        } catch (err) {
            console.error("[SecureSave] Critical error initializing WebAssembly:", err);
            throw err;
        }
    }

    return {
        init,
        getInstance: () => wasmInstance,
        getExports: () => wasmExports,
        isLoaded: () => isInitialized
    };
}));
