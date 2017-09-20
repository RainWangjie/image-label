/**
 * Created by gewangjie on 2017/9/20
 */
/**
 * Created by gewangjie on 2017/1/18.
 */
// jq与原生js混写，需移除jq
// 随机生成颜色
function getRandomColor() {
    return '#' +
        (function (color) {
            return (color += '0123456789abcdef'[Math.floor(Math.random() * 16)])
            && (color.length == 6) ? color : arguments.callee(color);
        })('');
}
/*
 label：标注（框选）
 tag：框选对应标签
 tag_2:属性
 */

var _domain = 'https://test.teegether.cn',
    imgAreaEl = $('#img-area-self'),//图片放置元素
    isMouseDown = false,//鼠标点击动作
    mouseType = 0,//鼠标操作内容，1：创建，2：移动，3：缩放
    mouse = {},//mouse属性(x,y)
    selected = 0,//操作标注索引
    tempSelected = 0,//暂存选择项
    operateData = {},//标注操作参数(x,y,w,h)，animate方法使用(渲染)
    labelList = [],//标注列表
    labelMove = {},//记录标注初始坐标等相关参数(x,y,resize)
    labelTotal = 0,//标注总数
    tagData = [],//标签数据name,color
    winScale = imgAreaEl.width() / imgAreaEl.height(),//图片放置区域比例
    labelId = '',//当前图片链接
    labelIdFinish = [],
    diffText = ['', '标注数量不同', '标注标签不同', '标注属性不同', '标注位置不同'];
// 全局提示框
var _placeHolderEl = {
    el: $('.placeholder'),
    setText: function (text) {
        this.el.html(text).show();
    },
    setHide: function (text, time) {
        var that = this;
        this.setText(text);
        setTimeout(function () {
            that.hide()
        }, time || 1000)
    },
    hide: function () {
        this.el.hide();
    }
};

var tagName = {
        '上衣': {
            detail: ['衬衫', '上衣', 'T恤', '西服', '夹克', '卫衣', '针织衫', '大衣', '棉衣', '风衣'],
            tag_2_type: 1
        },
        '裙子': {
            detail: ['连衣裙', '半身裙'],
            tag_2_type: 2
        },
        '裤子': {
            detail: ['裤装'],
            tag_2_type: 3
        },
        '鞋': {
            detail: ['鞋子']
        },
        '包': {
            detail: ['包']
        }
    },
    tagTotal = 0;
