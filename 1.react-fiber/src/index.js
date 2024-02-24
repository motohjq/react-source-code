import React, { useReducer, useState } from './react';
import ReactDOM from './react-dom';

class ClassCounter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { number: 0 };
  }
  onClick = () => {
    this.setState(state => ({ number: state.number + 1 }));
  }
  render() {
    return React.createElement("div", {
      id: "counter"
    }, React.createElement("span", null, this.state.number), React.createElement("button", {
      onClick: this.onClick
    }, "+1"));
  }
}

const ADD = 'ADD'
function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { count: state.count + 1 };
    default:
      return state;
  }
}

function FunctionCounter(props) {
  const [numberState, setNumberState] = useState({ number: 0 });
  const [countState, dispatch] = useReducer(reducer, { count: 0 });
  return React.createElement("div", null, React.createElement("div", {
    id: "counter1"
  }, React.createElement("span", null, numberState.number), React.createElement("button", {
    onClick: () => setNumberState({
      number: numberState.number + 1
    })
  }, "+1")), React.createElement("div", {
    id: "counter2"
  }, React.createElement("span", null, countState.count), React.createElement("button", {
    onClick: () => dispatch({
      type: ADD
    })
  }, "+1")));
}
ReactDOM.render(<FunctionCounter name='计数器' />, document.getElementById('root'));
