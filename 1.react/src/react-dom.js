import { REACT_TEXT, REACT_FORWARD_REF_TYPE, REACT_PROVIDER, REACT_CONTEXT, REACT_MEMO } from './constants';
import { addEvent } from './event';

//vdom是createElement之后的结果 let vdom = createElement(vdom); 如 {type,props,ref,key}

//renderVdom是组件return的内容形成的渲染虚拟DOM

let mountingComponent = null;
/**
 * 把虚拟DOM转成真实DOM插入容器中
 * @param {}} vdom  虚拟DOM
 * @param {*} container 容器
 */
let hookState = [];//这里存放着所有的状态
let hookIndex = 0;//当前的执行的hook的索引
let scheduleUpdate;//调度更新方法
function render(vdom, container) {
    mount(vdom, container);
    scheduleUpdate = () => {
        hookIndex = 0;//在状态修改后调试更新的时候，索引重置为0
        //然后再进行虚拟DOM的比较更新
        compareTwoVdom(container, vdom, vdom);//vdom并不指向当前的更新，而是指向根元素，因为render函数执行的是根元素
    }
}
function mount(vdom, container) {
    let newDOM = createDOM(vdom);
    container.appendChild(newDOM);//插入容器中
    if (newDOM.componentDidMount) newDOM.componentDidMount();
}
export function useRef() {
    if (hookState[hookIndex]) {
        return hookState[hookIndex++];
    } else {
        hookState[hookIndex] = { current: null };
        return hookState[hookIndex++];
    }
}
/** 为了保证此回调函数不是同步执行，而是在页面渲染之后执行
 * @param {*} callback 当前渲染完成之后下一个宏任务
 * @param {*} deps 依赖数组，
 */
export function useEffect(callback, deps) {
    if (hookState[hookIndex]) {
        let [destroy, lastDeps] = hookState[hookIndex];
        let everySame = deps.every((item, index) => item === lastDeps[index]);
        if (everySame) {
            hookIndex++;
        } else {
            //销毁函数每次都是在下一次执行的时候才会触发执行吗 
            destroy && destroy();//先执行销毁函数
            setTimeout(() => {
                let destroy = callback();
                hookState[hookIndex++] = [destroy, deps];
            });
        }
    } else {
        //初次渲染的时候，开启一个宏任务，在宏任务里执行callback,保存销毁函数和依赖数组
        setTimeout(() => {
            let destroy = callback();
            hookState[hookIndex++] = [destroy, deps];
        });
    }
}
export function useLayoutEffect(callback, deps) {
    if (hookState[hookIndex]) {
        let [destroy, lastDeps] = hookState[hookIndex];
        let everySame = deps.every((item, index) => item === lastDeps[index]);
        if (everySame) {
            hookIndex++;
        } else {
            //销毁函数每次都是在下一次执行的时候才会触发执行吗 
            destroy && destroy();//先执行销毁函数
            queueMicrotask(() => {
                let destroy = callback();
                hookState[hookIndex++] = [destroy, deps];
            });
        }
    } else {
        //初次渲染的时候，开启一个宏任务，在宏任务里执行callback,保存销毁函数和依赖数组
        queueMicrotask(() => {
            let destroy = callback();
            hookState[hookIndex++] = [destroy, deps];
        });
    }
}
export function useReducer(reducer, initialState) {
    if (!hookState[hookIndex]) {
        hookState[hookIndex] = initialState;
        // 将对应的hooks 下标和值缓存到当前挂载的实例
        if (mountingComponent && !mountingComponent.hooks) {
            mountingComponent.hooks = {}
            mountingComponent.hooks[hookIndex] = hookState[hookIndex]
        }
    }

    let currentIndex = hookIndex;
    function dispatch(action) {
        hookState[currentIndex] = reducer ? reducer(hookState[currentIndex], action) : action;
        scheduleUpdate();
    }
    return [hookState[hookIndex++], dispatch];
}
export function useState(initialState) {
    return useReducer(null, initialState)
}
/* export function useState(initialState){
    if(!hookState[hookIndex])
       hookState[hookIndex]=initialState;
    let currentIndex = hookIndex;
    function setState(newState){
        hookState[currentIndex]=newState;
        scheduleUpdate();
    }
    return [hookState[hookIndex++],setState];
} */
export function useMemo(factory, deps) {
    if (hookState[hookIndex]) {//说明不是第一次是更新
        let [lastMemo, lastDeps] = hookState[hookIndex];
        let everySame = deps.every((item, index) => item === lastDeps[index]);//和上一次对比是否相同
        if (everySame) {
            hookIndex++;
            return lastMemo;
        } else {
            let newMemo = factory();
            hookState[hookIndex++] = [newMemo, deps];
            return newMemo;
        }
    } else {
        let newMemo = factory();
        hookState[hookIndex++] = [newMemo, deps];
        return newMemo;
    }
}
export function useCallback(callback, deps) {
    if (hookState[hookIndex]) {//说明不是第一次是更新
        let [lastCallback, lastDeps] = hookState[hookIndex];
        let everySame = deps.every((item, index) => item === lastDeps[index]);//和上一次对比是否相同
        if (everySame) {
            hookIndex++;
            return lastCallback;
        } else {
            hookState[hookIndex++] = [callback, deps];
            return callback;
        }
    } else {
        hookState[hookIndex++] = [callback, deps];
        return callback;
    }
}
/**
 * 把虚拟DOM转成真实DOM
 * @param {*} vdom  虚拟DOM
 */
