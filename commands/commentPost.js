const { loadJSON, userid2ipns } = require("../ipfs");
const { saveComment2DB } = require("../db");
/**
 * 评论某个帖子
 *
 * 参数1：用户的uuid
 * 参数2: 帖子的ipns
 * 参数3: 评论的meta.json 评论会被保存在用户根目录下的 comments.json 里
 *
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs, log } = ctx;
  const [userid, ipns, parent, meta] = ctx.jsonrpc.params;
  const author = await userid2ipns(userid);
  const base = require("config").get("mfsbase");
  const json = await loadJSON(`${base}/${userid}/comments.json`);
  const comment = {
    ...meta,
    post: ipns,
    parent,
    author,
    updateat: new Date().getTime(),
  };
  json.push(comment);
  await ipfs.files.write(
    `${base}/${userid}/comments.json`,
    new TextEncoder().encode(JSON.stringify(comment))
  );
  await saveComment2DB(comment);
};
