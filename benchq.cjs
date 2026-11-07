const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://saint@localhost:5433/shortener_bench'});
(async()=>{
  const hot=await p.query(`
    SELECT c.id, c.code, COUNT(cl.id)::int AS clicks
    FROM codes c JOIN clicks cl ON cl.code_id=c.id
    GROUP BY c.id,c.code ORDER BY clicks DESC LIMIT 5`);
  console.log('HOT TOP:', JSON.stringify(hot.rows));
  const cold=await p.query(`
    SELECT c.id, c.code, COUNT(cl.id)::int AS clicks
    FROM codes c LEFT JOIN clicks cl ON cl.code_id=c.id
    GROUP BY c.id,c.code HAVING COUNT(cl.id) < 50
    ORDER BY clicks ASC, c.id LIMIT 5`);
  console.log('COLD:', JSON.stringify(cold.rows));
  await p.end();
})();
