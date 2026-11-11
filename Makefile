# SecureSave - Makefile for C to WebAssembly compilation

CC = emcc
CFLAGS = -O3 -Wall
SRC = src/main.c src/math_utils.c src/budget.c src/prediction.c src/encryption.c src/simulator.c
OUT_WASM = wasm/securesave.wasm

all: $(OUT_WASM)

$(OUT_WASM): $(SRC)
	@mkdir -p wasm
	@which emcc > /dev/null 2>&1 && \
		$(CC) $(CFLAGS) $(SRC) -s WASM=1 -s STANDALONE_WASM=1 --no-entry -o $(OUT_WASM) && \
		echo "Compiled with Emscripten" || \
		(python3 tools/build_wasm.py && python3 tools/generate_js_loader.py && echo "Generated with Python WASM builder")

test:
	node tools/test_wasm.js

clean:
	rm -rf wasm/*.wasm wasm/*.js

.PHONY: all test clean
