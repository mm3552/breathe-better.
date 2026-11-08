import test from 'node:test';
import assert from 'node:assert/strict';
import {percent,level,daily} from '../lib/air.ts';
test('percentage changes preserve zero results and reject zero baselines',()=>{assert.equal(percent(100,0),-100);assert.equal(percent(100,125),25);assert.equal(percent(0,100),null);assert.equal(percent(null,10),null);});
test('missing AQI is unavailable, not good',()=>{assert.equal(level(null).name,'Unavailable');assert.equal(level(0).name,'Good');assert.equal(level(51).name,'Moderate');assert.equal(level(151).name,'Unhealthy');assert.equal(level(301).name,'Hazardous');});
test('history groups by local date, excludes future data and retains missing values',()=>{const midnight=Date.UTC(2020,0,1,18,30)/1000;const d={timezone:'Asia/Kolkata',hourly:{time:[midnight-3600,midnight,midnight+3600,Date.now()/1000+86400],us_aqi:[10,null,30,999],pm2_5:[null,null,null,999],pm10:[5,10,20,999]}};const rows=daily(d);assert.equal(rows.length,2);assert.equal(rows[0].aqi,10);assert.equal(rows[1].aqi,30);assert.equal(rows[1].pm2_5,null);assert.equal(rows[1].pm10,15);assert.equal(rows[1].count,1);});
