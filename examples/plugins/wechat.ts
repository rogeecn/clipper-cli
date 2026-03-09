export const wechatCollector = {
  name: 'wechat',
  match(url: URL) {
    return url.hostname === 'mp.weixin.qq.com'
  },
  shouldFallback() {
    return false
  },
  buildClientOptions() {
    return {
      waitUntil: 'networkidle',
      waitForSelector: '#js_content'
    }
  }
}
