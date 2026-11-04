import { Router } from "express";
import { codesServices } from "../services/codes.services.js";
import { postSchema } from "../schemas/codes.schemas.js";
import { validateBody } from "../middlewares/roles.validate.body.js";

export const router = Router()

router.post('/', validateBody(postSchema) ,async (req, res) => {
    const result = await codesServices.post(req.body.url)
    
    return res.status(201).json(result)
})

router.get('/', async (req, res) => {
    const result = await codesServices.get();
    return res.status(200).json(result);
})

router.get('/:code', async (req, res) => {
    const result = await codesServices.getByCode(req.params.code);

    if(!result){
        return res.status(404).json({"message": "not found..."})
    }

    console.log(result);
    
    //TO-DO
    //insert click with this code
    return res.status(302).redirect(result.url)
})

router.delete('/:id', async (req, res) => {
    const id = req.params.id.toString();
    const result = await codesServices.delete(id);
    return res.status(203).json(result);
})