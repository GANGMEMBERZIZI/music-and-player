import type {musicList,QQLyrics,neteaseLyrics} from "./type.js";
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
      const response=await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songid=${id}&format=json&nobase64=1`,{headers:QQ_HEADERS,signal: AbortSignal.timeout(5000)});
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
async function getNeteaseList(data: any): Promise<musicList[]> {
  return Promise.all(
    data.playlist.tracks.map(async (element: any): Promise<musicList> => {
      console.log("歌单总数：", data.playlist?.trackCount);
console.log("当前返回数量：", data.playlist?.tracks?.length);
console.log("是否有完整歌单 ID：", data.playlist?.trackIds?.length);
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
  );
}
async function getQQList(data: any): Promise<musicList[]> {
  return Promise.all(
    data.cdlist[0].songlist.map(async (element: any): Promise<musicList> => {
      return {
        id: String(element.songid),
        title: element.songname,
        artist: element.singer.map((s: any) => s.name).join("/"),
        album: element.albumname,
        cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${element.albummid}.jpg`,
        src: `https://api.injahow.cn/meting/?type=url&id=${element.songmid}&server=tencent`,
        lrc: await getLyrics("qq", String(element.songid)),
        duration: element.interval * 1000,
      };
    })
  );
}
Bun.serve({
  port: Bun.env.PORT,
  routes:{
    "/api/music/:server/:type/:id": async(req)=>{
      try{
      let data,result;
      const {server,type,id}=req.params;
      if(server==="netease"){
        const response=await fetch(`https://music.163.com/api/v6/${type}/detail?id=${id}`,{headers:NETEASE_HEADERS,signal: AbortSignal.timeout(8000)});
        data=await response.json()as any;
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:data.playlist.name,
            total:data.playlist.trackCount,
            songs:await getNeteaseList(data)
        }
      }
      }else if(server==="qq"&&type==="songlist"){
        const response=await fetch(`https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,{headers:QQ_HEADERS,signal: AbortSignal.timeout(8000)});
        data=await response.json()as any;
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:data.cdlist[0].dissname,
            total:data.cdlist[0].total_song_num,
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
  }
  }
});