const bunyan = require("bunyan");
const log = bunyan.createLogger({ name: "dblib" });
const md5 = require("md5");
const uuid = require("uuid").v4;

let postDB, userDB, tagDB;
async function init(options) {
  let PouchDB;
  PouchDB = require("pouchdb");
  if (PouchDB.default) {
    PouchDB = PouchDB.default;
  }
  PouchDB.plugin(require("pouchdb-find"));
  postDB = new PouchDB({ ...options, name: `${options.dbPrefix || ""}posts` });
  userDB = new PouchDB({ ...options, name: `${options.dbPrefix || ""}users` });
  tagDB = new PouchDB({ ...options, name: `${options.dbPrefix || ""}tags` });
  commentDB = new PouchDB({
    ...options,
    name: `${options.dbPrefix || ""}comments`,
  });
  commentDB.createIndex({
    index: {
      fields: ["post"],
    },
  });
}

async function saveComment2DB(comment) {
  try {
    await commentDB.put({
      _id: uuid(),
      ...comment,
    });
  } catch (ex) {
    log.error({ error: ex }, "error on save comment");
  }
}

async function saveUser2DB(author) {
  try {
    const doc = await userDB.get(author.ipns);
    await userDB.put({
      ...author,
      _id: author.ipns,
      _rev: doc._rev,
    });
  } catch (ex) {
    await userDB.put({ ...author, _id: author.ipns });
  }
}

async function savePost2DB(post) {
  try {
    const doc = await postDB.get(post.ipns);
    await postDB.put({
      ...post,
      _id: post.ipns,
      _rev: doc._rev,
    });
  } catch (ex) {
    await postDB.put({ ...post, _id: post.ipns });
  }
  const tags = post.tags || [];
  for (let tag of tags || []) {
    const key = `${md5(tag)}`;
    try {
      const doc = await tagDB.get(key);
      await tagDB.put({
        _id: key,
        _rev: doc._rev,
        tag,
        count: doc.count + 1,
      });
    } catch (ex) {
      await tagDB.put({
        _id: key,
        tag,
        count: 1,
      });
    }
  }
}

async function listComment(post) {
  const result = await commentDB.find({ selector: { post } });
  return result.docs;
}

async function listTags() {
  const result = await tagDB.allDocs({ include_docs: true });
  result.rows = result.rows.map((r) => r.doc);
  return result;
}

async function listPosts(page) {
  const result = await postDB.allDocs({ include_docs: true, skip: page * 10 });
  result.rows = result.rows.map((r) => r.doc);
  return result;
}

async function loadAuthor(author) {
  try {
    return await userDB.get(author);
  } catch (ex) {
    log.error({ author }, "user not found");
    return { ipns: author };
  }
}

module.exports = {
  listTags,
  loadAuthor,
  listComment,
  listPosts,
  init,
  savePost2DB,
  saveComment2DB,
  saveUser2DB,
};
