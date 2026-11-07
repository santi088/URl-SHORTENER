import * as z from 'zod'

export const postSchema = z.object({
    url: z.httpUrl(),
    expires_at: z.number().int().positive().max(31).optional()
})

export const statsQuerySchema = z.object({
    period: z.enum(["today", "this_week", "this_month"]).optional(),
    year: z.coerce.number().min(2026).optional(),
    month: z.coerce.number().min(1).max(12).optional()
})

export type statsQuery = z.infer< typeof statsQuerySchema>

export type postBody = z.infer< typeof postSchema>
