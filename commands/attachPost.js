const uuid = require("uuid").v4;
const { Blob } = require("node:buffer");

/**
 * 给某个帖子添加附件，附件可以是图片、音频或者视频格式
 * 会粘贴在帖子文件夹里
 * 参数1 用户的uuid
 * 参数2 帖子的uuid
 * 参数3 附件的路径或者附件的binary内容
 *
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs } = ctx;
  let [userid, postid, attachments] = ctx.jsonrpc.params;
  const base = require("config").get("mfsbase");
  const cids = [];
  for (let attachment of attachments) {
    const { path, binary } = attachment;
    const attachmentPath = `${base}/${userid}/posts/${postid}/${uuid()}`;
    let cid;
    if (path) {
      const stream = require("fs").createReadStream(path);
      const result = await ipfs.add({ content: stream });
      cid = result.cid;
    } else {
      const result = await ipfs.add({ content: dataURItoBlob(binary) });
      cid = result.cid;
    }
    await ipfs.files.cp(`/ipfs/${cid}`, attachmentPath);
    cids.push(cid.toString());
  }
  return cids;
};

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}
