import type { MusicRecord } from "./music-index.ts";

export type PickSection = { id: string; period: string; total: number; music: MusicRecord[] };
export type PickSnapshot = { day: string; year: string; quarter: number; years: string[]; fallback: boolean; sections: PickSection[] };

// 날짜·구역·영상 ID로 순위를 정해 새로고침과 입력 순서에 영향을 받지 않습니다.
function hash(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}
export function dailySample(items: MusicRecord[], seed: string, count = 6) {
  return [...items].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id)).slice(0, count);
}
export function buildPicks(items: MusicRecord[], options: { year?: string; quarter?: number; refresh?: string; nonce?: string } = {}, now = new Date()): PickSnapshot {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const currentMonth = day.slice(0, 7).replace("-", ".");
  const months = [...new Set(items.flatMap(t => t.months))].filter(m => m <= currentMonth).sort().reverse();
  const period = months.includes(currentMonth) ? currentMonth : months[0] || "";
  const years = [...new Set(items.flatMap(t => t.years))].filter(y => y <= day.slice(0, 4)).sort().reverse();
  const year = options.year && years.includes(options.year) ? options.year : period.slice(0, 4) || years[0] || day.slice(0, 4);
  const quarter = options.quarter && options.quarter >= 1 && options.quarter <= 4 ? Math.floor(options.quarter) : Math.ceil(Number(period.slice(-2) || day.slice(5, 7)) / 3);
  const oldest = [...months].sort()[0] || "";
  const section = (id: string, label: string, pool: MusicRecord[]): PickSection => ({ id, period: label, total: pool.length, music: dailySample(pool, `${day}:${id}:${label}:${options.refresh === id ? options.nonce || "0" : "0"}`) });
  return { day, year, quarter, years, fallback: period !== currentMonth, sections: [
    section("month", period, items.filter(t => period && t.months.includes(period))),
    // 연도와 월을 같은 수집 월에서 검사해 서로 다른 연도의 소속이 섞이지 않게 합니다.
    section("quarter", `${year} · Q${quarter}`, items.filter(t => t.months.some(m => m.startsWith(`${year}.`) && Math.ceil(Number(m.slice(-2)) / 3) === quarter))),
    section("year", year, items.filter(t => t.years.includes(year))),
    section("archive", oldest.slice(0, 4), items.filter(t => oldest && t.months.some(m => m.startsWith(oldest.slice(0, 4) + ".")))),
  ] };
}
