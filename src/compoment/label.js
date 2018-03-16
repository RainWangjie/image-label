/**
 * Created by gewangjie on 2018/2/28
 * 标注
 */
import {captureMouse} from "../mouse";
import util from "../util";
import "../style/label.scss";

// 图片自适应
function adaptionImg(url, el, areaScale, callback) {
    // url += '?x-oss-process=image/resize,w_500';
    let img = new Image();

    img.onload = function () {
        let imgScale = img.naturalWidth / img.naturalHeight;
        if (imgScale > areaScale) {
            el.attr({
                'src': url,
                'data-scale': imgScale,
                'width': '100%',
                'height': 'auto'
            });
        } else {
            el.attr({
                'src': url,
                'data-scale': imgScale,
                'width': 'auto',
                'height': '100%'
            });
        }
        callback && callback();
    };
    img.onerror = function () {
    };
    img.src = url;
}

// 绘制标签
function drawTag(color, tag) {
    return `<li class="tag-item" style="background:${color}">${tag }</li>`;
}

function drawTagList($el, tagList, tagColor) {
    let content = '';
    for (let title in tagList) {
        const tag = tagList[title];
        const color = tagColor[tag];
        content += drawTag(color, `${title}:${tag}`);
    }

    $el.find('.tag-list').html(content);
}

// 处理宽高比例
function dealWH(img, label) {
    return (label / img).toFixed(4);
}

function tagStringToObj(string) {
    let obj = {};
    string.split(',').map((title_tag) => {
        const [title, tag] = title_tag.split(':');
    obj[title] = tag;
})
    return obj;
}

/**
 标注框 -- 可移动
 @param el 节点
 @param selectCb 选中回调
 @param width
 @param height
 */
const labelTpl = `  <div class="label-area">
        <div class="ui-resizable-handle ui-resizable-line-h ui-resizable-t" data-resize="t"></div>
        <div class="ui-resizable-handle ui-resizable-line-v ui-resizable-l" data-resize="l"></div>
        <div class="ui-resizable-handle ui-resizable-line-h ui-resizable-b" data-resize="b"></div>
        <div class="ui-resizable-handle ui-resizable-line-v ui-resizable-r" data-resize="r"></div>
        <div class="ui-resizable-handle ui-resizable-point ui-resizable-tl" data-resize="tl"></div>
        <div class="ui-resizable-handle ui-resizable-point ui-resizable-tr" data-resize="tr"></div>
        <div class="ui-resizable-handle ui-resizable-point ui-resizable-bl" data-resize="bl"></div>
        <div class="ui-resizable-handle ui-resizable-point ui-resizable-br" data-resize="br"></div>
        <ul class="tag-list"></ul>
    </div>`;

class ImgLabel {
    constructor(option) {
        this.$imgAreaEl = $(option.el);//图片放置元素
        this.isMouseDown = false;//鼠标点击动作
        this.mouseType = 0;//鼠标操作内容，1：创建，2：移动，3：缩放
        this.mouse = {};//mouse属性(x,y)
        this.selected = 0;//操作标注索引
        this.tempSelected = 0;//暂存选择项
        this.operateData = {};//标注操作参数(x,y,w,h)，animate方法使用(渲染)
        this.labelList = [];//标注列表
        this.labelMove = {};//记录标注初始坐标等相关参数(x,y,resize)
        this.labelTotal = 0;//标注总数
        this.tagData = [];//标签数据name,color

        this.areaScale = this.$imgAreaEl.width() / this.$imgAreaEl.height();//图片放置区域比例
        // 选中标注框回调
        this.selectCb = option.selectCb;
        // 初始化
        this.init();
    }

    init() {
        let self = this;

        // 新建图片
        const imgEl = document.createElement('img');
        imgEl.setAttribute('draggable', false);
        imgEl.id = 'img-self';
        this.$imgAreaEl[0].appendChild(imgEl);
        this.$imgEl = $(imgEl);

        // 屏蔽原生右击菜单
        $(document).bind('contextmenu', function (e) {
            return false; //屏蔽菜单
        });

        // 绑定鼠标事件
        this.bindNewLabel();
    }

    // 设置图片
    setImage(src) {
        this.clearAll();
        adaptionImg(src, this.$imgEl, this.areaScale);
    }

    // 删除选中标注标签
    clearTag() {
        const {selected, labelList} = this;
        const $selectEl = $('#label_' + selected);
        $selectEl.find('.tag-list').eq(0).html('');
    }

