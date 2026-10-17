import { readFile } from 'node:fs/promises';

const offers = JSON.parse(await readFile(new URL('../operations/data/offer-catalog.json', import.meta.url), 'utf8'));
const calendar = JSON.parse(await readFile(new URL('../operations/data/content-calendar-30-days.json', import.meta.url), 'utf8'));

if (!Array.isArray(offers.offers) || offers.offers.length !== 4) throw new Error('Expected four draft offers');
if (!offers.offers.every((offer) => offer.status === 'DRAFT' && Number.isInteger(offer.price_vnd) && offer.price_vnd > 0)) throw new Error('Offer catalog contains an invalid draft price');
if (!Array.isArray(calendar.days) || calendar.days.length !== 30) throw new Error('Content calendar must contain 30 days');
if (!calendar.days.every((day, index) => day.day === index + 1 && day.title && day.format && day.cta)) throw new Error('Content calendar contains an invalid day');
console.log('operations kit OK');
const sample = JSON.parse(await readFile(new URL('../operations/data/pilot-sample.json',import.meta.url),'utf8'));
if(sample.fictional!==true||sample.status!=='DRAFT_ONLY'||sample.assets.length!==12||sample.calendar.length!==14)throw new Error('Pilot sample structure invalid');
if(new Set(sample.assets.map(asset=>asset.id)).size!==12||!sample.assets.every(asset=>asset.content?.length>300&&asset.status==='DRAFT_ONLY'&&asset.approved_at===null&&asset.publication_receipt===null))throw new Error('Pilot sample content or approval status invalid');
if(!sample.calendar.every((day,i)=>day.day===i+1&&day.review_requirement&&(!day.asset_id||sample.assets.some(asset=>asset.id===day.asset_id))))throw new Error('Pilot sample calendar invalid');
if(!sample.sales_scripts.every(script=>script.consent_required===true&&script.sent_at===null)||sample.metrics.reconciled_cash_vnd!==null)throw new Error('Sample must not claim external outcomes');
console.log('Fictional Pilot sample: 12 complete drafts, 14 days; no external receipts.');
