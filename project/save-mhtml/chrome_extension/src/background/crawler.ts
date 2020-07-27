import { timestampedLog, timestampedAssert } from '../modules/debugger'
import { getArticlesUrl, postArticle, getArticlesById } from './server'
import Article, { ArticlePath } from '../entities/Article'

type PageStatus = "all" | "failed" | "success"
type CrawlStatus = "idle" | "running" | "done"

const MAX_PAGE_LOAD_TIMEOUT = 20000
const MAX_PREPROCESS_TIMEOUT = 5000

class Crawler {
  articles: Article[]
  currentIndex: number = 0
  status: CrawlStatus = "idle"
  tabId: number = chrome.tabs.TAB_ID_NONE
  saveStarted = false
  onLoadListener: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void
  onCommittedListener: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void

  constructor(articles: Article[]) {
    this.articles = articles
    this.onLoadListener = this.saveOnLoad.bind(this)
    this.onCommittedListener = this.saveOnTimeoutForDelayedPage.bind(this)
  }

  static async gatherPagesWithStatus(status: PageStatus, from?: number, size?: number) {
    let filter: ArticlePath = ""
    if (status === "failed") filter = "/failed";
    const articles = await getArticlesUrl(filter, from, size)
    timestampedLog(articles)
    return new Crawler(articles)
  }

  static async pickPagesWithId(ids: string[]) {
    const articles = await getArticlesById(ids)
    timestampedLog("TARGETS: ", articles)
    return new Crawler(articles)
  }

  crawl(tabId: number) {
    timestampedLog("Crawl starts...")
    this.tabId = tabId

    chrome.webNavigation.onCompleted.addListener(this.onLoadListener)
    chrome.webNavigation.onCommitted.addListener(this.onCommittedListener)
    this.loadPage()
  }

  saveOnTimeoutForDelayedPage(details: chrome.webNavigation.WebNavigationFramedCallbackDetails) {
    const frameId = details.frameId
    if (frameId !== 0) return;

    timestampedLog(`Wait ${MAX_PAGE_LOAD_TIMEOUT / 1000} seconds from now on`)
    setTimeout(() => {
      if (!this.saveStarted) {
        this.saveStarted = true
        timestampedLog("Force saving")
        this.savePage(details, true)
      }
    }, MAX_PAGE_LOAD_TIMEOUT)
  }

  saveOnLoad(details: chrome.webNavigation.WebNavigationFramedCallbackDetails) {
    const frameId = details.frameId
    if (frameId !== 0) return;

    timestampedLog("Loaded")
    if (!this.saveStarted) {
      this.saveStarted = true
      timestampedLog(`[LOAD] REQUEST preprocessing in ${MAX_PREPROCESS_TIMEOUT / 1000} seconds`)
      setTimeout(() => {
        this.savePage(details)
      }, MAX_PREPROCESS_TIMEOUT, this)
    }
    else timestampedLog("already saving")
  }

  savePage(details: chrome.webNavigation.WebNavigationCallbackDetails, forced = false) {
    const tabId = details.tabId
    const articleId = this.articles[this.currentIndex].id
    const normallyLoaded = !forced
    chrome.tabs.sendMessage(tabId, { command: "crawl" }, async res => {
      const lastError = chrome.runtime.lastError
      if (lastError) {
        timestampedLog("error occured")
        return
      }

      timestampedAssert(normallyLoaded, "page not completely loaded. force indexing")
      const numOfFrames = (await chrome.webNavigation.getAllFrames({ tabId: tabId }))?.length

      try {
        timestampedLog("Saving pages...", articleId, details.url)
        const page = await chrome.pageCapture.saveAsMHTML({ tabId: tabId })
        postArticle(articleId, {
          timestamp: new Date().toISOString(),
          status: "Success",
          saved: true,
          pageStatus: normallyLoaded,
          numOfFrames: numOfFrames
        }, page, res.webpage)
      } catch (e) {
        timestampedLog("Saving Failed")
        postArticle(articleId, {
          timestamp: new Date().toISOString(),
          status: "Failed",
          saved: false,
          pageStatus: normallyLoaded,
          numOfFrames: numOfFrames
        })
      }
      this.currentIndex++
      timestampedLog("Next page")
      this.loadPage()
    })
  }

  loadPage() {
    const tabId = this.tabId
    const index = this.currentIndex
    if (index >= this.articles.length) {
      this.finish(tabId)
      return
    }

    const url = this.articles[index].url_origin
    timestampedLog("Open page", url)
    this.saveStarted = false
    chrome.tabs.update(tabId, { url: url })
  }

  finish(tabId: number) {
    timestampedLog("Jobs done!", this)
    chrome.webNavigation.onCompleted.removeListener(this.onLoadListener)
    chrome.webNavigation.onCommitted.removeListener(this.onCommittedListener)

    this.currentIndex = 0
  }

  throwError(msg: string): never {
    throw new Error(msg)
  }
}

export default Crawler