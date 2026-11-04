import { Router } from "express";
import { codesServices } from "../services/codes.services.js";
import { postSchema } from "../schemas/codes.schemas.js";
import { validateBody } from "../middlewares/roles.validate.body.js";
import { clicksServices } from "../services/clicks.services.js";

export const route = Router()

route.post('/', validateBody(postSchema) ,async (req, res) => {
    const result = await codesServices.post(req.body.url)
    
    return res.status(201).json(result)
})

route.get('/', async (req, res) => {
    const result = await codesServices.get();
    return res.status(200).json(result);
})

route.get('/:code', async (req, res) => {
    const result = await codesServices.getByCode(req.params.code);

    if(!result){
        return res.status(404).json({"message": "not found..."})
    }
    
    clicksServices.post(result.id);

    return res.status(302).redirect(result.url)
})

route.delete('/:id', async (req, res) => {
    const id = req.params.id.toString();
    const result = await codesServices.delete(id);
    return res.status(203).json(result);
})