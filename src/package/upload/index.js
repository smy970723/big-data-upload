import bigDataUpload from './big-data-upload'
bigDataUpload.install = (Vue) =>{
  Vue.component(bigDataUpload.name,bigDataUpload)
}
export default bigDataUpload
