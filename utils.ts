
// Simple mock for ID generation
export const generateId = (): string => Math.random().toString(36).substring(2, 9);

// --- Jalali Converter Logic (Compact Implementation) ---
const g_days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const j_days = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

export const jalaliToGregorian = (jy: number, jm: number, jd: number) => {
  let gy = (jy > 979) ? 1600 : 621;
  jy -= (jy > 979) ? 979 : 0;
  let days = (365 * jy) + ((Math.floor(jy / 33)) * 8) + (Math.floor(((jy % 33) + 3) / 4)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * (Math.floor(days / 146097));
  days %= 146097;
  if (days > 36524) {
    gy += 100 * (Math.floor(--days / 36524));
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
};

export const gregorianToJalali = (gy: number, gm: number, gd: number) => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
};

// --- Helper Functions ---

export const getShamsiDate = (): string => {
  const date = new Date();
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
};

export const getTime = (): string => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const generateTrackingCode = (type: 'W' | 'P' | 'J' | 'G' | 'H' | 'K' | 'T'): string => {
  const date = new Date();
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  // Changed to 3 digits for year (e.g., 403)
  const year = String(j.jy).substring(1); 
  const month = String(j.jm).padStart(2, '0');
  
  // Format: Type(1) + Year(3) + Month(2) + Counter(4) = 10 Characters
  const randomCounter = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${type}${year}${month}${randomCounter}`;
};

export const parseShamsiDate = (shamsiDate: string): Date | null => {
  try {
    const parts = shamsiDate.split('/');
    if (parts.length !== 3) return null;
    const { gy, gm, gd } = jalaliToGregorian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
    return new Date(gy, gm - 1, gd);
  } catch (e) {
    return null;
  }
};

export const compareShamsiDateTime = (d1: string, t1: string, d2: string, t2: string): number => {
  // Returns -1 if d1 < d2, 1 if d1 > d2, 0 if equal
  const date1 = parseShamsiDate(d1);
  const date2 = parseShamsiDate(d2);
  
  if (!date1 || !date2) return 0;

  // Set times
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  
  date1.setHours(h1 || 0, m1 || 0, 0, 0);
  date2.setHours(h2 || 0, m2 || 0, 0, 0);

  if (date1.getTime() < date2.getTime()) return -1;
  if (date1.getTime() > date2.getTime()) return 1;
  return 0;
};

export const calculateDurationMinutes = (d1: string, t1: string, d2: string, t2: string): number => {
  const date1 = parseShamsiDate(d1);
  const date2 = parseShamsiDate(d2);
  
  if (!date1 || !date2) return 0;

  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  
  date1.setHours(h1 || 0, m1 || 0, 0, 0);
  date2.setHours(h2 || 0, m2 || 0, 0, 0);

  const diffMs = date2.getTime() - date1.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

export const isFutureDate = (shamsiDate: string): boolean => {
  const date = parseShamsiDate(shamsiDate);
  if (!date) return false;
  
  const now = new Date();
  now.setHours(0,0,0,0); // Normalize today to midnight for fair comparison
  
  return date.getTime() > now.getTime();
}

// Fetch real public IP
export const getPublicIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not fetch public IP:', error);
    return "Unknown / Offline";
  }
};

export const mockIp = "192.168.1.105"; // Fallback
