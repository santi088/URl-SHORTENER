#!/bin/bash
label="$1"
sql="$2"
for i in 1 2 3; do
  psql -p 5433 -h localhost -U saint -d shortener_bench -c "$sql" > "/home/saint/Documents/URl-SHORTENER/scripts/bench/results/${label}_run${i}.txt" 2>&1
done
