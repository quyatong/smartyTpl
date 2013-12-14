smartyTpl
=========

#####这个工具是Smarty模板在前端使用的一种解决方案。

开发前端时，为了防止页面抖动，会在页面加载的时候用 `Smarty` 后端渲染技术先产生首屏的结果页，然后翻页或者筛选，通过 `Ajax` 获取后端数据后继续渲染页面。一般的做法是，首屏通过 `Smarty` 语法写一遍，然后在前端添加script的前端模板，利用一些模板引擎，例如 `handlebars`, `ejs`, `artTemplate`, 来script模板进行数据渲染，这样就导致了一个页面中也写两份模板，一份是 `Smarty模板`，一份是 `script模板`，而且两份模板结构类似，只是语法不同，通过实际开发会发现同时维护两套模板是非常浪费时间的，还容易出错。

#####`smartyTpl` 就是为了防止一个页面出现两个模板做出来的一套工具。具体用法如下：

> 1、需要将前端模板和smarty模板渲染重复的一部分提取到一个tpl文件(例如：result.tpl)中，然后头部添加 `{%literal%}`, 尾部添加 `{%/literal%}`,这样做是为了引入文件的时候按照字符串来引，而不解析。

> 2、smarty模板解析部分只需要向如下方式引入，这样写的目的是为了让 `literal` 标签导致tpl不解析而执行让tpl可以在smarty需要解析的地方解析。    

````
    {%include file="./result.tpl" assign="template_string"%} 
    {%include file="string:$template_string"%}
````
  
> 3、创建script标签    

````
    <script id="result-tpl" type="text/template">    
        {%include file="./result.tpl"%} 
    </script>
````
    
> 4、需要用前端模板渲染的时候只需要调用：

````
    var smartyTpl = require('smartyTpl');
    smartyTpl.format('result-tpl', {
        tplData: data,
        feRoot: root
    }, 'result-list');
````
