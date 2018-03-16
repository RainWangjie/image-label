/**
 * Created by gewangjie on 2018/3/1
 * 全局提示框
 */

import '../style/tip.scss'

class Tip {
    constructor() {
        $('body').append('<div class="placeholder"></div>');
        this.el = $('.placeholder')
    }

    setText(text) {
        this.el.html(text).show();
    }

    setHide(text, time) {
        let that = this;
        this.setText(text);
        setTimeout(function () {
            that.hide()
        }, time || 1000)
    }

    hide() {
        this.el.hide();
    }
}

export default Tip