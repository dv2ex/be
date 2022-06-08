module.exports = class GateWay {
  constructor(ipfs) {
    this.ipfs = ipfs;
  }

  /**
   * 只支持单个文件的cid，不支持ipns
   * @param {*} req
   * @param {*} res
   * @returns
   */
  async handle(ctx, next) {
    if (!ctx.path.match(/^\/ip[nf]s\/[^/]+$/)) {
      await next();
      return;
    }
    let path = ctx.path;
    if (!ctx.headers) ctx.headers = {};
    if (!ctx.query) ctx.query = {};
    if (ctx.headers["service-worker"] === "script") {
      if (path.match(/^\/ip[nf]s\/[^/]+$/))
        throw new Error(
          "navigator.serviceWorker: registration is not allowed for this scope"
        );
    }
    if (path.startsWith("/ipfs/") && ctx.headers["if-modified-since"]) {
      return ctx.throw(304);
    }
    const stats = await this.ipfs.files.stat(path);
    const data = { cid: stats.cid };

    const etag = `"${data.cid}"`;
    const cachedEtag = ctx.headers["if-none-match"];
    if (cachedEtag === etag || cachedEtag === `W/${etag}`) {
      return ctx.throw(304); // Not Modified
    }

    const { size } = await this.ipfs.files.stat(`/ipfs/${data.cid}`);
    const catOptions = {};
    let rangeResponse = false;
    if (ctx.headers.range) {
      if (!ctx.headers["if-range"] || ctx.headers["if-range"] === etag) {
        const parseRange = require("range-parser");
        const ranges = parseRange(size, ctx.headers.range);
        if (!ranges || ranges.type !== "bytes") {
          ctx.throw(403, "range not satisfiable");
        }
        if (ranges.length === 1) {
          // Ignore requests for multiple ranges (hard to map to ipfs.cat and not used in practice)
          rangeResponse = true;
          const range = ranges[0];
          catOptions.offset = range.start;
          catOptions.length = range.end - range.start + 1;
        }
      }
    }

    const toStream = require("it-to-stream");
    const ipfs = this.ipfs;
    const responseStream = toStream.readable(
      (async function* () {
        for await (const chunk of ipfs.cat(data.cid, catOptions)) {
          yield chunk.slice(); // Convert BufferList to Buffer
        }
      })()
    );
    ctx.status = rangeResponse ? 206 : 200;
    ctx.body = responseStream;

    ctx.set("etag", etag);
    if (path.startsWith("/ipfs/")) {
      ctx.set("Cache-Control", "public, max-age=29030400, immutable");
    }
    if (rangeResponse) {
      const from = catOptions.offset;
      const to = catOptions.offset + catOptions.length - 1;
      ctx.set("Content-Range", `bytes ${from}-${to}/${size}`);
      ctx.set("Content-Length", `${catOptions.length}`);
    } else {
      // Announce support for Range requests
      ctx.set("Accept-Ranges", "bytes");
      ctx.set("Content-Length", `${size}`);
    }
    if (ctx.query.filename) {
      ctx.set(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(ctx.query.filename)}`
      );
    }
  }
};
