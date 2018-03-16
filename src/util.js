/**
 * Created by gewangjie on 2018/2/28
 * 辅助
 */

// 随机获取颜色
function getRandomColor() {
    return '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).substr(-6);

    // return '#' +
    //     (function (color) {
    //         return (color += '0123456789abcdef'[Math.floor(Math.random() * 16)])
    //         && (color.length === 6) ? color : arguments.callee(color);
    //     })('');
}

//取最小值
function getMax(num) {
    return Math.max(20, num);
}

function ajax(option, success, fail) {
    $.ajax(option).done((d) => {
        d = JSON.parse(d);
        if (d.status.code !== '1000') {
            fail && fail(d);
            return;
        }
        success && success(d.result);
    }).fail((d) => {
        fail && fail(d);
    })
}

const util = {
    getRandomColor,
    getMax,
    ajax
};

export default util;