    // 更新选中标注标签
    updateTag(title, tag, tagColor) {
        const {selected, labelList} = this;
        if (labelList.length === 0) {
            alert('请选择标注框');
            return;
        }
        const updateItem = labelList[selected];
        const $selectEl = $('#label_' + selected);

        if (!updateItem.hasOwnProperty('tag')) {
            updateItem.tag = {};
        }

        updateItem.tag[title] = tag;


        console.log(updateItem.tag);
        // updateItem.color = color;

        drawTagList($selectEl, updateItem.tag, tagColor);

        // $selectEl.find('.ui-resizable-handle').css('background', color);
    }

    // 获取数据
    getLabel() {
        const {labelList} = this;

        //是否有标签
        let isExist = labelList.every(function (item) {
            return item.isExist === false;
        });

        // 无标签数据
        if (isExist) {
            return {
                success: false,
                content: '无标签'
            }
        }
        let content = [];
        let imgW = this.$imgEl.width(),
            imgH = this.$imgEl.height();
        for (let i = 0, len = labelList.length; i < len; i++) {
            const label = labelList[i];
            const {tag, isExist} = label;
            if (!isExist) continue;
            if (!tag) {
                label.el.addClass('error_1');
                setTimeout(function () {
                    $('.label-area').removeClass('error_1');
                }, 1000);
                return {
                    success: false,
                    content: '未选择标签'
                }
                break;
            }
            const {x, y, w, h} = label;
            content.push({
                tag,
                pos: [dealWH(imgH, y), dealWH(imgW, x), dealWH(imgW, w), dealWH(imgH, h)]
            })
        }
        return {
            success: true,
            content
        }
    }

    // 初始化移动
    initOperate() {
        const {labelList, selected} = this;
        const {x, y, w, h} = labelList[selected];

        this.operateData = {
            x, y, w, h
        }
    }

    // 清除
    clearLabel() {
        this.labelMove = {};
    }

    clearAll() {
        this.clearLabel();
        this.selected = 0;
        this.labelList = [];
        this.labelTotal = 0;
        this.$imgAreaEl.find('.label-area').remove();
    }

    // 创建label
    bindNewLabel() {
        let self = this;
        // move绑定到父元素
        this.$imgAreaEl.on('mousedown', self.newLabelMouseDown.bind(self))
            .on('mousedown', '.ui-resizable-handle', function (e) {
                self.selected = $(this).parents('.label-area').attr('id').replace('label_', '');
                self.labelMove.resize = $(this).data('resize');
                self.scaleLabelMouseDown.call(self, e);
                return false;
            })
            .on('mousedown', '.label-area', function (e) {
                if (e.which === 3) {//右击删除
                    if (confirm('删除该标注?')) {
                        let id = $(this).attr('id').replace('label_', '');
                        $(this).remove();
                        self.labelList[id].isExist = false;
                    }
                    return false;
                }
                self.selected = $(this).attr('id').replace('label_', '');
                console.log(self.selected);
                self.moveLabelMouseDown.call(self, e);
                return false;
            })
            .on('mousemove', self.move.bind(self))
            .on('mouseup', self.up.bind(self));
    }

    // 解绑鼠标事件
    unbindEvent() {
        this.$imgAreaEl.unbind('mousedown', this.newLabelMouseDown)
            .unbind('mousemove', this.move)
            .unbind('mouseup', this.up);
    }

    newLabelMouseDown(event) {
        this.mouse = captureMouse(event);
        this.isMouseDown = true;
        this.mouseType = 1;

        this.tempSelected = this.selected;
        this.selected = this.labelTotal;

        // 为每个标注分配颜色
        const {x, y} = this.mouse;
        let newLabel = {
            x,
            y,
            el: $(labelTpl),
            isExist: false,
            color: "red",
            w: 0,
            h: 0
        };

        newLabel.el.attr('id', 'label_' + this.selected);

        // 记录当前鼠标pos
        this.labelMove = {x, y};

        this.labelList.push(newLabel);
        this.labelTotal++;

        console.log('创建标注开始');

        this.animate();
        return false;
    }

    newLabelMouseMove() {
        let {mouse, labelMove, selected, labelList} = this;
        let difference_x = mouse.x - labelMove.x,
            difference_y = mouse.y - labelMove.y;
        if (difference_x >= 0 && difference_y >= 0) {
            // 左上角向右下角
            this.operateData = {
                x: labelMove.x,
                y: labelMove.y,
                w: difference_x,
                h: difference_y
            };
        } else if (difference_x >= 0 && difference_y < 0) {
            // 左下角向右上角
            this.operateData = {
                x: labelMove.x,
                y: labelMove.y + difference_y,
                w: difference_x,
                h: -1 * difference_y
            };
        } else if (difference_x < 0 && difference_y >= 0) {
            // 右上角向左下角
            this.operateData = {
                x: labelMove.x + difference_x,
                y: labelMove.y,
                w: -1 * difference_x,
                h: difference_y
            };
        } else {
            // 右下角向左上角
            this.operateData = {
                x: labelMove.x + difference_x,
                y: labelMove.y + difference_y,
                w: -1 * difference_x,
                h: -1 * difference_y
            };
        }
        if (!labelList[selected].isExist) {
            this.$imgAreaEl.append(labelList[selected].el);
            labelList[selected].isExist = true;
        }
    }

