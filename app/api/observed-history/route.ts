import {upstream} from '@/lib/upstream';
import {archiveHistory} from '@/lib/archive';
import {massUnit,normalizeDaily,particleIndex,pmNowCast,Particle} from '@/lib/observed-aqi';
export async function GET(req:Request){
 const p=new URL(req.url).searchParams;const id=p.get('station');if(!id||!/^\d{1,12}$/.test(id))return Response.json({status:'error',message:'A valid station ID is required.'},{status:400});
 const key=process.env.OPENAQ_API_KEY;if(!key){try{return Response.json(await archiveHistory(id))}catch{return Response.json({status:'error',message:'Delayed station history could not be loaded from the public archive.'},{status:502})}}
 try{
 const headers={'X-API-Key':key};const base='https://api.openaq.org/v3';const ld=await upstream(`${base}/locations/${id}`,headers);const station=ld.results?.[0];if(!station)return Response.json({status:'empty',message:'Station not found.'});
 const selected:Record<string,any>={};for(const s of station.sensors||[]){const name=s.parameter?.name;if((name==='pm25'||name==='pm10')&&massUnit(s.parameter?.units)&&!selected[name])selected[name]=s;}
 const now=Date.now(),from=new Date(now-31*86400000).toISOString(),hourFrom=new Date(now-14*3600000).toISOString();
 const settled=await Promise.allSettled(Object.entries(selected).map(async([name,s]:[string,any])=>{
 const [d,h]=await Promise.allSettled([upstream(`${base}/sensors/${s.id}/measurements/daily?datetime_from=${encodeURIComponent(from)}&datetime_to=${encodeURIComponent(new Date(now).toISOString())}&limit=100`,headers),upstream(`${base}/sensors/${s.id}/measurements/hourly?datetime_from=${encodeURIComponent(hourFrom)}&datetime_to=${encodeURIComponent(new Date(now).toISOString())}&limit=100`,headers)]);
 const daily=d.status==='fulfilled'?normalizeDaily(d.value.results||[],name as Particle,now):[];
 const hourly=h.status==='fulfilled'?(h.value.results||[]).filter((r:any)=>!r.flagInfo?.hasFlags&&massUnit(r.parameter?.units)&&r.coverage?.percentCoverage>=75&&r.coverage?.percentComplete>=75&&Date.parse(r.period?.datetimeTo?.utc)-Date.parse(r.period?.datetimeFrom?.utc)===3600000).map((r:any)=>({end:Date.parse(r.period?.datetimeTo?.utc),value:r.value})):[];
 const nc=pmNowCast(hourly,now);return {particle:name,sensorId:s.id,daily,nowcast:nc?{...nc,aqi:particleIndex(nc.concentration,name as Particle)}:null,errors:[d.status==='rejected'?'Daily history unavailable':null,h.status==='rejected'?'Hourly observations unavailable':null].filter(Boolean)};
 }));
 const series=settled.filter((r):r is PromiseFulfilledResult<any>=>r.status==='fulfilled').map(r=>r.value);const indices=series.map(s=>s.nowcast?.aqi).filter((n):n is number=>n!=null);return Response.json({status:'ok',station:{id:station.id,name:station.name,provider:station.provider,coordinates:station.coordinates,timezone:station.timezone},series,currentAqi:indices.length?Math.max(...indices):null,kind:'derived_observed_pm_only',scale:'US EPA PM-only AQI',fetchedAt:new Date().toISOString(),message:'Calculated from available PM2.5/PM10 station observations. Excludes gaseous pollutants; not an official complete station AQI or Indian National AQI.',methodology:{nowcast:'EPA PM NowCast: 12-hour weighted window; at least 2 valid values in the latest 3 hours.',daily:'PM subindices from completed daily mean observations only; minimum 75% coverage and completeness; flagged or unsupported-unit data excluded.',breakpoints:'US EPA 2024 PM2.5 breakpoints, confirmed in May 2026 guidance.'},partialFailure:series.some(s=>s.errors.length)||settled.some(r=>r.status==='rejected')});
 }catch(e){return Response.json({status:'error',message:e instanceof Error?e.message:'Observed history unavailable.'},{status:502});}
}
