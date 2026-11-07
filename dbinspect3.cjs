const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://shortener_user:saint1367@localhost:5432/url_shortener'});
(async()=>{
  const r1=await p.query("SELECT pg_get_serial_sequence('public.codes','id') AS codes_seq, pg_get_serial_sequence('public.clicks','id') AS clicks_seq");
  console.log('seqs', JSON.stringify(r1.rows));
  const r2=await p.query("SELECT sequence_name, data_type, start_value FROM information_schema.sequences WHERE sequence_schema='public'");
  console.log('sequences', JSON.stringify(r2.rows));
  await p.end();
})();
