export interface ApiResponse<T>{
    readonly code:number,
    readonly msg:string,
    readonly data:Readonly<T>
}
export type MusicData=ApiResponse<MusicInfo>;
export type MusicLyrics=ApiResponse<{src:string,lrc:string}>;
export interface MusicInfo{
    playlistName:string;
    total:number;
    songs:[MusicList];
}
export interface MusicList{
    id:string;
    title:string;
    artist:string;
    album:string;
    cover:string;
    src:string;
    lrc:string; 
    duration:number;
}
export interface Lyrics{
    time:number;
    text:string;
}
