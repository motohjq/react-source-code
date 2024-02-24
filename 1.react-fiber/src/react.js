import { UpdateQueue, Update } from "./UpdateQueue";
import { ELEMENT_TEXT } from "./constants";
import { scheduleRoot, useReducer } from "./scheduler";

/**
 * 创建元素(虚拟DOM)的方法
 * @param {*} type 元素的类型div span p
 * @param {*} config 配置对象 属性 key ref
 * @param  {...any} children 所有的儿子
 */
function createElement(type, config, ...children) {
    // delete config.__self;
    // delete config.__source;//表示这个元素是在哪行那列哪个文件生成的
    return {
        type,
        props: {
            ...config,//做了兼容处理 如果是react元素就返回自己，如果是文本类型，如果是一个字符串，返回元素对象
            children: children.map(child => {
                return typeof child === 'object' ? child : {
                    type: ELEMENT_TEXT,
                    props: { text: child, children: [] }
                }
            })
        }
    }
}
class Component {
    constructor(props) {
        this.props = props;
        // this.updateQueue = new UpdateQueue();
    }
    setState(payload) {//可能是对象，也可能是一个函数
        let update = new Update(payload);
        //updateQueue其实是放在此类组件对应的fiber节点的internalFiber上
        this.internalFiber.updateQueue.enqueueUpdate(update);
        // this.updateQueue.enqueueUpdate(update);
        scheduleRoot();//从根节点开始调度
    }
}

Component.prototype.isReactComponent = {};//类组件
const React = {
    createElement,
    Component
}
export default React;
export { useReducer, useState } from './scheduler';