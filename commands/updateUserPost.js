const uuid = require("uuid").v4;
const { publishPost, userid2ipns } = require("../ipfs");
const { savePost2DB } = require("../db");
/**
 * 参数1: 用户的uuid，参数2: 帖子的uuid 参数3: 帖子的 meta.json
 * 如果用户的uuid为空，返回错误
 * 如果帖子的uuid为空，创建一个新的帖子
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs, log } = ctx;
  let [userid, postid, post] = ctx.jsonrpc.params;
  const author = await userid2ipns(userid);
  if (!author) {
    log.error("unknown user", userid);
    throw new Error("501");
  }
  const base = require("config").get("mfsbase");
  let target = `${base}/${userid}/posts/${postid}`;
  if (!postid) {
    postid = uuid();
    target = `${base}/${userid}/posts/${postid}`;
    await ipfs.files.mkdir(target, { parent: true });
    const ipns = await ipfs.key.gen(`post-${userid}-${postid}`);
    post = { ...post, ipns: ipns.id, postid, author };
    log.debug("new post with id", postid, "ipns", ipns.id);
    await ipfs.files.write(
      `${target}/comments.json`,
      new TextEncoder().encode(JSON.stringify({})),
      { create: true }
    );
  }
  post = { ...post, updateat: new Date().getTime() };
  await ipfs.files.write(
    `${target}/meta.json`,
    new TextEncoder().encode(JSON.stringify(post)),
    { create: true }
  );
  if (!post.draft) {
    //不等 publish 结束因为 publish 可能需要较长时间并且也可能失败
    publishPost(userid, post).catch((ex) => {
      log.info("publish ipns fail", ex);
    });
  }
  const statPost = await ipfs.files.stat(
    `${base}/${userid}/posts/${post.postid}`
  );
  post.cid = statPost.cid.toString();
  await savePost2DB(post);
  return post;
};
