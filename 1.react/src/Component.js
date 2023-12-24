import { findDOM, compareTwoVdom } from './react-dom';
import { shallowEqual } from './utils';
export let updateQueue = {
  isBatchingUpdate: false,//通过此变量来控制是否批量更新，默认值为直接更新不批量合并
  updaters: [],
  batchUpdate() {//在每个事件（例如onClick)函数中最后都会执行这个函数，触发批量更新
    for (let updater of updateQueue.updaters) {
      updater.updateComponent();
    }
    updateQueue.isBatchingUpdate = false;
    updateQueue.updaters.length = 0;
  }
}

// 触发事件批量更新本质 只不过updateQueue.isBatchingUpdate的设置会在合成事件处理
class MyComponet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      num: 0
    }
  }
  handleClick() {
    updateQueue.isBatchingUpdate = true;//先开启批量更新

    this.setState((lastState) => ({ num: lastState.num + 1 }), () => { console.log('cb1', this.state.num); })
    console.log(this.state.num);
    this.setState((lastState) => ({ num: lastState.num + 1 }), () => { console.log('cb2', this.state.num); })
    console.log(this.state.num);

    setTimeout(() => {
      //setTimeout是宏任务，会跳出handleClick函数
      console.log(this.state.num);
      this.setState((lastState) => ({ num: lastState.num + 1 }), () => { console.log('cb3', this.state.num); })
      console.log(this.state.num);
      this.setState((lastState) => ({ num: lastState.num + 1 }), () => { console.log('cb4', this.state.num); })
      console.log(this.state.num);
    }, 2000);

    updateQueue.batchUpdate();//批量更新执行

    updateQueue.isBatchingUpdate = false;//关闭批量更新，关闭后会执行上面的setTimeout，这时候是直接更新了
  }
  render() {
    console.log('render');
    return <div onClick={handleClick}>
      <span>num: {this.state.num}</span>
    </div>
  }
}
// 点击后应该是
// 0
// 0
// cb1 2
// cb2 2
// 2
// cb3 3
// 3
// cb4 4
// 4

class Updater {
  constructor(classInstance) {
    this.classInstance = classInstance;//类组件的实例
    this.pendingStates = [];//保存将要更新的队列，可能是个对象，也可能是个函数
    this.callbacks = [];//保存将要执行的回调函数
  }
  addState(partialState, callback) {
    this.pendingStates.push(partialState);
    if (typeof callback === 'function')
      this.callbacks.push(callback)
    this.emitUpdate();//触发更新逻辑   不传参是因为改变的是state
  }
  //不管状态和属性的变化 都会让组件刷新，不管状态变化和属性变化 都会执行此方法
  emitUpdate(nextProps) {
    this.nextProps = nextProps;//可能会传过来了一新的属性对象
    //如果当前处于批量更新模式，那么就把此updater实例添加到updateQueue里去
    if (updateQueue.isBatchingUpdate) {
      updateQueue.updaters.push(this);
    } else {
      this.updateComponent();//让组件更新
    }
  }
  updateComponent() {
    let { classInstance, pendingStates, nextProps } = this;
    if (nextProps || pendingStates.length > 0) {//如果有等待的更新的话
      shouldUpdate(classInstance, nextProps, this.getState());
    }
  }
  //根据老状态，和pendingStates这个更新队列，计算新状态
  getState() {
    let { classInstance, pendingStates } = this;
    let { state } = classInstance;//先获取老的原始的组件状态
    pendingStates.forEach(nextState => {
      //如果pendingState是一个函数的话，传入老状态，执行函数得到新状态，然后合并
      if (typeof nextState === 'function') {
        nextState = nextState(state);
      }
      state = { ...state, ...nextState };
    });
    pendingStates.length = 0;//清空等待更新的队列
    /*  this.callbacks.forEach(callback=>callback());
     this.callbacks.length=0; */
    return state;//返回新状态
  }
}
/**
 * 判断组件是否需要更新
 * @param {*} classInstance 组件实例
 * @param {*} nextProps 
 * @param {*} nextState 新的状态
 */
function shouldUpdate(classInstance, nextProps, nextState) {
  let willUpdate = true;//是否要更新，默认值是true
  if (classInstance.shouldComponentUpdate//有此方法
    && (!classInstance.shouldComponentUpdate(nextProps, nextState))) {//并且方法的返回值为false
    willUpdate = false;
  }
  if (willUpdate && classInstance.componentWillUpdate) {
    classInstance.componentWillUpdate(); // componentWillUpdate函数是在组件实例中声明实现的
  }
  //其实不管要不要更新属性和状态都要更新为最新的
  if (nextProps) classInstance.props = nextProps;
  if (classInstance.constructor.getDerivedStateFromProps) {
    let nextState = classInstance.constructor.getDerivedStateFromProps(nextProps, classInstance.state);
    if (nextState) {
      classInstance.state = nextState;
    }
  } else {
    classInstance.state = nextState;//永远指向最新的状态
  }
  if (willUpdate) {
    classInstance.forceUpdate();//然后调用类组件实例的updateComponent进行更新
  }
}
export class Component {
  static isReactComponent = true
  constructor(props) {
    this.props = props;
    this.state = {};
    //每一个类组件的实例有一个updater更新器
    this.updater = new Updater(this);
  }
  setState(partialState, callback) {
    this.updater.addState(partialState, callback);
  }
  /**
   * 组件是更新
   * 1.获取 老的虚拟DOM React元素
   * 2.根据最新的属生和状态计算新的虚拟DOM
   * 然后进行比较，查找差异，然后把这些差异同步到真实DOM上
   */
  forceUpdate() {
    let oldRenderVdom = this.oldRenderVdom;//老的虚拟DOM
    //根据老的虚拟DOM查到老的真实DOM
    let oldDOM = findDOM(oldRenderVdom);
    if (this.constructor.contextType) {
      this.context = this.constructor.contextType._currentValue;
    }
    let newRenderVdom = this.render();//计算新的虚拟DOM
    let extraArgs;
    if (this.getSnapshotBeforeUpdate) {
      extraArgs = this.getSnapshotBeforeUpdate();
    }
    compareTwoVdom(oldDOM.parentNode, oldRenderVdom, newRenderVdom);//比较差异，把更新同步到真实DOM上
    this.oldRenderVdom = newRenderVdom;
    if (this.componentDidUpdate) {
      this.componentDidUpdate(this.props, this.state, extraArgs); // componentDidUpdate函数是在组件实例中声明实现的
    }
  }
}

export class PureComponent extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState)
  }
}

//Component.prototype.isReactComponent = {};