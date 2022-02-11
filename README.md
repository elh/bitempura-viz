# bitempura-viz 🔮

**Bitempura-viz visualizes the 2D valid time and transaction time history in a [Bitempura database](https://github.com/elh/bitempura).**

[Bitemporality](https://github.com/elh/bitempura#bitemporality) provides attractive data integrity and querying properties, but actually implementing and reasoning about it can be quite confusing. The nifty convention of visualizing the underlying records in a 2D chart was established as early as Richard T. Snodgrass's writings, but in the course of researching temporal databases, I found it to be underutilized. I created this tool to make these charts a first class artifact for building and sharing Bitempura.

## Usage

The primary use case is to serve as a visual debugging tool for the development of Bitempura. Bitempura tests write [TestOutput](https://pkg.go.dev/github.com/elh/bitempura/dbtest#TestOutput) files which contain the temporal history for relevant keys. This app must be provided those files at start up.

<p align="center">
    <img width="80%" alt="test list" src="https://user-images.githubusercontent.com/1035393/152917599-38ca81c0-2a30-48df-bef2-7b9c1049e967.png">
    <img width="80%" alt="bitempura" src="https://user-images.githubusercontent.com/1035393/152917603-a2540ae5-e94d-4ea7-bda4-1f6e9dccea45.gif">
</p>

Interactive mode TBD. Hosted app TBD. 👀

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
