import { timestampedLog } from '../modules/debugger'
import AnswerOverlay, { Answer } from './overlay/answer'
import Boundary from './overlay/boundary'
import CenterFenceExtractor, { createMarker } from './extractors/center-fence'
import { runExtractors } from './extractor-view'
import { ExtractorResult } from './extractors/extractor'
import { evaluate, EvaluationReport } from './evaluators/evaluator'


export function curation(answerData: any[]): ExtractorResult[] | [ExtractorResult[], EvaluationReport[]] | null {
  timestampedLog("Running in ", parent.frames.length)
  const answers = curationAnswer(answerData)
  const extractors = runExtractors()
  // TODO: Pop one good answer
  if (answers) {
    const reports = evaluate(answers[0], extractors)
    console.log("EVAL REPORT", reports)
    return [extractors.map(extractor => extractor.report), reports]
  }
  return extractors.map(extractor => extractor.report)
  // examineAnswer(answerData[0]) // TODO: What answer would be chosen?
}

function curationAnswer(answerData: any[]): Answer[] | null {
  const answers: Answer[] = []
  answerData.forEach((answer: any) => {
    const cssSelector = answer["css_selector"]
    const mainContent: HTMLElement | null = <HTMLElement>document.querySelector(cssSelector)
    if (mainContent !== null) {
      const name = answer.naver_check_user.name
      AnswerOverlay.drawAnswer(mainContent, name)
      answers.push({
        elem: mainContent,
        naver_check_user: {
          name: name
        }
      })
    }
    else {
      timestampedLog("You have null.. send this target")
      chrome.runtime.sendMessage({
        info: "curation-no-main-content",
        message: "No Main Content",
        answer: answer
      })
    }
  })
  if (answers.length > 0) {
    return answers
  }
  return null
}

function examineAnswer(answer: any) {
  timestampedLog("EXAMINE")
  const cssSelector = answer["css_selector"]
  const mainContent: HTMLElement | null = <HTMLElement>document.querySelector(cssSelector)
  if (mainContent === null) {
    timestampedLog("NO ANSWER", answer)
    return;
  }

  const mainContentBoundary = new Boundary(mainContent)
  const centerFence = new CenterFenceExtractor()
  const coordinates = centerFence.examineCenters()
  const overlaps: Boolean[] = []
  for (let coord of coordinates) {
    const boundary = new Boundary(createMarker(coord))
    overlaps.push(mainContentBoundary.isOverlapped(boundary))
  }
  timestampedLog("COORDS", coordinates)
  timestampedLog("OVERLAPS", overlaps)
  const result = {
    "coords": coordinates,
    "overlaps": overlaps
  }

  chrome.runtime.sendMessage({
    command: "request-center-statistics",
    data: result,
    aid: answer.aid
  })
}