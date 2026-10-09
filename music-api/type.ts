export interface musicData{
    code:number;
    msg:string;
    data:musicInfo;
}
export interface musicInfo{
    playlistName:string;
    total:number;
    songs:[musicList];
}
export interface musicList{
    id:string;
    title:string;
    artist:string;
    album:string;
    cover:string;
    src:string;
    lrc:string; 
    duration:number;
}
export interface lyrics{
    time:number;
    text:string;
}
export interface QQLyrics{
    retcode:number;
    code:number;
    subcode:number;
    lyric:string;
    trans:string;
}
export interface LyricBlock {
  version: number;
  lyric: string | null;
}
export interface neteaseLyrics{
    code: number;
    sgc?: boolean;
    sfy?: boolean;
    qfy?: boolean;
    lrc?: LyricBlock;
    klyric?: LyricBlock;
    tlyric?: LyricBlock;
    nolyric?: boolean;      
    uncollected?: boolean;
}