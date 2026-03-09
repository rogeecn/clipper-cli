# clipper-cli

一个可发布到 NPM 的 CLI 工具，用于通过插件化 `collector`、`transformer` 和 `publisher` 采集网页内容并落地为 Markdown。

## Features

- 默认 `request` 采集通道
- 插件声明式 `client(cdp)` fallback（Playwright）
- `collector / transformer / publisher + hooks` 插件架构
- `markdown` / `obsidian` 文件落地发布器
- 自动发现 `clipper.config.*`
- `--debug` 调试产物输出

## Installation

```bash
npm install clipper-cli
```

## Usage

```bash
clipper collect <url> --publisher markdown --output ./notes
clipper collect <url> --publisher obsidian --output ./vault --debug
clipper publish ./document.json --publisher markdown --output ./notes
clipper plugins
```

## Commands

- `clipper collect <url>`：采集页面、转换内容并发布到目标目录
- `clipper publish <input>`：对已有标准文档执行发布
- `clipper plugins`：查看已注册插件

## Config

会自动发现以下配置文件：

- `clipper.config.mjs`
- `clipper.config.js`
- `clipper.config.ts`

示例：

```ts
export default {
  collectors: [
    {
      name: 'wechat',
      match(url) {
        return url.hostname === 'mp.weixin.qq.com'
      },
      shouldFallback(result) {
        return result.status !== 200
      },
      buildClientOptions() {
        return {
          waitUntil: 'networkidle',
          waitForSelector: '#js_content'
        }
      }
    }
  ],
  transformers: [],
  publishers: []
}
```

用户配置会按名称与默认插件合并，用户定义优先，默认插件兜底。

## Debug

开启 `--debug` 后，会写入：

- `.clipper/debug/<timestamp>/request.json`
- `.clipper/debug/<timestamp>/response.json`
- `.clipper/debug/<timestamp>/raw.html`
- `.clipper/debug/<timestamp>/cleaned.html`
- `.clipper/debug/<timestamp>/document.json`
- `.clipper/debug/<timestamp>/screenshot.png`（仅 fallback client 时）

## Publish

当前打包入口为 `dist/src/cli/index.js`，已通过：

- `npm run build`
- `npm test`
- `npm pack --dry-run`

发布前建议检查：

```bash
npm version patch
npm publish
```
