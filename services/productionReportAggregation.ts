import { supabase } from '../supabaseClient';

export const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

export type ShamsiMonthName = (typeof SHAMSI_MONTHS)[number];

export interface DowntimeLine {
  workTime: string;
  stopTime: string;
  reason: string;
}

export interface DailyDowntimeSnapshot {
  lineA: DowntimeLine;
  lineB: DowntimeLine;
  plant: DowntimeLine;
  generalDescription: string[];
  shifts: { shift: string; lineA: DowntimeLine; lineB: DowntimeLine; plant: DowntimeLine }[];
}

export interface DailyProductionSnapshot {
  reportDate: string;
  feed: { lineA: number; lineB: number; total: number };
  product: { lineA: number; lineB: number; total: number };
  waste: { lineA: number; lineB: number; total: number };
  downtime: DailyDowntimeSnapshot;
  shiftCount: number;
  labQuality: Record<string, number | null>;
  shiftChemicals: Record<string, unknown>[];
  availability: AvailabilityMetrics;
  logistics: LogisticsSnapshot;
  energy: EnergySnapshot;
  aggregatedAt: string;
}

export interface LineAvailability {
  workMin: number;
  stopMin: number;
  ua: number;
  pa: number;
}

export interface AvailabilityMetrics {
  lineA: LineAvailability;
  lineB: LineAvailability;
  plant: LineAvailability;
  overall: { workMin: number; stopMin: number; ua: number; pa: number };
  plannedMinutesPerLine: number;
}

export interface WarehouseLogisticsRow {
  type: string;
  qty: number;
  unit: string;
  partName: string;
  receiverName: string;
}

export interface ScaleLogisticsRow {
  truckNo: string;
  material: string;
  netWeight: number;
  origin: string;
  destination: string;
}

export interface LogisticsSnapshot {
  warehouse: {
    entryCount: number;
    exitCount: number;
    entryQty: number;
    exitQty: number;
    rows: WarehouseLogisticsRow[];
  };
  scale: {
    truckCount: number;
    totalNetWeight: number;
    byMaterial: Record<string, number>;
    rows: ScaleLogisticsRow[];
  };
}

export interface EnergySnapshot {
  dailyKwh: number;
  monthlyKwh: number;
  yearlyKwh: number;
  byShift: { source: string; shift: string; kwh: number }[];
}

export interface MonthlyUsageTotals {
  feed: number;
  product: number;
}

const emptyLine = (): DowntimeLine => ({ workTime: '', stopTime: '', reason: '' });

export function normalizeShamsiDate(d: string): string {
  const p = d.split('/').map((x) => parseInt(x, 10) || 0);
  if (p.length < 3) return d;
  return `${p[0]}/${String(p[1]).padStart(2, '0')}/${String(p[2]).padStart(2, '0')}`;
}

export function toNum(v: unknown): number {
  return Math.max(0, Number(v) || 0);
}

