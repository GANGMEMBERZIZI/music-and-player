import type {SongItem,QQVkeyResponse,NeteaseSongResponse,NeteasePlaylistResponse,QQPlaylistResponse,QQLyrics,NeteaseLyrics, MusicData, NeteaseSong, QQSong} from "./type.js";
import {safeAsyncRun} from "./Error.js";
import type {Result} from "./Error.js";
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
//分批处理限制并发
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
  const cache=caches.default;
  const cacheKey=new Request(`https://music-cache.local/lyric/${server}/${id}`);
  try{
  let cacheResponse=await cache.match(cacheKey);
  if(cacheResponse){
    return await cacheResponse.text();
  }
}catch(error){

}
let lyric = "[00:00.00]暂无歌词";
  try{
    if(server==="netease"){
      const response=await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,{headers:{...NETEASE_HEADERS,'cf-priority': '30/0'},signal:AbortSignal.timeout(5000)});
      const result=await response.json() as NeteaseLyrics;
      if(result.nolyric){
        return "[00:00.00]纯音乐，请欣赏";
      }
      return result?.lrc?.lyric||"[00:00.00]暂无歌词";
    }
    else if(server==="qq"){
      const response=await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`,{headers:{...QQ_HEADERS,'cf-priority': '30/0'},signal: AbortSignal.timeout(5000)});
      const result=await response.json() as QQLyrics;
      lyric = result.lyric || "[00:00.00]暂无歌词";
    }else{
      console.log("server不支持");
    }
  }catch(error){
    console.error("歌词请求失败:", error);
    return "[00:00.00]暂无歌词";
  }
  if (lyric !== "[00:00.00]暂无歌词" && lyric !== "[00:00.00]纯音乐，请欣赏") {
    const responseToCache = new Response(lyric, {
      headers: { 
        "Cache-Control": "s-maxage=604800" 
      },
    });
    await cache.put(cacheKey, responseToCache);
  }
  return lyric;
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
      headers:{...QQ_HEADERS,"Content-Type":"application/json",'cf-priority': '20/1'},
      body,
      signal:AbortSignal.timeout(5000),
    });
    const result:QQVkeyResponse=await response.json();
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
async function getNeteaseList(data: NeteasePlaylistResponse): Promise<SongItem[]> {
  if (!data.playlist){
    console.error("不存在data.playlist");
    return [{
        id:"",
        title: "",
        artist: "",
        album: "",
        cover: "",
        src:"",
        lrc:"",
        duration: 0,

    }];
  }
  const trackIds: readonly { readonly id: number }[] = data.playlist.trackIds || [];
  const BATCH = 100;
  const tracks:NeteaseSong[] = [];
  for (let i = 0; i < trackIds.length; i += BATCH) {
    const chunk = trackIds.slice(i, i + BATCH).map((t) => ({ id: String(t.id) }));
    const response = await fetch(
      `https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify(chunk))}`,
      { headers: {...NETEASE_HEADERS,'cf-priority': '20/1'}, signal: AbortSignal.timeout(8000) }
    );
    const result:NeteaseSongResponse=await response.json();
    tracks.push(...(result.songs || []));
  }
  return await processInBatches<NeteaseSong,SongItem>(tracks,5,async(element: NeteaseSong)=>{
    return {
        id:String(element.id),
        title: element.name,
        artist: element.ar?.map((a) => a.name).join("/")??"未知歌手",
        album: element.al?.name??"",
        cover: element.al?.picUrl??"",
        // src: `https://music.163.com/song/media/outer/url?id=${element.id}.mp3`,
        src:"",
        // lrc: await getLyrics("netease", String(element.id)),
        lrc:"",
        duration: element.dt??0,
      };
  })
}
async function getQQList(data:QQPlaylistResponse): Promise<SongItem[]>{
  if (!data.cdlist||!data.cdlist[0]||!data.cdlist[0].songlist){
    console.error("不存在data.cdlist及songList");
    return [{
        id:"",
        title: "",
        artist: "",
        album: "",
        cover: "",
        src:"",
        lrc:"",
        duration: 0,

    }];
  }
  const songlist:QQSong[]=[];
  songlist.push(...data.cdlist[0].songlist);
  return await processInBatches<QQSong, SongItem>(songlist,5,async (element:QQSong) => {
    return {
      id: String(element.songmid),
      title: element.songname,
      artist: element.singer?.map((s) => s.name).join("/")||"未知歌手", //可能为空
      album: element.albumname??"",
      cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${element.albummid}.jpg`,
      // src: await getQQUrl(element.songmid),
      src:"",
      // lrc: await getLyrics("qq", String(element.songmid)), 
      lrc:"",
      duration: (element.interval??0) * 1000 
    };
  });
}
Bun.serve({
  port: Bun.env.PORT,
  routes:{
    "/api/music/:server/:type/:id": async(req)=>{
      try{
      let result:MusicData|undefined;
      const {server,type,id}=req.params;
      if(server==="netease"){
        const response=await fetch(`https://music.163.com/api/v6/${type}/detail?id=${id}`,{headers:{...NETEASE_HEADERS,'cf-priority': '20/1'},signal: AbortSignal.timeout(8000)});
        const data=(await response.json()) as NeteasePlaylistResponse;
        if (data.code !== 200 || !data.playlist) {
        return Response.json(
        { code: 400, msg: "网易云歌单获取失败", data: null },
        { status: 400, headers: CORS_HEADERS });
      }
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:data.playlist.name,
            total:data.playlist.trackCount || 0,
            songs:await getNeteaseList(data)
        }
      }
      }else if(server==="qq"&&type==="songlist"){
        const response=await fetch(`https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,{headers:{...QQ_HEADERS,'cf-priority': '20/1'},signal: AbortSignal.timeout(8000)});
        const data=await response.json()as QQPlaylistResponse;
        if(data.code!==0||!data.cdlist){
          return Response.json({
            code:403,
            msg:data.code===10
              ?"该歌单是私密歌单或需要登录（QQ 返回 code 10），请换一个公开歌单 id"
              :`QQ 歌单请求失败（code ${data.code}），请检查 id 是否正确`,
            data:null,
          },{status:403,headers:CORS_HEADERS});
        }
        let sena=data.cdlist[0];
        if (!sena){
          return Response.json({code:403,msg:"错误不存在cdlist[0]",data:null},{status:403,headers:CORS_HEADERS});
        }
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:sena.dissname || "未知歌单",
            total:sena.total_song_num ||0,
            songs:await getQQList(data)
          }
        }
      }
      return Response.json(result,{headers:CORS_HEADERS});
    }
    catch(error){
      console.error("音乐接口请求失败：", error);
      return Response.json({code: 502,msg: error instanceof Error ? error.message : String(error),data: null,},{status: 502,headers: CORS_HEADERS,});
    }
  },
  "/api/lyrics/:server/:id": async (req)=>{
    let result;
    try{
      const {server,id}=req.params;
      if (server==="netease"){
        const src=`https://music.163.com/song/media/outer/url?id=${id}.mp3`;
        const lrc=await getLyrics(server,String(id));
        result={
          code:200,
          msg:"OK",
          data:{
            src:src,
            lrc:lrc
          }
        }
      }else if (server==="qq"){
        const src=await getQQUrl(id);
        const lrc=await getLyrics("qq", String(id)); 
        result={
          code:200,
          msg:"OK",
          data:{
            src:src,
            lrc:lrc
          }
        }
      }
      return Response.json(result,{headers:CORS_HEADERS}) 
    }catch(error){
      console.log("请求歌词失败",error);
      return Response.json({code: 502,msg: error instanceof Error ? error.message : String(error),data: null,},{status: 502,headers: CORS_HEADERS,});
    }
  }
  }
});