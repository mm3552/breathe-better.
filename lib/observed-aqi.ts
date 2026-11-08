/** US EPA May 2026 guidance; PM-only indices, never a complete multi-pollutant AQI. */
export type Particle='pm25'|'pm10';
export const BANDS={pm25:[[0,9,0,50],[9.1,35.4,51,100],[35.5,55.4,101,150],[55.5,125.4,151,200],[125.5,225.4,201,300],[225.5,325.4,301,500]],pm10:[[0,54,0,50],[55,154,51,100],[155,254,101,150],[255,354,151,200],[355,424,201,300],[425,604,301,500]]};
export function particleIndex(value:number|null|undefined,particle:Particle){if(value==null||!Number.isFinite(value)||value<0)return null;const c=particle==='pm25'?Math.floor((value+1e-9)*10)/10:Math.floor(value);const bands=BANDS[particle];const b=bands.find(b=>c<=b[1])||bands[bands.length-1];return Math.round((b[3]-b[2])/(b[1]-b[0])*(c-b[0])+b[2]);}
export function massUnit(unit:string|undefined){return !!unit&&['ug/m3','μg/m3','µg/m3'].includes(unit.toLowerCase().replace('³','3').replace(/\s/g,''));}
export type HourValue={end:number;value:number|null};
export function pmNowCast(rows:HourValue[],now=Date.now()){
 const hour=Math.floor(now/3600000);const slots:(number|null)[]=Array(12).fill(null);
 for(const row of rows){const age=hour-Math.floor(row.end/3600000);if(row.end<=now&&age>=0&&age<12&&row.value!=null&&Number.isFinite(row.value)&&row.value>=0)slots[age]=row.value;}
 if(slots.slice(0,3).filter(v=>v!=null).length<2)return null;
 const values=slots.filter((v):v is number=>v!=null);const max=Math.max(...values),min=Math.min(...values);const weight=max===0?1:Math.max(.5,min/max);let numerator=0,denominator=0;
 slots.forEach((v,i)=>{if(v!=null){const w=weight**i;numerator+=v*w;denominator+=w;}});
 return {concentration:numerator/denominator,hours:values.length,weight,asOf:new Date(hour*3600000).toISOString()};
}
export function validAggregate(row:any,now=Date.now()){
 const from=Date.parse(row.period?.datetimeFrom?.utc),to=Date.parse(row.period?.datetimeTo?.utc);
 return Number.isFinite(row.value)&&row.value>=0&&!row.flagInfo?.hasFlags&&massUnit(row.parameter?.units)&&Number.isFinite(from)&&Number.isFinite(to)&&to<=now&&to-from>=23*3600000&&to-from<=25*3600000&&row.coverage?.percentComplete>=75&&row.coverage?.percentCoverage>=75;
}
export function normalizeDaily(rows:any[],particle:Particle,now=Date.now()){
 return rows.map(r=>({date:(r.period?.datetimeFrom?.local||'').slice(0,10),value:Number.isFinite(r.value)&&r.value>=0&&massUnit(r.parameter?.units)&&!r.flagInfo?.hasFlags?r.value:null,unit:r.parameter?.units||'',coverage:r.coverage?.percentCoverage??null,complete:r.coverage?.percentComplete??null,eligible:validAggregate(r,now),aqi:validAggregate(r,now)?particleIndex(r.value,particle):null,hasFlags:!!r.flagInfo?.hasFlags})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)).sort((a,b)=>a.date.localeCompare(b.date));
}
