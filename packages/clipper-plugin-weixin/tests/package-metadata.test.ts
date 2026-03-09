import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const packageJson = pkg as Record<string, unknown>
const dependencies = packageJson.dependencies as Record<string, unknown> | undefined
const peerDependencies = packageJson.peerDependencies as Record<string, unknown> | undefined
const devDependencies = packageJson.devDependencies as Record<string, unknown> | undefined
const clipper = packageJson.clipper as Record<string, unknown> | undefined

describe('clipper-plugin-weixin package metadata', () => {
  it('declares publishable plugin metadata and host compatibility honestly', () => {
    expect(packageJson.name).toBe('clipper-plugin-weixin')
    expect(packageJson.version).toBeTruthy()
    expect(packageJson.description).toBeTruthy()
    expect(packageJson.type).toBe('module')
    expect(packageJson.license).toBe('MIT')
    expect(packageJson.keywords).toEqual(expect.arrayContaining(['clipper', 'weixin', 'plugin']))
    expect(packageJson.repository).toBeTruthy()
    expect(packageJson.homepage).toBeTruthy()
    expect(packageJson.bugs).toBeTruthy()
    expect(packageJson.engines).toMatchObject({
      node: expect.any(String)
    })
    expect(dependencies).toMatchObject({
      jsdom: expect.any(String),
      turndown: expect.any(String)
    })
    expect(peerDependencies).toMatchObject({
      'clipper-cli': expect.any(String)
    })
    expect(devDependencies).toMatchObject({
      'clipper-cli': expect.any(String)
    })
    expect(clipper).toMatchObject({
      plugin: true,
      apiVersion: 1,
      kind: ['collector', 'transformer'],
      entry: './dist/index.js'
    })
  })
})
