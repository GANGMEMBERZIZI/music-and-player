import type {lyrics} from "./types.js";
export function parseLRC(lrc:string):lyrics[]{
    let result:lyrics[]=[];
    let lrcArr=lrc.split("\n");
    lrcArr.forEach(element=>{
        const match=element.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/);
        if(!match) return ;
        const m=Number(match[1]);
        const s=Number(match[2]);
        let text=match[3].trim();
        if(text==="")
            text="纯音乐请欣赏^ ^"
        result.push({
            time:m*60+s,
            text:text
        });
    });
    return result;
}