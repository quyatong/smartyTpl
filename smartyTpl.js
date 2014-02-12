/**
 * @file 用于前端使用的smarty template
 * @author quyatong(quyatong@baidu.com)
 */

define(function(require) {

    // 使用的template组件，
    var template = require('./template');

    // 配置
    var CONFIG = {
        leftToken: '{%',
        rightToken: '%}',
        tplLeftToken: '<%',
        tplRightToken: '%>'
    };

    // smarty 中的运算符号转义成js中的运算符号
    var EXP_ESCAPE_MAP = {
        'neq': '!=',
        'ne': '!=',
        'eq': '==',
        'gt': '>',
        'lt': '<',
        'gte': '>=',
        'ge': '>=',
        'lte': '<=',
        'le': '<=',
        'and': '&&',
        'not': '!',
        'or': '||'
    };
    
    // 模板缓存（避免下次从新编译）
    var cache = {};

    /**
     * 避免使用第三方基础类库
     * 只添加了用到的一些函数
     * @type {Object}
     */
    var utils = {
        array: {
            indexOf: function (source, match, fromIndex) {
                var len = source.length;
                    
                fromIndex = fromIndex | 0;

                if(fromIndex < 0){//小于0
                    fromIndex = Math.max(0, len + fromIndex);
                }

                for ( ; fromIndex < len; fromIndex++) {
                
                    if(fromIndex in source && source[fromIndex] === match) {
                
                        return fromIndex;
                    }
                }
                
                return -1;
            },
            contains: function(source, obj) {
                return (utils.array.indexOf(source, obj) >= 0);
            },
            each: function (source, iterator, thisObject) {
                var returnValue;
                var item;
                var i;
                var len = source.length;
                
                if ('function' == typeof iterator) {
                    for (i = 0; i < len; i++) {
                        item = source[i];
                        // 此处实现和标准不符合，标准中是这样说的：
                        // If a thisObject parameter is provided to forEach, 
                        // it will be used as the this for each invocation 
                        // of the callback. If it is not provided, or is null, 
                        // the global object associated 
                        // with callback is used instead.
                        
                        returnValue = iterator.call(
                            thisObject || source, item, i
                        );
                        
                        if (returnValue === false) {
                            break;
                        }
                    }
                }
                return source;
            }
        }
    };

    // 标示符列表
    var IDENTIFIERS = [
        'if',
        'else',
        'foreach',
        'section',
        'assign'
    ];

    /**
     * 类似于 "a=1 b=2"格式的字符串转变为 对象：{a: 1, b: 2} 
     * @param  {string} expression 表达式
     * @return {Object}            转变后的对象
     */
    var kv2objs = function (expression) {
        var arr = expression.split(/\s+/);
        var obj = {};
        utils.array.each(arr, function(item) {
            var key = item.split('=')[0];
            var value = item.split('=')[1];

            obj[key] = (value && value.replace(/\$/g, ''));
        });
        return obj;
    };

    /**
     * 插件函数枚举（用于处理相关函数）
     * @type {Object}
     */
    var plugIns = {
        escape: function (operand, params) {
            
            return operand + '&&' + operand + '.toString()';
        },
        highlight: function (operand, params) {
            
            return operand + '&&' + operand + '.toString()';
        },
        strpos: function (operand, params) {
            
            return '((' + operand + ' + \'\').indexOf(' + params[0] + ') >= 0)';
        },
        count: function (operand, params) {
            
            return operand + '.length';
        },
        'is_array': function (operand, params) {
            
            return '((typeof ' + operand + ') == "object")';
        },
        isset: function (operand, params) {
            
            // js实现isset函数 
            var isset = function (param, paramsText) {

                var currentUsed = param;
                var vars = paramsText.split('.');
                var last = vars.pop();
                vars.shift();

                for (var i = 0; i < vars.length; i++) {
                    currentUsed = currentUsed[vars[i]];
                }

                if (currentUsed.hasOwnProperty(last)) {
                    return true;
                } 
                else {
                    return false;
                }
            };
            var vars = operand.split('.');

            return '(' + isset.toString().replace(/\s\s+/g, '')  + ')(' 
                + vars[0] 
                + ', "' 
                + operand 
                + '")';
        },
        empty: function (operand, params) {
            var empty = function (param) {
                if (
                    param === 0 
                    || param === '0' 
                    || param === '' 
                    || param === null 
                    || param === undefined
                ) {
                    return true;
                }
                else {
                    return false;
                }
            };

            return '(' 
                + empty.toString().replace(/\s\s+/g, '') 
                + ')'
                + '(' + operand + ')';
        },
        'default': function (operand) {
            return '(' + operand + ')';
        }
    };

    /**
     * 插件代理函数
     * @param  {string} func    插件名称
     * @param  {string} operand 操作数
     * @param  {string} params  传入的参数
     * @return {string}         转换之后的字符串
     */
    var plugInProxy = function (func, operand, params) {
        operand = operand.replace(/@/g, '.__');
        (!plugIns[func]) && (func = 'default');
        
        return plugIns[func](operand, params);
    };

    /**
     * 计算表达式
     * @param  {string} expression 表达式字符串
     * @return {string}            计算后的表达式
     */
    var calculate = function (expression) {
        var params = expression.split(/\s*\|\s*/g);
        var operand = params.shift();

        if (/([a-zA-Z0-9_]*)\s*\((.*?)\)/g.test(operand)) {
            operand = operand.replace(
                /([a-zA-Z0-9_]*)\s*\((.*?)\)/g, 
                function (exp, funcName, funcParamsStr){
                    var funcParams = funcParamsStr.split(/\s*,\s*/);
                    var operand = funcParams.shift();

                    return plugInProxy(funcName, operand, funcParams);
                }
            );
        }
        else {
            utils.array.each(params, function (item) {
                var arr = item.split(/\s*\:\s*/g);
                var funcName = arr[0];
                arr.shift();
                var funcParams = arr;
                operand = plugInProxy(funcName, operand, funcParams);
            });
        }
        return operand;
    };

    /**
     * 常用tag处理工具集
     * @type {Object}
     */
    var handler = {
        'foreach': function (expression) {
            var from;
            var item;
            var key;

            if (/([^\s]*)\s+as\s+([^\s]*)/g.test(expression)) {

                from =  RegExp.$1;
                item = RegExp.$2;
                if (/([^\s]*)\s*==>\s*([^\s]*)/g.test(item)) {
                    key = RegExp.$1;
                    item = RegExp.$2;
                } 
            }
            else {
                var attrs = kv2objs(expression);
                from =  attrs['from'] 
                    ? attrs['from'].replace(/['"]/g, '') 
                    : undefined;
                item = attrs['item'] 
                    ? attrs['item'].replace(/['"]/g, '') 
                    : undefined;
                key = attrs['key'] 
                    ? attrs['key'].replace(/['"]/g, '') 
                    : undefined;
            }

            var convert = function (ii) {
                if (typeof ii != 'object') {
                    return {
                        toString: function () {
                            return ii;
                        },
                        toValue: function () {
                            return ii;
                        }
                    };
                }
                else {
                    return ii;
                }
            };

            var text = [
                'for (',
                    'var ' + item + 'Index = 0, ',
                    item + ' = ' + from + '[' + item + 'Index]',
                    ((key !== undefined) ? (','+ key + ' = 0') : ''),
                    ';',
                    '(' + item + 'Index < ' + from + '.length)',
                    ' && ((' + item + ' = '
                        + from + '[' + item + 'Index]) || true)',
                    ' && (' + item + ' = '
                        + '(' + convert.toString().replace(/\s\s+/g, '') 
                        + '(' + item + ')))',
                    ' && ((' + item + '.__index = ' + item + 'Index) || true)',
                    ' && ((' + item + '.__first = ' + from + '[0] ) || true)',
                    ' && ((' + item + '.__last = ' 
                        + from + '[' + from + '.length - 1] ) || true)',
                    ';',
                    item + 'Index++',
                    ((key !== undefined) ? (', ' + key + '++') : ''),
                ') {'
            ].join('');
            return text;
        },
        'section': function (expression) {
            var attrs = kv2objs(expression);

            return [
                'for (',
                    'var ' + attrs['name'] + ' = 0;',
                     attrs['name'] + ' < ' + attrs['loop'] + '.length;',
                     attrs['name'] +'++',
                ') {'
            ].join('');
        },
        'assign': function (expression) {
            var attrs = kv2objs(expression);
            return (
                'var ' 
                + attrs['var'].replace(/["']/g,'') 
                + ' = ' 
                + attrs['value'] + ';'
            );
        },
        'calc': function (expression) {
            return calculate(expression) + ';';
        },
        'print': function (expression) {
            return '=' + calculate(expression) + '.toString()';
        },        
        'if': function (expression) {
            var tokens = [];
            for (var key in EXP_ESCAPE_MAP) {
                tokens.push(key);
            }

            expression = expression.replace(
                new RegExp('\\s+(' + tokens.join('|') + ')\\s+', 'g'), 
                function (match, token) {
                    return EXP_ESCAPE_MAP[token];
                }
            );
            
            return 'if (' + calculate(expression) + ') {';
        },
        'else': function (expression) {
            return '} else {';
        },
        'elseif': function (expression) {
            return '} else if (' + calculate(expression) + ') {';
        },
        'end': function (expression) {
            return '}';
        }
    };

    /**
     * 编译smarty模板
     * @param  {string} id 模板的id
     * @return {string}    编译模板产生的模板字符串
     */
    var compile = function (tpl) {
        var tokenReg = new RegExp(
            CONFIG.leftToken 
            + '\\s*(.*?\\s*)\\s*' 
            + CONFIG.rightToken, 'g'
        );

        // strip 处理
        tpl = tpl.replace(
            /\{%\s*strip\s*%\}([\s\S]*)?\{%\s*\/\s*strip\s*%\}/g, 
            function (match, expression) {
                return expression;
            }
        );

        
        tpl = tpl.replace(tokenReg, function(match, expression) {

            // 标识符
            var identifier = utils.array.contains(
                IDENTIFIERS,
                expression.split(/\s+/g)[0]
            ) ? expression.split(/\s+/g)[0] : '';
            var operationExpression = '';

            // 如果有标识符，选择相应的处理程序
            if (identifier) {
                var tokens = expression.split(/\s+/g);
                tokens.shift();
                operationExpression = tokens.join(' ');
            }                             
            // 如果没有标识符，得区分是否是输出表达式、结束符号、计算表达式
            else {
                // 输出表达式
                if (/^[$.a-zA-Z0-9|()]*$/g.test(expression)) {
                    
                    identifier = 'print';

                    if (expression == 'break') {
                        identifier = 'break';
                    }

                    operationExpression = expression;
                }
                // 如果是结束符号
                else if (/^\/.*/.test(expression)) {
                    identifier = 'end';
                    operationExpression = '}';
                }
                // 计算表达式
                else if (/=/.test(expression)) {
                    identifier = 'calc';
                    operationExpression = expression;
                }
                else {
                    identifier = 'print';
                    operationExpression = expression;
                }
            }

            operationExpression = operationExpression.replace(/\$/g, '');
            operationExpression = operationExpression.replace(/@/g, '.__');

            return CONFIG.tplLeftToken 
                + (
                    handler[identifier] 
                    ? handler[identifier](operationExpression) 
                    : ''
                )
                + CONFIG.tplRightToken;
        });
        return tpl;
    };

    /**
     * 使用数据产生HTML片段
     * @param  {string} scriptId    script标签的id（带smarty模板文件的）
     * @param  {string} data        需要渲染的数据
     * @param  {string} containerId 生成HTML片段后需要塞入的dom元素
     * @return {string}             生成的HTML片段
     */
    var format = function (scriptId, data, containerId) {

        // 如果缓存中没有开始编译
        if (!cache[scriptId]) {

            var scriptContent = document.getElementById(scriptId).innerHTML;
            
            cache[scriptId] = compile(scriptContent);
            // 从dom中去掉这个script 标签
            document.body.removeChild(document.getElementById(scriptId));
        }

        // 取到要选择的片段
        var tpl = cache[scriptId];

        // 塞入html中
        document.getElementById(
            containerId
        ).innerHTML = template.render(
            {
                id: scriptId,
                tpl: tpl
            },
            data
        );
    };

    return {
        format: format
    };
});