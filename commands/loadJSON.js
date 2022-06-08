const { loadJSON } = require("../ipfs");
/**
 * 以json格式返回某个ipfs/ipns的路径内容
 *
 * @param {*} ctx
 */
module.exports = async (ctx) => {
  let [path] = ctx.jsonrpc.params;
  return await loadJSON(path);
};
