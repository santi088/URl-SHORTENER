import pool from "../db.js";

export const codesRepo = {
    async create(url: string, code: string, expires_at: string){
        const result = await pool.query(`
            INSERT INTO codes (code, url, expires_at)
            VALUES ($1, $2, $3) RETURNING code, expires_at
            `, [code, url, expires_at]
        )
        return result.rows[0]
    },
    
    async fetchByCode(code: string){
        const result = await pool.query(`
                SELECT id, url FROM codes 
                WHERE code = $1
                    AND expires_at > NOW()
            `, [code]
        )

        return result

    },

    async fetchStats(code: string, start?: Date, end?: Date){

        let query = `
            SELECT COUNT(*)::int 
            FROM codes co
            JOIN clicks cl
            ON co.id = cl.code_id
            WHERE co.code = $1
        `
        
        const params = [code]

        if(start && end){
            query += ` AND cl.created_at >= $2 AND cl.created_at < $3`;
            params.push(start.toISOString(), end.toISOString());
        }

        const result = await pool.query(query, params)
 
        return result.rows[0]
    }
}