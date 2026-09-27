import sheet from "./player.css" with { type: 'css' };
class zPlayer extends HTMLElement{
    constructor(){
        super();
    }
    connectedCallback(){
        const shadow=this.attachShadow({mode:"open"});
        shadow.adoptedStyleSheets = [sheet as CSSStyleSheet];
    }
}
customElements.define("zplayer",zPlayer);