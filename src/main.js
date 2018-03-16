/**
 * Created by gewangjie on 2017/1/18.
 */
import {ImgLabel, ImgLabelNoMove} from './compoment/label'
import Tip from './compoment/tip'
import util from "./util";

import './main.scss'

// input,button
const $input = $('#label-text');
const $button = $('#check');

// 图片操作区域
let imgLabel = new ImgLabel({
    el: '#img-area-self',
    selectCb: (data) => {
        let {tag} = data;
        $input.val(tag);
    }
});

// 全屏提示
let tip = new Tip();

imgLabel.setImage('https://oss-image.deepfashion.cn/vp/f59664495dc93fee4be5fbff7731a2fd/5B399D03/t51.2885-15/e35/28435209_297888707410846_850247157733654528_n.jpg')

$button.click(()=>{
   imgLabel.updateTag();
});
