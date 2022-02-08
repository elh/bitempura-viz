import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useLocation,
  useParams
} from "react-router-dom";
import ReactECharts from 'echarts-for-react';
import './App.css';

const _MS_PER_DAY = 1000 * 60 * 60 * 24;

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
            <Route exact path="/">
              <div className="App" >
                <header className="App-header">
                  <h1>bitempura-viz 🔮</h1>
                  <div>
                    <h3>{this.state.test_outputs ? `test outputs (${this.state.test_outputs.tests.length} tests):` : "test outputs:"}</h3>
                    {this.state.test_outputs && this.state.test_outputs.test_output_dir}
                    <ul>
                      {this.state.test_outputs && this.state.test_outputs.tests.map((test) => {
                        let keyCount = 0, versionCount = 0;
                        for (const [key, value] of Object.entries(test.Histories)) {
                          keyCount++;
                          versionCount += value.length;
                        }
                        return <li key={test.TestName}>
                          {test.Passed ? "✅ " : "❌ "}
                          <Link to={"/tests/" + encodeURIComponent(test.TestName)}>{test.TestName}</Link> {testSummary(keyCount, versionCount)}
                        </li>
                      })}
                    </ul>
                    <Footer hide_all_tests_link="true"></Footer>
                  </div>
                </header>
              </div>
            </Route>
            {this.state.test_outputs &&
              <Route path="/tests/:test" children={
                <Test tests={this.state.test_outputs.tests || []} />
              } />
            }
            <Route path="*">
              <NoMatch />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

// formats some supplementary context about the test.
function testSummary(keyCount, versionCount) {
  let str = "(" + keyCount.toString()
  if (keyCount == 1) {
    str += " key"
  } else {
    str += " keys"
  }
  str += ", " + versionCount.toString()
  if (versionCount == 1) {
    str += " version)"
  } else {
    str += " versions)"
  }
  return str
}

// Test is the component for rendering a specific test output.
function Test(props) {
  let routerParams = useParams();
  let encodedTestName = routerParams.test;
  let testName = decodeURIComponent(encodedTestName);

  let test = props.tests.find(t => t.TestName === testName)
  if (!test) {
    return <NoMatch />
  }

  let smallestValid = Number.MAX_VALUE, largestValid = 0;
  let smallestTx = Number.MAX_VALUE, largestTx = 0;
  let validDelta = 0, txDelta = 0;
  let hasNullTxEnd = false, hasNullValidEnd = false;

  // TODO: handle multiple keys
  // identify the key, compute max and min values and their delta for charting
  let key = "";
  if (Object.keys(test.Histories).length > 0) {
    // get key
    key = Object.keys(test.Histories)[0];

    // gather max and min values to calculate delta.
    // check if we have null end times. informs graphing bounds
    for (const v of test.Histories[key]) {
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
    validDelta = Math.max(largestValid - smallestValid, _MS_PER_DAY);
    txDelta = Math.max(largestTx - smallestTx, _MS_PER_DAY);
  }

  // list of data points in the graph. the fields in order are:
  // 0 - valid time start
  // 1 - valid time end (capped using valid delta. this simplifies charting)
  // 2 - tx time start
  // 3 - tx time end (capped using tx delta. this simplifies charting)
  // 4 - value
  // 5 - tx end time (actual. can be null and will be displayed in tooltip)
  // 6 - valid end time (actual. can be null and will be displayed in tooltip)
  let echartsData = [];
  if (Object.keys(test.Histories).length > 0) {
    // create data points
    echartsData = test.Histories[key].map(v => {
      let valueStr = JSON.stringify(v.Value, null, '  ')
      return {
        value: [
          v.TxTimeStart !== null ? Date.parse(v.TxTimeStart) : null,
          v.TxTimeEnd !== null ? Date.parse(v.TxTimeEnd) : new Date(largestTx + txDelta),
          v.ValidTimeStart !== null ? Date.parse(v.ValidTimeStart) : null,
          v.ValidTimeEnd !== null ? Date.parse(v.ValidTimeEnd) : new Date(largestValid + validDelta),
          valueStr,
          v.TxTimeEnd !== null ? Date.parse(v.TxTimeEnd) : null,
          v.ValidTimeEnd !== null ? Date.parse(v.ValidTimeEnd) : null
        ],
        itemStyle: {
          color: stringToColour(valueStr)
        }
      }
    });
  }

  let options = {
    // design this outside of echarts
    // title: {
    //   text:testName + '\nKey: ' + key,
    //   left: 'center'
    // },
    tooltip: {
      show: true,
      // enterable: true,
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
      min: function (value) {
        return value.min - (txDelta / 10);
      },
      max: function (value) {
        if (hasNullTxEnd) {
          return value.max;
        }
        return value.max + (txDelta / 10);
      }
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
      min: function (value) {
        return value.min - (validDelta / 10);
      },
      max: function (value) {
        if (hasNullValidEnd) {
          return value.max;
        }
        return value.max + (validDelta / 10);
      }
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
        dimensions: ['tx start', 'tx end (capped)', 'valid start', 'valid end (capped)', 'value', 'tx end', 'valid end'],
        encode: {
          x: [0, 1, 5],
          y: [2, 3, 6],
          tooltip: [4, 0, 5, 2, 6],
          itemName: 4,
          label: 4,
        },
        data: echartsData
      }
    ],
    useUTC: true
  }

  // test context
  let keyCount = 0, versionCount = 0;
  for (const [key, value] of Object.entries(test.Histories)) {
    keyCount++;
    versionCount += value.length;
  }

  return (
    <div className="App" >
      <header className="App-header">
        <h3>{test.Passed ? "✅ " : "❌ "} {testName}</h3>
        Key: {key}. {testSummary(keyCount, versionCount)}
        <div className="chart" >
          <ReactECharts option={options} style={{ height: '100%', width: '100%' }} />
        </div>
        <Footer></Footer>
      </header>
    </div>
  );
}

// Footer is a common navigation footer.
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

// No match is a common 404 response.
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

// this hashes a value to generate a color for differeniation in the chart.
var stringToColour = function (str) {
  str += "foobar" // pad strings so hash produces wider range. this is very jank.
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
}

export default App;