export function parseTimeToMinutes(value: unknown): number {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (!raw.includes(':')) return Math.max(0, Number(raw) || 0);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sumTimes(times: string[]): string {
  return minutesToTime(times.reduce((acc, t) => acc + parseTimeToMinutes(t), 0));
}

export function extractFeedLines(fd: Record<string, unknown>) {
  return {
    lineA: toNum(fd.feed_line_a ?? fd.total_production_a ?? fd.line_a),
    lineB: toNum(fd.feed_line_b ?? fd.total_production_b ?? fd.line_b),
  };
}

export function extractProductLines(fd: Record<string, unknown>) {
  return {
    lineA: toNum(fd.product_line_a ?? fd.concentrate_line_a ?? fd.total_production_a),
    lineB: toNum(fd.product_line_b ?? fd.concentrate_line_b ?? fd.total_production_b),
  };
}

function readDowntimeBlock(source: Record<string, unknown>, key: 'lineA' | 'lineB' | 'plant'): DowntimeLine {
  const nested = (source.downtime as Record<string, unknown> | undefined)?.[key]
    ?? source[key]
    ?? {};
  const block = nested as Record<string, unknown>;
  return {
    workTime: String(block.workTime ?? ''),
    stopTime: String(block.stopTime ?? ''),
    reason: String(block.reason ?? ''),
  };
}

export function extractDowntimeFromFullData(fd: Record<string, unknown>): DailyDowntimeSnapshot {
  const nested = (fd.downtime as Record<string, unknown> | undefined) ?? fd;
  const general = nested.generalDescription;
  const generalDescription = Array.isArray(general)
    ? general.map((x) => String(x || '')).filter(Boolean)
    : general
      ? [String(general)]
      : [];

  return {
    lineA: readDowntimeBlock(fd, 'lineA'),
    lineB: readDowntimeBlock(fd, 'lineB'),
    plant: readDowntimeBlock(fd, 'plant'),
    generalDescription,
    shifts: [],
  };
}

export function mergeDowntimeSnapshots(shifts: DailyDowntimeSnapshot[]): DailyDowntimeSnapshot {
  if (shifts.length === 0) {
    return {
      lineA: emptyLine(),
      lineB: emptyLine(),
      plant: emptyLine(),
      generalDescription: [],
      shifts: [],
    };
  }

  const lineA: DowntimeLine = {
    workTime: sumTimes(shifts.map((s) => s.lineA.workTime)),
    stopTime: sumTimes(shifts.map((s) => s.lineA.stopTime)),
    reason: shifts.map((s) => s.lineA.reason).filter(Boolean).join(' | '),
  };
  const lineB: DowntimeLine = {
    workTime: sumTimes(shifts.map((s) => s.lineB.workTime)),
    stopTime: sumTimes(shifts.map((s) => s.lineB.stopTime)),
    reason: shifts.map((s) => s.lineB.reason).filter(Boolean).join(' | '),
  };
  const plant: DowntimeLine = {
    workTime: sumTimes(shifts.map((s) => s.plant.workTime)),
    stopTime: sumTimes(shifts.map((s) => s.plant.stopTime)),
    reason: shifts.map((s) => s.plant.reason).filter(Boolean).join(' | '),
  };
  const generalDescription = [...new Set(shifts.flatMap((s) => s.generalDescription))];

  return { lineA, lineB, plant, generalDescription, shifts: [] };
}

export async function fetchControlRoomRowsForYear(year: string) {
  const { data, error } = await supabase
    .from('control_room_reports')
    .select('report_date, shift, full_data')
    .like('report_date', `${year}/%`)
    .not('full_data', 'is', null);
  if (error) throw error;
  return data || [];
}

export function aggregateMonthlyFeedAndProduct(
  rows: { report_date?: string; full_data?: unknown }[],
  year: string
): Record<ShamsiMonthName, MonthlyUsageTotals> {
  const result = Object.fromEntries(SHAMSI_MONTHS.map((m) => [m, { feed: 0, product: 0 }])) as Record<
    ShamsiMonthName,
    MonthlyUsageTotals
  >;

  rows.forEach((row) => {
    const d = row.report_date || '';
    if (!d.startsWith(`${year}/`)) return;
    const parts = d.split('/');
    const monthName = SHAMSI_MONTHS[(parseInt(parts[1], 10) || 0) - 1];
    if (!monthName) return;
    const fd = typeof row.full_data === 'object' && row.full_data ? (row.full_data as Record<string, unknown>) : {};
    const feed = extractFeedLines(fd);
    const product = extractProductLines(fd);
    result[monthName].feed += feed.lineA + feed.lineB;
    result[monthName].product += product.lineA + product.lineB;
  });

  return result;
}

export function aggregateDailyFromControlRoomRows(
  rows: { report_date?: string; shift?: string; full_data?: unknown }[],
  reportDate: string
): Pick<DailyProductionSnapshot, 'feed' | 'product' | 'waste' | 'downtime' | 'shiftCount'> {
  const dayKey = normalizeShamsiDate(reportDate);
  const dayRows = rows.filter((r) => normalizeShamsiDate(r.report_date || '') === dayKey);

  let feedA = 0;
  let feedB = 0;
  let prodA = 0;
  let prodB = 0;
  const shiftSnapshots: DailyDowntimeSnapshot[] = [];

  dayRows.forEach((row) => {
    const fd = typeof row.full_data === 'object' && row.full_data ? (row.full_data as Record<string, unknown>) : {};
    const feed = extractFeedLines(fd);
    const product = extractProductLines(fd);
    feedA += feed.lineA;
    feedB += feed.lineB;
    prodA += product.lineA;
    prodB += product.lineB;
    const dt = extractDowntimeFromFullData(fd);
    dt.shifts = [{
      shift: String(row.shift || '—'),
      lineA: dt.lineA,
      lineB: dt.lineB,
      plant: dt.plant,
    }];
    shiftSnapshots.push(dt);
  });

  const mergedDowntime = mergeDowntimeSnapshots(shiftSnapshots);
  mergedDowntime.shifts = shiftSnapshots.flatMap((s) => s.shifts);

  return {
    feed: { lineA: feedA, lineB: feedB, total: feedA + feedB },
    product: { lineA: prodA, lineB: prodB, total: prodA + prodB },
    waste: {
      lineA: Math.max(0, feedA - prodA),
      lineB: Math.max(0, feedB - prodB),
      total: Math.max(0, feedA - prodA) + Math.max(0, feedB - prodB),
    },
    downtime: mergedDowntime,
    shiftCount: dayRows.length,
  };
}

export async function fetchLabQualityForDay(reportDate: string): Promise<Record<string, number | null>> {
  const dayKey = normalizeShamsiDate(reportDate);
  const { data } = await supabase
    .from('lab_reports')
    .select('fe_percent, feo_percent, s_percent, moisture_percent, blaine, mesh_size, report_date, shift')
    .like('report_date', `${dayKey.split('/')[0]}/%`);

  const rows = (data || []).filter((r) => normalizeShamsiDate(r.report_date || '') === dayKey);
  if (rows.length === 0) {
    return { fe: null, feo: null, s: null, moisture: null, blaine: null, mesh: null };
  }

  const avg = (key: keyof (typeof rows)[0]) => {
    const vals = rows.map((r) => Number(r[key])).filter((n) => Number.isFinite(n));
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  };

  return {
    fe: avg('fe_percent'),
    feo: avg('feo_percent'),
    s: avg('s_percent'),
    moisture: avg('moisture_percent'),
    blaine: avg('blaine'),
    mesh: avg('mesh_size'),
  };
}

export async function fetchShiftReportsForDay(reportDate: string) {
  const dayKey = normalizeShamsiDate(reportDate);
  const { data } = await supabase
    .from('shift_reports')
    .select('id, shift_date, shift_name, shift_type, full_data')
    .like('shift_date', `${dayKey.split('/')[0]}/%`);
  return (data || []).filter((r) => normalizeShamsiDate(r.shift_date || '') === dayKey);
}

const ENERGY_KEYS = [
  'energy_kwh', 'energy_consumption', 'power_kwh', 'electricity_kwh',
  'total_energy', 'electric_energy', 'consumption_kwh',
];

export function extractEnergyKwh(fd: Record<string, unknown>): number {
  for (const key of ENERGY_KEYS) {
    const v = Number(fd[key]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  const nested = fd.energy as Record<string, unknown> | undefined;
  if (nested) {
    const v = Number(nested.kwh ?? nested.total ?? nested.consumption);
    if (Number.isFinite(v) && v > 0) return v;
  }
  const electrical = fd.electrical as Record<string, unknown> | undefined;
  if (electrical) {
    const v = Number(electrical.kwh ?? electrical.consumption ?? electrical.total);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
}

export function computeAvailability(
  downtime: DailyDowntimeSnapshot,
  shiftCount: number,
  minutesPerShift = 720
): AvailabilityMetrics {
  const plannedMinutesPerLine = Math.max(shiftCount, 1) * minutesPerShift;

  const lineMetrics = (line: DowntimeLine): LineAvailability => {
    const workMin = parseTimeToMinutes(line.workTime);
    const stopMin = parseTimeToMinutes(line.stopTime);
    const total = workMin + stopMin;
    const ua = total > 0 ? (workMin / total) * 100 : 0;
    const pa = plannedMinutesPerLine > 0 ? (workMin / plannedMinutesPerLine) * 100 : 0;
    return {
      workMin,
      stopMin,
      ua: Math.round(ua * 10) / 10,
      pa: Math.round(Math.min(pa, 100) * 10) / 10,
    };
  };

  const lineA = lineMetrics(downtime.lineA);
  const lineB = lineMetrics(downtime.lineB);
  const plant = lineMetrics(downtime.plant);
  const workMin = lineA.workMin + lineB.workMin + plant.workMin;
  const stopMin = lineA.stopMin + lineB.stopMin + plant.stopMin;
  const total = workMin + stopMin;
  const plannedOverall = plannedMinutesPerLine * 3;

  return {
    lineA,
    lineB,
    plant,
    overall: {
      workMin,
      stopMin,
      ua: total > 0 ? Math.round((workMin / total) * 1000) / 10 : 0,
      pa: plannedOverall > 0 ? Math.round(Math.min((workMin / plannedOverall) * 100, 100) * 10) / 10 : 0,
    },
    plannedMinutesPerLine,
  };
}

function aggregateEnergyFromRows(
  controlRows: { report_date?: string; shift?: string; full_data?: unknown }[],
  shiftRows: { shift_name?: string; full_data?: unknown }[],
  reportDate: string
): EnergySnapshot {
  const dayKey = normalizeShamsiDate(reportDate);
  const parts = dayKey.split('/');
  const prefixMonth = `${parts[0]}/${parts[1]}`;
  const prefixYear = parts[0];
  const byShift: EnergySnapshot['byShift'] = [];
  let dailyKwh = 0;
  let monthlyKwh = 0;
  let yearlyKwh = 0;

  controlRows.forEach((row) => {
    const d = normalizeShamsiDate(row.report_date || '');
    const fd = typeof row.full_data === 'object' && row.full_data ? (row.full_data as Record<string, unknown>) : {};
    const kwh = extractEnergyKwh(fd);
    if (kwh <= 0) return;
    if (d === dayKey) {
      dailyKwh += kwh;
      byShift.push({ source: 'اتاق کنترل', shift: String(row.shift || '—'), kwh });
    }
    if (d.startsWith(prefixMonth)) monthlyKwh += kwh;
    if (d.startsWith(prefixYear)) yearlyKwh += kwh;
  });

  shiftRows.forEach((row) => {
    const fd = typeof row.full_data === 'object' && row.full_data ? (row.full_data as Record<string, unknown>) : {};
    const kwh = extractEnergyKwh(fd);
    if (kwh <= 0) return;
    dailyKwh += kwh;
    byShift.push({ source: 'گزارش شیفت', shift: String(row.shift_name || '—'), kwh });
  });

  return { dailyKwh, monthlyKwh, yearlyKwh, byShift };
}

export async function fetchLogisticsForDay(reportDate: string): Promise<LogisticsSnapshot> {
  const dayKey = normalizeShamsiDate(reportDate);
  const year = dayKey.split('/')[0];

  const [whRes, scRes] = await Promise.all([
    supabase
      .from('warehouse_reports')
      .select('type, qty, unit, report_date, receiver_name, parts(name)')
      .like('report_date', `${year}/%`),
    supabase
      .from('scale_reports')
      .select('truck_no, material, net_weight, origin, destination, report_date')
      .like('report_date', `${year}/%`),
  ]);

  const whDay = (whRes.data || []).filter((r) => normalizeShamsiDate(r.report_date || '') === dayKey);
  const scDay = (scRes.data || []).filter((r) => normalizeShamsiDate(r.report_date || '') === dayKey);

  let entryCount = 0;
  let exitCount = 0;
  let entryQty = 0;
  let exitQty = 0;
  const whRows: WarehouseLogisticsRow[] = whDay.map((r: any) => {
    const qty = toNum(r.qty);
    const type = String(r.type || '').toUpperCase();
    if (type === 'ENTRY') { entryCount += 1; entryQty += qty; }
    if (type === 'EXIT') { exitCount += 1; exitQty += qty; }
    return {
      type,
      qty,
      unit: String(r.unit || ''),
      partName: String(r.parts?.name || '—'),
      receiverName: String(r.receiver_name || '—'),
    };
  });

  const byMaterial: Record<string, number> = {};
  let totalNetWeight = 0;
  const scRows: ScaleLogisticsRow[] = scDay.map((r: any) => {
    const net = toNum(r.net_weight);
    totalNetWeight += net;
    const material = String(r.material || 'نامشخص');
    byMaterial[material] = (byMaterial[material] || 0) + net;
    return {
      truckNo: String(r.truck_no || '—'),
      material,
      netWeight: net,
      origin: String(r.origin || '—'),
      destination: String(r.destination || '—'),
    };
  });

  return {
    warehouse: { entryCount, exitCount, entryQty, exitQty, rows: whRows },
    scale: { truckCount: scRows.length, totalNetWeight, byMaterial, rows: scRows },
  };
}

export async function buildProductionReportSnapshot(reportDate: string): Promise<DailyProductionSnapshot> {
  const year = reportDate.split('/')[0];
  const controlRows = await fetchControlRoomRowsForYear(year);
  const daily = aggregateDailyFromControlRoomRows(controlRows, reportDate);
  const [labQuality, shiftChemicals, logistics] = await Promise.all([
    fetchLabQualityForDay(reportDate),
    fetchShiftReportsForDay(reportDate),
    fetchLogisticsForDay(reportDate),
  ]);

  const availability = computeAvailability(daily.downtime, daily.shiftCount);
  const energy = aggregateEnergyFromRows(controlRows, shiftChemicals, reportDate);

  return {
    reportDate: normalizeShamsiDate(reportDate),
    ...daily,
    labQuality,
    shiftChemicals,
    availability,
    logistics,
    energy,
    aggregatedAt: new Date().toISOString(),
  };
}

export async function fetchMonthlyUsageForYear(year: number): Promise<Record<ShamsiMonthName, MonthlyUsageTotals>> {
  const rows = await fetchControlRoomRowsForYear(String(year));
  return aggregateMonthlyFeedAndProduct(rows, String(year));
}

export async function syncProductionPlanUsage(
  year: number,
  monthName: ShamsiMonthName,
  feedUsage: number,
  prodUsage: number,
  feedDevPercent = 100,
  prodDevPercent = 100
) {
  const finalFeed = feedUsage * (feedDevPercent / 100);
  const finalProd = prodUsage * (prodDevPercent / 100);
  const { data: existing } = await supabase
    .from('production_plans')
    .select('id')
    .eq('year', year)
    .eq('month', monthName)
    .maybeSingle();

  const payload = {
    feed_usage: feedUsage,
    prod_usage: prodUsage,
    feed_dev_percent: feedDevPercent,
    prod_dev_percent: prodDevPercent,
    final_feed: finalFeed,
    final_prod: finalProd,
  };

  if (existing?.id) {
    await supabase.from('production_plans').update(payload).eq('id', existing.id);
  }
}
