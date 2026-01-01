
import React, { useState, useEffect, useRef } from 'react';
import { User, Note, Attachment } from '../types';
import { supabase } from '../supabaseClient';
import { StickyNote, Plus, Search, Tag, Calendar, Clock, Paperclip, X, Trash2, CheckCircle, Edit3, Loader2, Save, RefreshCw } from 'lucide-react';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { getShamsiDate } from '../utils';

interface Props {
  user: User;
}

export const Notes: React.FC<Props> = ({ user }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');

  // Form State
  const [editingNote, setEditingNote] = useState<Partial<Note>>({});
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      fetchNotes();
  }, []);

  const fetchNotes = async () => {
      setLoading(true);
      try {
          // Security: Only fetch notes for this user
          const { data, error } = await supabase
              .from('personal_notes')
              .select('*')
              .eq('user_id', user.id) 
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          // Map DB to Interface
          const mapped: Note[] = (data || []).map((n:any) => ({
              id: n.id,
              userId: n.user_id,
              title: n.title,
              content: n.content,
              tags: n.tags || [],
              reminderDate: n.reminder_date,
              reminderTime: n.reminder_time,
              isCompleted: n.is_completed,
              attachments: n.attachments || [],
              createdAt: n.created_at,
              reminderSeen: false
          }));
          setNotes(mapped);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  // --- Form Handlers ---
  const handleAddNew = () => {
      setEditingNote({ 
          title: '', 
          content: '', 
          tags: [], 
          isCompleted: false, 
          reminderDate: getShamsiDate() 
      });
      setFiles([]);
      setIsModalOpen(true);
  };

  const handleEdit = (note: Note) => {
      setEditingNote(note);
      setFiles([]); // Reset new files, keep existing attachments in note object
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingNote.title) return;

      setLoading(true);
      try {
          // Process Files
          const newAttachments: Attachment[] = [];
          for (const file of files) {
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
              });
              newAttachments.push({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  data: base64
              });
          }

          const finalAttachments = [...(editingNote.attachments || []), ...newAttachments];

          const payload = {
              user_id: user.id,
              title: editingNote.title,
              content: editingNote.content,
              tags: editingNote.tags,
              reminder_date: editingNote.reminderDate,
              reminder_time: editingNote.reminderTime,
              is_completed: editingNote.isCompleted,
              attachments: finalAttachments
          };

          if (editingNote.id) {
              await supabase.from('personal_notes').update(payload).eq('id', editingNote.id);
          } else {
              await supabase.from('personal_notes').insert([payload]);
          }

          setIsModalOpen(false);
          fetchNotes();

      } catch (err) {
          alert('خطا در ذخیره یادداشت');
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('آیا از حذف این یادداشت اطمینان دارید؟')) return;
      
      // Optimistic update
      setNotes(prev => prev.filter(n => n.id !== id));
      
      try {
          await supabase.from('personal_notes').delete().eq('id', id);
      } catch (err) {
          alert('خطا در حذف یادداشت');
          fetchNotes(); // Revert on error
      }
  };

  const toggleComplete = async (note: Note) => {
      const newVal = !note.isCompleted;
      // Optimistic update
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: newVal } : n));
      
      try {
          await supabase.from('personal_notes').update({ is_completed: newVal }).eq('id', note.id);
      } catch (err) {
          console.error(err);
      }
  };

  const addTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          if (!editingNote.tags?.includes(tagInput.trim())) {
              setEditingNote(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
          }
          setTagInput('');
      }
  };

  const removeTag = (tag: string) => {
      setEditingNote(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      }
  };

  // --- Filtering ---
  const filteredNotes = notes.filter(n => {
      const matchesSearch = n.title.includes(searchTerm) || n.content.includes(searchTerm) || n.tags.some(t => t.includes(searchTerm));
      if (activeTab === 'TODO') return matchesSearch && !n.isCompleted;
      if (activeTab === 'DONE') return matchesSearch && n.isCompleted;
      return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 p-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                  <StickyNote className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">یادداشت‌های من</h1>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={fetchNotes} 
                className="bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                title="بروزرسانی"
              >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={handleAddNew}
                className="bg-primary text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 hover:bg-red-800 transition transform active:scale-95"
              >
                  <Plus className="w-5 h-5" /> یادداشت جدید
              </button>
          </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="جستجو در یادداشت‌ها..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              {(['ALL', 'TODO', 'DONE'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === tab ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500 dark:text-gray-300'}`}
                  >
                      {tab === 'ALL' ? 'همه' : tab === 'TODO' ? 'انجام نشده' : 'انجام شده'}
                  </button>
              ))}
          </div>
      </div>

      {/* Grid */}
      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
              <p>در حال دریافت اطلاعات...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.length === 0 && (
                  <div className="col-span-full text-center py-20 text-gray-400">
                      یادداشتی یافت نشد.
                  </div>
              )}
              {filteredNotes.map((note, idx) => (
                  <div 
                    key={note.id} 
                    className={`
                        relative group rounded-2xl p-5 border shadow-sm transition hover:shadow-md flex flex-col
                        ${note.isCompleted ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70 grayscale-[0.5]' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}
                    `}
                  >
                      <div className="flex justify-between items-start mb-3">
                          <h3 className={`font-bold text-lg line-clamp-1 ${note.isCompleted ? 'line-through text-gray-500' : ''}`}>{note.title}</h3>
                          
                          {/* Actions: Edit & Delete */}
                          <div className="flex gap-1 pl-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="ویرایش"
                              >
                                  <Edit3 className="w-4 h-4"/>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="حذف"
                              >
                                  <Trash2 className="w-4 h-4"/>
                              </button>
                          </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 flex-1 whitespace-pre-line leading-relaxed">
                          {note.content}
                      </p>

                      {/* Meta Info */}
                      <div className="space-y-3 mt-auto">
                          <div className="flex flex-wrap gap-1">
                              {note.tags?.map(tag => (
                                  <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                                      #{tag}
                                  </span>
                              ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                              {note.reminderDate ? (
                                  <div className={`flex items-center gap-1 text-xs ${note.isCompleted ? 'text-gray-400' : 'text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded'}`}>
                                      <Clock className="w-3 h-3" />
                                      <span>{note.reminderDate} {note.reminderTime ? `- ${note.reminderTime}` : ''}</span>
                                  </div>
                              ) : <span></span>}
                              
                              <button 
                                onClick={() => toggleComplete(note)}
                                className={`p-2 rounded-full transition ${note.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-green-500'}`}
                                title={note.isCompleted ? 'بازگشت به کارها' : 'انجام شد'}
                              >
                                  <CheckCircle className="w-5 h-5" />
                              </button>
                          </div>
                      </div>
                      
                      {note.attachments && note.attachments.length > 0 && (
                          <div className="absolute top-2 left-2 text-gray-400 transform -rotate-45 pointer-events-none">
                              <Paperclip className="w-4 h-4" />
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                      <h3 className="font-bold text-lg">{editingNote.id ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h3>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-bold mb-1">عنوان</label>
                          <input 
                            value={editingNote.title}
                            onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                            className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                            placeholder="مثلاً: تماس با پیمانکار..."
                            autoFocus
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold mb-1">متن یادداشت</label>
                          <textarea 
                            value={editingNote.content}
                            onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                            className="w-full p-3 h-32 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="جزئیات را اینجا بنویسید..."
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                          <div>
                              <ShamsiDatePicker 
                                label="تاریخ یادآوری"
                                value={editingNote.reminderDate || ''}
                                onChange={d => setEditingNote({...editingNote, reminderDate: d})}
                                disableFuture={false}
                              />
                          </div>
                          <div>
                              <ClockTimePicker 
                                label="ساعت هشدار"
                                value={editingNote.reminderTime || ''}
                                onChange={t => setEditingNote({...editingNote, reminderTime: t})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold mb-1 flex items-center gap-2"><Tag className="w-4 h-4"/> برچسب‌ها</label>
                          <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-xl bg-gray-50 dark:bg-gray-700 min-h-[46px]">
                              {editingNote.tags?.map(tag => (
                                  <span key={tag} className="bg-white dark:bg-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm">
                                      {tag}
                                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                                  </span>
                              ))}
                              <input 
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={addTag}
                                className="bg-transparent outline-none flex-1 text-sm min-w-[100px]"
                                placeholder="تایپ و Enter بزنید..."
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold mb-1 flex items-center gap-2"><Paperclip className="w-4 h-4"/> فایل پیوست</label>
                          <div className="flex items-center gap-2">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">انتخاب فایل</button>
                              <span className="text-xs text-gray-400">{files.length} فایل جدید</span>
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                          
                          {/* Existing Attachments */}
                          {editingNote.attachments && editingNote.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                  {editingNote.attachments.map((att, i) => (
                                      <div key={i} className="text-xs flex items-center gap-2 text-gray-500">
                                          <Paperclip className="w-3 h-3"/> {att.name}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-xl hover:bg-gray-200 transition">انصراف</button>
                      <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl shadow hover:bg-red-800 transition flex items-center gap-2">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} ذخیره
                      </button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};
