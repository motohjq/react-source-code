import React from 'react';
import ReactDOM from 'react-dom';
let element = (
  <div id='A1'>
    <div id='B1'>
      <div id='C1'></div>
      <div id='C2'></div>
    </div>
    <div id='B2'></div>
  </div>
)
console.log(element);
ReactDOM.render(element, document.getElementById('root'));
