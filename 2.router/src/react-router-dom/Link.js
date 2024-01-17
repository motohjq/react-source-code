import React from 'react';
import { __RouterContext as RouterContext } from '../react-router';
function Link(props) {
  return (
    <RouterContext.Consumer>
      {
        ({ history }) => {
          return (
            <a
              {...props}
              onClick={
                event => {
                  event.preventDefault();//阻止a标签的默认跳转，用自己的history跳转
                  history.push(props.to);
                }
              }
            >{props.children}</a>
          )
        }
      }
    </RouterContext.Consumer>
  )
}
export default Link;