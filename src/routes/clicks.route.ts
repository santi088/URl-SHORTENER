import { Router } from "express";
import { clicksServices } from "../services/clicks.services.js";

export const route = Router();

route.get('/', async (req, res) => {
    const result = await clicksServices.getAll();
    return res.status(200).json(result);
})
