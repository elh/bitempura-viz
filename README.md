# bitempura-viz 🔍

**Bitempura-viz visualizes the 2 dimensional valid time and transaction time "history" in a [Bitempura database](https://github.com/elh/bitempura).**

The primary use case is to serve as a visual debugger for development of Bitempura. Bitempura tests write [TestOutput](https://pkg.go.dev/github.com/elh/bitempura/dbtest#TestOutput) files which contain the temporal history for relevant keys. This app must be provided those files at start up.

<p align="center">
    <img src="https://user-images.githubusercontent.com/1035393/152779039-a01ab3d5-f482-48e9-9a49-1cb33ced4f58.png">
    <img src="https://user-images.githubusercontent.com/1035393/152778606-6df7ba0d-6eea-4193-be4c-32c6b61ecb00.png">
</p>

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
