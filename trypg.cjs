const {Pool}=require('pg');
const passwords=['','postgres','password','admin','root','saint1367','shortener_user'];
(async()=>{
  for (const pw of passwords) {
    const p=new Pool({connectionString:`postgresql://postgres:${pw}@localhost:5432/postgres`, connectionTimeoutMillis:2000});
    try { await p.query('SELECT 1'); console.log('OK password:', JSON.stringify(pw)); }
    catch(e){ /* console.log('FAIL', JSON.stringify(pw), e.message); */ }
    await p.end();
  }
  console.log('done');
})();
