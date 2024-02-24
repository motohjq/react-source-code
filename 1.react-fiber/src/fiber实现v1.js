import element from "./element";
let container = document.getElementById('root');
const PLACEMENT = 'PLACEMENT';

//下一个工作单元
//fiber其实也是一个普通的js对象
let workInProgressRoot = {
  stateNode: container,//此fiber对应的DOM节点
  props: { children: [element] }//fiber的属性
  // child,
  // sibling,
  // return
};

//赋值给下一个工作单元
let nextUnitOfWork = workInProgressRoot;

function workLoop(deadline) {
  //如果有当前的工作单元，就执行它，并返回下一个执行单元
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  //这时候整个虚拟fiber树已经构建出来了，并且每个节点的真实dom也创建出来了，只不过还没有插入到父DOM中去
  console.log('虚拟fiber树', workInProgressRoot);

  if (!nextUnitOfWork) {
    commitRoot();
  }
}
function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;//这时候是C1
  while (currentFiber) {
    console.log('commitRoot', currentFiber.props.id);
    if (currentFiber.effectTag === PLACEMENT) {
      currentFiber.return.stateNode.appendChild(currentFiber.stateNode);
    }
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

/**
 * beginWork 1.创建此fiber的真实dom 通过虚拟dom创建fiber树结构
 * @param {*} workingInProgressFiber 
 */
function performUnitOfWork(workingInProgressFiber) {
  // 1.创建真实DOM，并没有挂载 2.创建fiber子树
  beginWork(workingInProgressFiber);
  if (workingInProgressFiber.child) {
    return workingInProgressFiber.child;//如果有儿子，返回儿子
  }
  while (workingInProgressFiber) {
    //如果没有儿子 当前节点其实就结束完成了
    completeUnitOfWork(workingInProgressFiber);
    if (workingInProgressFiber.sibling) {//如果有弟弟，返回弟弟
      return workingInProgressFiber.sibling;
    }
    workingInProgressFiber = workingInProgressFiber.return;//先指向父亲
  }
}

function beginWork(workingInProgressFiber) {
  console.log('beginWork', workingInProgressFiber.props.id);//开始工作
  if (!workingInProgressFiber.stateNode) {
    workingInProgressFiber.stateNode = document.createElement(workingInProgressFiber.type);
    for (let key in workingInProgressFiber.props) {
      if (key !== 'children') {
        workingInProgressFiber.stateNode[key] = workingInProgressFiber.props[key];
      }
    }
  }//在beginWork里是不会挂载的
  //创建子fiber
  let previousFiber;
  //children是一个虚拟DOM的数组
  if (Array.isArray(workingInProgressFiber.props.children)) {
    workingInProgressFiber.props.children.forEach((child, index) => {
      let childFiber = {
        type: child.type,//DOM节点类型 div p
        props: child.props,//属性
        return: workingInProgressFiber,
        effectTag: PLACEMENT,//这个fiber对应的DOM节点需要被插入到父DOM中去
        nextEffect: null//下一个有副作用的节点 副作用：需要进行dom操作
      }
      if (index === 0) {//第一个孩子
        workingInProgressFiber.child = childFiber;
      } else {//其他孩子 即孩子的兄弟
        previousFiber.sibling = childFiber;
      }
      previousFiber = childFiber;
    })
  }

}

function completeUnitOfWork(workingInProgressFiber) {
  console.log('completeUnitOfWork', workingInProgressFiber.props.id);
  //构建副作用链effectList 只有那些有副作用的节点
  let returnFiber = workingInProgressFiber.return;//如果是A1
  if (returnFiber) {
    //把当前fiber的有副作用的子链表挂载到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = workingInProgressFiber.firstEffect;
    }
    if (workingInProgressFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = workingInProgressFiber.firstEffect;
      }
      returnFiber.lastEffect = workingInProgressFiber.lastEffect
    }
    //再把自己挂到后面
    if (workingInProgressFiber.effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = workingInProgressFiber;
      } else {
        returnFiber.firstEffect = workingInProgressFiber;
      }
      returnFiber.lastEffect = workingInProgressFiber;
    }
  }
}

//告诉浏览器在空闲的时候执行workLoop
requestIdleCallback(workLoop);