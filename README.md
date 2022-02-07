# bitempura-viz 🔍

**Bitempura-viz visualizes the 2 dimensional valid time and transaction time "history" in a [Bitempura database](https://github.com/elh/bitempura).**

The primary use case is to debug database states through tests. Bitempura tests write [TestOutput](https://pkg.go.dev/github.com/elh/bitempura/dbtest#TestOutput) files which contain the temporal history for relevant keys. This app must be provided those files at start up.

### Installation

```
(cd server && npm ci) && (cd client && npm ci)
````

### Usage

Bitempura-viz has a simple client-server set up. The server makes temporal histories available for the client to render.

1. Start the Express server w/ `TEST_OUTPUT_DIR` env var set to a path to a Bitempura `_testoutput/` dir to visualize.
```
(cd server; TEST_OUTPUT_DIR=<path to `_testoutput/`> node server.js)
# or
# (cd server; TEST_OUTPUT_DIR=<path to `_testoutput/`> npx nodemon server.js)
```

2. Start the React web app. Navigate to it at `http://localhost:3000/`.
```
(cd client; npm start)
````
