import type {musicList,QQLyrics,neteaseLyrics} from "../type.js";
const NETEASE_HEADERS={
  "User-Agent":
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://music.163.com/",
};
const QQ_HEADERS={
  "User-Agent":
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://y.qq.com/",
};
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
async function processInBatches<T,R>(items:T[],batchSize:number,processItem:(item:T)=>Promise<R>):Promise<R[]>{
  let result:R[]=[];
  for(let i=0;i<items.length;i+=batchSize){
    const batch=items.slice(i, i + batchSize);
    const batchResults=await Promise.all(batch.map(item => processItem(item)));
    result.push(...batchResults);
  }
  return result;
}
async function getLyrics(server:string,id:string):Promise<string>{
  try{
    if(server==="netease"){
      const response=await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,{headers:NETEASE_HEADERS,signal:AbortSignal.timeout(5000)});
      const result=await response.json() as neteaseLyrics;
      if(result.nolyric){
        return "[00:00.00]纯音乐，请欣赏";
      }
      return result?.lrc?.lyric||"[00:00.00]暂无歌词";
    }
    else if(server==="qq"){
      const response=await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`,{headers:QQ_HEADERS,signal: AbortSignal.timeout(5000)});
      const result=await response.json() as QQLyrics;
      return result.lyric||"[00:00.00]暂无歌词";
    }else{
      console.log("server不支持");
    }
    return "[00:00.00]暂无歌词";
  }catch(error){
    console.error("歌词请求失败:", error);
    return "[00:00.00]暂无歌词";
  }
}
async function getQQUrl(songmid:string):Promise<string>{
  try{
    const body=JSON.stringify({
      req_0:{
        module:"vkey.GetVkeyServer",
        method:"CgiGetVkey",
        param:{
          guid:"10000",
          songmid:[songmid],
          songtype:[0],
          uin:"0",
          loginflag:1,
          platform:"20",
        },
      },
    });
    const response=await fetch(`https://u.y.qq.com/cgi-bin/musicu.fcg`,{
      method:"POST",
      headers:{...QQ_HEADERS,"Content-Type":"application/json"},
      body,
      signal:AbortSignal.timeout(5000),
    });
    const result=await response.json()as any;
    const data=result?.req_0?.data;
    const purl=data?.midurlinfo?.[0]?.purl;
    if(!purl) return "";
    const sip=data?.sip?.[0]??"https://dl.stream.qqmusic.qq.com/";
    return `${sip}${purl}`;
  }catch(error){
    console.error("QQ 播放地址获取失败:",error);
    return "";
  }
}
async function getNeteaseList(data: any): Promise<musicList[]> {
  const trackIds: { id: number }[] = data.playlist.trackIds || [];
  const BATCH = 100;
  const tracks: any[] = [];
  for (let i = 0; i < trackIds.length; i += BATCH) {
    const chunk = trackIds.slice(i, i + BATCH).map((t) => ({ id: String(t.id) }));
    const response = await fetch(
      `https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify(chunk))}`,
      { headers: NETEASE_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    const result = (await response.json()) as any;
    tracks.push(...(result.songs || []));
  }
  return await processInBatches<any,musicList>(tracks,5,async(element: any)=>{
    return {
        id:String(element.id),
        title: element.name,
        artist: element.ar.map((a: any) => a.name).join("/"),
        album: element.al.name,
        cover: element.al.picUrl,
        src: `https://music.163.com/song/media/outer/url?id=${element.id}.mp3`,
        lrc: await getLyrics("netease", String(element.id)),
        duration: element.dt,
      };
  })
}
async function getQQList(data: any): Promise<musicList[]>{
  const songlist = data.cdlist[0].songlist;
  return await processInBatches<any, musicList>(songlist,5,async (element: any) => {
    return {
      id: String(element.songid),
      title: element.songname,
      artist: element.singer.map((s: any) => s.name).join("/"),
      album: element.albumname,
      cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${element.albummid}.jpg`,
      src: await getQQUrl(element.songmid),
      lrc: await getLyrics("qq", String(element.songmid)), 
      duration: element.interval * 1000,
    };
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/api\/music\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    }
    const [_, server, type, id] = match;
    try {
      let data, result;
      if (server === "netease") {
        const response = await fetch(
          `https://music.163.com/api/v6/${type}/detail?id=${id}`,
          { headers: NETEASE_HEADERS, signal: AbortSignal.timeout(8000) }
        );
        data = (await response.json()) as any;
        result = {
          code: 200,
          msg: "OK",
          data: {
            playlistName: data.playlist.name,
            total: data.playlist.trackCount,
            songs: await getNeteaseList(data),
          },
        };
      } else if (server === "qq" && type === "songlist") {
        const response = await fetch(
          `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,
          { headers: QQ_HEADERS, signal: AbortSignal.timeout(8000) }
        );
        data = (await response.json()) as any;
        if (data.code !== 0 || !data.cdlist?.length) {
          return Response.json(
            {
              code: 403,
              msg:
                data.code === 10
                  ? "该歌单是私密歌单或需要登录（QQ 返回 code 10），请换一个公开歌单 id"
                  : `QQ 歌单请求失败（code ${data.code}），请检查 id 是否正确`,
              data: null,
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
            songs: await getQQList(data),
          },
        };
      } else {
        return Response.json(
          { code: 400, msg: "不支持的参数", data: null },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      return Response.json(result, { headers: CORS_HEADERS });
    } catch (error) {
      console.error("音乐接口请求失败：", error);
      return Response.json(
        {
          code: 502,
          msg: error instanceof Error ? error.message : String(error),
          data: null,
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }
  },
};