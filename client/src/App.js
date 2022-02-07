import React, { Component } from 'react';
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
      <div className="App" >
        <header className="App-header">
          <h1>bitempura-viz 🔍</h1>
          <div>
            <h3>test outputs:</h3>
            <ul>
              {this.state.test_outputs && this.state.test_outputs.tests.map((test) =>
                <li key={test.TestName}>{test.TestName}</li>)
              }
            </ul>
            <p>
              <a href="https:/github.com/elh/bitempura-viz">bitempura-viz</a> visualization of bitempura databases<br></br>
              <a href="https:/github.com/elh/bitempura">bitempura</a> bitemporal databases
            </p>
          </div>
        </header>
      </div>
    );
  }
}

export default App;
