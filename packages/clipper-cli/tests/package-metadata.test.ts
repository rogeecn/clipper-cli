import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const packageJson = pkg as Record<string, unknown>
const dependencies = packageJson.dependencies as Record<string, unknown> | undefined

describe('clipper-cli package metadata', () => {
  it('declares publishable package metadata and runtime dependencies', () => {
    expect(packageJson.name).toBe('clipper-cli')
    expect(packageJson.version).toBeTruthy()
    expect(packageJson.description).toBeTruthy()
    expect(packageJson.type).toBe('module')
    expect(packageJson.license).toBe('MIT')
    expect(packageJson.repository).toBeTruthy()
    expect(packageJson.homepage).toBeTruthy()
    expect(packageJson.bugs).toBeTruthy()
    expect(packageJson.keywords).toEqual(expect.arrayContaining(['clipper', 'cli']))
    expect(packageJson.engines).toMatchObject({
      node: expect.any(String)
    })
    expect(dependencies).toMatchObject({
      commander: expect.any(String),
      jsdom: expect.any(String),
      playwright: expect.any(String),
      turndown: expect.any(String)
    })
  })
})
