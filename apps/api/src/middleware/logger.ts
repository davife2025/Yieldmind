import type { Request, Response, NextFunction } from "express"

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const { method, path, ip } = req

  res.on("finish", () => {
    const ms     = Date.now() - start
    const status = res.statusCode
    const color  = status >= 500 ? "\x1b[31m" :
                   status >= 400 ? "\x1b[33m" :
                   status >= 200 ? "\x1b[32m" : "\x1b[0m"
    console.log(
      `${color}${method}\x1b[0m ${path} ${color}${status}\x1b[0m ${ms}ms — ${ip}`
    )
  })

  next()
}
