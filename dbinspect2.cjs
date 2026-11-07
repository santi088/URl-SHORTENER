const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://shortener_user:saint1367@localhost:5432/url_shortener'});
(async()=>{
  for (const q of [
    "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE tablename IN ('codes','clicks') ORDER BY tablename,indexname",
    "SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid::regclass::text IN ('codes','clicks')",
    "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name IN ('codes','clicks') ORDER BY table_name, ordinal_position"
  ]) {
    const r=await p.query(q);
    console.log("===",q);
    console.log(JSON.stringify(r.rows,null,2));
  }
  await p.end();
})();
