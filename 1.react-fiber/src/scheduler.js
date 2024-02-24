import { Update, UpdateQueue } from "./UpdateQueue";
import { ELEMENT_TEXT, TAG_HOST, TAG_ROOT, TAG_TEXT, PLACEMENT, DELETION, UPDATE, TAG_CLASS, TAG_FUNCTION_COMPONENT } from "./constants";
import { setProps } from "./utils";

/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * diff阶段 对比新旧的虚拟DOM，进行增加更新创建，render阶段
 * 这个阶段比较花时间，我们可以对任务进行拆分，拆分的维度 虚拟DOM，此阶段可以暂停
 * commit阶段，进行DOM更新创建阶段，此阶段不能暂停，要一气呵成
 */
let nextUnitOfWork = null;//下一个工作单元
let workInProgressRoot = null;//RootFiber应用的根
let currentRoot = null;//渲染成功之后当前根root
let deletions = [];//删除的节点并不放在effect链表中，需要单独记录并执行
let workInProgressFiber = null;//正在工作的fiber
let hookIndex = 0;//hooks索引

export function scheduleRoot(rootFiber) {// {tag: TAG_ROOT,stateNode: container,props: { children: [element] }

    if (currentRoot && currentRoot.alternate) {//这时候有alternate 说明至少更新一次了 这次是第二三四...次更新
        workInProgressRoot = currentRoot.alternate;//第一次渲染出来的那个fiber树 currentRoot是第二次渲染出来的 alternate指向第一次渲染的
        workInProgressRoot.alternate = currentRoot;//让这个树的替身指向当前的currentRoot currentRoot是第二次渲染出来的
        if (rootFiber) workInProgressRoot.props = rootFiber.props;//props更新为新的props rootFiber是第三次传入的
    } else if (currentRoot) {//说明至少已经渲染过一次了 这是第一次更新
        if (rootFiber) {
            rootFiber.alternate = currentRoot;
            workInProgressRoot = rootFiber;
        } else {
            workInProgressRoot = {
                ...currentRoot,
                alternate: currentRoot
            }
        }
    } else {//第一次渲染
        workInProgressRoot = rootFiber;
    }

    workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null;
    nextUnitOfWork = workInProgressRoot;
}
function performUnitOfWork(currentFiber) {
    beginWork(currentFiber);
    if (currentFiber.child) {//有儿子返回儿子 继续创建儿子的fiber结构
        return currentFiber.child
    }
    while (currentFiber) {
        completeUnitOfWork(currentFiber);//没有儿子让自己完成
        if (currentFiber.sibling) {
            return currentFiber.sibling//有弟弟返回弟弟 继续创建弟弟的fiber结构
        }
        currentFiber = currentFiber.return;//找父亲然后让父亲去找
    }
}
/**
 * beginWork创建fiber
 * 1. 创建真实DOM元素
 * 2. 创建子fiber
 * @param {*} currentFiber 
 */
function beginWork(currentFiber) {
    if (currentFiber.tag === TAG_ROOT) {//根fiber
        updateHostRoot(currentFiber);
    } else if (currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber);
    } else if (currentFiber.tag === TAG_HOST) {//原生dom节点 div p
        updateHost(currentFiber);
    } else if (currentFiber.tag === TAG_CLASS) {//类组件
        updateClassComponent(currentFiber);
    } else if (currentFiber.tag === TAG_FUNCTION_COMPONENT) {//函数组件
        updateFunctionComponent(currentFiber);
    }
}

function createDOM(currentFiber) {
    if (currentFiber.tag === TAG_TEXT) {
        return document.createTextNode(currentFiber.props.text);
    } else if (currentFiber.tag === TAG_HOST) {
        let stateNode = document.createElement(currentFiber.type);
        updateDOM(stateNode, {}, currentFiber.props);
        return stateNode;
    }
}


function updateDOM(stateNode, oldProps, newProps) {
    if (stateNode && stateNode.setAttribute) {
        setProps(stateNode, oldProps, newProps);//更新属性
    }
}

