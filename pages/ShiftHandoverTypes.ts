
import { Users, Factory, Activity, Magnet, Layers, Droplet, Recycle, StopCircle } from 'lucide-react';

// --- Types ---
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';
export type LeaveType = 'HOURLY' | 'DAILY';

export interface FeedInput {
    type: string;
    percent: number;
    isCustom?: boolean; 
}

export interface BallCharge {
    size: number;
    count: number;
}

// --- Constants ---
export const PRODUCTION_TIMES = [
    "07:30", "08:30", "09:30", "10:30", "11:30", "12:30",
    "01:30", "02:30", "03:30", "04:30", "05:30", "06:30"
];

export const THICKENER_TIMES = ["08:00", "11:00", "02:00", "05:00"];
export const FEED_TYPES_OPTIONS = ["گلالی", "باباعلی", "شهرک", "چنار", "سایر"];
export const BALL_SIZES = [25, 30, 40, 50, 60, 70, 80, 90, 100];
export const LINES = ['lineA', 'lineB'] as const;

export const SHIFT_TYPE_MAP: Record<string, string> = {
    'Day1': 'روز کار اول',
    'Day2': 'روز کار دوم',
    'Night1': 'شب کار اول',
    'Night2': 'شب کار دوم'
};

export const DEFAULT_FEEDS: [FeedInput, FeedInput, FeedInput] = [
    {type:'', percent:0}, {type:'', percent:0}, {type:'', percent:0}
];

export const PIE_COLORS = ['#22c55e', '#ef4444'];

export const TABS = [
    { id: 1, label: 'اطلاعات شیفت', icon: Users },
    { id: 2, label: 'خوراک', icon: Factory },
    { id: 3, label: 'بالمیل', icon: Activity },
    { id: 4, label: 'هیدروسیکلون', icon: Magnet },
    { id: 5, label: 'درام مگنت', icon: Magnet },
    { id: 6, label: 'فیلتر کنسانتره', icon: Layers },
    { id: 7, label: 'تیکنر', icon: Droplet },
    { id: 8, label: 'فیلتر بازیافت', icon: Recycle },
    { id: 9, label: 'توقفات و پمپ', icon: StopCircle },
];

export const toPersianNum = (num: number) => {
    return num.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
};

export const parseTimeToMinutes = (timeStr: string): number => {
    if(!timeStr || timeStr === '00:00') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
};