function createDOM(vdom) {
    let { type, props, ref } = vdom;
    let dom;//获取 真实DOM元素
    let prevComponent = mountingComponent
    mountingComponent = vdom

    //如果type.$$typeof属性是REACT_FORWARD_REF_TYPE值
    if (type && type.$$typeof === REACT_MEMO) {
        return mountMemoComponent(vdom)
    } else if (type && type.$$typeof === REACT_CONTEXT) {
        return mountContextComponent(vdom)
    } else if (type && type.$$typeof === REACT_PROVIDER) {
        return mountProviderComponent(vdom)
    } else if (type && type.$$typeof === REACT_FORWARD_REF_TYPE) {
        return mountForwardComponent(vdom)
    } else if (type === REACT_TEXT) {//如果是一个文本元素，就创建一个文本节点
        dom = document.createTextNode(props.content);
    } else if (typeof type === 'function') {//说明这是一个React函数组件的React元素
        if (type.isReactComponent) {//说明它是一个类组件
            return mountClassComponent(vdom);
        } else {
            return mountFunctionComponent(vdom);
        }
    } else if (typeof type === 'string') {
        dom = document.createElement(type);//原生DOM类型
    } else {
        throw new Error(`无法处理的元素类型`, type);
    }
    if (props) {
        updateProps(dom, {}, props);//根据虚拟DOM中的属性更新真实DOM属性
        if (typeof props.children == 'object' && props.children.type) {//它是个对象 只有一个儿子
            render(props.children, dom);
        } else if (Array.isArray(props.children)) {//如果是一个数组
            reconcileChildren(props.children, dom);
        }
    }
    mountingComponent = prevComponent
    //让虚拟DOM的dom属生指向它的真实DOM 
    vdom.dom = dom;
    if (ref) ref.current = dom;//让ref.current属性指向真实DOM的实例
    return dom;
}
function mountMemoComponent(vdom) {
    let { type, props } = vdom;
    let renderVdom = type.type(props);
    vdom.prevProps = props;//记录一下老的属性对象，在更新的时候会用到
    vdom.oldRenderVdom = renderVdom;
    return createDOM(renderVdom);
}
function mountContextComponent(vdom) {
    let { type, props } = vdom;
    let renderVdom = props.children(type._context._currentValue);
    vdom.oldRenderVdom = renderVdom;
    return createDOM(renderVdom);
}
function mountProviderComponent(vdom) {//vdom={}
    //type={$$typeof: REACT_PROVIDER, _context: context},props={value,children}
    let { type, props } = vdom;
    //在渲染Provider组件的时候，拿到属性中的value，赋给context._currentValue
    type._context._currentValue = props.value;
    let renderVdom = props.children;
    vdom.oldRenderVdom = renderVdom;
    return createDOM(renderVdom);
}
function mountForwardComponent(vdom) {
    let { type, props, ref } = vdom;
    let renderVdom = type.render(props, ref);
    vdom.oldRenderVdom = renderVdom;
    return createDOM(renderVdom);
}
/**
 * 1. 创建类组件的实例
 * 2. 调用类组件实例的render方法获得返回的虚拟DOM
 * 3. 将虚拟DOM挂载到真实DOM上
 * @param {*} vdom 类型为类组件的虚拟DOM
 * @returns 
 */
