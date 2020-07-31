import { greet } from "./controller/hello"
import {
  getArticleAction, getArticlesAction,
  getFailedArticlesAction, postArticleAction, getArticleFileAction, getArticleCheckedAnswerAction
} from "./controller/NaverArticle"
import { postFileAction } from "./controller/FileHandler"
import { getQueryBoardAction } from './controller/queryboard'

export const AppRoutes = [
  {
    path: "/",
    method: "get",
    action: greet
  },
  {
    path: "/articles",
    method: "get",
    action: getArticlesAction
  },
  {
    path: "/articles/failed",
    method: "get",
    action: getFailedArticlesAction
  },
  {
    path: "/article",
    method: "get",
    action: getArticleAction
  },
  {
    path: "/article/answer",
    method: "get",
    action: getArticleCheckedAnswerAction
  },
  {
    path: "/article/file",
    method: "get",
    action: getArticleFileAction
  },
  {
    path: "/article",
    method: "post",
    action: postArticleAction
  },
  {
    path: '/article/upload',
    method: 'post',
    action: postFileAction
  },
  {
    path: '/queryboard',
    method: 'get',
    action: getQueryBoardAction
  }
]