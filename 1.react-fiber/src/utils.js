
export function setProps(dom, oldProps, newProps) {
    for (let key in oldProps) {
        if (key !== 'children') {
            if (newProps.hasOwnProperty(key)) {
                setProp(dom, key, newProps[key]);// oldProps和newProps都有 更新
            } else {
                dom.removeAttribute(key);//oldProps有 newProps没有 删掉
            }
        }
    }
    for (let key in newProps) {
        if (key !== 'children') {
            if (!oldProps.hasOwnProperty(key)) {//oldProps没有 newProps有 添加新属性
                setProp(dom, key, newProps[key]);
            }
        }
    }
}
function setProp(dom, key, value) {
    if (/^on/.test(key)) {//onClick
        dom[key.toLowerCase()] = value; //dom.onclick=value
    } else if (key === 'style') {
        if (value) {
            for (let styleName in value) {
                dom.style[styleName] = value[styleName];
            }
        }
    } else {
        dom.setAttribute(key, value);
    }
}