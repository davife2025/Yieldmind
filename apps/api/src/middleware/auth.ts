import type { Request, Response, NextFunction } from "express"

// ─────────────────────────────────────────────────────────────
// YieldMind API — Auth Middleware
// Validates X-API-Key header on all non-public routes.
// Set YIELDMIND_API_KEY in your .env to enable.
// If not set, auth is skipped (dev mode).
// ─────────────────────────────────────────────────────────────

const API_KEY = process.env.YIELDMIND_API_KEY

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  // Skip auth in dev if no key is configured
  if (!API_KEY) {
    return next()
  }

  const key =
    req.headers["x-api-key"] as string ||
    (req.headers["authorization"] ?? "").replace("Bearer ", "")

  if (!key || key !== API_KEY) {
    return res.status(401).json({
      error:   "Unauthorized",
      message: "Valid X-API-Key header required",
    })
  }

  next()
}

// Public routes that skip auth
export const PUBLIC_ROUTES = [
  "/health",
  "/api/v1/health",
  "/api/v1/yields",
  "/api/v1/prices",
]

export function conditionalAuth(req: Request, res: Response, next: NextFunction) {
  const isPublic = PUBLIC_ROUTES.some(r => req.path.startsWith(r))
  if (isPublic) return next()
  return requireApiKey(req, res, next)
}
