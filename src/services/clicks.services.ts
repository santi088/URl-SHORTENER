import { clicksRepo } from "../repositories/clicks.repository.js"

export const clicksServices = {
    async post(codeId: string){
        return await clicksRepo.create(codeId);
    },

    async getAll(){
        return await clicksRepo.fetchAll();
    }
}