declare module '@unblockneteasemusic/server' {
  /**

   * @param id 
   * @param source 
   */
  export default function match(
    id: number | string,
    source?: string[]
  ): Promise<{ 
    url: string; 
    br?: number; 
    size?: number;
  } | void>;
}