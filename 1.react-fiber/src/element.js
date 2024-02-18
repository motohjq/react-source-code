// import React from 'react';
// import ReactDOM from 'react-dom';
// let element = (
//   <div id='A1'>
//     <div id='B1'>
//       <div id='C1'></div>
//       <div id='C2'></div>
//     </div>
//     <div id='B2'></div>
//   </div>
// )
// console.log(JSON.stringify(element, null, 2));
// ReactDOM.render(element, document.getElementById('root'));

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  "type": "div",
  "props": {
    "id": "A1",
    "children": [
      {
        "type": "div",
        "props": {
          "id": "B1",
          "children": [
            {
              "type": "div",
              "props": {
                "id": "C1"
              },
            },
            {
              "type": "div",
              "props": {
                "id": "C2"
              },
            }
          ]
        },
      },
      {
        "type": "div",
        "props": {
          "id": "B2"
        },
      }
    ]
  }
}