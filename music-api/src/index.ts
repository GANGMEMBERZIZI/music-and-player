import type {SongItem,QQVkeyResponse,NeteaseSongResponse,NeteasePlaylistResponse,QQPlaylistResponse,QQLyrics,NeteaseLyrics, MusicData, NeteaseSong, QQSong} from "../type.js";
import {safeAsyncRun, safeRun} from "../Error.js";
import {ResultHandler} from "../Error.js";
const NETEASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://music.163.com/",
};
const QQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://y.qq.com/",
};
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
async function processInBatches<T, R>(items: T[], batchSize: number, processItem: (item: T) => Promise<R>): Promise<R[]> {
  let result: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(item => processItem(item)));
    result.push(...batchResults);
  }
  return result;
}
async function getLyrics(server: string, id: string): Promise<string> {
  const cache = caches.default;
  const cacheKey = new Request(`https://music-cache.local/lyric/${server}/${id}`);
  const cacheRes = await safeAsyncRun(async () => await cache.match(cacheKey));
  if (cacheRes.ok && cacheRes.value) {
    return await cacheRes.value.text();
  }
  const lyricResult = await safeAsyncRun(async (): Promise<string> => {
    if (server === "netease") {
      const response = await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`, {
        headers: { ...NETEASE_HEADERS, 'cf-priority': '30/0' },
        signal: AbortSignal.timeout(5000)
      });
      const result = await response.json() as NeteaseLyrics;
      if (result.nolyric) return "[00:00.00]纯音乐，请欣赏";
      return result?.lrc?.lyric || "[00:00.00]暂无歌词";
    } else if (server === "qq") {
      const response = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`, {
        headers: { ...QQ_HEADERS, 'cf-priority': '30/0' },
        signal: AbortSignal.timeout(5000)
      });
      const result = await response.json() as QQLyrics;
      return result.lyric || "[00:00.00]暂无歌词";
    } else {
      throw new Error("server不支持");
    }
  });
  const finalLyric = lyricResult.ok ? lyricResult.value : "[00:00.00]暂无歌词";
  if (finalLyric !== "[00:00.00]暂无歌词" && finalLyric !== "[00:00.00]纯音乐，请欣赏") {
    await safeAsyncRun(async () => {
      const responseToCache = new Response(finalLyric, {
        headers: { "Cache-Control": "s-maxage=604800" },
      });
      await cache.put(cacheKey, responseToCache);
    });
  }
  return finalLyric;
}
async function getQQUrl(songmid: string): Promise<string> {
  const result = await safeAsyncRun(async () => {
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
          platform: "20",
        },
      },
    });
    const response = await fetch(`https://u.y.qq.com/cgi-bin/musicu.fcg`, {
      method: "POST",
      headers: { ...QQ_HEADERS, "Content-Type": "application/json", 'cf-priority': '20/1' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    const jsonResult: QQVkeyResponse = await response.json();
    const data = jsonResult?.req_0?.data;
    const purl = data?.midurlinfo?.[0]?.purl;
    if (!purl) return "";
    const sip = data?.sip?.[0] ?? "https://dl.stream.qqmusic.qq.com/";
    return `${sip}${purl}`;
  });

  return result.ok ? result.value : "";
}
async function getNeteaseList(data: NeteasePlaylistResponse): Promise<SongItem[]> {
  if (!data.playlist) {
    console.error("不存在data.playlist");
    return [{ id: "", title: "", artist: "", album: "", cover: "", src: "", lrc: "", duration: 0 }];
  }
  const trackIds: readonly { readonly id: number }[] = data.playlist.trackIds || [];
  const BATCH = 100;
  const tracks: NeteaseSong[] = [];
  for (let i = 0; i < trackIds.length; i += BATCH) {
    const chunk = trackIds.slice(i, i + BATCH).map((t) => ({ id: String(t.id) }));
    const res = await safeAsyncRun(async () => {
      const response = await fetch(
        `https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify(chunk))}`,
        { headers: { ...NETEASE_HEADERS, 'cf-priority': '20/1' }, signal: AbortSignal.timeout(8000) }
      );
      return (await response.json()) as NeteaseSongResponse;
    });
    if (res.ok && res.value.songs) {
      tracks.push(...res.value.songs);
    }
  }
  return await processInBatches<NeteaseSong, SongItem>(tracks, 5, async (element: NeteaseSong) => {
    return new ResultHandler(safeRun(() => element))
      .map(el => ({
        id: String(el.id),
        title: el.name,
        artist: el.ar?.map((a) => a.name).join("/") ?? "未知歌手",
        album: el.al?.name ?? "",
        cover: el.al?.picUrl ?? "",
        src: "",
        lrc: "",
        duration: el.dt ?? 0,
      }))
      .unwrap();
  });
}
async function getQQList(data: QQPlaylistResponse): Promise<SongItem[]> {
  if (!data.cdlist || !data.cdlist[0] || !data.cdlist[0].songlist) {
    console.error("不存在data.cdlist及songList");
    return [{ id: "", title: "", artist: "", album: "", cover: "", src: "", lrc: "", duration: 0 }];
  }
  const songlist: QQSong[] = [...data.cdlist[0].songlist];
  return await processInBatches<QQSong, SongItem>(songlist, 5, async (element: QQSong) => {
    return new ResultHandler(safeRun(() => element))
      .map(el => ({
        id: String(el.songmid),
        title: el.songname,
        artist: el.singer?.map((s) => s.name).join("/") || "未知歌手",
        album: el.albumname ?? "",
        cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${el.albummid}.jpg`,
        src: "",
        lrc: "",
        duration: (el.interval ?? 0) * 1000
      }))
      .unwrap();
  });
}
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(req.url);
    const pathname = url.pathname;
    const routeResult = await safeAsyncRun(async (): Promise<Response> => {
      const lyricMatch = pathname.match(/^\/api\/lyrics\/([^/]+)\/([^/]+)$/);
      if (lyricMatch) {
        const [_, server, id] = lyricMatch;
        if (server === "netease") {
          const src = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
          const lrc = await getLyrics(server, String(id));
          return Response.json({ code: 200, msg: "OK", data: { src, lrc } }, { headers: CORS_HEADERS });
        } else if (server === "qq") {
          const src = await getQQUrl(id as string);
          const lrc = await getLyrics("qq", String(id));
          return Response.json({ code: 200, msg: "OK", data: { src, lrc } }, { headers: CORS_HEADERS });
        } else {
          return Response.json({ code: 400, msg: "不支持的 server", data: null }, { status: 400, headers: CORS_HEADERS });
        }
      }
      const musicMatch = pathname.match(/^\/api\/music\/([^/]+)\/([^/]+)\/([^/]+)$/);
      if (musicMatch) {
        const [_, server, type, id] = musicMatch;
        if (server === "netease") {
          const response = await fetch(
            `https://music.163.com/api/v6/${type}/detail?id=${id}`,
            { headers: { ...NETEASE_HEADERS, 'cf-priority': '20/1' }, signal: AbortSignal.timeout(8000) }
          );
          const data = (await response.json()) as NeteasePlaylistResponse;
          if (data.code !== 200 || !data.playlist) {
            return Response.json({ code: 400, msg: "网易云歌单获取失败", data: null }, { status: 400, headers: CORS_HEADERS });
          }
          const result = {
            code: 200,
            msg: "OK",
            data: {
              playlistName: data.playlist.name,
              total: data.playlist.trackCount || 0,
              songs: await getNeteaseList(data),
            },
          };
          return Response.json(result, { headers: CORS_HEADERS });
        } 
        else if (server === "qq" && type === "songlist") {
          const response = await fetch(
            `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,
            { headers: { ...QQ_HEADERS, 'cf-priority': '20/1' }, signal: AbortSignal.timeout(8000) }
          );
          const data = (await response.json()) as QQPlaylistResponse;
          if (data.code !== 0 || !data.cdlist) {
            return Response.json(
              {
                code: 403,
                msg: data.code === 10
                  ? "该歌单是私密歌单或需要登录（QQ 返回 code 10），请换一个公开歌单 id"
                  : `QQ 歌单请求失败（code ${data.code}），请检查 id 是否正确`,
                data: null,
              },
              { status: 403, headers: CORS_HEADERS }
            );
          }
          let sena = data.cdlist[0];
          if (!sena) {
            return Response.json({ code: 403, msg: "错误不存在cdlist[0]", data: null }, { status: 403, headers: CORS_HEADERS });
          }
          const result = {
            code: 200,
            msg: "OK",
            data: {
              playlistName: sena.dissname || "未知歌单",
              total: sena.total_song_num || 0,
              songs: await getQQList(data),
            },
          };
          return Response.json(result, { headers: CORS_HEADERS });
        } 
        else {
          return Response.json({ code: 400, msg: "不支持的参数", data: null }, { status: 400, headers: CORS_HEADERS });
        }
      }

      return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    });
    if (!routeResult.ok) {
      console.error("音乐接口请求失败：", routeResult.error);
      return Response.json(
        {
          code: 502,
          msg: routeResult.error.message,
          data: null,
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }
    return routeResult.value;
  },
};