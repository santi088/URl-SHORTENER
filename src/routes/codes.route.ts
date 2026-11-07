import { Router } from "express";
import { codesServices } from "../services/codes.services.js";
import { postSchema } from "../schemas/codes.schemas.js";
import { validateBody } from "../middlewares/roles.validate.body.js";
import { clicksServices } from "../services/clicks.services.js";
import { validateQuery } from "../middlewares/stats.query.validation.js";

export const router = Router()

router.post('/', validateBody(postSchema) ,async (req, res) => {
    const result = await codesServices.post(req.body)
    
    return res.status(201).json(result)
})


router.get('/:code', async (req, res) => {
    const result = await codesServices.getByCode(req.params.code);

    if(result.rowCount === 0){
        return res.status(404).json({"message": "not found..."})
    }
    
    const {id, url} = result.rows[0]

    //fire and forget
    clicksServices.post(id);

    return res.status(302).redirect(url)
})


router.get('/:code/stats', validateQuery ,async (req, res) => {
  
    const code  = req.params.code as string;

    const query = req.body;

    const result = await codesServices.getStats(code,query)
    return res.status(200).json({"count": result.count})
});
