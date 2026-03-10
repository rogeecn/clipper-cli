# Weixin Request Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Weixin collector build request headers and timeout that match `demo.fetch.js` so host-side requests better mimic the known working browser request profile.

**Architecture:** Keep the change local to `packages/clipper-plugin-weixin/src/index.ts` by adding a Weixin-specific `buildClientOptions` implementation. Copy the browser headers from `demo.fetch.js`, add a dynamic `Referer` based on the requested article URL, and return a fixed `timeout` of `30000` without changing parsing or transformer behavior.

**Tech Stack:** TypeScript, Vitest, clipper plugin collector API, Node.js URL handling.

---

### Task 1: Add a failing collector-options test

**Files:**
- Modify: `packages/clipper-plugin-weixin/tests/weixin.test.ts`
- Reference: `demo.fetch.js:7`
- Modify later: `packages/clipper-plugin-weixin/src/index.ts:132`

**Step 1: Write the failing test**

Replace the current assertion that `buildClientOptions` is undefined with a test that expects it to exist and return the exact request shape.

```ts
it('builds browser-like request options for weixin article fetches', () => {
  const options = weixinCollector.buildClientOptions?.({
    url: 'https://mp.weixin.qq.com/s?__biz=fixture-article'
  } as never)

  expect(options).toMatchObject({
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-CH-UA': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Priority': 'u=0, i',
      'Cookie': 'rewardsn=; wxtokenkey=777',
      'Referer': 'https://mp.weixin.qq.com/s?__biz=fixture-article'
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-plugin-weixin vitest run tests/weixin.test.ts`
Expected: FAIL because `buildClientOptions` is currently undefined.

**Step 3: Commit**

Do not commit unless explicitly requested by the user.

### Task 2: Implement Weixin-specific request options

**Files:**
- Modify: `packages/clipper-plugin-weixin/src/index.ts:1`
- Reference: `demo.fetch.js:7`
- Test: `packages/clipper-plugin-weixin/tests/weixin.test.ts`

**Step 1: Write minimal implementation**

Add a browser header constant and a timeout constant near the top of the file.

```ts
const WEIXIN_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-CH-UA': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Priority': 'u=0, i',
  'Cookie': 'rewardsn=; wxtokenkey=777'
} as const

const WEIXIN_REQUEST_TIMEOUT = 30000
```

Then add `buildClientOptions` to the collector.

```ts
buildClientOptions(input) {
  return {
    timeout: WEIXIN_REQUEST_TIMEOUT,
    headers: {
      ...WEIXIN_BROWSER_HEADERS,
      Referer: input.url
    }
  }
},
```

**Step 2: Run test to verify it passes**

Run: `pnpm --filter clipper-plugin-weixin vitest run tests/weixin.test.ts`
Expected: PASS.

**Step 3: Refactor only if needed**

Keep implementation local and simple. Do not change unrelated parsing logic.

**Step 4: Commit**

Do not commit unless explicitly requested by the user.

### Task 3: Run focused package verification

**Files:**
- Test: `packages/clipper-plugin-weixin/tests/weixin.test.ts`
- Build: `packages/clipper-plugin-weixin/src/index.ts`

**Step 1: Run package build and tests**

Run: `pnpm --filter clipper-plugin-weixin test`
Expected: package build succeeds and Vitest passes.

**Step 2: Review for scope drift**

Confirm only request option behavior changed and existing normalization tests still pass.

**Step 3: Commit**

Do not commit unless explicitly requested by the user.
