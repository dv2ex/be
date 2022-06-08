const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const Jsonrpc = require("@koalex/koa-json-rpc");
const methods = require("./commands");
const IPFS = require("./ipfs");
const db = require("./db");
const bunyan = require("bunyan");
const log = bunyan.createLogger({ name: "main" });
const Gateway = require("./gateway");
const loggers = {};

const app = new Koa();
app.use(require("@koa/cors")());

async function start() {
  const ipfs = await IPFS.init(require("config").get("ipfs"));
  await db.init(require("config").get("db"));
  app.use(async (ctx, next) => {
    ctx.ipfs = ipfs;
    await next();
  });
  const gw = new Gateway(ipfs);
  app.use(gw.handle.bind(gw));
  const router = new Router();
  const jsonrpc = new Jsonrpc({
    bodyParser: bodyParser({
      onerror: (err, ctx) => {
        ctx.status = 200;
        ctx.body = Jsonrpc.parseError;
      },
    }),
  });
  Object.keys(methods).forEach((method) => {
    jsonrpc.method(method, async (ctx, next) => {
      if (!loggers[method]) {
        loggers[method] = bunyan.createLogger({ name: method });
      }
      ctx.log = loggers[method];
      const result = await methods[method](ctx, next);
      if (!ctx.body) {
        ctx.body = result;
      }
      log.info(
        {
          method,
          requestid: ctx.jsonrpc.id,
          params: ctx.jsonrpc.params,
          body: ctx.body,
        },
        "rpc result"
      );
      await next();
    });
  });

  router.post("/rpc", jsonrpc.middleware);
  router.get("/js/config.js", (ctx) => (ctx.body = `window.RPC=1;`));
  app.use(router.routes());
  const serve = require("koa-static");
  const wwwroot =
    process.env.DV2EX_WWW ||
    (require("config").has("www") && require("config").get("www")) ||
    require("path").join(__dirname, "www");
  log.info("server wwwroot at", wwwroot);
  app.use(serve(wwwroot));
  app.listen(require("config").get("port"), "0.0.0.0");
  log.info("server start at", require("config").get("port"));
}

module.exports = {
  app,
  start,
};