    newLabelMouseUp() {
        let {labelList, selected, labelTotal, tempSelected} = this;
        if (!labelList[selected].isExist) {
            labelList.pop();
            this.labelTotal--;
            this.selected = tempSelected;
            console.log('创建标注失败or撤销');
            return;
        }

        // 绑定标注框鼠标事件
        console.log('创建标注' + (labelTotal - 1));
    }

    // 移动
    moveLabelMouseDown(event) {
        this.mouse = captureMouse(event);
        this.isMouseDown = true;
        this.mouseType = 2;

        // $labelTag.val(labelList[selected].tag);
        const {x, y} = this.mouse;
        this.labelMove = {x, y};
        this.initOperate();
        console.log('移动标注_' + this.selected);
        this.animate();
    }

    moveLabelMouseMove() {
        const {operateData, labelList, selected, mouse, labelMove} = this;
        operateData.y = labelList[selected].y + mouse.y - labelMove.y;
        operateData.x = labelList[selected].x + mouse.x - labelMove.x;
    }

    moveLabelMouseUp() {
        console.log('移动结束并选中标注_' + this.selected);
    }

    // 缩放area
    scaleLabelMouseDown(event) {

        this.mouse = captureMouse(event);
        this.isMouseDown = true;
        this.mouseType = 3;
        const {x, y} = this.mouse;
        let {resize} = this.labelMove;
        this.labelMove = {resize, x, y};
        this.initOperate();
        console.log('缩放start' + this.selected);
        this.animate();
    }

    scaleLabelMouseMove() {
        const {labelMove, operateData, labelList, mouse, selected} = this;
        switch (labelMove.resize) {
            case 't':
                operateData.y = labelList[selected].y + mouse.y - labelMove.y;
                operateData.h = labelList[selected].h - (mouse.y - labelMove.y);
                break;
            case 'l':
                operateData.x = labelList[selected].x + mouse.x - labelMove.x;
                operateData.w = labelList[selected].w - (mouse.x - labelMove.x);
                break;
            case 'r':
                operateData.w = labelList[selected].w + mouse.x - labelMove.x;
                break;
            case 'b':
                operateData.h = labelList[selected].h + mouse.y - labelMove.y;
                break;
            case 'tl':
                operateData.y = labelList[selected].y + mouse.y - labelMove.y;
                operateData.x = labelList[selected].x + mouse.x - labelMove.x;
                operateData.w = labelList[selected].w - (mouse.x - labelMove.x);
                operateData.h = labelList[selected].h - (mouse.y - labelMove.y);
                break;
            case 'tr':
                operateData.y = labelList[selected].y + mouse.y - labelMove.y;
                operateData.w = labelList[selected].w + mouse.x - labelMove.x;
                operateData.h = labelList[selected].h - (mouse.y - labelMove.y);
                break;
            case 'bl':
                operateData.x = labelList[selected].x + mouse.x - labelMove.x;
                operateData.w = labelList[selected].w - (mouse.x - labelMove.x);
                operateData.h = labelList[selected].h + mouse.y - labelMove.y;
                break;
            case 'br':
                operateData.h = labelList[selected].h + mouse.y - labelMove.y;
                operateData.w = labelList[selected].w + mouse.x - labelMove.x;
                break;
        }
    }

    scaleLabelMouseUp() {
        console.log('缩放结束并选中标注_' + this.selected);
    }

    // 公共方法，根据MouseDown事件发生Node区分操作
    move(event) {
        if (!this.isMouseDown) {
            return false;
        }

        this.mouse = captureMouse(event);

        switch (this.mouseType) {
            case 1:
                this.newLabelMouseMove();
                break;
            case 2:
                this.moveLabelMouseMove();
                break;
            case 3:
                this.scaleLabelMouseMove();
                break;
        }

        return false;
    }

    up() {
        const {isMouseDown, mouseType, labelList, selected, operateData} = this;
        if (isMouseDown) {
            switch (mouseType) {
                case 1:
                    this.newLabelMouseUp();
                    break;
                case 2:
                    this.moveLabelMouseUp();
                    break;
                case 3:
                    this.scaleLabelMouseUp();
                    break;
            }
            if (labelList[selected]) {//鼠标点击引起的错误
                labelList[selected].y = operateData.y;
                labelList[selected].x = operateData.x;
                labelList[selected].w = util.getMax(operateData.w);
                labelList[selected].h = util.getMax(operateData.h);
                this.clearLabel();
                //操作label添加selected
                $('.label-area').removeClass('selected');
                $('#label_' + selected).addClass('selected');
            }
        }
        // window.cancelAnimationFrame(animate);
        this.isMouseDown = false;
        this.mouseType = 0;
        this.selectCb && this.selectCb(labelList[selected]);
        return false;
    }

