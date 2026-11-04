import pool from "../db.js";

export const clicksRepo = {
    async create(codeId: string){
        const result = await pool.query(`
                INSERT INTO clicks (code_id)
                VALUES ($1) RETURNING *
            `, [codeId]
        )

        return result.rows[0]
    },

    async fetchAll(){
        const result = await pool.query(`
                SELECT * 
                FROM clicks
            `
        )

        return result.rows
    }
}