function mountClassComponent(vdom) {
    // 解构类的定义和类的属性对象
    let { type, props, ref } = vdom;
    let defaultProps = type.defaultProps || {};
    // 创建类的实例
    let classInstance = new type({ ...defaultProps, ...props });
    if (type.contextType) {
        classInstance.context = type.contextType._currentValue;
    }
    //让这个类组件的虚拟dom的classInstance属性指向这个类组件的实例
    vdom.classInstance = classInstance;
    if (classInstance.componentWillMount) classInstance.componentWillMount();
    // 调用实例的render方法返回需要渲染的虚拟DOM对象
    let renderVdom = classInstance.render();
    classInstance.oldRenderVdom = vdom.oldRenderVdom = renderVdom;//挂载的时候计算出虚拟DOM，然后挂到类的实例上
    if (ref) ref.current = classInstance;//ref.current指向类组件的实例
    // 根据虚拟DOM对象创建真实DOM对象
    let dom = createDOM(renderVdom);
    //暂时把didMount方法暂存到dom上
    if (classInstance.componentDidMount)
        dom.componentDidMount = classInstance.componentDidMount.bind(classInstance);
    return dom;
}
/**
 * 把一个类型为自定义函数组件的虚拟DOM转换为真实DOM并返回
 * @param {*} vdom 类型为自定义函数组件的虚拟DOM
 */
function mountFunctionComponent(vdom) {
    let { type: FunctionComponent, props } = vdom;
    let renderVdom = FunctionComponent(props);
    //让这个类组件的虚拟dom的oldRenderVdom属性指向这个组件的实例
    vdom.oldRenderVdom = renderVdom;
    return createDOM(renderVdom);
}
/**
 * 
 * @param {*} childrenVdom 儿子们的虚拟DOM
 * @param {*} parentDOM 父亲的真实DOM
 */
function reconcileChildren(childrenVdom, parentDOM) {
    for (let i = 0; i < childrenVdom.length; i++) {
        let childVdom = childrenVdom[i];
        render(childVdom, parentDOM);
    }
}
/**
 * 使用虚拟DOM的属性更新刚创建出来的真实DOM属性
 * @param {*} dom  真实dom
 * @param {*} oldProps 
 * @param {*} newProps 新属性对象
 */
function updateProps(dom, oldProps, newProps) {
    for (let key in newProps) {
        if (key === 'children') { continue; }//后面会单独处理children属性，所以此处跳过去
        if (key === 'style') {
            let styleObj = newProps[key];
            for (let attr in styleObj) {
                dom.style[attr] = styleObj[attr];
            }
        } else if (key.startsWith('on')) {//onClick
            //dom[key.toLocaleLowerCase()]=newProps[key];//dom.onclick=handleClick
            addEvent(dom, key.toLocaleLowerCase(), newProps[key]);
        } else {
            if (newProps[key])
                dom[key] = newProps[key];
        }
    }
}
/**
 * 根据vdom返回真实DOM
 * @param {*} vdom 
 */
