
import React from 'react';
import { SHIFT_TYPE_MAP } from './ShiftHandoverTypes';

export const SHIFT_REPORT_COLUMNS = [
    { 
        header: 'کد گزارش', 
        accessor: (i: any) => i.tracking_code, 
        sortKey: 'tracking_code' 
    },
    { 
        header: 'تاریخ', 
        accessor: (i: any) => i.shift_date, 
        sortKey: 'shift_date' 
    },
    { 
        header: 'شیفت', 
        accessor: (i: any) => i.shift_name, 
        sortKey: 'shift_name' 
    },
    { 
        header: 'نوع شیفت', 
        accessor: (i: any) => SHIFT_TYPE_MAP[i.shift_type] || i.shift_type, 
        sortKey: 'shift_type' 
    },
    { 
        header: 'سرپرست', 
        accessor: (i: any) => i.supervisor_name || '---', 
        sortKey: 'supervisor_name' 
    },
    { 
        header: 'خوراک مصرفی A', 
        accessor: (i: any) => i.total_production_a, 
        sortKey: 'total_production_a' 
    },
    { 
        header: 'خوراک مصرفی B', 
        accessor: (i: any) => i.total_production_b, 
        sortKey: 'total_production_b' 
    },
];

export const INITIAL_SHIFT_INFO = (user: any) => ({
    name: 'A',
    type: 'Day1',
    date: '', 
    shiftDuration: '12:00',
    supervisor: user.id,
    supervisorName: user.fullName 
});

export const INITIAL_PRODUCTION = {
    lineA: {},
    lineB: {}
};

export const INITIAL_DOWNTIME = {
    lineA: { workTime: '', stopTime: '', reason: '' },
    lineB: { workTime: '', stopTime: '', reason: '' },
    generalDescription: ['']
};
