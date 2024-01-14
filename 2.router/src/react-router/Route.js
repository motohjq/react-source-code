import React from 'react';
import RouterContext from './RouterContext';
import matchPath from './matchPath';
/**
 * 1. 获取到context中的值
 * 2. 匹配路由规则里的path是否和当前地址中的url地址一样‘
 * 如果相等，就渲染component，如果不渲染，就不渲染任何东西
 */
class Route extends React.Component {
  static contextType = RouterContext;
  render() {
    let { history, location } = this.context;//static contextType=>this.context
    let { component: RouteComponent, computedMatch, render, children } = this.props;
    let match = computedMatch ? computedMatch : matchPath(location.pathname, this.props);
    //let match = location.pathname === path;//如果两个一样匹配上了
    let renderElement = null;
    let routeProps = { history, location };
    if (match) {
      routeProps.match = match;
      if (RouteComponent) {
        renderElement = <RouteComponent {...routeProps} />;
      } else if (render) {
        renderElement = render(routeProps);
      } else if (children) {
        renderElement = children(routeProps);
      } else {
        renderElement = null;
      }
    } else {
      if (children) {
        renderElement = children(routeProps);
      } else {
        renderElement = null;
      }
    }
    return renderElement;
  }
}
export default Route;