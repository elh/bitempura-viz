import React, { Component, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useLocation,
  useParams
} from "react-router-dom";
import ReactECharts from 'echarts-for-react';
import ReactMarkdown from 'react-markdown'
import cloneDeep from 'lodash.clonedeep';
import './App.css';

const _MS_PER_DAY = 1000 * 60 * 60 * 24;

// App is the root component which handles multiple url routes and pages.
class App extends Component {
  state = {
    test_outputs: null
  };

  componentDidMount() {
    this.fetchTestOutputs()
      .then(res => this.setState({ test_outputs: res }))
      .catch(err => console.log(err));
  }

  fetchTestOutputs = async () => {
    // if REACT_APP_USE_FIXTURES env var is set, use fixtures instead of fetching from server. response is static json file _fixtures/test_output.json
    let response = null;
    if (process.env.REACT_APP_USE_FIXTURES && process.env.REACT_APP_USE_FIXTURES === "true" ) {
      response = await fetch('bitempura-viz/_fixtures/test_output.json');
    } else {
      response = await fetch('/test_output');
    }

    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message)
    }
    return body;
  };

  render() {
    return (
      <Router basename={process.env.PUBLIC_URL}>
        <div>
          <Switch>
            {/* home page */}
            <Route exact path="/">
              <div className="App" >
                <header className="App-header">
                  <TestList test_outputs={this.state.test_outputs}></TestList>
                </header>
              </div>
            </Route>
            {/* test page */}
            {this.state.test_outputs &&
              <Route path="/tests/:test" children={
                <Test tests={this.state.test_outputs.tests || []} />
              } />
            }
            {/* interactive mode */}
            <Route path="/interactive">
              <Interactive />
            </Route>
            {/* 404 */}
            <Route path="*">
              <NoMatch />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

// TestList is the component for rendering the list of all provided tests.
// props.test_outputs: API response w/ all provided tests and the name of the test dir
function TestList(props) {
  const intro = `
**Bitempura-viz visualizes the 2D valid time and transaction time history in a [simple bitemporal kv database↗](https://github.com/elh/bitempura).**

[Bitemporality↗](https://github.com/elh/bitempura#bitemporality) provides attractive data integrity and querying properties, but actually implementing and reasoning about it can be quite confusing. The nifty convention of visualizing the underlying records in a 2D chart was established as early as Richard T. Snodgrass's writings, but in the course of researching temporal databases, I found it to be underutilized. I created this tool to make these charts a first class artifact for building and sharing Bitempura.

Temporal databases model time as a core aspect of storing and querying data. A bitemporal database is one that supports these orthogonal axes.
* **Valid time**: When the fact was *true* in the real world. This is the *application domain's* notion of time.
* **Transaction time**: When the fact was *recorded* in the database. This is the *system's* notion of time.

&nbsp;  
&nbsp;  
See an example: [TestRobinhoodExample](/bitempura-viz/tests/TestRobinhoodExample) ([code↗](https://github.com/elh/bitempura/blob/main/memory/db_examples_test.go))
&nbsp;  
See [bitempura-viz↗](https:/github.com/elh/bitempura-viz) and [bitempura↗](https:/github.com/elh/bitempura) for more.
`
  return (
    <div className="test-list">
      <h1>bitempura-viz 🔮</h1>
      <ReactMarkdown children={intro}></ReactMarkdown>
      <div className="divider"/>
      <div>
        <h3>1. <Link to={"/interactive"}>Interactive Mode</Link></h3>
        <div>A janky live demo powered by a WASM-compiled bitemporal key-value db. TODO: interact with it via a powerbar</div>
        <br></br>
        <h3>{props.test_outputs ? `2. Test Outputs (${props.test_outputs.tests.length} tests):` : "2. Test Outputs:"}</h3>
        2D visualizations of bitempura test cases
        <br/><br/>
        {props.test_outputs && props.test_outputs.test_output_dir}
        <ul>
          {props.test_outputs && props.test_outputs.tests.map((test) => {
            let keyCount = 0, versionCount = 0;
            for (const [, value] of Object.entries(test.Histories)) {
              keyCount++;
              versionCount += value.length;
            }
            return <li key={test.TestName}>
              {test.Passed ? "✅ " : "❌ "}
              {test.TestName === "TestRobinhoodExample" && <span>⭐ </span>}
              <span><Link to={"/tests/" + encodeURIComponent(test.TestName)}>{test.TestName}</Link> {testSummary(keyCount, versionCount)}</span>
            </li>
          })}
        </ul>
        <Footer hide_all_tests_link="true"></Footer>
      </div>
    </div>
  )
}

// formats some supplementary context about the test.
function testSummary(keyCount, versionCount) {
  let str = "(" + keyCount.toString()
  if (keyCount === 1) {
    str += " key"
  } else {
    str += " keys"
  }
  str += ", " + versionCount.toString()
  if (versionCount === 1) {
    str += " version)"
  } else {
    str += " versions)"
  }
  return str
}

// Test is the component for rendering a specific test output.
// props.tests: the list of all provided tests
function Test(props) {
  let routerParams = useParams();
  let encodedTestName = routerParams.test;
  let testName = decodeURIComponent(encodedTestName);

  // react-router-dom doesn't make it easy to take just the specific test from the url route as a prop
  let test = props.tests.find(t => t.TestName === testName)
  if (!test) {
    return <NoMatch />
  }

  // test context
  let keyCount = 0, versionCount = 0;
  for (const [, value] of Object.entries(test.Histories)) {
    keyCount++;
    versionCount += value.length;
  }

  // NOTE: right now, this only ever renders the first key.
  // this is a big assumption about the behavior of Chart component. revisit if we actually support multiple keys.
  let key = Object.keys(test.Histories).length > 0 ? Object.keys(test.Histories)[0] : "";

  // build histories history from the test
  const historiesHistory = buildHistoriesHistory(test.Histories)

  return (
    <div className="App" >
      <header className="App-header">
        <div className="test">
          <h3>{test.Passed ? "✅ " : "❌ "} {testName}</h3>
          { test.Description &&
            <div>
              <ReactMarkdown children={test.Description} />
              <div className="divider"/>
              </div>}
          <div>Key: {key}. {testSummary(keyCount, versionCount)}.</div>
          <Chart historiesHistory={historiesHistory} enableReplay={true}></Chart>
          <Footer></Footer>
        </div>
      </header>
    </div>
  );
}

// given a final history, return back a representation of the history as it was at every tx start and tx end time.
function buildHistoriesHistory(histories) {
  // assign ids to each versioend kv so that there is a stable id for considering change over time (for animations)
  const historiesWithKVIds = cloneDeep(histories);
  let idx = 0
  for (const [, kvs] of Object.entries(histories)) {
    for (const v of kvs) {
      v.Id = idx
      idx++
    }
  }
  let historiesHistory = [historiesWithKVIds] // an array of histories (objects where db keys are keys and list of versioned kvs are values)

  while (true) {
    let latestTxTime = getLatestNonNullTxTime(historiesHistory[0])
    if (latestTxTime == null) {
      break
    }
    const prevHistories = cloneDeep(historiesHistory[0]);
    for (const [, kvs] of Object.entries(prevHistories)) {
      // stupid trick to iterate list backwards to not break indices when deleting elements during iteration
      for (var i = kvs.length - 1; i >= 0; i--) {
        let v = kvs[i]
        if (v.TxTimeEnd !== null && Date.parse(v.TxTimeEnd) === latestTxTime) {
          v.TxTimeEnd = null;
        }
        if (v.TxTimeStart !== null && Date.parse(v.TxTimeStart) === latestTxTime) {
          kvs.splice(i, 1);
        }
      }
    }

    // don't add a set of histories where there are no records at all
    let count = 0
    for (const [, kvs] of Object.entries(prevHistories)) {
      count += kvs.length
    }
    if (count === 0) {
      break
    }

    historiesHistory.unshift(prevHistories);
  }

  return historiesHistory
}


function getLatestNonNullTxTime(histories) {
  let latest = null
  for (const [, kvs] of Object.entries(histories)) {
    for (const v of kvs) {
      if (v.TxTimeStart !== null) {
        let t = Date.parse(v.TxTimeStart)
        if (latest == null || t > latest) {
          latest = t
        }
      }
      if (v.TxTimeEnd !== null) {
        let t = Date.parse(v.TxTimeEnd)
        if (latest == null || t > latest) {
          latest = t
        }
      }
    }
  }
  return latest
}

// Interactive is the component for creating an interactive chart powered by the in-memory Go DB compiled to Wasm.
function Interactive() {
  return (
    <div className="App" >
      <header className="App-header">
        <div className="test">
          <h3>Interactive Mode</h3>
          <div>A janky live demo powered by a WASM-compiled bitemporal key-value db. TODO: interact with it via a powerbar</div>
          <h2/>
          Use the globally available <code>bt_</code>-prefixed fns from the browser console to interact with a <a href="https://github.com/elh/bitempura/tree/main/memory/wasm">local Bitempura DB</a>.<br></br>
          Call <code>bt_Init(true)</code> to re-init the db with a clock if you want to control tx times with <code>bt_SetNow(time)</code>.
          <ChartInteractive></ChartInteractive>
          <Footer></Footer>
        </div>
      </header>
    </div>
  );
}

// ChartInteractive is a variation of Chart component that sources the histories to render from the in-memory Go DB
// compiled to Wasm.
function ChartInteractive() {
  const [state, setState] = useState({
    option: BASE_OPTION
  });

  function onChange(key) {
    let h = window.bt_History(key);
    if (!h) {
      return
    }
    setState({
      option: updateOptionWithHistories(BASE_OPTION, { key: h }, 10 * 1000 /* 10s */),
    });
  }

  // useEffect is only invoked once because of empty dependency array second arg
  useEffect(() => {
    // init bitempura DB and set up the on change callback
    // TODO: remove this janky sleep to make sure the .wasm has loaded before this component is mounted.
    setTimeout(() => {
      window.bt_Init();
      window.bt_OnChange(function (key) { onChange(key) });
    }, 500);
  }, []);

  return (
    <div className="chart" >
      <ReactECharts option={state.option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

// BASE_OPTION are the common unchanging options for all our echart configs.
// Chart components will set xAxis.min, xAxis.max, yAxis.min, yAxis.max, and series.data.
// NOTE: right now, this only ever renders the first key. this assumes there is always only 1 "series"
const BASE_OPTION = {
  grid: {
    top: "20px", // we do not use titles. make this shorter than default 60px
  },
  tooltip: {
    show: true,
    axisPointer: {
      snap: true,
      type: 'cross'
    },
    textStyle: {
      width: '100px',
      fontSize: '10',
    },
  },
  textStyle: {
    fontFamily: 'monospace'
  },
  xAxis: {
    name: 'Tx Time',
    type: 'time',
    nameLocation: 'middle',
    nameTextStyle: {
      padding: 20,
    },
    axisLine: {
      show: true,
    },
    axisTick: {
      show: true,
    },
    splitLine: {
      show: true,
    },
  },
  yAxis: {
    name: 'Valid Time',
    type: 'time',
    nameLocation: 'middle',
    nameTextStyle: {
      padding: 20,
    },
    axisLine: {
      show: true,
    },
    axisTick: {
      show: true,
    },
    splitLine: {
      show: true,
    },
  },
  series: [
    {
      type: 'custom',
      renderItem: function (params, api) {
        var start = api.coord([api.value(0), api.value(2)]);
        var size = api.size([api.value(1) - api.value(0), api.value(3) - api.value(2)]);
        var style = api.style();
        return {
          type: 'rect',
          shape: {
            x: start[0],
            y: start[1],
            width: size[0],
            height: -size[1]
          },
          style: style
        };
      },
      label: {
        show: false, // disabled. truncating is not working
        position: ['10', '10'],
        color: '#fff',
        overflow: 'truncate',
        width: "50px"
      },
      dimensions: ['tx start', 'tx end (capped)', 'valid start', 'valid end (capped)', 'value', 'tx end', 'valid end', 'id'],
      encode: {
        x: [0, 1, 5],
        y: [2, 3, 6],
        tooltip: [4, 0, 5, 2, 6],
        itemName: 4,
        itemId: 7, // optional 8th element which is an id for the record. useful for animating/debugging history-histories
        label: 4,
      },
      animationEasing: 'elasticOut',
      universalTransition: {
        enabled: true
      }
    }
  ],
  useUTC: true
}

// return a new option object by updating option arg with histories. does not mutate option arg
// Will return an option updating xAxis.min, xAxis.max, yAxis.min, yAxis.max, and series.data.
// minDeltaDurationMs is an optional parameter that specifies the minimum range for the chart between min and max values.
// NOTE: right now, this only ever renders the first key.
function updateOptionWithHistories(option, histories, minDeltaDurationMs = 7 * _MS_PER_DAY) {
  // compute these values that will inform axes min and max
  let smallestValid = Number.MAX_VALUE, largestValid = 0;
  let smallestTx = Number.MAX_VALUE, largestTx = 0;
  let validDelta = 0, txDelta = 0;
  let hasNullTxEnd = false, hasNullValidEnd = false;

  // identify the key, compute max and min values and their delta for charting
  let key = "";
  if (Object.keys(histories).length > 0) {
    // get key
    key = Object.keys(histories)[0];

    // gather max and min values to calculate delta.
    // check if we have null end times. informs graphing bounds
    for (const v of histories[key]) {
      if (v.ValidTimeStart !== null) {
        let t = Date.parse(v.ValidTimeStart)
        if (t < smallestValid) {
          smallestValid = t;
        }
        if (t > largestValid) {
          largestValid = t;
        }
      }
      if (v.ValidTimeEnd !== null) {
        let t = Date.parse(v.ValidTimeEnd)
        if (t < smallestValid) {
          smallestValid = t;
        }
        if (t > largestValid) {
          largestValid = t;
        }
      } else {
        hasNullValidEnd = true;
      }
      if (v.TxTimeStart !== null) {
        let t = Date.parse(v.TxTimeStart)
        if (t < smallestTx) {
          smallestTx = t;
        }
        if (t > largestTx) {
          largestTx = t;
        }
      }
      if (v.TxTimeEnd !== null) {
        let t = Date.parse(v.TxTimeEnd)
        if (t < smallestTx) {
          smallestTx = t;
        }
        if (t > largestTx) {
          largestTx = t;
        }
      } else {
        hasNullTxEnd = true;
      }
    }

    // default minimum delta is 1 day
    validDelta = Math.max(largestValid - smallestValid, minDeltaDurationMs);
    txDelta = Math.max(largestTx - smallestTx, minDeltaDurationMs);
  }

  // list of data points in the graph. the fields in order are:
  // 0 - valid time start
  // 1 - valid time end (capped using valid delta. this simplifies charting)
  // 2 - tx time start
  // 3 - tx time end (capped using tx delta. this simplifies charting)
  // 4 - value
  // 5 - tx end time (actual. can be null and will be displayed in tooltip)
  // 6 - valid end time (actual. can be null and will be displayed in tooltip)
  // 7 - an id for the underlying bitemporal record. useful for animating/debugging history-histories (optional)
  let echartsData = [];
  if (Object.keys(histories).length > 0) {
    // create data points
    echartsData = histories[key].map(v => {
      let valueStr = JSON.stringify(v.Value, null, '  ')
      let value = [
        v.TxTimeStart !== null ? Date.parse(v.TxTimeStart) : null,
        v.TxTimeEnd !== null ? Date.parse(v.TxTimeEnd) : new Date(largestTx + txDelta),
        v.ValidTimeStart !== null ? Date.parse(v.ValidTimeStart) : null,
        v.ValidTimeEnd !== null ? Date.parse(v.ValidTimeEnd) : new Date(largestValid + validDelta),
        valueStr,
        v.TxTimeEnd !== null ? Date.parse(v.TxTimeEnd) : null,
        v.ValidTimeEnd !== null ? Date.parse(v.ValidTimeEnd) : null
      ]
      if (v.Id) {
        value.push(v.Id);
      }
      return {
        value: value,
        itemStyle: {
          color: toColor(valueStr)
        }
      }
    });
  }

  // actually update and return a new option
  const newOption = cloneDeep(option); // immutable
  newOption.xAxis.min = function (value) {
    return value.min - (txDelta / 10);
  }
  newOption.xAxis.max = function (value) {
    if (hasNullTxEnd) {
      return value.max;
    }
    return value.max + (txDelta / 10);
  }
  newOption.yAxis.min = function (value) {
    return value.min - (validDelta / 10);
  }
  newOption.yAxis.max = function (value) {
    if (hasNullValidEnd) {
      return value.max;
    }
    return value.max + (validDelta / 10);
  }
  newOption.series[0].data = echartsData;

  return newOption;
}

// Chart is the core component that actually renders the temporal chart. It can be responsive and replays a
// histories-history for a database.
// NOTE: right now, this only ever renders the first key.
// props.historiesHistory: a history of histories for a set of keys in the database.
// props.enableReplay: if true, allow replay controls
function Chart(props) {
  const maxIdx = props.historiesHistory.length - 1;
  const [state, setState] = useState({
    idx: maxIdx,
    option: props.historiesHistory.length > 0 ? updateOptionWithHistories(BASE_OPTION, props.historiesHistory[maxIdx]) : BASE_OPTION
  });

  // dir is -1 for left (back one), +1 for right (forward one)
  function handleClick(dir) {
    let curState = state;
    setState({
      idx: curState.idx + dir,
      option: updateOptionWithHistories(BASE_OPTION, props.historiesHistory[curState.idx + dir]),
    });
  }

  return (
    <div>
      {props.enableReplay &&
        <div className="replay-controls">
          <span>Replay Controls:</span>
          <span>
            {state.idx > 0 ? <span className="replay-button" onClick={() => handleClick(-1)}>◀️</span> : <span className="replay-button-placeholder">◀️</span>}
            {state.idx < maxIdx ? <span className="replay-button" onClick={() => handleClick(1)}>▶️</span> : <span className="replay-button-placeholder">▶️</span>}
          </span>
        </div>
      }
      <div className="chart" >
        <ReactECharts option={state.option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

// Footer is a common navigation footer component.
// props.hide_all_tests_link is true is we should hide the back link to the TestList page.
function Footer(props) {
  return (
    <div>
      <p>
        {!props.hide_all_tests_link && <span>🔙 <Link to="/">Home</Link><br></br></span>}
        🔗 <a href="https:/github.com/elh/bitempura-viz">bitempura-viz</a><br></br>
        🔗 <a href="https:/github.com/elh/bitempura">bitempura</a>
      </p>
    </div>
  )
}

// NoMatch is a 404 page component.
function NoMatch() {
  let location = useLocation();
  return (
    <div className="App" >
      <header className="App-header">
        <h3>
          404 <code>{location.pathname}</code>
        </h3>
        <Footer></Footer>
      </header>
    </div>
  );
}

// returns a css hsl string for this app. using fixed saturation and lightness, just vary hue by hashing the string value.
function toColor(v) {
  v = v + "foo" // random seed that made me like the test colors more...
  return `hsl(${Math.abs(hash(v)) % 360}, 100%, 65%)`
}

// hash returns a 32 bit integer hash of a string.
function hash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export default App;