    // 按浏览器刷新率渲染标注
    animate() {
        const {isMouseDown, animate, labelTotal, labelList, selected, operateData} = this;
        // stats.begin();
        // stats.end();
        isMouseDown && window.requestAnimationFrame(this.animate.bind(this));
        if (labelTotal > 0 && labelList[selected] && labelList[selected].isExist) {
            operateData.w = util.getMax(operateData.w);
            operateData.h = util.getMax(operateData.h);
            $('#label_' + selected).css({
                top: operateData.y,
                left: operateData.x,
                width: operateData.w,
                height: operateData.h
            })
        }
    }

    // 数据还原
    // 可操作
    restore(data, tagColor) {
        let self = this;
        const t = self.$imgEl;
        self.clearAll();

        adaptionImg(data.pic, t, self.areaScale, () => {
            let w = t.width(),
            h = t.height();
        const {tagList} = data;
        for (let i = 0, len = tagList.length; i < len; i++) {
            let item = tagList[i];
            console.log("item", item);
            self.selected = i;
            const tag = tagStringToObj(item.name || item.tag);

            console.log(item.pos);

            let newLabel = {
                    x: item.pos[1] * w,
                    y: item.pos[0] * h,
                    el: $(labelTpl),
                    isExist: true,
                    w: item.pos[2] * w,
                    h: item.pos[3] * h,
                    tag
                },
                color = tagColor[item.name] || 'red';

            newLabel.el.attr('id', 'label_' + self.selected);
            self.labelList.push(newLabel);
            self.operateData = {
                x: newLabel.x,
                y: newLabel.y,
                w: newLabel.w,
                h: newLabel.h,
            };
            self.labelTotal++;
            t.after(newLabel.el);

            //强制模拟鼠标动作，渲染一把
            self.isMouseDown = true;
            self.animate();
            self.isMouseDown = false;

            // 绘制标签
            drawTagList(newLabel.el, tag, tagColor);
        }

        // 模拟选中最后一个标签
        self.isMouseDown = true;
        self.mouseType = 1;
        self.up();
    });
    }
}

const labelNoMoveTpl = '<div class="label-area-no-move"><ul class="tag-list"></ul></div>';

/**
 * 标注框 -- 不可移动
 */
class ImgLabelNoMove {
    constructor(option) {
        if (document.querySelectorAll(option.el).length === 0) return;
        this.$imgAreaEl = $(option.el);//图片放置元素
        this.labelList = [];//标注列表
        this.labelTotal = 0;// 标注数
        this.$imgAreaEl = $(option.el);//图片放置元素
        this.areaScale = this.$imgAreaEl.width() / this.$imgAreaEl.height();//图片放置区域比例

        this.init();
    }

    init() {
        // 新建图片
        const imgEl = document.createElement('img');
        imgEl.setAttribute('draggable', false);
        this.$imgAreaEl[0].appendChild(imgEl);
        this.$imgEl = $(imgEl);
    }

    clearAll() {
        this.labelList = [];
        this.labelTotal = 0;
        this.$imgAreaEl.find('.label-area').remove();
    }

    // 设置图片
    setImage(src) {
        adaptionImg(src, this.$imgEl, this.areaScale);
    }

    restore(data, tagColor) {
        let self = this;
        const t = self.$imgEl;
        self.clearAll();

        adaptionImg(data.pic, t, self.areaScale, () => {
            let w = t.width(),
            h = t.height();
        const {tagList} = data;
        for (let i = 0, len = tagList.length; i < len; i++) {
            let item = tagList[i];
            console.log("item", item);
            const tag = tagStringToObj(item.name || item.tag);

            console.log(item.pos);

            let newLabel = {
                    x: item.pos[1] * w,
                    y: item.pos[0] * h,
                    el: $(labelNoMoveTpl),
                    isExist: true,
                    w: item.pos[2] * w,
                    h: item.pos[3] * h,
                    tag
                },
                color = tagColor[item.name] || 'red';

            newLabel.el.attr('id', 'label_' + i);
            self.labelList.push(newLabel);

            self.labelTotal++;

            newLabel.el.css({
                borderColor: color,
                top: item.pos[0] * h + 'px',
                left: item.pos[1] * w + 'px',
                width: item.pos[2] * w + 'px',
                height: item.pos[3] * h + 'px'
            });

            t.after(newLabel.el);

            // 绘制标签
            drawTagList(newLabel.el, tag, tagColor);
        }
    });
    }

}

export {ImgLabel, ImgLabelNoMove}