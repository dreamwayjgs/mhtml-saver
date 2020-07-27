import { timestampedLog } from '../modules/debugger'
import Preprocessor from './preprocessor';

timestampedLog("Script injected at the beginning! Wait window full loading")

function main() {
  timestampedLog("inject js starts")

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    timestampedLog("REQUEST from master", request["command"])

    const preprocessor = new Preprocessor()

    const response = { webpage: preprocessor.webpage }
    sendResponse(response)
  })
}

main()