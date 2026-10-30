import cssString from "./player.css?inline";
import {PlayerBuild} from "./constructor.js";
import {getRandomIntInclusive,formate} from "./tool.js";
import {parseLRC} from "./lyrics.js";
import type {musicData,musicList,lyrics} from "./types.js";
class zPlayer extends HTMLElement{
    private isPlaying:boolean=this.getAttribute('autoplay')==='true';
    private currentMode=this.getAttribute('order');
    private audio=new Audio();
    private songsList:musicList[]=[];
    private currentIndex:number=0;
    private isDragging: boolean = false;
    private currentLyrics: lyrics[] = [];
    static get observedAttributes() {
       return ["server","type","id","fixed","autoplay","order"];
    }
    constructor(){
        super();
    }
    async connectedCallback(){
        const shadow=this.attachShadow({mode:"open"});
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssString);
        shadow.adoptedStyleSheets = [sheet];
        shadow.appendChild(PlayerBuild());
        await this.initData();
        this.musicList();
        this.ChangeModule();
        this.volume();
        this.lyricsToggle();
        this.musicPlay();
        this.render();     
    }
    //解析数据
    private async initData(){
        try{
            const server=this.getAttribute("server");
            const type=this.getAttribute("type");
            const id=this.getAttribute("id");
            if (!server||!type||!id){
                console.log("不存在属性");
                return;
            }
            const API_BASE = "https://api.zsaw.dpdns.org";     
            const response = await fetch(`${API_BASE}/api/music/${server}/${type}/${id}`);
            const result:musicData=await response.json();
            this.songsList=result.data.songs;
            if(this.songsList.length>0){
                this.loadMusic(this.currentIndex);
            }
        }
        catch(error){
            console.log(error);
        }
    }
    private updateLyricHighlight(time?: number){
    if (this.currentLyrics.length===0) return;
    const currentTime=time??this.audio.currentTime;
    let activeIndex=this.currentLyrics.findIndex(lrc => lrc.time > currentTime) - 1;
    if (activeIndex===-2) activeIndex=this.currentLyrics.length - 1;
    if (activeIndex===-1) activeIndex=0;
    const lrcUl=this.shadowRoot?.querySelector<HTMLUListElement>(".lrc-list");
    const lines=lrcUl?.querySelectorAll<HTMLLIElement>(".lrc-line");
    if (!lines||!lrcUl||!lines[activeIndex]) return;
    lines.forEach((li, i)=>{
    if (i === activeIndex) {
      li.classList.add("text-red-500", "opacity-100", "scale-110");
      li.classList.remove("opacity-50");
    } else {
      li.classList.remove("text-red-500", "opacity-100", "scale-110");
      li.classList.add("opacity-50");
    }});
    const wrapperHeight=lrcUl.parentElement?.clientHeight ?? 256;
    const activeLine=lines[activeIndex];
    const offset=activeLine.offsetTop + activeLine.offsetHeight / 2 - wrapperHeight / 2;
    lrcUl.style.transform=`translateY(-${offset}px)`;
}
    //加载歌曲
    private async loadMusic(index:number){
        if(this.songsList.length===0)
            return;
        const song=this.songsList[index];
        const server=this.getAttribute("server");
        const title=this.shadowRoot?.querySelector<HTMLParagraphElement>(".title");
        const author=this.shadowRoot?.querySelector<HTMLParagraphElement>(".author");
        const cover=this.shadowRoot?.querySelector<HTMLImageElement>(".img");
        if(title) title.innerText=song.title;
        if(author) author.innerText=song.artist;
        if(cover) cover.src=song.cover;
        const lis=this.shadowRoot?.querySelectorAll(".musicLi");
        if(lis){
            lis.forEach((li,i)=>{
                if(i===index){
                    li.classList.add("active");
                }else{
                    li.classList.remove("active");
                }
            });
        }
        if(!song.src || !song.lrc){
            try{
                const API_BASE = "https://api.zsaw.dpdns.org";
                const targetUrl = `${API_BASE}/api/lyrics/${server}/${song.id}`;
                console.log("正在请求单曲接口:", targetUrl);
                const response = await fetch(targetUrl);
                const json = await response.json();
                console.log("后端返回的单曲数据:", json); 
                if (json.code === 200 && json.data) {
                    song.src = json.data.src;
                    song.lrc = json.data.lrc;
                } else {
                    console.error("后端返回状态码异常:", json);
                }
            }catch(err){
                console.error("按需获取单曲详情失败:", err);
            }
        }
        console.log("最终赋给 audio.src 的地址是:", song.src); 
        if (!song.src) {
            console.error("致命错误：song.src 为空，浏览器无法加载！");
            return;
        }
        this.audio.crossOrigin = "anonymous";
        this.audio.src = song.src;
        this.audio.load();
        this.currentLyrics = parseLRC(song.lrc || "");
        this.renderLyrics();
        if(this.isPlaying) {
            this.audio.play().catch(e=>console.log("自动播放错误:",e));
        } 
    }
    //更改状态
    private ChangeModule(){
        const module=this.shadowRoot!.querySelector<HTMLSpanElement>(".module");
        const start=this.shadowRoot!.querySelector<HTMLSpanElement>(".start");
        const prev=this.shadowRoot!.querySelector<HTMLSpanElement>(".prev");
        const next=this.shadowRoot!.querySelector<HTMLSpanElement>(".next");
        start?.addEventListener("click",()=>{
            this.isPlaying=!this.isPlaying;
            if(this.isPlaying){
                this.audio.play();
            }else{
                this.audio.pause();
            }
            this.render();
        });
        module?.addEventListener("click",()=>{
            switch (this.currentMode){
                case 'loop':
                    this.currentMode='random';
                    break;
                case 'random':
                    this.currentMode='ordering';
                    break;
                case 'ordering':
                    this.currentMode='loop';
                    break;
                default:
                    console.log("未知的order属性");    
            }
            this.render();
        });
        prev?.addEventListener("click",()=>{
            const totals=this.songsList.length;
            if(totals === 0) return;
            if(this.currentMode==="random"){
                this.currentIndex=getRandomIntInclusive(0,totals-1);
            }else{
            this.currentIndex=(this.currentIndex-1+totals)%totals;
            this.loadMusic(this.currentIndex);
            }
        });
        next?.addEventListener("click",()=>{
            const totals=this.songsList.length;
            if(totals===0) return;
            if (this.currentMode==="random"){
                this.currentIndex=getRandomIntInclusive(0,totals-1);
            }else{
                this.currentIndex=(this.currentIndex+1)%totals;
            }
            this.loadMusic(this.currentIndex);
        });
    }
    //audio
    private musicPlay(){
        const controller=this.shadowRoot?.querySelector<HTMLInputElement>(".control");
        controller?.addEventListener("mousedown",()=>{
            this.isDragging=true;
        });
        controller?.addEventListener("mouseup",()=>{
            this.isDragging=false;
        });
        controller?.addEventListener("touchstart",()=>{
            this.isDragging=true;
        });
        controller?.addEventListener("touchend",()=>{
            this.isDragging = false;
        });
        this.audio.addEventListener("loadedmetadata",()=>{
            if(controller){
                controller.max=String(this.audio.duration);
            }
        });
        this.audio.addEventListener("timeupdate",()=>{
            if(controller&&!this.isDragging){
                controller.value=String(this.audio.currentTime);
            }
            this.updateLyricHighlight();
        });
        this.audio.addEventListener("seeked",()=>{
            this.updateLyricHighlight();
        });
        controller?.addEventListener("input", (e)=>{
            const val=(e.target as HTMLInputElement).value;
            this.audio.currentTime = Number(val);
            this.updateLyricHighlight(Number(val));
        });
        this.audio.addEventListener("ended", () => {
            const totals = this.songsList.length;
            switch (this.currentMode) {
                case "loop":
                    this.audio.currentTime = 0;
                    this.audio.play();
                    break;
                case "random":
                    this.currentIndex = getRandomIntInclusive(0, totals - 1);
                    this.loadMusic(this.currentIndex);
                    break;
                case "ordering":
                    this.currentIndex = (this.currentIndex + 1) % totals;
                    this.loadMusic(this.currentIndex);
                    break;
            }
        });
    }
    //隐藏栏
     private async musicList() {
        const list= this.shadowRoot?.querySelector<HTMLSpanElement>(".list");
            const ol = document.createElement("ol");
            ol.className = "musicOl hidden"; 
            this.songsList.forEach((song, index) => {
                const li = document.createElement("li");
                li.className=index=== this.currentIndex?"musicLi active group":"musicLi group";
                const leftZone = document.createElement("div");
                leftZone.className = "musicInfoLeft";
                const musicIndex = document.createElement("span");
                musicIndex.className = "musicIndex";
                musicIndex.innerText = (index + 1).toString().padStart(2, '0');
                const musicTitle = document.createElement("span");
                musicTitle.className = "musicTitle";
                musicTitle.innerText = song.title;
                leftZone.append(musicIndex, musicTitle);
                const rightZone = document.createElement("div");
                rightZone.className = "musicInfoRight";
                const musicAuthor = document.createElement("span");
                musicAuthor.className = "musicAuthor";
                musicAuthor.innerText = song.artist;
                const musicTime = document.createElement("span");
                musicTime.className = "musicTime";
                musicTime.innerText = formate(song.duration);
                rightZone.append(musicAuthor, musicTime);
                li.append(leftZone,rightZone);
                li.addEventListener("click",()=>{
                    this.currentIndex=index;
                    this.isPlaying = true;
                    this.loadMusic(this.currentIndex);
                    this.render();

                });
                ol.appendChild(li);
            });
            this.shadowRoot?.appendChild(ol);
            list?.addEventListener("click", () => {
                ol.classList.toggle("hidden");
            });
    }
    //音量隐藏
    private volume(){
        const trumpet = this.shadowRoot?.querySelector<HTMLSpanElement>(".trumpet");
        const volPanel = this.shadowRoot?.querySelector<HTMLDivElement>(".volPanel");
        const volSlider = this.shadowRoot?.querySelector<HTMLInputElement>(".volSlider");
        const volText = this.shadowRoot?.querySelector<HTMLDivElement>(".volText");
        trumpet?.addEventListener("click",()=>{
            volPanel?.classList.toggle("hidden");
        });
        volSlider?.addEventListener("input",(e)=>{
            const val=(e.target as HTMLInputElement).value;
            if (volText){
                volText.innerText= `${val}%`;
            }
            this.audio.volume=Number(val)/100;
        });
    }
    //歌词显隐
    private lyricsToggle(){
        const songs=this.shadowRoot?.querySelector<HTMLSpanElement>(".songs");
        const wrapper=this.shadowRoot?.querySelector<HTMLDivElement>(".lrc-wrapper");
        songs?.addEventListener("click",()=>{
            wrapper?.classList.toggle("hidden");
        });
    }
    //更新icon
    private updateIcon(isPlaying:boolean,state:string){
        const start=this.shadowRoot?.querySelector<HTMLSpanElement>(".start");
        const module=this.shadowRoot?.querySelector<HTMLSpanElement>(".module");
        if (!start||!module) return ; 
        const pause=`<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h2v9H5v-9zm4 0h2v9H9v-9z"/></svg>`;
        const play= `<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style="margin-left: 2px;"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
        const iconRandom = `<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.827 10.99 11.202 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.173 5.01 2.798 4 1 4H.5a.5.5 0 0 1-.5-.5z"/><path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/></svg>`;
        const iconOrdering = `<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.832.556A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192Zm3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z"/></svg>`;
        const iconLoop = `<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.832.556A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192Zm3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z"/><path d="M9 5v6h-1V6.5l-1.5.5v-1l2-1h.5z"/></svg>`;
        start.innerHTML = isPlaying ? pause : play;
        switch (state){
            case 'loop':
                module.innerHTML=iconLoop;
                break;
            case 'random':
                module.innerHTML=iconRandom;
                break;
            case 'ordering':
                module.innerHTML=iconOrdering;
                break;
            default:
                console.log("未知的order属性");              
        }
    }
    private render(){
        this.updateIcon(this.isPlaying,this.currentMode as string);
    }
    private renderLyrics(){
        const lrcUl = this.shadowRoot?.querySelector<HTMLUListElement>(".lrc-list");
        if(!lrcUl) return;
        lrcUl.innerHTML="";
        this.currentLyrics.forEach(lrc=>{
            const li = document.createElement("li");
            li.className = "lrc-line transition-all duration-300 opacity-50";
            li.innerText = lrc.text;
            lrcUl.appendChild(li);
        });
    }
}
customElements.define("z-player",zPlayer);