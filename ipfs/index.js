const IPFS = require("ipfs-core");
const uint8ArrayConcat = require("uint8arrays/concat").concat;

let ipfs;

async function userid2ipns(userid) {
  const keys = await ipfs.key.list();
  for (let key of keys) {
    if (key.name === `user-${userid}`) {
      return key.id;
    }
  }
}

async function init(options = {}) {
  ipfs = await IPFS.create(options);
  return ipfs;
}

async function publishUser(userid) {
  const base = require("config").get("mfsbase");
  const statUser = await ipfs.files.stat(`${base}/${userid}`);
  await ipfs.name.publish(statUser.cid, { key: `user-${userid}` });
}

async function publishUserPost(userid, postid) {
  const base = require("config").get("mfsbase");
  const statPost = await ipfs.files.stat(`${base}/${userid}/posts/${postid}`);
  await ipfs.name.publish(statPost.cid, {
    key: `post-${userid}-${postid}`,
  });
}

/**
 * 广播用户的时候，只需要广播最基础的信息，就是你的ipns是什么
 * 理论上，用户可以通过你的ipns获取到你cid，从而获取到你的meta和你的post
 * @param {*} userid
 */
async function broadcastBody(userid) {
  const ipns = await userid2ipns(userid);
  return ipns;
}

async function broadcast(userid) {
  const body = await broadcastBody(userid);
  await ipfs.pubsub.publish("dv2ex-user", JSON.stringify(body));
}

async function publishPost(userid, post) {
  await publishUser(userid);
  await publishUserPost(userid, post.postid);
  await broadcast(userid);
}

async function loadJSON(path) {
  const chunks = [];
  for await (const chunk of ipfs.files.read(path)) {
    chunks.push(chunk);
  }
  const str = new TextDecoder().decode(uint8ArrayConcat(chunks));
  return JSON.parse(str);
}

async function loadPost(userid, postid) {
  const base = require("config").get("mfsbase");
  return loadJSON(`${base}/${userid}/posts/${postid}/meta.json`);
}

module.exports = {
  init,
  publishPost,
  userid2ipns,
  loadPost,
  loadJSON,
};
