const fs=require('fs');
const dir='/home/saint/Documents/URl-SHORTENER/scripts/bench/results';
const cases=['before_hot_1m','before_hot_12m','before_cold_1m','after_hot_1m','after_hot_12m','after_cold_1m'];
for (const c of cases) {
  const times=[]; const reads=[]; const nodes=new Set();
  for (let i=1;i<=3;i++){
    const t=fs.readFileSync(`${dir}/${c}_run${i}.txt`,'utf8');
    const et=t.match(/Execution Time: ([\d.]+) ms/);
    times.push(et?+et[1]:NaN);
    const buf=t.match(/Buffers: shared [^\n]*/);
    const read=buf? (buf[0].match(/read=(\d+)/)||[0,'0'])[1] : '0';
    reads.push(+read);
    for (const n of ['Seq Scan','Index Scan','Index Only Scan','Bitmap Heap Scan']) {
      if (t.includes(n)) nodes.add(n);
    }
  }
  const sorted=[...times].sort((a,b)=>a-b);
  const med=sorted[1];
  console.log(c, 'times=',times.join(','), 'median=',med, 'reads=',reads.join(','), 'nodes=',[...nodes].join(','));
}