function updateHost(currentFiber) {
    if (!currentFiber.stateNode) {//如果此fiber没有创建dom节点
        currentFiber.stateNode = createDOM(currentFiber);//创建真实DOM节点
    }
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}
function updateHostRoot(currentFiber) {
    //1.先处理自己 如果是一个原生节点，创建真实dom 
    //2.创建子fiber
    let newChildren = currentFiber.props.children;//[element=<div id='A1'/>]
    reconcileChildren(currentFiber, newChildren);
}
function updateHostText(currentFiber) {
    if (!currentFiber.stateNode) {//如果此fiber没有创建真实DOM节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
}
function updateClassComponent(currentFiber) {
    if (!currentFiber.stateNode) {//类组件 stateNode是组件实例
        // new ClassCounter(); 类组件实例 fiber双向指向
        currentFiber.stateNode = new currentFiber.type(currentFiber.props);
        currentFiber.stateNode.internalFiber = currentFiber;
        currentFiber.updateQueue = new UpdateQueue();
    }
    // 给组件实例的state赋值
    currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(currentFiber.stateNode.state);
    let newElement = currentFiber.stateNode.render();//获取最新的vnode
    const newChildren = [newElement];
    reconcileChildren(currentFiber, newChildren);
}
function updateFunctionComponent(currentFiber) {
    workInProgressFiber = currentFiber;
    hookIndex = 0;
    workInProgressFiber.hooks = [];
    const newChildren = [currentFiber.type(currentFiber.props)];
    reconcileChildren(currentFiber, newChildren)
}

function reconcileChildren(currentFiber, newChildren) {//newChildren=[A1]
    let newChildIndex = 0;//新子节点的索引

    //如果currentFiber有alternate属性并且alternate.child存在，那么说明此fiber已经渲染过，那么需要比较新旧节点
    let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
    if (oldFiber) oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;

    let prevSibling;//上一个子fiber
    while (newChildIndex < newChildren.length || oldFiber) {
        let newChild = newChildren[newChildIndex]//取出虚拟DOM节点[A1]{type:'A1}
        let newFiber;//新的fiber
        const sameType = oldFiber && newChild && newChild.type === oldFiber.type;//判断是否是同类型的
        let tag;
        if (newChild && typeof newChild.type === 'function' && newChild.type.prototype.isReactComponent) {
            tag = TAG_CLASS;
        } else if (newChild && typeof newChild.type === 'function') {
            tag = TAG_FUNCTION_COMPONENT//文本节点
        } else if (newChild && newChild.type === ELEMENT_TEXT) {
            tag = TAG_TEXT//文本节点
        } else if (newChild && typeof newChild.type === 'string') {
            tag = TAG_HOST;//如果是字符串 那么是一个原生dom节点 div p
        }
        if (sameType) {//说明老fiber和新的虚拟DOM类型一样，可以复用老的DOM节点，更新即可
            if (oldFiber.alternate) {//说明至少已经更新一次了
                newFiber = oldFiber.alternate;//如果有上上次的fiber，就拿过来作为这一次的fiber
                newFiber.props = newChild.props;
                newFiber.alternate = oldFiber;
                newFiber.effectTag = UPDATE;
                newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
                newFiber.nextEffect = null;
            } else {
                newFiber = {
                    tag: oldFiber.tag,//TAG_HOST
                    type: oldFiber.type,//div
                    props: newChild.props,//{id='A1} style={style}
                    stateNode: oldFiber.stateNode,//div还没有创建DOM元素
                    return: currentFiber,//父fiber returnFiber
                    updateQueue: oldFiber.updateQueue || new UpdateQueue(),
                    alternate: oldFiber,//新fiber的alternate指向老的fiber
                    effectTag: UPDATE,//副作用标识 更新
                    nextEffect: null,//effect链表中的下个节点
                }
            }
        } else {
            if (newChild) {//看看新的虚拟DOM是不是为null
                newFiber = {
                    tag,//TAG_HOST
                    type: newChild.type,//div
                    props: newChild.props,//{id='A1} style={style}
                    stateNode: null,//div还没有创建DOM元素
                    return: currentFiber,//父fiber returnFiber
                    effectTag: PLACEMENT,//副作用标识 这个fiber对应的DOM节点需要被插入到父DOM中去
                    updateQueue: new UpdateQueue(),
                    nextEffect: null,//effect链表中的下个节点
                    //effect链表顺序和完成顺序一样 即树的后序遍历顺序
                }
            }
            if (oldFiber) {
                oldFiber.effectTag = DELETION;
                deletions.push(oldFiber);//将删除的节点放入deletion数组中
            }
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling;//oldFiber指向自己的兄弟 向后移动
        }

        //小儿子没有弟弟
        if (newFiber) {
            if (newChildIndex === 0) {//如果当前索引为0，说明是大儿子
                currentFiber.child = newFiber;
            } else {
                prevSibling.sibling = newFiber;
            }
            prevSibling = newFiber;
        }
        newChildIndex++;
    }
}

/**
 * completeUnitOfWork的时候收集有副作用的fiber，组成effect链表
 * //每个fiber有两个属性 firstEffect 第一个有副作用的子fiber 和 lastEffect 最后一个副作用子fiber
 * //中间的用nextEffect指向下一个有副作用的子fiber
 * @param {*} currentFiber
 */
function completeUnitOfWork(currentFiber) {//第一个完成的是A1(TEXT)
    // console.log('completeUnitOfWork', currentFiber.props.id);
    //构建副作用链effectList 只有那些有副作用的节点
    let returnFiber = currentFiber.return;//如果是A1 returnFiber=div 'A1' currentFiber=A1(TEXT)
    if (returnFiber) {
        // 这一段是把自己儿子的effect链表挂在自己父亲身上 最后加上自己
        //这里举例  returnFiber=A1  currentFiber=B1  此时B1的firstEffect=C1 lastEffect=C2
        if (!returnFiber.firstEffect) {
            returnFiber.firstEffect = currentFiber.firstEffect;
        }
        if (!!currentFiber.lastEffect) {
            if (!!returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
            }
            returnFiber.lastEffect = currentFiber.lastEffect;
        }

        // 这一段是把自己儿子的effect挂在自己身上
        //这里举例 returnFiber=B1  currentFiber=C1C2 此时B1的firstEffect=null lastEffect=null
        const effectTag = currentFiber.effectTag;
        if (effectTag) {//有副作用 A1的firstEffect和lastEffect
            if (returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber;
            } else {
                returnFiber.firstEffect = currentFiber;
            }
            returnFiber.lastEffect = currentFiber;
        }


    }
}

//循环执行工作 nextUnitOfWork
function workLoop(deadline) {
    let shouldYield = false;//是否要让出时间片或控制权
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);//执行完一个任务后
        shouldYield = deadline.timeRemaining() < 1;//没有时间 让出控制权
    }
    if (!nextUnitOfWork && workInProgressRoot) {
        console.log('render阶段结束');
        commitRoot();
    }
    //不管有没有任务 都请求再次调度 每一帧都要执行一次workLoop
    requestIdleCallback(workLoop, { timeout: 500 })
}

