import 'dotenv/config'
import * as z from 'zod'

const EnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.string().min(1).max(4)
})

const env = EnvSchema.parse(process.env);

export default env