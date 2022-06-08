const bunyan = require("bunyan");
const PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-adapter-memory"));

const commands = require("../commands");

const { init } = require("../ipfs");
const db = require("../db");

let ctx = {};
let ipfs;
beforeEach(async () => {
  require("fs").rmSync(
    require("path").join(require("os").homedir(), ".jsipfs"),
    { recursive: true, force: true }
  );
  ipfs = await init(require("config").get("ipfs"));
  await db.init(require("config").get("db"));
  ctx = {
    ipfs,
    log: bunyan.createLogger({ name: "test", level: "info" }),
  };
});

test("basic", async () => {
  ctx.jsonrpc = { params: ["wesley"] };
  const user = await commands.newUser(ctx);
  expect(user.nickname).toBe("wesley");
  expect(user.ipns).toBeTruthy();
  expect(user.createat).toBeTruthy();

  const users = await commands.listUser(ctx);
  expect(users.length).toBe(1);

  ctx.jsonrpc = {
    params: [
      user.userid,
      null,
      {
        title: "测试",
        tags: ["tag1"],
        content: [{ text: "text", selstart: 0 }],
      },
    ],
  };
  const post = await commands.updateUserPost(ctx);
  expect(post.ipns).toBeTruthy();
  expect(post.author).toBeTruthy();
  expect(post.cid).toBeTruthy();

  ctx.jsonrpc = {
    params: [
      user.userid,
      post.postid,
      {
        ...post,
        title: "测试2",
        tags: ["tag1"],
        content: [{ text: "text", selstart: 0 }],
      },
    ],
  };
  const post2 = await commands.updateUserPost(ctx);
  expect(post2.ipns).toBe(post.ipns);
  expect(post2.title).toBe("测试2");

  ctx.jsonrpc = {
    params: [
      user.userid,
      post.ipns,
      null,
      { content: [{ text: "comment", selstart: 0 }] },
    ],
  };
  await commands.commentPost(ctx);

  ctx.jsonrpc = {
    params: [user.userid],
  };
  const posts = await commands.listUserPosts(ctx);
  expect(posts.length).toBe(1);

  ctx.jsonrpc = {
    params: [],
  };
  const dbtags = await commands.listTags(ctx);
  expect(dbtags.total_rows).toBe(1);
  expect(dbtags.rows.length).toBe(1);

  ctx.jsonrpc = {
    params: [0],
  };
  const dbposts = await commands.listPosts(ctx);
  expect(dbposts.total_rows).toBe(1);
  expect(dbposts.rows.length).toBe(1);
  expect(dbposts.rows[0].comments.length).toBe(1);
  expect(dbposts.rows[0].author.nickname).toBe("wesley");

  ctx.jsonrpc = {
    params: [user.userid, post.postid, [{ path: "/tmp/test" }]],
  };
  require("fs").writeFileSync("/tmp/test", "this is a test");
  const attachments = await commands.attachPost(ctx);
  require("fs").rmSync("/tmp/test");
  expect(attachments.length).toBe(1);
});

afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await ipfs.stop();
});
