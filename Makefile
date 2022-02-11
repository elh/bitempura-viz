.PHONY: error install run-server run-server-nodemon run-client

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
