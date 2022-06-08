const { loadPost } = require("../ipfs");
/**
 * 请求参数: 1 用户名
 * 获取某个用户的所有帖子
 * 这个api用于展示某个用户原创的帖子列表，来源事ipfs的mfs文件系统
 * 用户可以修改这个列表中的帖子的内容，重新更新帖子的ipns
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs, log } = ctx;
  let [userid] = ctx.jsonrpc.params;
  const base = require("config").get("mfsbase");
  const userbase = `${base}/${userid}`;
  let posts = [];
  for await (const post of ipfs.files.ls(`${userbase}/posts/`)) {
    if (post.type === "directory") {
      try {
        const meta = await loadPost(userid, post.name);
        posts.push(meta);
      } catch (ex) {
        log.error("error when list post", ex);
      }
    }
  }
  return posts;
};
