'use strict';

import SparkMD5 from 'spark-md5'

export default function (fileItem, callback) {
  var  blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
      file = fileItem,
      chunkSize = 2097152,                             // Read in chunks of 2MB
      chunks = Math.ceil(file.size / chunkSize),
      currentChunk = 0,
      spark = new SparkMD5.ArrayBuffer(),
      fileReader = new FileReader();
  fileReader.onload = function (e) {
    console.log('read chunk nr', currentChunk + 1, 'of', chunks);
    spark.append(e.target.result);                   // Append array buffer
    currentChunk++;

    if (currentChunk < chunks) {
      loadNext();
    } else {
      callback(null, spark.end());
      console.log(spark)
      console.log('finished loading');
    }
  };

  fileReader.onerror = function () {
    callback('oops, something went wrong.');
  };

  function loadNext() {
    var start = currentChunk * chunkSize,
        end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
    try {
      console.log('loadNext',file, start, end)
      console.log(blobSlice)
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }catch (e) {
      console.log(e)
    }
  }

  loadNext();
}

