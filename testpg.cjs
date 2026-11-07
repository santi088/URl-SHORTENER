const {Pool}=require('pg');
for (const url of [
 'postgresql://postgres:postgres@localhost:5432/postgres',
 'postgresql://postgres@localhost:5432/postgres',
 'postgresql://root@localhost:5432/postgres'
]) {
  const p=new Pool({connectionString:url});
  (async()=>{
    try { await p.query('SELECT 1'); console.log('OK', url); }
    catch(e){ console.log('ERR', url, e.message); }
    await p.end();
  })();
}
