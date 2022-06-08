const { listPosts, listComment, loadAuthor } = require("../db");
/**
 * 用户可能从各种地方得到新的帖子，比如1、收到广播消息
 * 2、同步follow的用户时同步到它创建的帖子
 * 3、同步用户评论的时候同步到评论对应的帖子
 * 4、同步follow的用户follow的用户时候同步到他们创建的帖子
 *
 * 无论哪种方式得到新的帖子，都会存在本地的pounchDB中，这个api从这个db中获取
 * 所有的帖子列表
 * 参数1 分页页码
 *
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { log } = ctx;
  let [page] = ctx.jsonrpc.params;
  const posts = await listPosts(page);
  for (let post of posts.rows) {
    post.comments = await listComment(post.ipns);
    post.author = await loadAuthor(post.author);
  }
  return posts;
};
