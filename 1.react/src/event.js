import { updateQueue } from './Component';
/**
 * 实现的事件委托，把所有的事件都绑定到document上
 * @param {*} dom 真实dom
 * @param {*} eventType 事件类型
 * @param {*} handler 监听函数
 */
//这个函数是dom挂载的时候就会调用
export function addEvent(dom, eventType, handler) {//TODO handler
    let store;//这是个对象，时面存放着此DOM上对应的事件处理函数
    //原生DOm身上的一个自定义属性
    if (dom.store) {
        store = dom.store;
    } else {
        dom.store = {};
        store = dom.store;
    }
    //store.onclick = handler;
    store[eventType] = handler;//先把事件调用的函数保存起来，之后dispatchEvent会找到执行
    if (!document[eventType])//如果有很多个元素都绑定 click事件，往document持的时候只挂一次
        document[eventType] = dispatchEvent;//document.addEventListener('click',dispatchEvent);
}
//这个函数是事件触发时才会调用
function dispatchEvent(event) {
    let { target, type } = event;
    let eventType = `on${type}`;//onclick
    updateQueue.isBatchingUpdate = true;//切换为批量更新模式
    let syntheticEvent = createSyntheticEvent(event);
    //模拟事件冒泡的过程
    while (target) {
        let { store } = target;
        let handler = store && store[eventType];
        handler && handler.call(target, syntheticEvent);
        target = target.parentNode;
    }
    updateQueue.isBatchingUpdate = false;
    updateQueue.batchUpdate();
}
//在源码里此处做了一些浏览器兼容性的适配
function createSyntheticEvent(event) {
    let syntheticEvent = {};
    for (let key in event) {
        syntheticEvent[key] = event[key];
    }
    return syntheticEvent;
}