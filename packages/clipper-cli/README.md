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
clipper-cli collect <url> --publisher markdown --output ./notes
clipper-cli collect <url> --publisher obsidian --output ./vault --debug
clipper-cli publish ./document.json --publisher markdown --output ./notes
clipper-cli plugins
clipper-cli plugins --verbose
```
