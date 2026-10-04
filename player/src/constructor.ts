export function PlayerBuild(){
    const player=document.createElement("div");
        player.className="player";
        //唱片
        const record=document.createElement("div");
        record.className="record";
        //详细信息
        const info=document.createElement("div");
        info.className="info";
        const title=document.createElement("p");
        title.className="title";
        const author=document.createElement("p");
        author.className="author";
        info.appendChild(title);
        info.appendChild(author);
        //进度条
        const controller=document.createElement("input");
        controller.type="range";
        controller.className="control";
        //控制栏 模式 前 后 播放键 列表
        const option=document.createElement("div");
        option.className="option";
        //模式 (单曲循环,随机播放,顺序播放)
        const module=document.createElement("span");
        module.className="module";
        // <-
        const prev=document.createElement("span");
        prev.className="prev";
        prev.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 4a.5.5 0 0 0-1 0v8a.5.5 0 0 0 1 0V4zm9.704.308L6.841 8l6.363 3.692c.54.313 1.233-.066 1.233-.697V4.308c0-.63-.692-1.01-1.233-.696z"/></svg>`;
        // 播放
        const start=document.createElement("span");
        start.className="start";
        // ->
        const next=document.createElement("span");
        next.className="next";
        next.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 1 1 0v8a.5.5 0 0 1-1 0V4zM2.796 4.308L9.159 8l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696z"/></svg>`;
        //列表
        const list=document.createElement("span");
        list.className="list";
        list.innerHTML = `<svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>`;
        option.appendChild(module);
        option.appendChild(prev);
        option.appendChild(start);
        option.appendChild(next);
        option.appendChild(list);
        //other其他 歌词以及 声音
        const others=document.createElement("div");
        others.className="others";
        //歌词
        const songs=document.createElement("span");
        songs.className="songs";
        songs.textContent = "词";
        //声音 
        const trumpet=document.createElement("span");
        trumpet.className="trumpet";
        trumpet.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.889l.706.707z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg>`;
        //隐藏栏
        const volumeWrapper = document.createElement("div");
        volumeWrapper.className = "relative flex items-center justify-center";
        const volPanel = document.createElement("div");
        volPanel.className = "volPanel hidden";
        const volSliderWrapper = document.createElement("div");
        volSliderWrapper.className = "relative w-full h-24 flex items-center justify-center";
        const volSlider = document.createElement("input");
        volSlider.type = "range";
        volSlider.min = "0";
        volSlider.max = "100";
        volSlider.value = "47"; 
        volSlider.className = "volSlider";
        const volText = document.createElement("div");
        volText.className = "volText";
        volText.innerText = "47%";
        volSliderWrapper.appendChild(volSlider);
        volPanel.append(volSliderWrapper, volText);
        volumeWrapper.append(trumpet, volPanel);
        others.appendChild(songs);
        others.appendChild(volumeWrapper);
        // 组装
        player.appendChild(record);
        player.appendChild(info);
        player.appendChild(controller);
        player.appendChild(option);
        player.appendChild(others);
        return player;
}