var tag_2 = {
    1: ['长袖', '短袖', '无袖', '吊带'],
    3: ['长裤', '中裤', '短裤'],
    2: ['长裙', '中裙', '短裙']
};
initTag('.label-group');
// 获取图片
function getImage() {
    _placeHolderEl.setText('新图片加载中......');
    $.ajax({
        url: _domain + '/deep_fashion/ins_label/img',
        type: 'GET',
        success: function (d) {
            d = JSON.parse(d);
            if (d.status.code == '1000') {
                clearAll();
                if (d.result.pic !== undefined) {
                    adaptionImg(d.result.pic, $('#img-self'));
                    labelId = d.result.labelId;
                } else {
                    _placeHolderEl.setHide('没有图片了');
                }
                editLabelSummary(d.result.summary);
            } else {
                alert(d.message);
            }
        },
        error: function (d) {
            alert('网络错误')
        }
    });
    //重置标签
    linkage();
}
// 获取差异图片
function getDiffImage() {
    _placeHolderEl.setText('新图片加载中......');
    $.ajax({
        url: _domain + '/deep_fashion/ins_label/diffImg',
        type: 'GET',
        success: function (d) {
            d = JSON.parse(d);
            if (d.status.code == '1000') {
                clearAll();
                if (d.result !== undefined) {
                    restore(d.result);
                    labelId = d.result.labelId;
                } else {
                    _placeHolderEl.setHide('没有图片了');
                }
            } else {
                alert(d.message);
            }
        },
        error: function (d) {
            alert('网络错误')
        }
    });
}
// 获取裁决图片
function getFinalDiffImg() {
    _placeHolderEl.setText('新图片加载中......');
    $.ajax({
        url: _domain + '/deep_fashion/ins_label/finalDiffImg',
        type: 'GET',
        success: function (d) {
            d = JSON.parse(d);
            if (d.status.code == '1000') {
                clearAll();
                if (d.result !== undefined) {
                    restoreRight({
                        pic: d.result.pic,
                        diffLabel: d.result.left.labelDetail
                    }, '#img-self');
                    restoreRight({
                        pic: d.result.pic,
                        diffLabel: d.result.right.labelDetail
                    }, '#img-other');
                    labelIdFinish = [d.result.left.labelId, d.result.right.labelId];
                    $('.finish-total span').html(d.result.total);
                } else {
                    _placeHolderEl.setHide('没有图片了');
                }
            } else {
                alert(d.message);
            }
        },
        error: function (d) {
            alert('网络错误')
        }
    });
}
// 图片自适应
function adaptionImg(url, el, callback) {
    url += '?x-oss-process=image/resize,w_500';
    var img = new Image();
    img.onload = function () {
        var imgScale = img.naturalWidth / img.naturalHeight;
        _placeHolderEl.hide();
        if (imgScale > winScale) {
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
        _placeHolderEl.setHide('图片获取失败...');
    };
    img.src = url;
}
// 初始化标签
function initTag(el) {
    for (var i in tagName) {
        var html = '<ul class="label-list">';
        for (var j in tagName[i].detail) {
            var name = tagName[i].detail[j];
            var color = getRandomColor();
            tagData.push({
                'name': name,
                'color': color,
                'tag_2_type': tagName[i].tag_2_type || -1
            });
            //最好class控制color
            html += '<li>' +
                '<label><input type="radio" class="imgTag tag_' + tagTotal + '" name="imgTag" value="' + tagTotal + '">' + name +
                '</label><div class="color-block" style="background: ' + color + '"></div>' +
                '</li>';
            tagTotal++;
        }
        html += "</ul>";
        $(el).append(html);
    }
    $('.imgTag').on('change', changeTag);
    print('列表初始化');
    // 绑定鼠标事件
    bindNewLabel();
}
// 初始化二级标签
function initSecondTag(tag, y) {//根据一级标签对应二级标签类型渲染列表，y为panel移动距离
    if (tag != -1) {//二级标签为空则移除
        var html = '';
        for (var i in tag_2[tag]) {
            html += '<li>' +
                '<label><input type="radio" class="imgTag_2 tag_2_' + i + '" name="imgSecondTag" value="' + i + '">' + tag_2[tag][i] +
                '</label></li>';
        }
        $('.second-tag-panel').html(html).addClass('show').css({
            'transform': 'translate3d(120px,' + y + 'px,0)',
            '-webkit-transform': 'translate3d(120px,' + y + 'px,0)'
        });
        // 二级标签已选择则模拟点击
        labelList[selected].tag_2 != -1 && $('.imgTag_2').eq(labelList[selected].tag_2).click();
    } else {
        $('.second-tag-panel').removeClass('show');
    }
    drawTagList();
}
// 初始化移动
function initOperate() {
    operateData.y = labelList[selected].y;
    operateData.x = labelList[selected].x;
    operateData.w = labelList[selected].w;
    operateData.h = labelList[selected].h;
}
// 清除
function clearLabel() {
    labelMove = {};
}
function clearAll() {
    clearLabel();
    labelId = '';
    selected = 0;
    labelList = [];
    labelTotal = 0;
    $('.label-area').remove();
    $('.label-area-right').remove();
    // $('#img-self').attr('src', '')
}
// 创建label
function bindNewLabel() {
    // move绑定到父元素
    $('#img-area-self').on('mousedown', newLabelMouseDown)
        .on('mousemove', move)
        .on('mouseup', up);
}
function unbindEvent() {
    $('#img-area-self').unbind('mousedown', newLabelMouseDown)
        .unbind('mousemove', move)
        .unbind('mouseup', up);
}
function newLabelMouseDown(event) {
    mouse = captureMouse(event);
    isMouseDown = true;
    mouseType = 1;
    tempSelected = selected;
    selected = labelTotal;
    var newLabel = {
        x: mouse.x,
        y: mouse.y,
        el: $($('#tpl-area').html()),
        isExist: false,
        w: 0,
        h: 0
    };
    newLabel.el.attr('id', 'label_' + selected);
    labelMove = {
        x: mouse.x,
        y: mouse.y
    };
    labelList.push(newLabel);
    labelTotal++;
    print('创建标注开始');
    animate();
    return false;
}
function newLabelMouseMove() {
    var difference_x = mouse.x - labelMove.x,
        difference_y = mouse.y - labelMove.y;
    if (difference_x >= 0 && difference_y >= 0) {
        // 左上角向右下角
        operateData = {
            x: labelMove.x,
            y: labelMove.y,
            w: difference_x,
            h: difference_y
        };
    } else if (difference_x >= 0 && difference_y < 0) {
        // 左下角向右上角
        operateData = {
            x: labelMove.x,
            y: labelMove.y + difference_y,
            w: difference_x,
            h: -1 * difference_y
        };
    } else if (difference_x < 0 && difference_y >= 0) {
        // 右上角向左下角
        operateData = {
            x: labelMove.x + difference_x,
            y: labelMove.y,
            w: -1 * difference_x,
            h: difference_y
        };
    } else {
        // 右下角向左上角
        operateData = {
            x: labelMove.x + difference_x,
            y: labelMove.y + difference_y,
            w: -1 * difference_x,
            h: -1 * difference_y
        };
    }
    if (!labelList[selected].isExist) {
        $('#img-area-self').append(labelList[selected].el);
        labelList[selected].isExist = true;
    }
}
function newLabelMouseup() {
    if (labelList[selected].isExist) {
        print('创建标注' + (labelTotal - 1));
        bindMoveLabel();
        bindScaleLabel();
    } else {
        labelList.pop();
        labelTotal--;
        selected = tempSelected;
        print('创建标注失败or撤销');
        return;
    }
}
// 移动area
function bindMoveLabel() {
    $('.label-area').on('mousedown', moveLabelMouseDown);
}
$(document).bind('contextmenu', function (e) {
    return false; //屏蔽菜单
});
function moveLabelMouseDown(event) {
    if (event.which == 3) {//右击删除
        if (confirm('删除该标注?')) {
            var id = $(this).attr('id').replace('label_', '');
            $(this).remove();
            labelList[id].isExist = false;
        }
        return false;
    } else {
        mouse = captureMouse(event);
        isMouseDown = true;
        mouseType = 2;
        selected = $(this).attr('id').replace('label_', '');
        labelMove = {
            x: mouse.x,
            y: mouse.y
        };
        initOperate();
        print('移动标注_' + selected);
        animate();
    }
    return false;
}
function moveLabelMouseMove() {
    operateData.y = labelList[selected].y + mouse.y - labelMove.y;
    operateData.x = labelList[selected].x + mouse.x - labelMove.x;
}
function moveLabelMouseup() {
    print('移动结束并选中标注_' + selected);
}
// 缩放area
function bindScaleLabel() {
    $('.ui-resizable-handle').on('mousedown', scaleLabelMouseDown);
}
function scaleLabelMouseDown(event) {
    mouse = captureMouse(event);
    isMouseDown = true;
    mouseType = 3;
    selected = $(this).parents('.label-area').attr('id').replace('label_', '');
    labelMove = {
        resize: $(this).data('resize'),
        x: mouse.x,
        y: mouse.y
    };
    initOperate();
    print('缩放start' + selected);
    animate();
    return false;
}
function scaleLabelMouseMove() {
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
function scaleLabelMouseup() {
    print('缩放结束并选中标注_' + selected);
}
// 公共方法
function move(event) {
    if (isMouseDown) {
        mouse = captureMouse(event);
        switch (mouseType) {
            case 1:
                newLabelMouseMove();
                break;
            case 2:
                moveLabelMouseMove();
                break;
            case 3:
                scaleLabelMouseMove();
                break;
        }
    }
    return false;
}
function up() {
    if (isMouseDown) {
        switch (mouseType) {
            case 1:
                newLabelMouseup();
                break;
            case 2:
                moveLabelMouseup();
                break;
            case 3:
                scaleLabelMouseup();
                break;
        }
        if (labelList[selected]) {//鼠标点击引起的错误
            labelList[selected].y = operateData.y;
            labelList[selected].x = operateData.x;
            labelList[selected].w = _max(operateData.w);
            labelList[selected].h = _max(operateData.h);
            clearLabel();
            linkage();
            //操作label添加selected
            $('.label-area').removeClass('selected');
            $('#label_' + selected).addClass('selected');
        }
    }
    // window.cancelAnimationFrame(animate);
    isMouseDown = false;
    mouseType = 0;
    return false;
}
function print(txt) {
    console.log(txt)
}
// 删除标注
$('body').on('click', '.remove-label', function () {
    if (confirm('删除该标注?')) {
        var id = $(this).parent().attr('id').replace('label_', '');
        $(this).parent().remove();
        labelList[id].isExist = false;
    }
    return false;
});
// 修改标签
function changeTag() {
    var value = $('.imgTag:checked').val();
    // 一级标签被修改，二级标签重置
    labelList[selected].tag != value && (labelList[selected].tag_2 = -1);
    labelList[selected].tag = value;
    initSecondTag(tagData[value].tag_2_type, this.offsetTop);
}
function drawTagList() {
    var el = $('#label_' + selected + ' .tag-list'),
        _tag = labelList[selected].tag,//一级标签索引
        _tag_name = tagData[_tag].name,
        _tag_2 = labelList[selected].tag_2,//二级标签索引
        _tag_2_type = tagData[_tag].tag_2_type,//一级标签对应二级标签类型
        _tag_2_name = _tag_2 != -1 ? tag_2[_tag_2_type][_tag_2] : '';
    el.html(drawTag(tagData[_tag].color, _tag_name)).append(drawTag_2(_tag_2_name));
    el.siblings(".ui-resizable-handle").css('background', tagData[_tag].color);
}
// 绘制标签
function drawTag(color, tag) {
    return '<li class="tag-item" style="background:' + color + '">' + tag + '</li>';
}
// 绘制属性
function drawTag_2(tag_2) {
    return tag_2 ? '<li class="tag-item tag_2">' + tag_2 + '</li>' : '';
}
// tag,radio联动
function linkage() {
    if (labelList[selected].tag) {
        $('.imgTag').eq(labelList[selected].tag).click();
    } else {
        $('.imgTag').each(function () {
            $(this).removeAttr('checked');
        });
        $('.second-tag-panel').removeClass('show');
    }
}
// 根据标签与属性返回对应索引
function returnTagIndex(_tag_name, _tag_2_name) {
    var _tag_index, _tag_2_type, _tag_2_index;
    for (var i in tagData) {
        if (tagData[i].name === _tag_name) {
            _tag_index = i;
            _tag_2_type = tagData[i].tag_2_type;
            break;
        }
    }
    if (_tag_2_type !== -1) {
        for (var j in tag_2[_tag_2_type]) {
            if (tag_2[_tag_2_type][j] === _tag_2_name) {
                _tag_2_index = j;
                break;
            }
        }
    } else {
        _tag_2_index = -1;
    }

    return {
        tag_index: _tag_index,
        tag_2_index: _tag_2_index
    }
}
// 二级标签点击
$('.second-tag-panel').on('change', 'input', function () {
    labelList[selected].tag_2 = $(this).val();
    drawTagList();
});
// 获取新图
$('#next-picture').click(function () {
    if (!labelId) {
        _placeHolderEl.setHide('异常错误，请刷新后重新打标');
        return;
    }
    _placeHolderEl.setText('数据打包......');
    var _type = $(this).data('type'),
        labelDetail = [],
        isError = false,
        consoleTable = [['TOP', 'LEFT', 'WIDTH', 'HEIGHT', '标签']],//控制台打印表格数据
        isExist = labelList.every(function (item) { //是否有标签
            return item.isExist == false;
        });

    if (isExist && _type == 'label') {
        getImage();
        return;
    }
    for (var i in labelList) {
        var label = labelList[i];
        if (label.isExist) {
            var tagName = isTagRight(label.tag, label.tag_2);
            if (typeof tagName === 'object') {
                consoleTable.push([dealWH('h', label.y), dealWH('w', label.x), dealWH('w', label.w), dealWH('h', label.h), tagName]);
                labelDetail.push({
                    'tag': tagName.tag,
                    'property': [tagName.tag_2 || ''],
                    'pos': [dealWH('h', label.y), dealWH('w', label.x), dealWH('w', label.w), dealWH('h', label.h)]
                })
            } else {
                consoleTable.push([dealWH('h', label.y), dealWH('w', label.x), dealWH('w', label.w), dealWH('h', label.h), '空']);
                label.el.addClass(tagName);
                _placeHolderEl.hide();
                setTimeout(function () {
                    $('.label-area').removeClass('error_1').removeClass('error_2');
                }, 1000);
                isError = true;
            }
        }
    }
    console.table(consoleTable);
    if (!isError) {
        var postData = {
            'labelId': labelId,
            'labelDetail': JSON.stringify(labelDetail)
        };
        // 提交数据
        _placeHolderEl.setText('数据上传......');
        if (_type == 'label') {
            $.ajax({
                url: _domain + '/deep_fashion/ins_label/labels',
                type: 'POST',
                data: postData,
                success: function (d) {
                    d = JSON.parse(d);
                    if (d.status.code == '1000') {
                        getImage();
                    } else {
                        alert(d.message);
                    }
                    _placeHolderEl.hide();
                },
                error: function (d) {
                    _placeHolderEl.hide();
                    alert('网络错误')
                }
            });
        } else {
            $.ajax({
                url: _domain + '/deep_fashion/ins_label/diff',
                type: 'POST',
                data: postData,
                success: function (d) {
                    d = JSON.parse(d);
                    if (d.status.code == '1000') {
                        getDiffImage();
                    } else {
                        alert(d.message);
                    }
                    _placeHolderEl.hide();
                },
                error: function (d) {
                    _placeHolderEl.hide();
                    alert('网络错误')
                }
            });
        }
    }
});
// 不需要标注按钮
$('#skip').click(function () {
    $.ajax({
        url: _domain + '/deep_fashion/ins_label/nolabel',
        type: 'POST',
        data: {labelId: labelId},
        success: function (d) {
            d = JSON.parse(d);
            if (d.status.code == '1000') {
                getImage();
            } else {
                alert(d.message);
            }
            _placeHolderEl.hide();
        },
        error: function (d) {
            _placeHolderEl.hide();
            alert('网络错误')
        }
    });
});

// 修改标签统计文案
function editLabelSummary(data) {
    $('.label-count span').html(data.labelCount);
    $('.label-diff-count span').html(data.labelDiffCount);
    $('.label-ok-count span').html(data.labelOkCount);
    $('.label-need-count span').html(data.needLabelCount);
}
// 处理标签,一、二级标签是否选择
function isTagRight(_tag, _tag_2) {
    if (!_tag) {
        return 'error_1';
    }
    var _tag_name = tagData[_tag].name,
        _tag_2_type = tagData[_tag].tag_2_type,//一级标签对应二级标签类型
        _tag_2_name = _tag_2 != -1 ? tag_2[_tag_2_type][_tag_2] : '';
    if (_tag_2_type != -1 && _tag_2 == -1) {
        return 'error_2'
    } else {
        return {
            tag: _tag_name,
            tag_2: _tag_2_name
        }
    }
}
// 处理宽高比例
function dealWH(type, num) {
    var t = $('#img-self'),
        w = t.width(),
        h = t.height();
    if (type == 'w') {
        return (num / w).toFixed(4);
    } else if (type == 'h') {
        return (num / h).toFixed(4);
    }
}
// 帧率显示
// var stats = new Stats();
// stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
// stats.dom.style.cssText = 'position:fixed;top:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
// document.body.appendChild(stats.dom);
// 按浏览器刷新率渲染标注
function animate() {
    // stats.begin();
    // stats.end();
    isMouseDown && window.requestAnimationFrame(animate);
    if (labelTotal > 0 && labelList[selected] && labelList[selected].isExist) {
        operateData.w = _max(operateData.w);
        operateData.h = _max(operateData.h);
        $('#label_' + selected).css({
            top: operateData.y,
            left: operateData.x,
            width: operateData.w,
            height: operateData.h
        })
    }
}
// 根据数据还原框选
function restore(data) {
    restoreLeft(data);
    restoreRight(data);
    // 差异信息显示
    $('.label-diff').html(diffText[data.diffType] + '<br/>' + data.diffDesc);
}
function restoreLeft(data, el) {
    var t = el ? $(el) : $('#img-self');
    adaptionImg(data.pic, t, function () {
        var w = t.width(),
            h = t.height();
        for (var i in data.label) {
            var item = data.label[i];
            selected = i;
            var _tag_name = item.tag,
                _tag_2_name = item.property[0],
                tagObj = returnTagIndex(_tag_name, _tag_2_name),
                newLabel = {
                    x: item.pos[1] * w,
                    y: item.pos[0] * h,
                    el: $($('#tpl-area').html()),
                    isExist: true,
                    w: item.pos[2] * w,
                    h: item.pos[3] * h,
                    tag: tagObj.tag_index,
                    tag_2: tagObj.tag_2_index
                },
                color = tagData[tagObj.tag_index].color;
            newLabel.el.attr('id', 'label_' + selected);
            newLabel.el.find('.tag-list').eq(0).append(drawTag(color, _tag_name))
                .append(drawTag_2(_tag_2_name))
                .siblings(".ui-resizable-handle")
                .css('background', color);
            labelList.push(newLabel);
            operateData = {
                x: newLabel.x,
                y: newLabel.y,
                w: newLabel.w,
                h: newLabel.h,
            };
            labelTotal++;
            t.after(newLabel.el);
            //强制模拟鼠标动作，渲染一把
            isMouseDown = true;
            animate();
            isMouseDown = false;
        }
        // 模拟选中最后一个标签
        isMouseDown = true;
        mouseType = 1;
        up();
    });
}
function restoreRight(data, el) {
    var t = el ? $(el) : $('#img-other');
    adaptionImg(data.pic, t, function () {
        var w = t.width(),
            h = t.height();
        for (var i in data.diffLabel) {
            var item = data.diffLabel[i];
            var $tpl = $($('#tpl-other-person').html()),
                _tag_name = item.tag,
                _tag_2_name = item.property[0],
                tagObj = returnTagIndex(_tag_name, _tag_2_name),
                color = tagData[tagObj.tag_index].color;
            $tpl.find('.tag-list').eq(0).append(drawTag(color, _tag_name)).append(drawTag_2(_tag_2_name));
            $tpl.css({
                borderColor: color,
                top: item.pos[0] * h + 'px',
                left: item.pos[1] * w + 'px',
                width: item.pos[2] * w + 'px',
                height: item.pos[3] * h + 'px'
            });
            t.after($tpl);
        }
    });
}
//取最小值
function _max(num) {
    return Math.max(20, num);
}
