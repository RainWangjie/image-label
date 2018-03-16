/**
 * Created by gewangjie on 2017/9/20
 */

// 在utils对象上定义捕获坐标的方法
// 鼠标事件
function captureMouse(event) {
    const element = document.getElementById('img-self');
    //定义一个名为mouse的对象
    let mouse = {x: 0, y: 0};
    let x, y;

    //获取鼠标位于当前屏幕的位置， 并作兼容处理
    if (event.pageX || event.pageY) {
        x = event.pageX;
        y = event.pageY;
    } else {
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    //将当前的坐标值减去元素的偏移位置，即为鼠标位于当前element的位置
    x -= element.offsetLeft;
    y -= element.offsetTop;

    mouse.x = x;
    mouse.y = y;
    // console.log(x, y);
    //返回值为mouse对象
    return mouse;
}

// 兼容requestAnimationFrame
// 动画循环
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000/60);
        });
}

//动画循环取消
if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (window.cancelRequestAnimationFrame ||
        window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame ||
        window.mozCancelAnimationFrame || window.mozCancelRequestAnimationFrame ||
        window.msCancelAnimationFrame || window.msCancelRequestAnimationFrame ||
        window.oCancelAnimationFrame || window.oCancelRequestAnimationFrame ||
        window.clearTimeout);
}

export {captureMouse}