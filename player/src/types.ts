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
    lrc:string, 
    duration:number
}
