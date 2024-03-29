let pathToRegExp = require('path-to-regexp');
function compilePath(path, options) {
    const keys = [];//处理路径参数
    const regexp = pathToRegExp(path, keys, options);
    return { keys, regexp };
}
/**
 * 把地址中的路径和属性中的path进行匹配，返回匹配结果 
 * @param {*} pathname  浏览器当前的真实的路径名
 * @param {*} options 属性对象，其实就是Route组件的属性 path Component exact
 * path Route的路径
 * exact Route的路径是否精确匹配 后面能不能跟子路径
 * strict Route的路径是否严格匹配 后面能不能有可选地
 * sensitive Route的路径是否区分大小写
 */
function matchPath(pathname, options = {}) {
    let { path = "/", exact = false, strict = false, sensitive = false } = options;
    let { keys, regexp } = compilePath(path, { end: exact, strict, sensitive });
    let match = regexp.exec(pathname);
    if (!match) return null;
    const [url, ...groups] = match;
    //pathname=/user/list  regxp =/\/user/ url=/user
    const isExact = pathname === url;//是否完整匹配url路径
    //if (exact && !isExact) return null;
    return {
        path,//Route 里的路径
        url,//正则匹配到的浏览器路径的部分
        isExact,// 是否精确匹配
        params: keys.reduce((memo, key, index) => {//路径参数对象
            memo[key.name] = groups[index];
            return memo;
        }, {})
    }

}
export default matchPath;