import React from 'react';
import matchPath from './matchPath';
import RouterContext from './RouterContext';
class Switch extends React.Component {
  static contextType = RouterContext;
  render() {
    const { location } = this.context;
    let element, match;
    React.Children.forEach(this.props.children, route => {
      //一旦有一个匹配了，后面的就不再匹配了
      if (!match && React.isValidElement(route)) {//如果还没有任何一个元素匹配上
        element = route;
        match = matchPath(location.pathname, route.props);//如果返回true，说明匹配上了，后续的循环就不再继续处理了；如果返回false，在下一次循环继续判断是否匹配
      }
    });
    return match ? React.cloneElement(element, { computedMatch: match }) : null;
  }
}
export default Switch;