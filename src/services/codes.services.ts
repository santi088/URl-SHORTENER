import { codesRepo } from "../repositories/codes.repository.js";
import { logger } from "../logger.js";
import { randomAlphanumeric } from "./generate.code.js";

export const codesServices = {
    async post(url: string): Promise<string>{
        
        let retries = 3
        let lastError: unknown

        for (let i = 0; i < retries; i++) {
            let code =  randomAlphanumeric(7)
            try {
                console.log(code, url);
                
                const result = await codesRepo.create(url, code);
                console.log(result);
                
                return result
            } catch (error) {
                lastError = error;
                logger.error({ error, url, attempt: i + 1 }, 'Failed to create code');

                if ((error as any).errno !== 1062) throw error;
            }
        }
        throw lastError!
    },

    async get(){
        return await codesRepo.fetch();
    },

    async delete(id: string){
        return await codesRepo.remove(id);
    },

    async getByCode(code: string){
        return await codesRepo.fetchByCode(code);
    }
}