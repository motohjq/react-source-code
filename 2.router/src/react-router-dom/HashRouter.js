import React from 'react';
import { Router } from '../react-router';
import { createHashHistory } from '../history';
//创建一个hash history对象的方法，模拟一个自己的history对象，但是使用hash实现的
class HashRouter extends React.Component {
    constructor(props) {
        super(props);
        this.history = createHashHistory(props)
    }
    render() {
        return (
            <Router history={this.history}>
                {this.props.children}
            </Router>
        )
    }
}
export default HashRouter;