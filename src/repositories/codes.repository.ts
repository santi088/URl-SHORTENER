import pool from "../db.js";

export const codesRepo = {
    async create(url: string, code: string){
        const result = await pool.query(`
            INSERT INTO codes (code, url)
            VALUES ($1, $2) RETURNING code
            `, [code, url]
        )
        return result.rows[0]
    },

    async fetch(){
        const result = await pool.query(`
            SELECT * FROM codes
            `)

        return result.rows
    },

    async remove(id: string){
        const result = await pool.query(`
                UPDATE codes
                SET is_active = false
                WHERE id = $1
                RETURNING *
            `, [id]
        )

        return result.rows[0]
    },

    async fetchByCode(code: string){
        const result = await pool.query(`
                SELECT * FROM codes 
                WHERE code = $1
            `, [code]
        )

        return result.rows[0]

    }
}