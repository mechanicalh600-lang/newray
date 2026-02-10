
import React, { useState, useEffect } from 'react';
import { CartableItem } from '../types';
import { Wrench, Eye, Printer, Trash2, X } from 'lucide-react';
import { WorkOrders } from './WorkOrders';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { DataPage } from '../components/DataPage';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';

export const WorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [items, setItems] = useState<CartableItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CartableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CartableItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Handle URL Params
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const statusParam = params.get('status');
      
      if (statusParam === 'OPEN') {
          // Special pseudo-filter for "Open" (Not Finished)
          setStatusFilter('OPEN'); 
      } else if (statusParam === 'FINISHED') {
          setStatusFilter('پایان');
      } else if (statusParam) {
          setStatusFilter(statusParam);
      }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
              .from('work_orders')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(50);

          if (error) throw error;

          const mappedItems: CartableItem[] = (data || []).map((row: any) => ({
              id: row.id,
              trackingCode: row.tracking_code,
              title: `درخواست کار ${row.equipment_name || row.local_name || ''}`,
              description: row.failure_description,
              status: row.status === 'FINISHED' ? 'DONE' : 'PENDING', 
              createdAt: row.request_date || new Date(row.created_at).toLocaleDateString('fa-IR'),
              updatedAt: row.request_date,
              module: 'WORK_ORDER',
              workflowId: 'legacy-db',
              currentStepId: 'legacy-step',
              initiatorId: row.requester_id,
              assigneeRole: 'ADMIN',
              data: {
                  ...row,
                  equipName: row.equipment_name,
                  equipLocalName: row.local_name,
                  failureDesc: row.failure_description,
                  requester: row.requester_name,
                  status: row.status,
                  equipment_code: row.equipment_code,
                  request_time: row.request_time,
                  workCategory: row.work_category
              }
          }));

          setItems(mappedItems);
          setFilteredItems(mappedItems);
      } catch (err) {
          console.error("Error fetching work orders:", err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    let res = items;
    
    if (statusFilter === 'OPEN') {
        // Filter out finished items
        res = res.filter(item => item.data.status !== 'FINISHED');
    } else if (statusFilter !== 'ALL') {
        res = res.filter(item => getStatusLabel(item).includes(statusFilter));
    }

    if (dateFrom) res = res.filter(item => item.createdAt >= dateFrom);
    if (dateTo) res = res.filter(item => item.createdAt <= dateTo);
    setFilteredItems(res);
  }, [items, statusFilter, dateFrom, dateTo]);

  const handleDelete = async (ids: string[]) => {
      await supabase.from('work_orders').delete().in('id', ids);
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
  };

  const getStatusLabel = (item: CartableItem) => {
    const dbStatus = item.data?.status;
    if (dbStatus === 'REQUEST') return 'درخواست جدید';
    if (dbStatus === 'IN_PROGRESS') return 'در حال انجام';
    if (dbStatus === 'VERIFICATION') return 'منتظر تایید';
    if (dbStatus === 'FINISHED') return 'پایان یافته';
    return 'نامشخص';
  };

  const getCategoryLabel = (cat: string) => {
      switch(cat) {
          case 'MECHANICAL': return 'مکانیک';
          case 'ELECTRICAL': return 'برق';
          case 'INSTRUMENTATION': return 'ابزار دقیق';
          case 'FACILITIES': return 'تأسیسات';
          default: return cat || '-';
      }
  }

  const getStatusBadge = (item: CartableItem) => {
    const label = getStatusLabel(item);
    let colorClass = 'bg-gray-100 text-gray-600';
    if (label.includes('درخواست')) colorClass = 'bg-blue-100 text-blue-700';
    else if (label.includes('انجام')) colorClass = 'bg-orange-100 text-orange-700';
    else if (label.includes('تایید')) colorClass = 'bg-purple-100 text-purple-700';
    else if (label.includes('پایان')) colorClass = 'bg-green-100 text-green-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorClass}`}>{label}</span>;
  };

  const filterContent = (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-800">
                  <option value="ALL">همه وضعیت‌ها</option>
                  <option value="OPEN">باز (جاری)</option>
                  <option value="درخواست">درخواست جدید</option>
                  <option value="انجام">در حال انجام</option>
                  <option value="تایید">منتظر تایید</option>
                  <option value="پایان">پایان یافته</option>
              </select>
          </div>
          <div>
              <ShamsiDatePicker label="از تاریخ" value={dateFrom} onChange={setDateFrom} />
          </div>
           <div>
              <ShamsiDatePicker label="تا تاریخ" value={dateTo} onChange={setDateTo} />
          </div>
      </div>
  );

  const columns = [
      { header: 'کد پیگیری', accessor: (i: any) => <span className="font-mono font-bold">{i.trackingCode}</span>, sortKey: 'trackingCode' },
      { header: 'کد تجهیز', accessor: (i: any) => <span className="font-mono text-sm">{i.data?.equipment_code || '-'}</span>, sortKey: 'data.equipment_code' },
      { header: 'نام تجهیز', accessor: (i: any) => i.data?.equipLocalName || i.data?.local_name || '-', sortKey: 'data.local_name' },
      { header: 'شرح', accessor: (i: any) => <span className="truncate max-w-[200px] block">{i.data?.failureDesc || i.title}</span>, sortKey: 'title' },
      { header: 'دیسیپلین', accessor: (i: any) => getCategoryLabel(i.data?.workCategory), sortKey: 'data.workCategory' },
      { header: 'درخواست کننده', accessor: (i: any) => i.data?.requester || 'ناشناس', sortKey: 'data.requester' },
      { header: 'تاریخ', accessor: (i: any) => <span className="font-mono text-xs">{i.createdAt}</span>, sortKey: 'createdAt' },
      { header: 'وضعیت', accessor: (i: any) => getStatusBadge(i), sortKey: 'status' },
  ];

  return (
    <>
      <DataPage
        title="مدیریت دستور کارها"
        icon={Wrench}
        data={filteredItems}
        isLoading={loading}
        columns={columns}
        onAdd={() => navigate('/work-orders/new')}
        onReload={fetchData}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        onViewDetails={(item) => setSelectedItem(item)}
        exportName="WorkOrders"
        extraActions={selectedIds.length === 1 && (
            <button onClick={() => alert('مشاهده PDF')} className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition" title="چاپ">
                <Printer className="w-5 h-5" />
            </button>
        )}
      />

      {/* Detail Modal */}
      {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{selectedItem.title}</span>
                          <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{selectedItem.trackingCode}</span>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/20 p-4">
                      <WorkOrders initialData={selectedItem.data} isViewOnly={true} />
                  </div>
                  <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end">
                      <button onClick={() => setSelectedItem(null)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition">بستن</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default WorkOrderList;
