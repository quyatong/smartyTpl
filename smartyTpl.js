/*
 * 用于前端使用的smarty template
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * path: smartyTpl.js
 * author: quyatong(quyatong@baidu.com)
 * date: 2013/10/09
 */

define(function(require) {

    // 使用的template组件，
    var template = require('./template');

    // 配置
    var config = {
        leftToken: '\{%',
        rightToken: '%\}',
        tplLeftToken: '<%',
        tplRightToken: '%>'
    };

    /**
     * 避免使用第三方基础类库
     * 只添加了用到的一些函数
     * @type {Object}
     */
    var utils = {
        array: {
            indexOf: function (source, match, fromIndex) {
                var len = source.length;
                var iterator = match;
                    
                fromIndex = fromIndex | 0;

                if(fromIndex < 0){//小于0
                    fromIndex = Math.max(0, len + fromIndex)
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
                        //此处实现和标准不符合，标准中是这样说的：
                        //If a thisObject parameter is provided to forEach, 
                        //it will be used as the this for each invocation 
                        //of the callback. If it is not provided, or is null, 
                        //the global object associated with callback is used instead.
                        returnValue = iterator.call(thisObject || source, item, i);
                        if (returnValue === false) {
                            break;
                        }
                    }
                }
                return source;
            };
        }
    }

    // 标示符列表
    var IDENTIFIERS = [
        'if',
        'else',
        'foreach',
        'section',
        'assign'
    ];

    // 这个cache是为了把smarty的模板缓存起来
    var cache = {};

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
            return operand;
        },
        highlight: function (operand, params) {
            return operand;
        },
        strpos: function (operand, params) {
            return '((' + operand + ' + \'\').indexOf(' + params[0] + ') >= 0)';
        },
        count: function (operand, params) {
            return operand + '.length';
        },
        is_array: function (operand, params) {
            return '((typeof ' + operand + ') == "object")';
        }
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
                    return plugIns[funcName](operand, funcParams);
                }
            );
        }
        else {
            utils.array.each(params, function (item) {
                var arr = item.split(/\s*\:\s*/g);
                var funcName = arr[0];
                arr.shift();
                var funcParams = arr;
                operand = plugIns[funcName](operand, funcParams);
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

            var attrs = kv2objs(expression);
            var item = attrs['item'];
            var from =  attrs['from'];

            return [
                'for (',
                    'var ' + item + 'Index = 0,',
                    item + ' = ' + from + '[' + attrs['item'] + 'Index]' + '; ',
                    item + 'Index < ' + from + '.length,',
                    item + ' = ' + from + '[' + attrs['item'] + 'Index]' + '; ',
                    item + 'Index++',
                ') {'
            ].join('');
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
            return '=' + calculate(expression);
        },        
        'if': function (expression) {
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
    var compile = function (id) {
        var tpl = document.getElementById(id).innerHTML;
        var tokenReg = new RegExp(
            config.leftToken 
            + '\\s*(.*?\\s*)\\s*' 
            + config.rightToken, 'g'
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
                if (/^[$.a-zA-Z0-9|()].*$/g.test(expression)) {
                    identifier = 'print';
                    operationExpression = expression;
                }
                // 如果是结束符号
                else if (/^\/.*/.test(expression)) {
                    identifier = 'end';
                    operationExpression = '}';
                }
                // 计算表达式
                else {
                    identifier = 'calc';
                    operationExpression = expression;
                }
            }

            operationExpression = operationExpression.replace(/\$/g, '');

            return config.tplLeftToken 
                + handler[identifier](operationExpression)
                + config.tplRightToken;
        });
        cache[id] = tpl;

        // 从dom中去掉这个script 标签
        document.body.removeChild(document.getElementById(id));
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
        var tpl = cache[scriptId] ? cache[scriptId] : compile(scriptId);

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