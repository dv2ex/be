const { loadJSON } = require("../ipfs");
/**
 * 用户可以创建多个Planet并且可以任意切换到某个Planet
 * 每个Planet有一个自己的key，对应到一个 MFS 文件夹
 * 这个文件夹中一定有一个meta.json存储这个用户的信息，
 * 一个follows.json 代表这个用户关注的用户的列表(ipns)
 *
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs, log } = ctx;
  let users = [];
  const base = require("config").get("mfsbase");
  try {
    for await (const file of ipfs.files.ls(base)) {
      if (file.type === "directory") {
        try {
          const usermeta = await loadJSON(`${base}/${file.name}/meta.json`);
          users.push(usermeta);
        } catch (ex) {
          log.error({ error: ex, path: file.name }, "load user meta fail");
        }
      }
    }
  } catch (ex) {
    log.error({ error: ex.toString() }, "list user got error");
    return [];
  }
  return users;
};
