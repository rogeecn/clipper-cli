import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCli } from '../../packages/clipper-cli/src/cli/index.js'
import * as collectCommandModule from '../../packages/clipper-cli/src/cli/commands/collect.js'

const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname
const fixtureDiscoveryCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname
const weixinArticleHtml = readFileSync(new URL('../fixtures/weixin/article.html', import.meta.url), 'utf8')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cli action binding', () => {
  it('executes commands when used through the built binary entry', () => {
    const binaryPath = fileURLToPath(new URL('../../packages/clipper-cli/dist/cli/index.js', import.meta.url))

    const output = execFileSync(process.execPath, [binaryPath, 'plugins'], {
      encoding: 'utf8'
    })

    expect(output).toContain('"publishers"')
  })

  it('builds an executable CLI entry for the global clipper symlink target', () => {
    const binaryPath = fileURLToPath(new URL('../../packages/clipper-cli/dist/cli/index.js', import.meta.url))
    const mode = statSync(binaryPath).mode

    expect(mode & 0o111).not.toBe(0)
  })

  it('prints built-in help for the clipper-cli executable name', () => {
    const binaryPath = fileURLToPath(new URL('../../packages/clipper-cli/dist/cli/index.js', import.meta.url))

    const output = execFileSync(process.execPath, [binaryPath, '--help'], {
      encoding: 'utf8'
    })

    expect(output).toContain('Usage: clipper-cli')
    expect(output).toContain('collect')
  })

  it('runs collect action and writes markdown output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-cli-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>CLI Hello</title></head><body><p>CLI World</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const program = buildCli()
    await program.parseAsync(['collect', 'https://example.com/post', '--output', outputDir, '--publisher', 'markdown'], { from: 'user' })

    const outputFile = join(outputDir, 'CLI Hello.md')
    expect(readFileSync(outputFile, 'utf8')).toContain('CLI World')
  })

  it('prints collect output status after writing output to disk', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-cli-'))
    const writes: string[] = []

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => weixinArticleHtml,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    })

    const program = buildCli()
    await program.parseAsync(['collect', 'https://mp.weixin.qq.com/s?__biz=fixture-article', '--output', outputDir], { from: 'user' })

    try {
      const outputFile = join(outputDir, 'Weixin Fixture Article.md')
      const outputSize = statSync(outputFile).size
      const outputText = writes.join('')

      expect(readFileSync(outputFile, 'utf8')).toContain('Fixture Heading')
      expect(outputText).toContain('是否成功: 是')
      expect(outputText).toContain(`内容大小: ${outputSize} bytes`)
      expect(outputText).toContain(`保存文件路径: ${outputFile}`)
      expect(outputText).toMatch(/采集耗时: \d+ms/)
    } finally {
      stdout.mockRestore()
    }
  })

  it('prints failed collect output status when writing output to disk fails', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'clipper-cli-'))
    const outputDir = join(tempDir, 'occupied-output-path')
    const writes: string[] = []
    const previousExitCode = process.exitCode

    writeFileSync(outputDir, 'occupied')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => weixinArticleHtml,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    })

    const program = buildCli()

    try {
      process.exitCode = undefined

      await expect(
        program.parseAsync(['collect', 'https://mp.weixin.qq.com/s?__biz=fixture-article', '--output', outputDir], { from: 'user' })
      ).resolves.toBe(program)

      const outputLines = writes.join('').replace(/\r\n/g, '\n').trim().split('\n')

      expect(outputLines).toHaveLength(2)
      expect(outputLines[0]).toBe('采集状态: 失败')
      expect(outputLines[1]).toMatch(/^失败原因: .+$/)
      expect(process.exitCode).toBe(1)
    } finally {
      process.exitCode = previousExitCode
      stdout.mockRestore()
    }
  })

  it('stringifies non-Error collect output failures', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-cli-'))
    const writes: string[] = []
    const previousExitCode = process.exitCode

    const collectSpy = vi.spyOn(collectCommandModule, 'runCollectCommand').mockRejectedValueOnce({
      reason: 'plain failure'
    })

    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    })

    const program = buildCli()

    try {
      process.exitCode = undefined

      await expect(
        program.parseAsync(['collect', 'https://example.com/post', '--output', outputDir], { from: 'user' })
      ).resolves.toBe(program)

      const outputLines = writes.join('').replace(/\r\n/g, '\n').trim().split('\n')

      expect(outputLines).toEqual([
        '采集状态: 失败',
        '失败原因: {"reason":"plain failure"}'
      ])
      expect(process.exitCode).toBe(1)
    } finally {
      process.exitCode = previousExitCode
      stdout.mockRestore()
      collectSpy.mockRestore()
    }
  })

  it('does not expose unused command registration helpers', async () => {
    const collectModule = await import('../../packages/clipper-cli/src/cli/commands/collect.js')
    const publishModule = await import('../../packages/clipper-cli/src/cli/commands/publish.js')
    const pluginsModule = await import('../../packages/clipper-cli/src/cli/commands/plugins.js')

    expect('registerCollectCommand' in collectModule).toBe(false)
    expect('registerPublishCommand' in publishModule).toBe(false)
    expect('registerPluginsCommand' in pluginsModule).toBe(false)
  })
})
