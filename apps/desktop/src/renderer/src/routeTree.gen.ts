/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as CChatIDImport } from './routes/c/$chatID'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const CChatIDRoute = CChatIDImport.update({
  id: '/c/$chatID',
  path: '/c/$chatID',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/c/$chatID': {
      id: '/c/$chatID'
      path: '/c/$chatID'
      fullPath: '/c/$chatID'
      preLoaderRoute: typeof CChatIDImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/c/$chatID': typeof CChatIDRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/c/$chatID': typeof CChatIDRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/c/$chatID': typeof CChatIDRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/c/$chatID'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/c/$chatID'
  id: '__root__' | '/' | '/c/$chatID'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  CChatIDRoute: typeof CChatIDRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  CChatIDRoute: CChatIDRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/c/$chatID"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/c/$chatID": {
      "filePath": "c/$chatID.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
