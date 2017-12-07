var OPEN_TAG = '{';
var CLOSE_TAG = '}';

/**
 * 字符串字面化
 *
 * @param  {String} source  - 需要字面化的字符串
 * @return {String}         - 字符串字面化结果
 */
function stringLiteralize(source) {
    return '"'
        + source
            .replace(/\x5C/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\x0A/g, '\\n')
            .replace(/\x09/g, '\\t')
            .replace(/\x0D/g, '\\r')
        // .replace( /\x08/g, '\\b' )
        // .replace( /\x0C/g, '\\f' )
        + '"';
}

// 字符串需要添加双引号，如果字符串中存在需要转译的字符则转译
var quote = JSON.stringify ? JSON.stringify : stringLiteralize;

var num = 0,
    pool = {};

function dig(str) {
    var key = '??' + num++;

    pool[key] = str;

    return key;
}

function fill(str) {
    return pool[str];
}

/**
 *  转换模版数据
 *
 *  @param  {Object} -
 *  @param  {String} -
 *  @return {void}
 */
function addPrefix(expr) {
   var reg = /\.\s*[\w\.\$]+/g,
       reg1 = /[$a-zA-Z_][\w\$]*/g,
       reg2 = /\?\?\d+/g,
       js;

   js = expr.replace(reg, dig);
   js = js.replace(reg1, function (m) {
       return 'data.' + m;
   });

   return js.replace(reg2, fill);
}

/**
 *  转化模版信息
 *
 *  @param  {String} str - 字符串模版
 *  @return {Array}
 */
function tokenize(str) {
    var ret = [], index, value;

    do {
        index = str.indexOf(OPEN_TAG);
        index = index === -1 ? str.length : index;
        value = str.slice(0, index);
        ret.push({
            expr: value,
            type: 'TEXT'
        });

        str = str.slice(index + OPEN_TAG.length);

        if (str) {
            index = str.indexOf(CLOSE_TAG);
            if (index === -1) {
                throw new Error('can not find close tag');
            }
            value = str.slice(0, index);
            ret.push({
                expr: value.trim(),
                type: 'JS'
            });
        }

        str = str.slice(index + CLOSE_TAG.length);
    }while(str.length)

    return ret;
}

function render(str) {
    var tokens = tokenize(str),
        ret = [];
    
    for (var i = 0, l = tokens.length, token; i < l; i++){
        token = tokens[i];

        if (token.type === 'TEXT') {
            ret.push(quote(token.expr));
        }else {
            ret.push(addPrefix(token.expr));
        }
    }

    return new Function('data', 'return ' + ret.join('+'));
}