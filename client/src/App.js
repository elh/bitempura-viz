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
                  <h1>bitempura-viz 🔍</h1>
                  <div>
                    <h3>test outputs:</h3>
                    <ul>
                      {this.state.test_outputs && this.state.test_outputs.tests.map((test) =>
                        <li key={test.TestName}><Link to={"/tests/" + encodeURIComponent(test.TestName)}>{test.TestName}</Link></li>
                      )}
                    </ul>
                    <Footer></Footer>
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
  let hasNullTxEnd = false, hasNullValidEnd = false;

  // NOTE: assumes there is only 1 key
  let key = "";
  if (Object.keys(test.Histories).length > 0) {
    for (const [k, vs] of Object.entries(test.Histories)) {
      // get key
      key = k;

      // gather max and min values to calculate delta.
      // check if we have null end times. informs graphing bounds
      for (const v of vs) {
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
      break;
    }
  }

  console.log(test.Histories[key])

  console.log("smallestValid", new Date(smallestValid).toLocaleString());
  console.log("largestValid", new Date(largestValid).toLocaleString());
  console.log("smallestTx", new Date(smallestTx).toLocaleString());
  console.log("largestTx", new Date(largestTx).toLocaleString());
  // default minimum delta is 1 day
  let validDelta = Math.max(largestValid - smallestValid, _MS_PER_DAY);
  let txDelta = Math.max(largestTx - smallestTx, _MS_PER_DAY);
  console.log(validDelta);
  console.log(txDelta);

  // list of data points in the graph. the fields in order are:
  // 0 - valid time start
  // 1 - valid time end (capped using valid delta. this simplifies charting)
  // 2 - tx time start
  // 3 - tx time end (capped using tx delta. this simplifies charting)
  // 4 - value
  // 5 - tx end time (actual. can be null and will be displayed in tooltip)
  // 6 - valid end time (actual. can be null and will be displayed in tooltip)
  let echartData = [];
  if (Object.keys(test.Histories).length > 0) {
    for (const [k, vs] of Object.entries(test.Histories)) {
      // create data point
      echartData = vs.map(v => {
        let valueStr = JSON.stringify(v.Value, null, '  ')
        return {
          value: [
            v.TxTimeStart !== null ? Date.parse(v.TxTimeStart) : null,
            v.TxTimeEnd !== null ? Date.parse(v.TxTimeEnd) : largestTx + txDelta,
            v.ValidTimeStart !== null ? Date.parse(v.ValidTimeStart) : null,
            v.ValidTimeEnd !== null ? Date.parse(v.ValidTimeEnd) : largestValid + validDelta,
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
  }

  console.log(echartData)

  // TODO: remove this dummy data
  // echartData = [
  //   [+new Date(2011, 0, 1), +new Date(2011, 3, 1), +new Date(2011, 0, 1), +new Date(2012, 0, 1), 'A'],
  //   [+new Date(2011, 3, 1), +new Date(2011, 6, 1), +new Date(2011, 3, 1), +new Date(2012, 0, 1), 'B'],
  //   [+new Date(2011, 3, 1), +new Date(2011, 6, 1), +new Date(2011, 0, 1), +new Date(2011, 3, 1), 'A'],
  //   [+new Date(2011, 6, 1), +new Date(2012, 0, 1), +new Date(2011, 0, 1), +new Date(2012, 0, 1), 'C'],
  // ].map(function (item) {
  //   return {
  //     value: item,
  //     itemStyle: {
  //       color: stringToColour(item[4])
  //     }
  //   };
  // });


  let options = {
    // title: {
    //   text:testName + '\nKey: ' + key,
    //   left: 'center'
    // },
    tooltip: {},
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
      min: function (value) {
        return value.min - (txDelta / 10);
        // return value.min - 30 * _MS_PER_DAY; // TODO: make relative to data
      },
      max: function (value) {
        if (hasNullTxEnd) {
          return value.max;
        }
        return value.max + (txDelta / 10);
        // return value.max + 30 * _MS_PER_DAY; // TODO: make relative to data
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
      min: function (value) {
        return value.min - (validDelta / 10);
        // return value.min - 30 * _MS_PER_DAY; // TODO: make relative to data
      },
      max: function (value) {
        if (hasNullValidEnd) {
          return value.max;
        }
        return value.max + (validDelta / 10);
        // return value.max + 30 * _MS_PER_DAY; // TODO: make relative to data
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
          show: true, // disabled. set to true to enable
          position: ['10', '10'],
          color: '#fff',
          overflow: 'truncate',
          width: "50px"
        },
        dimensions: ['tx start', 'tx end', 'valid start', 'valid end', 'value', 'tx end actual', 'valid end actual'],
        encode: {
          x: [0, 1],
          y: [2, 3],
          tooltip: [4, 0, 1, 2, 3, 5, 6],
          itemName: 4,
          label: 4,
        },
        data: echartData
      }
    ]
  }

  return (
    <div className="App" >
      <header className="App-header">
        <h3>Test: {testName}</h3>
        Key: {key}
        <div className="chart" >
          <ReactECharts option={options} style={{ height: '100%', width: '100%', }} />
        </div>
        <Footer></Footer>
      </header>
    </div>
  );
}

function Footer() {
  return (
    <div>
      <p>
        <Link to="/">Home</Link><br></br>
        <a href="https:/github.com/elh/bitempura-viz">bitempura-viz</a> visualization of bitempura databases<br></br>
        <a href="https:/github.com/elh/bitempura">bitempura</a> bitemporal databases
      </p>
    </div>
  )
}

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
