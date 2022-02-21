.PHONY: error install run-server run-server-nodemon run-client build-wasm

error:
	@echo "specify make target"
	@exit 1

# install client and server deps
install:
	(cd server && npm ci) && (cd client && npm ci)

# run server with TEST_OUTPUT_DIR env var as path to Bitempura `_testoutput/` dir
run-server:
	(cd server; node server.js)

# run server with live reloading with TEST_OUTPUT_DIR env var as path to Bitempura `_testoutput/` dir
run-server-nodemon:
	(cd server; npx nodemon server.js)

# run client
run-client:
	(cd client; npm start)

# clone bitempura repo, build wasm artifacts, and copy them to client/public
# git reset --hard to a specific revision. hardcoded into the make command for now.
build-wasm:
	rm -rf .bitempura
	git clone git@github.com:elh/bitempura.git .bitempura
	(cd .bitempura; git reset --hard 0ba6cf9; make cp-wasm-exec build-wasm; cp memory/wasm/assets/* ../client/public/)
