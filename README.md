smartyTpl
=========

##### 前后端共用smarty模板的一种解决方案。

遇到场景：首屏数据通过后端渲染后整个输出，后续交互再异步获取数据重新渲染这部分区域。这样就会有两部分的开发：后端模板和前端模板的编写，前后端两套模板的出现会导致开发成本提高，并且后续维护复杂。

解决思路：通过工具转化后端语法，让其可以产生前端可用模板。

##### `smartyTpl` 具体用法如下：

##### 1、处理前后端公共模板

抽取模板到tpl文件中，文件头部添加 `{%literal%}`，尾部添加 `{%/literal%}`，目的是阻止smarty语法解析。

````
    {%literal%}
        <!--没有产品的情况-->
        {%if $tplData.count == 0%}
        <li class="list-item no-list-item">
            <div class="cry-face"></div>抱歉，没有找到符合的信用卡产品，再挑挑看吧：）
        </li>
        {%/if%}

        <!--页面在如的时候初始化列表数据-->
        {%foreach from=$tplData.list item=item%}
            ...
        {%/foreach%}
    {%/literal%}
````


##### 2、引入模板

###### 1）smarty模板

因tpl已添加`literal`标签，用传统的include引入文件方式后端不会解析，需要利用include从字符串方式让smarty模板可以解析。

````
    {%include file="./result.tpl" assign="tpl_string"%} 
    {%include file="string:$tpl_string"%}
````
  
###### 2）前端模板    

直接新建一个type=text/template的script标签，用传统的include方式引入放入标签中。

````
    <script id="result-tpl" type="text/template">    
        {%include file="./result.tpl"%} 
    </script>
````
    
##### 3、使用前端模板

````
    var smartyTpl = require('smartyTpl');
    smartyTpl.format('result-tpl', {
        tplData: data,
        feRoot: root
    }， 'result-list');
````
