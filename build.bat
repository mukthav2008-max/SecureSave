@echo off
echo =======================================================
echo          SecureSave - WebAssembly Build Script
echo =======================================================

where emcc >nul 2>nul
if %errorlevel% equ 0 goto use_emcc
goto use_python

:use_emcc
echo [INFO] Emscripten compiler (emcc) detected in PATH.
echo [INFO] Compiling C source files to WebAssembly...
if not exist wasm mkdir wasm
call emcc src/main.c src/math_utils.c src/budget.c src/prediction.c src/encryption.c src/simulator.c -O3 -s WASM=1 -s STANDALONE_WASM=1 --no-entry -o wasm/securesave.wasm
if %errorlevel% neq 0 (
    echo [WARNING] Emscripten compilation failed. Falling back to Python generator.
    goto use_python
)
echo [SUCCESS] WebAssembly compiled successfully with Emscripten!
goto verify

:use_python
echo [INFO] Building WebAssembly via Python bytecode builder...
python tools\build_wasm.py
python tools\generate_js_loader.py
echo [SUCCESS] WebAssembly binary generated successfully!
goto verify

:verify
echo.
echo Running verification test suite...
where node >nul 2>nul
if %errorlevel% equ 0 (
    node tools\test_wasm.js
) else (
    echo [INFO] Node.js not detected. Skipping local CLI tests.
)

echo =======================================================
echo Build complete. Ready for browser and GitHub Pages.
echo =======================================================
