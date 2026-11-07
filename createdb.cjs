const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://shortener_user:saint1367@localhost:5432/postgres'});
(async()=>{
  try {
    await p.query('CREATE DATABASE shortener_bench OWNER shortener_user');
    console.log('created');
  } catch(e){ console.log('err', e.message); }
  await p.end();
})();
