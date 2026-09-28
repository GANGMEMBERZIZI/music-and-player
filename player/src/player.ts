import sheet from "./player.css" with { type: 'css' };
import {PlayerBuild} from "./constructor.js";
class zPlayer extends HTMLElement{
    constructor(){
        super();
    }
    connectedCallback(){
        const shadow=this.attachShadow({mode:"open"});
        shadow.adoptedStyleSheets = [sheet as CSSStyleSheet];
        const player=PlayerBuild();
        shadow.appendChild(player);        
    }
}
customElements.define("zplayer",zPlayer);