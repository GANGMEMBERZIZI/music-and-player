import type {musicData,musicInfo,musicList,QQLyrics,neteaseLyrics} from "./type.js";
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
async function getLyrics(server:string,id:string):Promise<string>{
  try{
    if(server==="netease"){
      const response=await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,{headers:NETEASE_HEADERS});
      const result=await response.json() as neteaseLyrics;
      if(result.nolyric){
        return "[00:00.00]纯音乐，请欣赏";
      }
      return result?.lrc?.lyric||"[00:00.00]暂无歌词";
    }
    else if(server==="qq"){
      const response=await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`,{headers:QQ_HEADERS});
      const result=await response.json() as QQLyrics;
      return result.lyric||"[00:00.00]纯音乐，请欣赏";
    }else{
      console.log("server不支持");
    }
    return "[00:00.00]暂无歌词";
  }catch(error){
    console.log(error);
    return "[00:00.00]暂无歌词"; 
  }
}
async function getNeteaseList(data){
  try{
    let result;
    data.result.tracks.forEach(element => {
      const song={
        id:element.id,
        title:element.name,
        artist:element.ar.name,
        album:element.al.name,
        cover:element.al.picUrl,
        src:`https://music.163.com/song/media/outer/url?id=${element.id}.mp3`,
        lrc:getLyrics("netease",element.id),
        duration:element.dt
      }
      result=result.push(song)
    });
    return result;
  }catch(error){
    console.log(error);
    return;
  }
}
async function getQQList(data){
  try{
    let result;
    data.cdlist.songlist.forEach(element=>{
      const song={
        id:element.songid,
        title:element.songname,
        artist:element.singer.name,
        album:element.albumname,
        cover:`https://y.gtimg.cn/music/photo_new/T002R300x300M000${element.albummid}.jpg`,
        src:`https://api.injahow.cn/meting/?type=url&id=${element.songmid}&server=tencent`,
        lrc:getLyrics("qq",element.songid),
        duration:element.interval
      }
      result=result.push(song);
    })
    return result;
  }catch(error){
    console.log(error);
    return;
  }
}
Bun.serve({
  port: Bun.env.PORT,
  routes:{
    "/api/music/:server/:type/:id": async(req)=>{
      try{
      let data,songs,result;
      const {server,type,id}=req.params;
      if(server==="netease"){
        const response=await fetch(`https://music.163.com/api/v6/${type}/detail?id=${id}`,{headers:NETEASE_HEADERS});
        data=await response.json();
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:data.result.name,
            total:data.result.trackCount,
            songs:getNeteaseList(data),
        }
      }
      }else if(server==="qq"&&type==="songlist"){
        const response=await fetch(`https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,{headers:QQ_HEADERS});
        data=await response.json();
        result={
          code:200,
          msg:"OK",
          data:{
            playlistName:data.cdlist.dissname,
            total:data.cdlist.total_song_num,
            songs:getQQList(data)
          }

        }
      }
      return Response.json(result);
    }
    catch(error){
      return Response.json({
        code:400,
        msg:"Error",
        data:null
      });
    }
  }
  }
});
console.log(`正在监听:`);