
import { 
    Users, Factory, Activity, StopCircle, CheckCircle, Truck, Info, Trash2
} from 'lucide-react';

export const PRODUCTION_TABS = [
    { id: 1, label: 'اطلاعات گزارش', icon: Info },
    { id: 2, label: 'خوراک', icon: Factory },
    { id: 3, label: 'تولید', icon: Activity },
    { id: 4, label: 'باطله', icon: Trash2 },
    { id: 5, label: 'توقفات', icon: StopCircle },
    { id: 6, label: 'دسترسی تجهیزات', icon: CheckCircle },
    { id: 7, label: 'ورود خروج', icon: Truck },
];

export interface PlanRow {
    id: string;
    year: number;
    month: string;
    feed_plan: number;
    feed_usage: number;
    prod_plan: number;
    prod_usage: number;
    total_days: number;
    active_days: number;
    downtime_days: number;
}
