import * as z from 'zod'

export const postSchema = z.object({
    url: z.url()
})

export type postBody = z.infer< typeof postSchema>
