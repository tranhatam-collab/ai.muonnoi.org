import { readFile } from 'node:fs/promises';

const offers = JSON.parse(await readFile(new URL('../operations/data/offer-catalog.json', import.meta.url), 'utf8'));
const calendar = JSON.parse(await readFile(new URL('../operations/data/content-calendar-30-days.json', import.meta.url), 'utf8'));

if (!Array.isArray(offers.offers) || offers.offers.length !== 4) throw new Error('Expected four draft offers');
if (!offers.offers.every((offer) => offer.status === 'DRAFT' && Number.isInteger(offer.price_vnd) && offer.price_vnd > 0)) throw new Error('Offer catalog contains an invalid draft price');
if (!Array.isArray(calendar.days) || calendar.days.length !== 30) throw new Error('Content calendar must contain 30 days');
if (!calendar.days.every((day, index) => day.day === index + 1 && day.title && day.format && day.cta)) throw new Error('Content calendar contains an invalid day');
console.log('operations kit OK');
