# clipper-cli

一个可发布到 NPM 的 CLI 工具，用于通过插件化 `collector`、`transformer` 和 `publisher` 采集网页内容并落地为 Markdown。

## Features

- 默认 `request` 采集通道
- 插件声明式 `client(cdp)` fallback（Playwright）
- `collector / transformer / publisher + hooks` 插件架构
- `markdown` / `obsidian` 文件落地发布器
- 自动发现当前项目已安装的插件包
- 自动加载 `clipper.config.*` 作为行为覆盖配置
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
clipper plugins --verbose
```

## Commands

- `clipper collect <url>`：采集页面、转换内容并发布到目标目录
- `clipper publish <input>`：对已有标准文档执行发布
- `clipper plugins`：查看已加载插件
- `clipper plugins --verbose`：查看插件发现与加载诊断

## Config

会自动加载以下配置文件：

- `clipper.config.mjs`
- `clipper.config.js`
- `clipper.config.ts`

配置文件主要用于覆盖行为，而不是注册插件对象。示例：

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

内置插件会先加载，随后合并自动发现的已安装插件，最后再应用用户配置中的覆盖项。

## Plugin Authoring

安装到当前项目可解析范围内的插件会被自动发现，无需再在 `clipper.config.*` 中手动注册。推荐使用 `clipper-plugin-*` 或 `@scope/clipper-plugin-*` 包名，并在插件包的 `package.json` 中声明 `clipper.plugin` 元数据：

```json
{
  "name": "clipper-plugin-example",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "clipper": {
    "plugin": true,
    "apiVersion": 1,
    "kind": ["collector", "publisher"],
    "entry": "./dist/index.js"
  }
}
```

插件模块应导出 `default` 或命名导出 `plugin`，并返回包含 `name`、`collectors`、`transformers`、`publishers` 的对象。

本地未发布插件同样支持，只要它已经安装到当前项目：

- `npm install ../clipper-plugin-local`
- `npm install file:../clipper-plugin-local`
- workspace 依赖
- `npm link clipper-plugin-local`

可以通过 `clipper plugins` 查看已加载插件；排查问题时使用 `clipper plugins --verbose` 查看发现和加载诊断。

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
