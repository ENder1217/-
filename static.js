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

function addPrefix2(expr) {
    var reg = /([^\w\u00c0-\uFFFF_])(@|##)(?=[$\w])/g;

    return expr.replace(reg, 'data.');
}

/**
 *  支持逻辑（for、if）需要将文本和表达式添加进数组，而逻辑不做此操作
 *
 *  @param  {Object} -
 *  @param  {String} -
 *  @return {void}
 */
function addToData(str) {
    return '__data__.push(' + str + ')';
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

            if (value.indexOf('#') === 0) {
                if (value === '#eachEnd' || value === '#ifEnd') {
                    ret.push({
                        expr: '}',
                        type: 'LOGIC'
                    });
                }

                if (value.slice(0, 4) === '#if ') {
                    ret.push({
                        expr: 'if (' + value.slice(4) + '){',
                        type: 'LOGIC'
                    });
                }

                if (value.slice(0, 6) === '#each ') {
                    var arr = value.slice(6).split(' in '),
                        arrName = arr[1],
                        args = arr[0].match(/[$\w_]+/g),
                        itemName = args.pop(),
                        itemIndex = args.pop() || '$index',
                        value = ['for (var ', ' = 0, l = ' + arrName + '.length; ', ' < l;', ' ++){'].join(itemIndex) +
                                '\nvar ' + itemName + ' = ' + arrName + '[' + itemIndex + '];'

                    ret.push({
                        expr: value,
                        type: 'LOGIC'
                    });
                }
            }else {
                ret.push({
                    expr: value.trim(),
                    type: 'JS'
                });
            }
        }

        str = str.slice(index + CLOSE_TAG.length);
    }while(str.length)

    return ret;
}

function render(str) {
    var tokens = tokenize(str),
        ret = ['var __data__ = []'];
    
    for (var i = 0, l = tokens.length, token; i < l; i++){
        token = tokens[i];

        if (token.type === 'TEXT') {
            ret.push(addToData(quote(token.expr)));
        }else if (token.type === 'LOGIC'){
            ret.push(addPrefix2(token.expr))
        }else {
            ret.push(addToData(addPrefix2(token.expr)));
        }
    }

    ret.push('return __data__.join("")');

    return new Function('data', ret.join('\n'));
}