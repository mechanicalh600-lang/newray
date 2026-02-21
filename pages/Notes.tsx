
import React, { useState, useEffect } from 'react';
import { User, Note } from '../types';
import { supabase } from '../supabaseClient';
import { StickyNote, Plus, Search, Tag, Calendar, Clock, X, Trash2, CheckCircle, Circle, Edit3, Loader2, Save, Filter, Bell } from 'lucide-react';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { generateId, getShamsiDate, getTime, toPersianDigits, compareShamsiDateTime } from '../utils';

interface Props {
  user: User;
}

export const Notes: React.FC<Props> = ({ user }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');
  
  // Filter
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterTag, setFilterTag] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [user]);

  useEffect(() => {
    let res = notes;
    if (searchTerm) {
      res = res.filter(n => n.title.includes(searchTerm) || n.content.includes(searchTerm));
    }
    if (activeTab === 'TODO') res = res.filter(n => !n.isCompleted);
    if (activeTab === 'DONE') res = res.filter(n => n.isCompleted);
    if (filterTag) res = res.filter(n => n.tags.some(t => t.includes(filterTag)));
    
    setFilteredNotes(res);
  }, [notes, searchTerm, activeTab, filterTag]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('personal_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (data) {
      const mapped: Note[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        title: d.title,
        content: d.content,
        tags: d.tags || [],
        reminderDate: d.reminder_date,
        reminderTime: d.reminder_time,
        isCompleted: d.is_completed,
        createdAt: d.created_at,
        reminderSeen: false
      }));
      setNotes(mapped);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote.title?.trim()) {
      alert('عنوان یادداشت را وارد کنید.');
      return;
    }
    if (!user?.id) {
      alert('کاربر وارد نشده است. لطفاً دوباره لاگین کنید.');
      return;
    }

    try {
      const hasReminder = !!editingNote.reminderDate?.trim();
      const payload: Record<string, unknown> = {
        user_id: user.id,
        title: (editingNote.title || '').trim(),
        content: editingNote.content || '',
        tags: editingNote.tags || [],
        reminder_date: editingNote.reminderDate || null,
        reminder_time: editingNote.reminderTime || null,
        is_completed: editingNote.isCompleted || false
      };
      if (hasReminder) payload.reminder_dismissed = false;

      if (editingNote.id) {
        const { error } = await supabase.from('personal_notes').update(payload).eq('id', editingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('personal_notes').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingNote({});
      fetchNotes();
      if (payload.reminder_date) window.dispatchEvent(new Event('notes-reminder-saved'));
    } catch (e: any) {
      console.error('ذخیره یادداشت:', e);
      alert('خطا در ذخیره یادداشت: ' + (e?.message || e?.error_description || 'خطای ناشناخته'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete note?')) {
      await supabase.from('personal_notes').delete().eq('id', id);
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const toggleComplete = async (note: Note) => {
    const newState = !note.isCompleted;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: newState } : n));
    await supabase.from('personal_notes').update({ is_completed: newState }).eq('id', note.id);
  };

  return (
    <div className="w-full max-w-full pb-20 p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <StickyNote className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">یادداشت‌های شخصی</h1>
        </div>
        <button onClick={() => { setEditingNote({}); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> یادداشت جدید
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="جستجو در یادداشت‌ها..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              {['ALL', 'TODO', 'DONE'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${activeTab === t ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
                >
                  {t === 'ALL' ? 'همه' : t === 'TODO' ? 'انجام نشده' : 'انجام شده'}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition ${isFilterOpen ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}
              title="فیلترها"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {isFilterOpen && (
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 p-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">برچسب</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" 
                  placeholder="#تگ" 
                  value={filterTag} 
                  onChange={e => setFilterTag(e.target.value)} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div> : 
         filteredNotes.map(note => {
          const hasReminder = !!(note.reminderDate || '').trim();
          const isOverdue = hasReminder && !note.isCompleted && compareShamsiDateTime(
            note.reminderDate || '', note.reminderTime || '00:00',
            getShamsiDate(), getTime()
          ) <= 0;
          const cardBg = note.isCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
            : isOverdue
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50'
              : hasReminder
                ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
          return (
          <div key={note.id} className={`${cardBg} p-4 rounded-xl shadow-sm border transition hover:shadow-md ${note.isCompleted ? 'opacity-90' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className={`font-bold text-lg ${note.isCompleted ? 'line-through text-gray-500' : ''}`}>{note.title}</h3>
              <div className="flex gap-1">
                <button onClick={() => { setEditingNote(note); setIsModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-blue-500"><Edit3 className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(note.id)} className="p-1.5 hover:bg-gray-100 rounded text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 min-h-[40px]">{note.content}</p>
            
            <div className="flex justify-between items-center mt-auto">
              <div className="flex gap-2">
                {note.reminderDate && (
                  <span className="text-xs bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 px-2 py-1 rounded flex items-center gap-1 font-medium font-sans">
                    <Calendar className="w-3 h-3 flex-shrink-0"/>
                    {note.reminderTime ? (
                      <>
                        {toPersianDigits(note.reminderTime)}
                        <span className="text-cyan-500 mx-1">|</span>
                      </>
                    ) : null}
                    {toPersianDigits(note.reminderDate)}
                  </span>
                )}
                {note.tags?.map(t => <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded">#{t}</span>)}
              </div>
              <button onClick={() => toggleComplete(note)} className={`p-1.5 rounded-full ${note.isCompleted ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}`}>
                {note.isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingNote.id ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h3>
            <input required placeholder="عنوان" className="w-full p-3 border rounded-xl dark:bg-gray-700" value={editingNote.title || ''} onChange={e => setEditingNote({...editingNote, title: e.target.value})} />
            <textarea placeholder="متن یادداشت..." className="w-full p-3 border rounded-xl dark:bg-gray-700 h-32" value={editingNote.content || ''} onChange={e => setEditingNote({...editingNote, content: e.target.value})} />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                <Bell className="w-4 h-4" />
                <span>اعلان هشدار</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ShamsiDatePicker label="تاریخ یادآوری" value={editingNote.reminderDate || ''} onChange={d => setEditingNote({...editingNote, reminderDate: d})} disableFuture={false} />
                <ClockTimePicker label="ساعت" value={editingNote.reminderTime || ''} onChange={t => setEditingNote({...editingNote, reminderTime: t})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg">انصراف</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">ذخیره</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// FIX: Add default export for React.lazy
export default Notes;
