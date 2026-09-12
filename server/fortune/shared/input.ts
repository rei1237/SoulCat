import { BirthProfile, DomainId, FortuneError, FortuneInput } from './contracts';
function profile(value: unknown, domain: DomainId): BirthProfile {
  if (!value || typeof value !== 'object') throw new FortuneError('PROFILE_REQUIRED');
  const p = value as Record<string, unknown>;
  if (p.calendarType !== undefined && p.calendarType !== 'solar') throw new FortuneError('SOLAR_DATE_REQUIRED');
  if (typeof p.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) throw new FortuneError('INVALID_BIRTH_DATE');
  const d = new Date(`${p.birthDate}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== p.birthDate || d.getUTCFullYear() < 1901 || d > new Date()) throw new FortuneError('INVALID_BIRTH_DATE');
  const time = p.birthTime;
  if (time !== undefined && time !== '' && (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new FortuneError('INVALID_BIRTH_TIME');
  if (!time && domain !== 'saju') throw new FortuneError('BIRTH_TIME_REQUIRED');
  if (p.gender !== undefined && p.gender !== 'male' && p.gender !== 'female') throw new FortuneError('INVALID_GENDER');
  if ((domain === 'saju' || domain === 'ziwei') && !p.gender) throw new FortuneError('GENDER_REQUIRED');
  let birthPlace: BirthProfile['birthPlace'];
  if (['vedic', 'astrology', 'sukuyo'].includes(domain)) {
    const loc = p.birthPlace as Record<string, unknown> | undefined;
    if (!loc || typeof loc.latitude !== 'number' || !Number.isFinite(loc.latitude) || Math.abs(loc.latitude) > 90 || typeof loc.longitude !== 'number' || !Number.isFinite(loc.longitude) || Math.abs(loc.longitude) > 180 || typeof loc.timezone !== 'string') throw new FortuneError('BIRTH_PLACE_REQUIRED');
    try { new Intl.DateTimeFormat('en', { timeZone: loc.timezone }); } catch { throw new FortuneError('INVALID_TIMEZONE'); }
    birthPlace = { latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone };
  }
  return { birthDate: p.birthDate, birthTime: time ? time as string : undefined, gender: p.gender as BirthProfile['gender'], calendarType: 'solar', ...(birthPlace ? { birthPlace } : {}) };
}
export function validateInput(value: unknown, domain: DomainId): FortuneInput {
  if (!value || typeof value !== 'object') throw new FortuneError('INVALID_INPUT');
  const v = value as Record<string, unknown>;
  const question = v.question === undefined ? '' : v.question;
  if (typeof question !== 'string' || question.length > 1000) throw new FortuneError('INVALID_QUESTION');
  return { personA: profile(v.personA, domain), ...(domain === 'sukuyo' ? { personB: profile(v.personB, domain) } : {}), question: question.trim() };
}
