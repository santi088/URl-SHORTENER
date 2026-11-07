import { codesRepo } from "../repositories/codes.repository.js";
import { logger } from "../logger.js";
import { randomAlphanumeric } from "./generate.code.js";
import { getCustomExpiration } from "../services/expiration.date.js";
import type { postBody, statsQuery } from "../schemas/codes.schemas.js";

export const codesServices = {
    async post({url, expires_at}: postBody, generateCode: () => string = () => randomAlphanumeric(7)){
        
        let retries = 3
        let lastError: unknown
        const days = expires_at || 30

        for (let i = 0; i < retries; i++) {
            let code =  generateCode()
            try {
                const result = await codesRepo.create(url, code, getCustomExpiration(days));
                return result
            } catch (error) {
                lastError = error;
                logger.error({ error, url, attempt: i + 1 }, 'Failed to create code');

                if ((error as any).code !== '23505') throw error;
            }
        }
        throw lastError!
    },

    async getByCode(code: string){
        return await codesRepo.fetchByCode(code);
    },

    async getStats(code: string, {period, year, month}: statsQuery){
        const now = new Date();
        let startDate, endDate;

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        } else if (period === 'this_week') {
            // Find Monday of the current week
            const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
            const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            
            startDate = new Date(now.setDate(diffToMonday));
            startDate.setHours(0, 0, 0, 0); // Midnight on Monday

            // End date is exactly 7 days later (Start of next Monday)
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);

        } else if (period === 'this_month' || (month && year)) {
            const targetYear = year ? year : now.getFullYear();
            const targetMonth = month ? month - 1 : now.getMonth();
            
            startDate = new Date(targetYear, targetMonth, 1);
            endDate = new Date(targetYear, targetMonth + 1, 1); // Automatically rolls over
        }

        const result = await codesRepo.fetchStats(code, startDate, endDate);
        return result
    }
}