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
    const response = await fetch('/test_output');
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message)
    }
    return body;
  };

  render() {
    return (
      <Router>
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
            {/* test replay page */}
            {this.state.test_outputs &&
              <Route path="/replays/:test" children={
                <Replay tests={this.state.test_outputs.tests || []} />
              } />
            }
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
  return (
    <div className="test-list">
      <h1>bitempura-viz 🔮</h1>
      <div>
        <h3>{props.test_outputs ? `test outputs (${props.test_outputs.tests.length} tests):` : "test outputs:"}</h3>
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
              {/* NOTE: currently preferring using Replay instead of Test since adding manual controls */}
              <span><Link to={"/replays/" + encodeURIComponent(test.TestName)}>{test.TestName}</Link> {testSummary(keyCount, versionCount)}</span>
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
// NOTE: currently not used in favor of Replay since adding manual controls instead of timed animation.
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

  return (
    <div className="App" >
      <header className="App-header">
        <div className="test">
          <h3>{test.Passed ? "✅ " : "❌ "} {testName}</h3>
          Key: {key}. {testSummary(keyCount, versionCount)}. <Link to={"/replays/" + encodedTestName}>⏳ Replay it</Link>
          <Chart histories={test.Histories}></Chart>
          <Footer></Footer>
        </div>
      </header>
    </div>
  );
}

// Replay is a page deoming our responsive chart feature
function Replay(props) {
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
          {/* NOTE: currently preferring using Replay instead of Test since adding manual controls */}
          Key: {key}. {testSummary(keyCount, versionCount)}. {/* <Link to={"/tests/" + encodedTestName}>{test.Passed ? "✅ " : "❌ "} Back to test</Link> */}
          <ChartReplay historiesHistory={historiesHistory}></ChartReplay>
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
// NOTE: right now, this only ever renders the first key.
function updateOptionWithHistories(option, histories) {
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
    validDelta = Math.max(largestValid - smallestValid, 7 * _MS_PER_DAY);
    txDelta = Math.max(largestTx - smallestTx, 7 * _MS_PER_DAY);
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

// ChartReplay is a variation of Chart that is responsive and replays a history-history for a database.
// props.historiesHistory to render.
function ChartReplay(props) {
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
      <div className="replay-controls">
        <span>Replay Controls: </span>
        <span>
          {state.idx > 0 ? <span className="replay-button" onClick={() => handleClick(-1)}>◀️</span> : <span className="replay-button-placeholder">◀️</span>}
          {state.idx < maxIdx ? <span className="replay-button" onClick={() => handleClick(1)}>▶️</span> : <span className="replay-button-placeholder">▶️</span>}
        </span>
      </div>
      <div className="chart" >
        <ReactECharts option={state.option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

// Chart is the core component that actually renders the temporal chart.
// props.histories: list of VersionedKV for a single key
// NOTE: right now, this only ever renders the first key.
function Chart(props) {
  let option = updateOptionWithHistories(BASE_OPTION, props.histories);
  return (
    <div className="chart" >
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

// Footer is a common navigation footer component.
// props.hide_all_tests_link is true is we should hide the back link to the TestList page.
function Footer(props) {
  return (
    <div>
      <p>
        {!props.hide_all_tests_link && <span>🔙 <Link to="/">All Tests</Link><br></br></span>}
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
