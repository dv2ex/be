const { saveUser2DB } = require("../db");
const uuid = require("uuid").v4;

/**
 * 添加一个新用户，初始化目录结构，新建一个uuid，创建一个key，返回用户的uuid，
 * 参数，用户的用户名
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  const { ipfs, log } = ctx;
  const id = uuid();
  const [nickname] = ctx.jsonrpc.params;
  const base = require("config").get("mfsbase");
  try {
    await ipfs.files.stat(base);
  } catch (ex) {
    await ipfs.files.mkdir(base);
  }
  try {
    const key = await ipfs.key.gen(`user-${id}`);
    await ipfs.files.mkdir(`${base}/${id}/posts`, {
      parents: true,
    });
    await ipfs.files.write(
      `${base}/${id}/comments.json`,
      new TextEncoder().encode(JSON.stringify([])),
      { create: true }
    );
    const json = {
      nickname,
      userid: id,
      ipns: key.id,
      createat: new Date().getTime(),
    };
    await ipfs.files.write(
      `${base}/${id}/meta.json`,
      new TextEncoder().encode(JSON.stringify(json)),
      { create: true }
    );
    log.debug("create new user", nickname, "return", json);
    await saveUser2DB(json);
    return json;
  } catch (e) {
    await ipfs.files.rm(`${base}/${id}`, { recursive: true });
    throw e;
  }
};
