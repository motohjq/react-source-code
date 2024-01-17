import React from 'react';
class LifeCycle extends React.Component {
  componentDidMount() {
    this.props.onMount && this.props.onMount(this);//利用生命周期来跳转路径
  }
  componentWillUnmount() {
    this.props.onUnMount && this.props.onUnMount(this);
  }
  render() {
    return null;
  }
}
export default LifeCycle;