export function findDOM(vdom) {
    let type = vdom.type;
    let dom;
    if (typeof type === 'string' || type === REACT_TEXT) {//原生的组件
        dom = vdom.dom;
    } else {//可能函数组件 类组件 provider context forward
        dom = findDOM(vdom.oldRenderVdom);
    }
    return dom;
}
/**
 * 比较新旧的虚拟DOM，找出差异，更新到真实DOM上
 * 现在还没有实现dom-diff
 * @param {*} parentDOM 当前组件挂载父真实dom节点
 * @param {*} oldVdom 上一次老的虚拟dom
 * @param {*} newVdom 这一次新的虚拟dom
 */
export function compareTwoVdom(parentDOM, oldVdom, newVdom, nextDOM) {
    if (!oldVdom && !newVdom) {//如果老的虚拟DOM是null,新的虚拟DOM也是null
    } else if (oldVdom && (!newVdom)) {//老的为不null,新的为null,销毁老组件
        let currentDOM = findDOM(oldVdom);
        currentDOM.parentNode.removeChild(currentDOM);//把老的真实DOM删除
        if (oldVdom.classInstance && oldVdom.classInstance.componentWillUnmount) {
            oldVdom.classInstance.componentWillUnmount();//执行组件卸载方法
        }
    } else if (!oldVdom && newVdom) {//如果老的没有，新的有，就根据新的组件创建新的DOM并且添加到父DOM容器中
        let newDOM = createDOM(newVdom);
        if (nextDOM) {
            parentDOM.insertBefore(newDOM, nextDOM);
        } else {
            parentDOM.appendChild(newDOM);
        }
        if (newDOM.componentDidMount) newDOM.componentDidMount();
        //新老都有，但是不同div p    也不能复用，则需要删除老的，添加新的 
    } else if (oldVdom && newVdom && (oldVdom.type !== newVdom.type)) {
        let oldDOM = findDOM(oldVdom);//先获取 老的真实DOM
        let newDOM = createDOM(newVdom);//创建新的真实DOM
        oldDOM.parentNode.replaceChild(newDOM, oldDOM);
        if (oldVdom.classInstance && oldVdom.classInstance.componentWillUnmount) {
            oldVdom.classInstance.componentWillUnmount();//执行组件卸载方法
        }
        if (newDOM.componentDidMount) newDOM.componentDidMount();
    } else {//老的有，新的也有，类型也一样，需要复用老节点，进行深度的递归dom diff了
        updateElement(oldVdom, newVdom);
    }
}
/**
 * 深度比较两个dom
 * @param {*} oldVdom 老的虚拟dom 
 * @param {*} newVdom 新的虚拟dom
 */