function commitDeletion(currentFiber, returnDOM) {
    if (currentFiber.tag === TAG_HOST || currentFiber.tag === TAG_TEXT) {
        returnDOM.removeChild(currentFiber.stateNode);
    } else {
        commitDeletion(currentFiber.child, returnDOM)
    }
}

function commitRoot() {
    deletions.forEach(commitWork);//执行effect链表之前先把该删除的元素删除
    let currentFiber = workInProgressRoot.firstEffect;
    while (currentFiber) {
        console.log('commitRoot', currentFiber.type);
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    deletions.length = 0;//提交之后要清空数组
    currentRoot = workInProgressRoot;//把当前渲染成功的根fiber 赋值给currentRoot
    workInProgressRoot = null;
}
function commitWork(currentFiber) {
    if (!currentFiber) return;
    let returnFiber = currentFiber.return;
    while (returnFiber.tag !== TAG_HOST && returnFiber.tag !== TAG_ROOT && returnFiber.tag !== TAG_TEXT) {
        returnFiber = returnFiber.return;
    }
    let returnDOM = returnFiber.stateNode;
    if (currentFiber.effectTag === PLACEMENT) {//插入节点
        let nextFiber = currentFiber;
        //如果要挂载的节点 不是dom节点 比如说是类组件fiber 一直找第一个儿子 直到找到一个真实DOM节点为止
        while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
            nextFiber = currentFiber.child;
        }
        returnDOM.appendChild(nextFiber.stateNode);
    } else if (currentFiber.effectTag === DELETION) {//删除节点
        return commitDeletion(currentFiber, returnDOM);
        // returnDOM.removeChild(currentFiber.stateNode);
    } else if (currentFiber.effectTag === UPDATE) {//更新节点
        if (currentFiber.type === ELEMENT_TEXT) {
            if (currentFiber.alternate.props.text !== currentFiber.props.text) {
                currentFiber.stateNode.textContent = currentFiber.props.text;
            }
        } else {
            updateDOM(currentFiber.stateNode, currentFiber.alternate.props, currentFiber.props);//currentFiber.alternate是上一个更新前的节点
        }
    }
    currentFiber.effectTag = null;
}

/**
 * workInProgressFiber=currentFiber
 * hookIndex=0
 * workInProgressFiber.hooks=[]
 */
export function useReducer(reducer, initialState) {
    let newHook = workInProgressFiber.alternate && workInProgressFiber.alternate.hooks
        && workInProgressFiber.alternate.hooks[hookIndex]
    if (newHook) {
        //第二次渲染
        newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
    } else {
        newHook = {
            state: initialState,
            updateQueue: new UpdateQueue()
        }
    }
    const dispatch = action => {
        let payload = reducer ? reducer(newHook.state, action) : action;
        newHook.updateQueue.enqueueUpdate(new Update(payload))
        scheduleRoot();
    }
    workInProgressFiber.hooks[hookIndex++] = newHook;
    // console.log(newHook.state, dispatch);
    return [newHook.state, dispatch];
}
export function useState(initialValue) {
    return useReducer(null, initialValue)
}

//react告诉浏览器 我现在有任务 在空闲的时候执行
//有一个优先级的概念 expirationTime
requestIdleCallback(workLoop, { timeout: 500 });