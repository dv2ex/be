# dv2ex 的后端代码

## 独立使用
  
`
  npm install -g dv2ex
  dv2ex [前端代码的ipfs或者ipns路径]
`  

打开浏览器，访问 http://192.168.xxx.xxx:4698，你应该可以看到欢迎页面


## 作为nodejs模块引入

`
  npm install dv2ex
  const serve = require('dv2ex')
  serve.start(4698, '0.0.0.0')
`

这种方式将不会引入任何前端代码