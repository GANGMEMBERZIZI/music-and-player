export interface ApiResponse<T>{
    readonly code:number,
    readonly msg:string,
    readonly data:Readonly<T>
}
export type MusicData=ApiResponse<MusicInfo>;

export interface MusicInfo{
    playlistName:string;
    total:number;
    songs:Readonly<SongItem[]>;
}

export interface SongItem{
    id:string;
    title:string;
    artist:string;
    album:string;
    cover:string;
    src?:string;
    lrc?:string; 
    duration:number;
}
export interface QQVkeyResponse {
  readonly req_0?: {
    readonly data?: {
      readonly sip?: readonly string[];
      readonly midurlinfo?: readonly {
        readonly purl?: string;
      }[];
    };
  };
}

export interface QQSong {
  readonly songmid: string | number;
  readonly songname: string;
  readonly singer?: readonly {
    readonly name: string;
  }[];
  readonly albumname?: string;
  readonly albummid?: string;
  readonly interval?: number; 
}

export interface QQPlaylistResponse {
  readonly code: number;
  readonly cdlist?: readonly {
    readonly disstid?: string;
    readonly dissname?: string; 
    readonly logo?: string;           
    readonly total_song_num?: number; 
    readonly songlist?: readonly QQSong[];
  }[];
}

export interface NeteaseSong{
  readonly id: number;
  readonly name: string;
  readonly ar?: readonly {
    readonly id?: number;
    readonly name: string;
  }[];
  readonly al?: {
    readonly id?: number;
    readonly name?: string;
    readonly picUrl?: string;
  }
  readonly dt?: number; 
}

export interface NeteaseSongResponse {
  readonly code: number;
  readonly songs?: readonly NeteaseSong[];
}

export interface NeteasePlaylistResponse {
  readonly code: number;
  readonly playlist?: {
    readonly id: number;
    readonly name: string;
    readonly coverImgUrl?: string;
    readonly trackCount?: number;
    readonly trackIds?: readonly {
      readonly id: number;
    }[];
    readonly tracks?: readonly NeteaseSong[];
  };
}

export interface QQLyrics{
    retcode:number;
    code:number;
    subcode:number;
    lyric?:string;
    trans?:string;
}
export interface LyricBlock {
  version: number;
  lyric: string | null;
}
export interface NeteaseLyrics{
    code: number;
    sgc?: boolean;
    sfy?: boolean;
    qfy?: boolean;
    lrc?: Readonly<LyricBlock>;
    klyric?: Readonly<LyricBlock>;
    tlyric?: Readonly<LyricBlock>;
    nolyric?: boolean;      
    uncollected?: boolean;
}