const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://shortener_user:saint1367@localhost:5432/url_shortener'});
(async()=>{
  const r=await p.query("SELECT table_name,column_name,character_maximum_length FROM information_schema.columns WHERE table_name IN ('codes','clicks') ORDER BY table_name,ordinal_position");
  console.log(JSON.stringify(r.rows));
  await p.end();
})();
