# music-and-player

一个跨平台（网易云音乐 / QQ 音乐）的在线音乐播放器项目。项目由两部分组成：

- **`music-api`** —— 基于 Cloudflare Workers 的聚合 API，转发并聚合网易云音乐、QQ 音乐的歌单与歌词接口，附带歌词缓存与 CORS 支持。
- **`player`** —— 一个用 TypeScript + Tailwind CSS 编写的原生 Web Component 音乐播放器 `<z-player>`，通过 Shadow DOM 封装，可直接嵌入任意网页。

> 聚合 API 不存储任何音频文件，仅代理上游公开接口；请仅用于学习与个人用途，并遵守上游平台的服务条款。

## 功能特性

- 网易云音乐、QQ 音乐双数据源
- 歌单 / 专辑 / 歌曲信息聚合解析
- 播放地址（`src`）与歌词（`lrc`）按需懒加载
- 歌词逐句高亮、自动滚动
- 播放模式切换：顺序播放 / 单曲循环 / 随机播放
- 进度条拖动、音量调节、歌单列表、封面展示
- Web Component 封装（Shadow DOM），无样式冲突，开箱即用
- 歌词缓存（Cloudflare Cache API，`s-maxage` 一周）
- 跨域（CORS）支持，可直接被浏览器端调用

## 项目结构

```
music and player
├── music-api/                 # 聚合 API（Cloudflare Workers）
│   ├── src/index.ts           # Worker 入口（生产）
│   ├── main.ts                # Bun 本地服务器入口（本地开发）
│   ├── type.ts                # 接口类型定义
│   ├── wrangler.json          # Wrangler 部署配置
│   ├── .env                   # 环境变量（PORT、Cookie 等，勿提交）
│   └── package.json
└── player/                    # Web Component 播放器
    ├── src/
    │   ├── player.ts          # <z-player> 自定义元素主逻辑
    │   ├── constructor.ts     # 构建播放器 DOM 结构
    │   ├── lyrics.ts          # LRC 歌词解析
    │   ├── tool.ts            # 工具函数
    │   ├── types.ts           # TypeScript 类型
    │   └── player.css         # 播放器样式（内联注入 Shadow DOM）
    ├── vite.config.ts         # Vite 配置（含 Tailwind 插件、代理）
    ├── package.json
    └── dist/player.js         # 构建产物
```

## 技术栈

| 模块 | 技术 |
| --- | --- |
| `music-api` | Cloudflare Workers、Wrangler、Bun、TypeScript |
| `player` | TypeScript、Vite、Tailwind CSS v4、Web Components（Shadow DOM） |

## 快速开始

### 1. 启动聚合 API

项目提供两种运行方式：

**方式 A：Cloudflare Workers（生产）**

```bash
cd music-api
bun install
bunx wrangler dev          # 本地模拟 Workers 环境
bunx wrangler deploy       # 部署到 Cloudflare
```

**方式 B：Bun 本地服务器（`main.ts`）**

```bash
cd music-api
bun install
cp .env.example .env       # 若无 .env，手动创建并配置 PORT
bun run main.ts
```

默认监听端口由 `.env` 中的 `PORT` 决定（示例为 `4000`）。

### 2. 启动播放器（开发）

```bash
cd player
npm install
npm run dev                # 启动 Vite 开发服务器
```

构建产物：

```bash
cd player
npm run build              # 输出到 dist/player.js
```

### 获取歌单信息

```
GET /api/music/:server/:type/:id
```

| 参数 | 说明 |
| --- | --- |
| `server` | 数据源：`netease` 或 `qq` |
| `type` | 资源类型：网易云支持 `playlist` / `album` 等；QQ 仅支持 `songlist` |
| `id` | 歌单 / 专辑 ID |

响应示例：

```json
{
  "code": 200,
  "msg": "OK",
  "data": {
    "playlistName": "歌单名称",
    "total": 100,
    "songs": [
      {
        "id": "歌曲ID",
        "title": "歌曲名",
        "artist": "歌手",
        "album": "专辑",
        "cover": "封面地址",
        "src": "",
        "lrc": "",
        "duration": 223000
      }
    ]
  }
}
```

> 列表中 `src` 与 `lrc` 默认留空，由前端按需调用歌词接口懒加载，以减少首屏请求量。

### 获取单曲播放地址与歌词

```
GET /api/lyrics/:server/:id
```

| 参数 | 说明 |
| --- | --- |
| `server` | 数据源：`netease` 或 `qq` |
| `id` | 歌曲 ID（网易云为数字 id，QQ 为 `songmid`） |

响应示例：

```json
{
  "code": 200,
  "msg": "OK",
  "data": {
    "src": "https://.../xxx.mp3",
    "lrc": "[00:00.00]歌词内容\n[00:10.00]..."
  }
}
```

错误响应统一包含 `code`、`msg`、`data` 字段，常见状态码：`200` 成功、`400` 参数错误、`403` 私密/需登录歌单、`502` 上游请求失败。

## 播放器使用

在页面中引入构建产物后，直接使用自定义元素：

```html
<script type="module" src="./dist/player.js"></script>

<z-player
  server="netease"
  type="playlist"
  id="你的歌单ID"
  order="loop"
  autoplay="false"
></z-player>
```

### 属性说明

| 属性 | 取值 | 说明 |
| --- | --- | --- |
| `server` | `netease` \| `qq` | 数据源 |
| `type` | `playlist` \| `album` \| `songlist` | 资源类型 |
| `id` | string | 歌单 / 专辑 ID |
| `order` | `loop` \| `random` \| `ordering` | 播放模式（单曲循环 / 随机 / 顺序） |
| `autoplay` | `true` \| `false` | 是否自动播放 |

> 播放器默认请求 `https://api.zsaw.dpdns.org` 上的 API。如需指向其他后端，请修改 `player/src/player.ts` 中的 `API_BASE` 常量后重新构建。

## 部署

1. 修改 `music-api/wrangler.json` 中的 `name` 与 `routes`，替换为自己的自定义域名。
2. 执行 `bunx wrangler deploy` 部署 Worker。
3. 将 `player/src/player.ts` 中的 `API_BASE` 改为你的域名，重新 `npm run build`。
4. 把 `player/dist/player.js` 及引用它的页面部署到任意静态托管平台。

## 免责声明

本项目仅用于技术学习与个人用途，所有音乐与歌词版权归原平台所有，请勿用于商业用途。

## TODOList

1. VIP歌曲全部解析
2. 修复bug
