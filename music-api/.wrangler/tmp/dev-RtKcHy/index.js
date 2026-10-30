var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var NETEASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://music.163.com/"
};
var QQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://y.qq.com/"
};
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
async function processInBatches(items, batchSize, processItem) {
  let result = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item) => processItem(item)));
    result.push(...batchResults);
  }
  return result;
}
__name(processInBatches, "processInBatches");
async function getLyrics(server, id) {
  const cache = caches.default;
  const cacheKey = new Request(`https://music-cache.local/lyric/${server}/${id}`);
  try {
    let cacheResponse = await cache.match(cacheKey);
    if (cacheResponse) {
      return await cacheResponse.text();
    }
  } catch (error) {
  }
  let lyric = "[00:00.00]\u6682\u65E0\u6B4C\u8BCD";
  try {
    if (server === "netease") {
      const response = await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`, { headers: { ...NETEASE_HEADERS, "cf-priority": "30/0" }, signal: AbortSignal.timeout(5e3) });
      const result = await response.json();
      if (result.nolyric) {
        return "[00:00.00]\u7EAF\u97F3\u4E50\uFF0C\u8BF7\u6B23\u8D4F";
      }
      return result?.lrc?.lyric || "[00:00.00]\u6682\u65E0\u6B4C\u8BCD";
    } else if (server === "qq") {
      const response = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`, { headers: { ...QQ_HEADERS, "cf-priority": "30/0" }, signal: AbortSignal.timeout(5e3) });
      const result = await response.json();
      lyric = result.lyric || "[00:00.00]\u6682\u65E0\u6B4C\u8BCD";
    } else {
      console.log("server\u4E0D\u652F\u6301");
    }
  } catch (error) {
    console.error("\u6B4C\u8BCD\u8BF7\u6C42\u5931\u8D25:", error);
    return "[00:00.00]\u6682\u65E0\u6B4C\u8BCD";
  }
  if (lyric !== "[00:00.00]\u6682\u65E0\u6B4C\u8BCD" && lyric !== "[00:00.00]\u7EAF\u97F3\u4E50\uFF0C\u8BF7\u6B23\u8D4F") {
    const responseToCache = new Response(lyric, {
      headers: {
        "Cache-Control": "s-maxage=604800"
      }
    });
    await cache.put(cacheKey, responseToCache);
  }
  return lyric;
}
__name(getLyrics, "getLyrics");
async function getQQUrl(songmid) {
  try {
    const body = JSON.stringify({
      req_0: {
        module: "vkey.GetVkeyServer",
        method: "CgiGetVkey",
        param: {
          guid: "10000",
          songmid: [songmid],
          songtype: [0],
          uin: "0",
          loginflag: 1,
          platform: "20"
        }
      }
    });
    const response = await fetch(`https://u.y.qq.com/cgi-bin/musicu.fcg`, {
      method: "POST",
      headers: { ...QQ_HEADERS, "Content-Type": "application/json", "cf-priority": "20/1" },
      body,
      signal: AbortSignal.timeout(5e3)
    });
    const result = await response.json();
    const data = result?.req_0?.data;
    const purl = data?.midurlinfo?.[0]?.purl;
    if (!purl) return "";
    const sip = data?.sip?.[0] ?? "https://dl.stream.qqmusic.qq.com/";
    return `${sip}${purl}`;
  } catch (error) {
    console.error("QQ \u64AD\u653E\u5730\u5740\u83B7\u53D6\u5931\u8D25:", error);
    return "";
  }
}
__name(getQQUrl, "getQQUrl");
async function getNeteaseList(data) {
  const trackIds = data.playlist.trackIds || [];
  const BATCH = 100;
  const tracks = [];
  for (let i = 0; i < trackIds.length; i += BATCH) {
    const chunk = trackIds.slice(i, i + BATCH).map((t) => ({ id: String(t.id) }));
    const response = await fetch(
      `https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify(chunk))}`,
      { headers: { ...NETEASE_HEADERS, "cf-priority": "20/1" }, signal: AbortSignal.timeout(8e3) }
    );
    const result = await response.json();
    tracks.push(...result.songs || []);
  }
  return await processInBatches(tracks, 5, async (element) => {
    return {
      id: String(element.id),
      title: element.name,
      artist: element.ar.map((a) => a.name).join("/"),
      album: element.al.name,
      cover: element.al.picUrl,
      // src: `https://music.163.com/song/media/outer/url?id=${element.id}.mp3`,
      src: "",
      // lrc: await getLyrics("netease", String(element.id)),
      lrc: "",
      duration: element.dt
    };
  });
}
__name(getNeteaseList, "getNeteaseList");
async function getQQList(data) {
  const songlist = data.cdlist[0].songlist;
  return await processInBatches(songlist, 5, async (element) => {
    return {
      id: String(element.songmid),
      title: element.songname,
      artist: element.singer.map((s) => s.name).join("/"),
      album: element.albumname,
      cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${element.albummid}.jpg`,
      // src: await getQQUrl(element.songmid),
      src: "",
      // lrc: await getLyrics("qq", String(element.songmid)),
      lrc: "",
      duration: element.interval * 1e3
    };
  });
}
__name(getQQList, "getQQList");
var src_default = {
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(req.url);
    const pathname = url.pathname;
    try {
      const lyricMatch = pathname.match(/^\/api\/lyrics\/([^/]+)\/([^/]+)$/);
      if (lyricMatch) {
        const [_, server, id] = lyricMatch;
        let result;
        if (server === "netease") {
          const src = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
          const lrc = await getLyrics(server, String(id));
          result = {
            code: 200,
            msg: "OK",
            data: { src, lrc }
          };
        } else if (server === "qq") {
          const src = await getQQUrl(id);
          const lrc = await getLyrics("qq", String(id));
          result = {
            code: 200,
            msg: "OK",
            data: { src, lrc }
          };
        } else {
          return Response.json({ code: 400, msg: "\u4E0D\u652F\u6301\u7684 server", data: null }, { status: 400, headers: CORS_HEADERS });
        }
        return Response.json(result, { headers: CORS_HEADERS });
      }
      const musicMatch = pathname.match(/^\/api\/music\/([^/]+)\/([^/]+)\/([^/]+)$/);
      if (musicMatch) {
        const [_, server, type, id] = musicMatch;
        let data, result;
        if (server === "netease") {
          const response = await fetch(
            `https://music.163.com/api/v6/${type}/detail?id=${id}`,
            { headers: { ...NETEASE_HEADERS, "cf-priority": "20/1" }, signal: AbortSignal.timeout(8e3) }
          );
          data = await response.json();
          result = {
            code: 200,
            msg: "OK",
            data: {
              playlistName: data.playlist.name,
              total: data.playlist.trackCount,
              songs: await getNeteaseList(data)
            }
          };
        } else if (server === "qq" && type === "songlist") {
          const response = await fetch(
            `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,
            { headers: { ...QQ_HEADERS, "cf-priority": "20/1" }, signal: AbortSignal.timeout(8e3) }
          );
          data = await response.json();
          if (data.code !== 0 || !data.cdlist?.length) {
            return Response.json(
              {
                code: 403,
                msg: data.code === 10 ? "\u8BE5\u6B4C\u5355\u662F\u79C1\u5BC6\u6B4C\u5355\u6216\u9700\u8981\u767B\u5F55\uFF08QQ \u8FD4\u56DE code 10\uFF09\uFF0C\u8BF7\u6362\u4E00\u4E2A\u516C\u5F00\u6B4C\u5355 id" : `QQ \u6B4C\u5355\u8BF7\u6C42\u5931\u8D25\uFF08code ${data.code}\uFF09\uFF0C\u8BF7\u68C0\u67E5 id \u662F\u5426\u6B63\u786E`,
                data: null
              },
              { status: 403, headers: CORS_HEADERS }
            );
          }
          result = {
            code: 200,
            msg: "OK",
            data: {
              playlistName: data.cdlist[0].dissname,
              total: data.cdlist[0].total_song_num,
              songs: await getQQList(data)
            }
          };
        } else {
          return Response.json(
            { code: 400, msg: "\u4E0D\u652F\u6301\u7684\u53C2\u6570", data: null },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        return Response.json(result, { headers: CORS_HEADERS });
      }
      return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    } catch (error) {
      console.error("\u97F3\u4E50\u63A5\u53E3\u8BF7\u6C42\u5931\u8D25\uFF1A", error);
      return Response.json(
        {
          code: 502,
          msg: error instanceof Error ? error.message : String(error),
          data: null
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-3RTgbo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-3RTgbo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
