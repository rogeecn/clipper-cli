import { resolveRuntimeConfigResult } from '../../core/config.js'

const COLLECTOR_PRESENTATION_FALLBACKS: Record<string, { displayName: string; description: string; urlPatterns: string[] }> = {
  weixin: {
    displayName: '微信公众号文章',
    description: '采集微信公众号文章页，提取正文、摘要和相关元信息。',
    urlPatterns: [
      'https://mp.weixin.qq.com/s?*',
      'https://mp.weixin.qq.com/s/*'
    ]
  },
  generic: {
    displayName: '通用网页',
    description: '采集常见 HTML 页面，提取标题和正文内容。',
    urlPatterns: [
      'http://*',
      'https://*'
    ]
  }
}

function getCollectorPresentation(plugin: { name: string; displayName?: string; description?: string; urlPatterns?: string[] }) {
  const fallback = COLLECTOR_PRESENTATION_FALLBACKS[plugin.name]

  return {
    displayName: plugin.displayName ?? fallback?.displayName ?? plugin.name,
    description: plugin.description ?? fallback?.description ?? '未提供说明',
    urlPatterns: plugin.urlPatterns ?? fallback?.urlPatterns ?? ['未提供规则']
  }
}

function formatDiagnostics(diagnostics: Array<{ packageName: string; stage: string; status: string; message: string }>) {
  if (diagnostics.length === 0) {
    return '诊断信息:\n- 无'
  }

  return [
    '诊断信息:',
    ...diagnostics.map((diagnostic) => `- [${diagnostic.status}] ${diagnostic.packageName} (${diagnostic.stage}): ${diagnostic.message}`)
  ].join('\n')
}

export async function listPlugins(options: { cwd?: string; config?: string; verbose?: boolean; globalNodeModulesPath?: string } = {}) {
  const runtimeConfig = await resolveRuntimeConfigResult({ cwd: options.cwd, configPath: options.config, globalNodeModulesPath: options.globalNodeModulesPath })

  const lines = [
    '可采集链接规则:',
    ...runtimeConfig.collectors.flatMap((plugin, index) => {
      const presentation = getCollectorPresentation(plugin)

      return [
      `${index + 1}. ${presentation.displayName}`,
      `   标识: ${plugin.name}`,
      `   说明: ${presentation.description}`,
      '   规则:',
      ...presentation.urlPatterns.map((pattern) => `   - ${pattern}`)
    ]
    })
  ]

  if (options.verbose) {
    lines.push('', formatDiagnostics(runtimeConfig.diagnostics))
  }

  return lines.join('\n')
}
