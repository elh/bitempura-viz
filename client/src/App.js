import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useLocation,
  useParams
} from "react-router-dom";
import './App.css';

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

  return (
    <div className="App" >
      <header className="App-header">
        <h3>Test: {testName}</h3>
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

export default App;
