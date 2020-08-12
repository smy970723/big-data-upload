<template>
  <div class="about">
    <el-button style="display: block" @click="clickInputFile" type="primary" size="small">选择文件</el-button>
    <input type="file" name="file" ref="fileUpload" @change="responseChange()" style="display: none">
    <br>
    <el-alert title="上传文件分块大小为 5MB" type="info" show-icon :closable="false"></el-alert>
    <el-table :data="tableData" border style="width: 100%">
      <el-table-column prop="name" label="文件名称"></el-table-column>
      <el-table-column prop="size" label="文件大小"></el-table-column>
      <el-table-column prop="chunks" label="所分块数">
        <template slot-scope="scope">
          <span>{{scope.row.chunks === -1 ?'正在计算分块数...':scope.row.chunks}}</span>
        </template>
      </el-table-column>
      <el-table-column prop="md5" label="md5">
        <template slot-scope="scope">
          <span>{{scope.row.md5 === -1 ?'正在计算md5...':scope.row.md5}}</span>
        </template>
      </el-table-column>
      <el-table-column prop="hasUploaded" label="进度">
        <template slot-scope="scope">
          <el-progress :text-inside="true" :stroke-width="18" :percentage="scope.row.hasUploaded" v-if="scope.row.hasUploaded>=0" :color="parseInt(scope.row.hasUploaded) == 100 ? '#5cb87a':'#1989fa'"></el-progress>
          <span v-else>正在查看进度</span>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="操作" width="200">
        <template slot-scope="scope">
          <div v-if="parseInt(scope.row.hasUploaded) != 100 && scope.row.hasUploaded>=0">
            <el-button @click="upLoadChunks({row:scope.row,index:scope.$index})" type="primary" size="small" :loading="scope.row.uploadLoading" >上传</el-button>
            <el-button type="danger" @click="stopUpLoadChunks({row:scope.row,index:scope.$index})" size="small">暂停</el-button>
          </div>
          <div v-if="parseInt(scope.row.hasUploaded) == 100">
            <span>已经上传完毕</span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script>
    import SparkMD5 from 'spark-md5'
    export default {
        name:'big-data-upload',
        props:{
            checkFileMd5Url:{
                type:String,
                default:'/api/BigFile/getChunksByMd5'
            },
            uploadUrl:{
                type:String,
                default: '/api/BigFile/upload'
            }
        },
        data () {
            return {
                chunkSize : 5 * 1024 * 1024,
                fileSize : 0,
                file : null,
                hasUploaded : 0,
                chunks :0,
                fileList: [],
                thisMd5:'',
                tableData:[]
            }
        },
        methods: {
            //点击触发上传
            clickInputFile(){
                this.$refs.fileUpload.click()
            },
            //点击得到文件
            async responseChange(){
                let fileList= this.$refs.fileUpload.files
                if (fileList.length === 0){
                    this.$message.info('并未选择文件！')
                    return
                }else{
                    //  得到此文件的MD5 以及是否上传过 得到传递进度
                    console.log(fileList)
                    let  file = fileList[0]
                    let tableItem = {name:file.name,
                        size:file.size,
                        chunks:-1,
                        md5:-1,
                        hasUploaded:-1,
                        currentChunk:-1,
                        upload:false,
                        uploadLoading:false}
                    this.tableData.push(tableItem)
                    let {md5,chunks} = await this.md5File(file)
                    this.$set(this.tableData,this.tableData.length-1,{...tableItem,chunks:chunks,md5:md5})
                    let result = await this.checkFileMD5(md5)
                    let hasUploaded = 0
                    let chunk = 0
                    if(result.flag){
                        hasUploaded = 0
                    }else{
                        //  计算百分比
                        chunk = result.chunk
                        hasUploaded = (result.chunk*1.0/chunks*1.0)*100
                    }
                    this.$set(this.tableData,this.tableData.length-1,{...tableItem,chunks:chunks,md5:md5,hasUploaded:hasUploaded,currentChunk:chunk})
                    this.fileList.push(file)
                }
            },
            //点击上传
            async upLoadChunks({row,index}){
                this.$set(this.tableData,index,{...row,uploadLoading:true,upload:true})
                row = {...row,uploadLoading:true,upload:true}
                await this.checkAndUploadChunk(index)
            },
            //进行停止
            stopUpLoadChunks({row,index}){
                console.log('stopUpLoadChunks')
                this.$set(this.tableData,index,{...row,uploadLoading:false,upload:false})
            },
            // MD5
            md5File(file) {
                return new Promise((resolve, reject) => {
                    try {
                        let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
                            chunkSize = this.chunkSize, // Read in chunks of 2MB
                            chunks = Math.ceil(file.size / chunkSize),
                            currentChunk = 0,
                            spark = new SparkMD5.ArrayBuffer(),
                            fileReader = new FileReader();
                        fileReader.onload = function (e) {
                            console.log('read chunk nr', currentChunk + 1, 'of', chunks);
                            spark.append(e.target.result); // Append array buffer
                            currentChunk++;
                            if (currentChunk < chunks) {
                                loadNext();
                            } else {
                                console.log('finished loading');
                                let result = spark.end()
                                let params = {
                                    md5:result,
                                    chunks:chunks
                                }
                                resolve(params)
                            }
                        };

                        fileReader.onerror = function () {
                            console.warn('oops, something went wrong.');
                        };

                        const  loadNext = function() {
                            var start = currentChunk * chunkSize,
                                end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

                            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
                        }
                        loadNext();
                    }catch (e) {
                        console.log(e)
                        reject(e)
                    }
                })
            },
            // 校验文件的MD5
            checkFileMD5(fileMd5Value) {
                return new Promise((resolve, reject) => {
                    this.$axios.post(this.checkFileMd5Url, {md5: fileMd5Value}
                    ).then(res =>{
                        resolve(res.data)
                    })
                        .catch(function (error) {
                            console.log(error);
                            reject(error)
                        });
                })
            },
            // 上传chunks
            async checkAndUploadChunk(index) {
                let {size,currentChunk,md5} = this.tableData[index]
                console.log(this.tableData[index])
                console.log('checkAndUploadChunk',size,this.chunkSize)
                let chunks = Math.ceil(size / this.chunkSize)
                console.log(chunks)
                let hasUploadedChunk = currentChunk
                for (let i = currentChunk; i < chunks; i++) {
                    console.log(i)
                    let upload = this.tableData[index].upload
                    if(upload){
                        let resUpload = await this.upload(i, md5,index)
                        console.log(resUpload)
                        hasUploadedChunk++
                        let newhasUploaded = (hasUploadedChunk*1.0/chunks*1.0)*100
                        //展示进度
                        this.$set(this.tableData,index,{...this.tableData[index],hasUploaded:newhasUploaded,currentChunk:hasUploadedChunk})
                    }else{
                        break
                    }
                }
            },

            // 上传chunk
            upload(i, fileMd5Value,index) {
                return new Promise((resolve, reject) => {
                    //构造一个表单，FormData是HTML5新增的
                    const file = this.fileList[index]
                    let {chunks} = this.tableData[index]

                    let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
                    let end = (i + 1) * this.chunkSize >= file.size ? file.size : (i + 1) * this.chunkSize
                    let fileItem = blobSlice.call(file,i * this.chunkSize, end)

                    let formData=new FormData();
                    formData.append('md5',fileMd5Value)
                    formData.append('size',file.size)
                    formData.append('chunks',chunks)
                    formData.append('chunk',i)
                    formData.append('file',fileItem)
                    this.$axios.post(this.uploadUrl,formData,{
                        'Content-Type':'multipart/form-data'
                    })
                        .then(res =>{
                            resolve(res)
                        }).catch(function (error) {
                        console.log(error);
                        reject(error)
                    });
                })
            },
        }

    }
</script>
<style lang="css" scoped>
  .about{
  }
</style>

