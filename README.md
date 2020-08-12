### 大文件端点续传页面
**引入**
```
npm install big-data-upload
```
**项目中使用**

main.js 中
```
import bigDataUpload from 'big-data-upload'
Vue.use(bigDataUpload)
```

要引入的页面中
`uploadUrl:后台保存文件的路径，checkFileMD5Url:检查文件md5的路径`
```
<big-data-upload :upload-url="uploadUrl" :checkFileMD5Url="checkFileMD5Url"></big-data-upload>
```
