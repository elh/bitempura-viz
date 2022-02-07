import React, { Component } from 'react';
import './App.css';

class App extends Component {
  state = {
    data: null
  };

  componentDidMount() {
    this.callBackendAPI()
      .then(res => this.setState({ data: res.express }))
      .catch(err => console.log(err));
  }

  // fetching the GET route from the Express server which matches the GET route from server.js
  callBackendAPI = async () => {
    const response = await fetch('/express_backend');
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
          <p>bitempura-viz 🔍</p>
          <ul>
            <li>A</li>
            <li>B long text long long long</li>
          </ul>
          <p className="App-intro">{this.state.data}</p>
          <p>
            <a href="https:/github.com/elh/bitempura-viz">bitempura-viz</a> visualization of bitempura databases<br></br>
            <a href="https:/github.com/elh/bitempura">bitempura</a> bitemporal databases
          </p>
        </header>
      </div>
    );
  }
}

export default App;
