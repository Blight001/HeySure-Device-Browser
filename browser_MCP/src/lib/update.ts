const PRODUCT_ID = 'chrome-extension'
const TARGET_ID = 'chrome-mv3-stable'
const NOTICE_PREFIX = 'heysure-update:'
const STORAGE_KEY = '_update_notice_versions'

interface UpdateInfo {
  latest_version?: string
  update_available?: boolean
  release_notes?: string
  release_page_url?: string
}

let checking: Promise<void> | null = null

async function markFirstNotice(version: string): Promise<boolean> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const versions = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY].map(String) : []
  if (versions.includes(version)) return false
  await chrome.storage.local.set({ [STORAGE_KEY]: [...versions.slice(-19), version] })
  return true
}

async function check(serverUrl: string): Promise<void> {
  const base = String(serverUrl || '').replace(/\/+$/, '')
  if (!base) return
  const current = chrome.runtime.getManifest().version
  const endpoint = `${base}/api/device-hall/updates/${PRODUCT_ID}/${TARGET_ID}?current_version=${encodeURIComponent(current)}`
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const info = await response.json() as UpdateInfo
  const latest = String(info.latest_version || '').trim()
  const releasePage = String(info.release_page_url || '').trim()
  if (!info.update_available || !latest || !releasePage || !(await markFirstNotice(latest))) return
  const notificationId = `${NOTICE_PREFIX}${latest}`
  await chrome.storage.local.set({ [`${notificationId}:url`]: releasePage })
  await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `HeySure Agent ${latest} 可更新`,
    message: String(info.release_notes || '是否打开当前服务器的设备大厅下载更新？'),
    buttons: [{ title: '前往下载' }, { title: '稍后' }],
    priority: 1,
  })
}

/** Best-effort: update discovery must never affect login or socket recovery. */
export function checkBrowserUpdate(serverUrl: string): Promise<void> {
  if (checking) return checking
  checking = check(serverUrl)
    .catch(error => console.warn('[HeySure update] 检查更新失败:', error))
    .finally(() => { checking = null })
  return checking
}

async function openReleasePage(notificationId: string): Promise<void> {
  if (!notificationId.startsWith(NOTICE_PREFIX)) return
  const key = `${notificationId}:url`
  const stored = await chrome.storage.local.get(key)
  const url = String(stored[key] || '')
  if (/^https?:\/\//i.test(url)) await chrome.tabs.create({ url })
  await chrome.notifications.clear(notificationId)
}

chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (buttonIndex === 0) void openReleasePage(id)
  else if (id.startsWith(NOTICE_PREFIX)) void chrome.notifications.clear(id)
})

chrome.notifications.onClicked.addListener(id => { void openReleasePage(id) })
