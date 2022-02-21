# bitempura-viz 🔮

**Bitempura-viz visualizes the 2D valid time and transaction time history in a [Bitempura database](https://github.com/elh/bitempura).**

[Bitemporality](https://github.com/elh/bitempura#bitemporality) provides attractive data integrity and querying properties, but actually implementing and reasoning about it can be quite confusing. The nifty convention of visualizing the underlying records in a 2D chart was established as early as Richard T. Snodgrass's writings, but in the course of researching temporal databases, I found it to be underutilized. I created this tool to make these charts a first class artifact for building and sharing Bitempura.

## Usage

### Debugging Tests 🧪

The original use case was to serve as a visual debugging tool for the development of Bitempura. Bitempura tests write [TestOutput](https://pkg.go.dev/github.com/elh/bitempura/dbtest#TestOutput) files which contain the temporal history for relevant keys. This app must be provided those files at start up.

<p align="center">
    <img width="95%" alt="test list" src="https://user-images.githubusercontent.com/1035393/154894176-a2927e36-4b2a-41e3-82ca-88011d4a3f46.png">
    <img width="95%" alt="bitempura" src="https://user-images.githubusercontent.com/1035393/154894531-396b2ec4-0a4c-474f-bb11-73b5cc456eb2.gif">
</p>

### Interactive Mode 🪄

Using the [Bitempura in-memory DB compiled to Wasm](https://github.com/elh/bitempura/tree/main/memory/wasm), we can directly manipulate a bitempura DB and visualize it from the web!

<p align="center">
    <img width="95%" alt="bitempura" src="https://user-images.githubusercontent.com/1035393/154895514-a3327fec-c5c5-46bd-8e5e-a686cc8b21ef.gif">
</p>

Hosted app TBD. 👀

### Installation

```
make install
````

### Running Locally

Bitempura-viz has a simple client-server set up. The server makes temporal histories available for the client to render.

1. Start the Express server w/ `TEST_OUTPUT_DIR` env var set to a path to a Bitempura `_testoutput/` dir to visualize.
```
make run-server
# or `make run-server-nodemon`
```

2. Start the React web app. Navigate to it at `http://localhost:3000/`.
```
make run-client
````

See `Makefile` for more context.

### Enhancements?

see [Issues](https://github.com/elh/bitempura-viz/issues).
