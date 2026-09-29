import sheet from "./player.css" with { type: 'css' };
import {PlayerBuild} from "./constructor.js";
class zPlayer extends HTMLElement{
    private isMounted: boolean = false;
    static get observedAttributes() {
       return ["server","type","id","fixed","autoplay","order"];
    }
    constructor(){
        super();
    }
    connectedCallback(){
        const shadow=this.attachShadow({mode:"open"});
        shadow.adoptedStyleSheets = [sheet as CSSStyleSheet];
        const player=PlayerBuild();
        shadow.appendChild(player);
        this.ChangeModule();
        this.isMounted = true;
        this.render();      
    }
    attributeChangedCallback(name:string|null, oldValue:string|null, newValue:string|null){
        if(!this.isMounted||oldValue===newValue) return;
        if(name==='order'){//新值更新icon
            this.updateIcon(this.getAttribute('autoplay')==='true',newValue as string);
        }
        if(name==='autoplay'){
            this.updateIcon(newValue==='true',this.getAttribute('order') as string);
        }
    }
    //更改状态
    private ChangeModule(){
        const module=this.shadowRoot!.querySelector<HTMLSpanElement>(".module");
        const start=this.shadowRoot!.querySelector<HTMLSpanElement>(".start");
        start?.addEventListener("click",()=>{
            const currentState=this.getAttribute('autoplay')==='true';
            this.setAttribute('autoplay',currentState ? 'false' :'true');
        });
        module?.addEventListener("click",()=>{
            const currentModule=this.getAttribute('order');
            switch (currentModule){
                case 'loop':
                    this.setAttribute('order','random');
                    break;
                case 'random':
                    this.setAttribute('order','ordering');
                    break;
                case 'ordering':
                    this.setAttribute('order','loop');
                    break;
                default:
                    console.log("未知的order属性");    
            }
        });
    }
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
        this.updateIcon(this.getAttribute('autoplay')==='true',this.getAttribute('order') as string);
    }
}
customElements.define("z-player",zPlayer);