function updateElement(oldVdom, newVdom) {
    if (oldVdom.type && oldVdom.type.$$typeof === REACT_MEMO) {
        updateMemoComponent(oldVdom, newVdom);
    } else if (oldVdom.type && oldVdom.type.$$typeof === REACT_PROVIDER) {
        updateProviderComponent(oldVdom, newVdom);
    } else if (oldVdom.type && oldVdom.type.$$typeof === REACT_CONTEXT) {
        updateContextComponent(oldVdom, newVdom);
    } else if (oldVdom.type === REACT_TEXT && newVdom.type === REACT_TEXT) {
        let currentDOM = newVdom.dom = findDOM(oldVdom);
        if (oldVdom.props.content !== newVdom.props.content)
            currentDOM.textContent = newVdom.props.content;
    } else if (typeof oldVdom.type === 'string') {//说明是原生组件 div
        //让新的虚拟DOM的真实DOM属性等于老的虚拟DOM对应的那个真实DOM
        let currentDOM = newVdom.dom = findDOM(oldVdom);
        //用新的属性更新DOM的老属性
        updateProps(currentDOM, oldVdom.props, newVdom.props);
        //更新儿子们
        updateChildren(currentDOM, oldVdom.props.children, newVdom.props.children);
    } else if (typeof oldVdom.type === 'function') {//这时候老的新的type一样
        if (oldVdom.type.isReactComponent) {//老的新的都是类组件
            updateClassComponent(oldVdom, newVdom);
        } else {//老的新的都是函数组件
            updateFunctionComponent(oldVdom, newVdom);
        }
    }
}
function updateMemoComponent(oldVdom, newVdom) {
    let { type, prevProps } = oldVdom;
    //比较老的属性对象和新的属性对象是否相等 

    // 就算未渲染该组件也必须执行render 保证hook的hookIndex能下移
    let renderVdom = newVdom.type.type(newVdom.props);
    let hookKeys = Object.keys(oldVdom.hooks)
    if (type.compare(prevProps, newVdom.props) &&
        hookKeys.every(key => hookState[key] === oldVdom.hooks[key])) {
        console.log(oldVdom.props.name, oldVdom.oldRenderVdom, oldVdom.hooks)
        newVdom.oldRenderVdom = oldVdom.oldRenderVdom;
        newVdom.prevProps = oldVdom.props;
        hookKeys.forEach((key) => {
            oldVdom.hooks[key] = hookState[key]
        })
    } else {
        let parentDOM = findDOM(oldVdom).parentNode;


        compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
        newVdom.prevProps = newVdom.props;
        newVdom.oldRenderVdom = renderVdom;
    }

    newVdom.hooks = oldVdom.hooks; // 将新hooks 缓存下来
}
function updateProviderComponent(oldVdom, newVdom) {
    let parentDOM = findDOM(oldVdom).parentNode;
    let { type, props } = newVdom;
    type._context._currentValue = props.value;
    let renderVdom = props.children;
    compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
    newVdom.oldRenderVdom = renderVdom;
}
function updateContextComponent(oldVdom, newVdom) {
    let parentDOM = findDOM(oldVdom).parentNode;
    let { type, props } = newVdom;
    let renderVdom = props.children(type._context._currentValue);
    compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
    newVdom.oldRenderVdom = renderVdom;
}
function updateFunctionComponent(oldVdom, newVdom) {
    let parentDOM = findDOM(oldVdom).parentNode;
    let { type, props } = newVdom;
    let renderVdom = type(props);//新的vdom div#counter-function>2
    //oldVdom.oldRenderVdom老的渲染出来的vdom div#counter-function>0
    compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
    newVdom.oldRenderVdom = renderVdom;
}
/**
 * 如果老的虚拟DOM节点和新的虚拟DOM节点都是类组件，走这个逻辑
 * @param {*} oldVdom 老的虚拟DOM节点
 * @param {*} newVdom 新的虚拟DOM节点
 */
function updateClassComponent(oldVdom, newVdom) {
    let classInstance = newVdom.classInstance = oldVdom.classInstance;//类的实例需要复用，实例不管更新多少次只有一个
    newVdom.oldRenderVdom = oldVdom.oldRenderVdom;//上一次这个类组件渲染出来的虚拟DOM
    //因为此更新是由于父组件更新引起的，父组件在重新渲染的时候，给子组件传递新的属性
    if (classInstance.componentWillReceiveProps) {//组件将要接受到新的属性
        classInstance.componentWillReceiveProps();
    }
    //触发组件的更新
    classInstance.updater.emitUpdate(newVdom.props);
}
function updateChildren(parentDOM, oldVChildren, newVChildren) {
    // 因为children可能是对象，也可能是数组，为了方便按索引比较，全部格式化为数组
    oldVChildren = Array.isArray(oldVChildren) ? oldVChildren : [oldVChildren];
    newVChildren = Array.isArray(newVChildren) ? newVChildren : [newVChildren];
    let maxLength = Math.max(oldVChildren.length, newVChildren.length);
    for (let i = 0; i < maxLength; i++) {
        //找当前的虚拟DOM节点这后的最近的一个真实DOM节点
        let nextVNode = oldVChildren.find((item, index) => index > i && item && findDOM(item));
        compareTwoVdom(parentDOM, oldVChildren[i], newVChildren[i], nextVNode && findDOM(nextVNode));
    }
}
const ReactDOM = {
    render
}
export default ReactDOM;

/*
export function compareTwoVdom(parentDOM,oldVdom,newVdom){
    let oldDOM = findDOM(oldVdom);//TODO findDOM
    let newDOM = createDOM(newVdom);
    parentDOM.replaceChild(newDOM,oldDOM);
} */