
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, UserRole, Attachment } from '../types';
import { fetchUserMessages, sendMessageToDb, markMessageReadInDb, fetchMasterData } from '../workflowStore';
import { MessageSquare, Send, Inbox, Upload, Check, CheckCheck, Users, Globe, User as UserIcon, X, ChevronDown, Loader2, Paperclip, File as FileIcon, Download, CheckCircle, Search, Filter, ChevronLeft, ChevronRight, ArrowDownUp, RefreshCw } from 'lucide-react';

interface Props {
  user: User;
}

export const Messages: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'COMPOSE'>('INBOX');
  const [inboxMsgs, setInboxMsgs] = useState<Message[]>([]);
  const [sentMsgs, setSentMsgs] = useState<Message[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);

  // Users List State
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compose State
  const [receiverType, setReceiverType] = useState<'USER' | 'GROUP' | 'ALL'>('USER');
  const [receiverId, setReceiverId] = useState(''); // For Group/All
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [successMsg, setSuccessMsg] = useState(''); // New Success State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Filtering & Pagination State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load Messages
  useEffect(() => {
      refreshMessages();
  }, [user, activeTab]);

  // Reset pagination when tab changes
  useEffect(() => {
      setCurrentPage(1);
      setSearchTerm('');
  }, [activeTab]);

  // Load Users List
  useEffect(() => {
      const loadUsers = async () => {
          try {
              const appUsers = await fetchMasterData('app_users');
              const personnel = await fetchMasterData('personnel');
              
              const mappedUsers = appUsers.map((u: any) => {
                  const person = personnel.find((p: any) => p.id === u.personnel_id);
                  return {
                      id: u.id,
                      name: person ? person.full_name : u.username
                  };
              });
              setUsersList(mappedUsers);
          } catch (error) {
              console.error("Error loading users for messages:", error);
          }
      };
      loadUsers();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshMessages = async () => {
      setLoading(true);
      try {
          const { inbox, sent } = await fetchUserMessages(user.id, user.role);
          setInboxMsgs(inbox);
          setSentMsgs(sent);
      } catch (e) {
          console.error("Failed to load messages", e);
      } finally {
          setLoading(false);
      }
  };

  const handleReadMessage = async (msg: Message) => {
      setSelectedMsg(msg);
      if (activeTab === 'INBOX' && !msg.readBy.includes(user.id)) {
          // Optimistic UI Update
          setInboxMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, readBy: [...m.readBy, user.id] } : m));
          
          // DB Update
          await markMessageReadInDb(msg, user.id);
      }
  };

  const toggleUserSelection = (id: string) => {
      setSelectedUserIds(prev => 
          prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
      );
  };

  // Convert File to Base64
  const convertBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.readAsDataURL(file);
          fileReader.onload = () => {
              resolve(fileReader.result as string);
          };
          fileReader.onerror = (error) => {
              reject(error);
          };
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles: File[] = Array.from(e.target.files);
          const maxFileSize = 5 * 1024 * 1024; // 5MB limit
          
          const validFiles = newFiles.filter(f => {
              if (f.size > maxFileSize) {
                  alert(`فایل ${f.name} بیشتر از ۵ مگابایت است و حذف شد.`);
                  return false;
              }
              return true;
          });

          setFiles(prev => [...prev, ...validFiles]);
      }
      // Reset input value to allow selecting the same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalReceiverIds: string | string[] = '';
      
      if (receiverType === 'USER') {
          if (selectedUserIds.length === 0) {
              alert('لطفا حداقل یک گیرنده را انتخاب کنید');
              return;
          }
          finalReceiverIds = selectedUserIds;
      } else if (receiverType === 'ALL') {
          finalReceiverIds = 'ALL';
      } else {
          // GROUP
          if (!receiverId) {
              alert('لطفا گروه را مشخص کنید');
              return;
          }
          finalReceiverIds = receiverId;
      }

      setSending(true);
      setSuccessMsg(''); // Reset previous success msg
      try {
          // Process Attachments
          const processedAttachments: Attachment[] = [];
          for (const file of files) {
              const base64 = await convertBase64(file);
              processedAttachments.push({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  data: base64
              });
          }

          await sendMessageToDb(user, finalReceiverIds, receiverType, subject, body, processedAttachments);
          
          // Show Success Message
          setSuccessMsg('پیام با موفقیت ارسال شد');
          
          // Clear Form
          setSubject('');
          setBody('');
          setReceiverId('');
          setSelectedUserIds([]);
          setFiles([]);
          
          // Refresh list quietly
          refreshMessages();

          // Hide success message after 3 seconds
          setTimeout(() => {
              setSuccessMsg('');
              setActiveTab('SENT');
          }, 3000);

      } catch (err: any) {
          const msg = err?.message || JSON.stringify(err) || 'خطای ناشناخته';
          alert('خطا در ارسال پیام: ' + msg);
          console.error(err);
      } finally {
          setSending(false);
      }
  };

  const getReadStatusIcon = (msg: Message) => {
      // Logic: If it's a direct message (USER type), check if readBy has elements.
      // If it's broadcast, it's harder to say "read by all", so we just show checked if *anyone* read it or just sent.
      const isRead = msg.readBy && msg.readBy.length > 0;
      
      if (isRead) {
          return <span title="خوانده شده" className="flex text-blue-500"><CheckCheck className="w-4 h-4" /></span>;
      }
      return <span title="ارسال شده" className="flex text-gray-400"><Check className="w-4 h-4" /></span>;
  };

  // Helper to resolve recipient name for Sent Items
  const getRecipientName = (msg: Message) => {
      if (msg.receiverType === 'ALL') return 'همه کاربران';
      if (msg.receiverType === 'GROUP') return `گروه ${msg.receiverId}`;
      // For USER type, receiverId is the User ID. Look it up.
      const foundUser = usersList.find(u => u.id === msg.receiverId);
      return foundUser ? foundUser.name : 'کاربر';
  };

  // --- Process List Data (Filter & Sort & Pagination) ---
  const getProcessedMessages = () => {
      let data = activeTab === 'INBOX' ? inboxMsgs : sentMsgs;

      // 1. Filter
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          data = data.filter(m => 
              m.subject.toLowerCase().includes(lowerTerm) ||
              m.body.toLowerCase().includes(lowerTerm) ||
              m.senderName.toLowerCase().includes(lowerTerm) ||
              (activeTab === 'SENT' && getRecipientName(m).toLowerCase().includes(lowerTerm))
          );
      }

      // 2. Sort
      data.sort((a, b) => {
          // Assuming createdAt is string format YYYY/MM/DD HH:MM
          return sortOrder === 'newest' 
              ? b.createdAt.localeCompare(a.createdAt)
              : a.createdAt.localeCompare(b.createdAt);
      });

      return data;
  };

  const processedData = getProcessedMessages();
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentData = processedData.slice(startIdx, startIdx + rowsPerPage);

  return (
    <div className="w-full max-w-full h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-2">
                <button 
                    onClick={() => { setActiveTab('COMPOSE'); setSelectedMsg(null); setSuccessMsg(''); }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                    <Send className="w-4 h-4" /> ارسال پیام جدید
                </button>
                <button 
                    onClick={refreshMessages}
                    className="w-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg border dark:border-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
                </button>
            </div>
            <div className="p-2 space-y-1">
                <button 
                    onClick={() => { setActiveTab('INBOX'); setSelectedMsg(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${activeTab === 'INBOX' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4" /> صندوق دریافت
                    </div>
                    {inboxMsgs.filter(m => !m.readBy.includes(user.id)).length > 0 && (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                            {inboxMsgs.filter(m => !m.readBy.includes(user.id)).length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => { setActiveTab('SENT'); setSelectedMsg(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${activeTab === 'SENT' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" /> صندوق ارسال
                    </div>
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            
            {activeTab === 'COMPOSE' && (
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary"/> ارسال پیام جدید
                    </h2>

                    {successMsg && (
                        <div className="mb-4 bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn">
                            <CheckCircle className="w-5 h-5" />
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSend} className="space-y-4 max-w-2xl">
                        {/* Form contents same as before */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">نوع گیرنده</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setReceiverType('USER')} className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-1 ${receiverType === 'USER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}>
                                        <UserIcon className="w-4 h-4"/> فرد
                                    </button>
                                    <button type="button" onClick={() => setReceiverType('GROUP')} className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-1 ${receiverType === 'GROUP' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}>
                                        <Users className="w-4 h-4"/> گروه
                                    </button>
                                    <button type="button" onClick={() => setReceiverType('ALL')} className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-1 ${receiverType === 'ALL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}>
                                        <Globe className="w-4 h-4"/> همه
                                    </button>
                                </div>
                            </div>
                            
                            {receiverType === 'USER' && (
                                <div className="relative" ref={dropdownRef}>
                                    <label className="block text-sm font-bold mb-1">انتخاب کاربران</label>
                                    <div 
                                        className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none cursor-pointer flex items-center justify-between"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span className="text-sm truncate">
                                            {selectedUserIds.length > 0 
                                                ? `${selectedUserIds.length} نفر انتخاب شده` 
                                                : 'انتخاب کنید...'}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </div>
                                    
                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto p-1">
                                            {usersList.map(u => (
                                                <div 
                                                    key={u.id} 
                                                    onClick={() => toggleUserSelection(u.id)}
                                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedUserIds.includes(u.id)} 
                                                        readOnly
                                                        className="w-4 h-4 rounded text-primary focus:ring-primary pointer-events-none"
                                                    />
                                                    <span className="text-sm">{u.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedUserIds.map(id => {
                                            const user = usersList.find(u => u.id === id);
                                            if (!user) return null;
                                            return (
                                                <span key={id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                    {user.name}
                                                    <button type="button" onClick={() => toggleUserSelection(id)} className="hover:text-red-600"><X className="w-3 h-3"/></button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {receiverType === 'GROUP' && (
                                <div>
                                    <label className="block text-sm font-bold mb-1">انتخاب گروه کاربری</label>
                                    <select 
                                        className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none"
                                        value={receiverId}
                                        onChange={e => setReceiverId(e.target.value)}
                                        required
                                    >
                                        <option value="">انتخاب کنید...</option>
                                        <option value={UserRole.ADMIN}>مدیران سیستم</option>
                                        <option value={UserRole.MANAGER}>مدیران فنی</option>
                                        <option value={UserRole.USER}>پرسنل اجرایی</option>
                                        <option value={UserRole.STOREKEEPER}>انبارداران</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1">موضوع پیام <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary"
                                required
                                placeholder="عنوان پیام..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1">متن پیام <span className="text-red-500">*</span></label>
                            <textarea 
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className="w-full p-3 border rounded-lg h-40 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary resize-none"
                                required
                                placeholder="متن پیام خود را بنویسید..."
                            ></textarea>
                        </div>

                        {/* File Attachment Section */}
                        <div>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg transition hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <Paperclip className="w-4 h-4" /> پیوست فایل
                                </button>
                                <span className="text-xs text-gray-400">حداکثر حجم هر فایل: ۵ مگابایت</span>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                />
                            </div>
                            
                            {files.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-xs border border-gray-200 dark:border-gray-600">
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-100 rounded-full p-0.5">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button disabled={sending} type="submit" className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-800 transition flex items-center gap-2 disabled:opacity-50">
                                {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />} ارسال پیام
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {(activeTab === 'INBOX' || activeTab === 'SENT') && (
                <div className="flex h-full flex-col md:flex-row">
                    {/* Message List Panel */}
                    <div className={`${selectedMsg ? 'hidden md:flex md:w-1/3 border-l dark:border-gray-700' : 'w-full flex'} flex-col h-full bg-white dark:bg-gray-800`}>
                        
                        {/* Search & Sort Toolbar */}
                        <div className="p-3 border-b dark:border-gray-700 space-y-2">
                            <div className="relative">
                                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="جستجو..." 
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <button 
                                    onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                                    className="flex items-center gap-1 text-gray-500 hover:text-primary transition"
                                >
                                    <ArrowDownUp className="w-3 h-3" />
                                    {sortOrder === 'newest' ? 'جدیدترین' : 'قدیمی‌ترین'}
                                </button>
                                <span className="text-gray-400">{totalItems} پیام</span>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto">
                            {loading && (
                                <div className="p-10 text-center text-gray-400">
                                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                                    <span>در حال دریافت اطلاعات...</span>
                                </div>
                            )}
                            {!loading && currentData.length === 0 && (
                                <div className="text-center p-10 text-gray-400">
                                    <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>موردی یافت نشد</p>
                                </div>
                            )}
                            {currentData.map(msg => {
                                const isUnread = activeTab === 'INBOX' && !msg.readBy.includes(user.id);
                                return (
                                    <div 
                                        key={msg.id}
                                        onClick={() => handleReadMessage(msg)}
                                        className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition relative
                                            ${selectedMsg?.id === msg.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                            ${isUnread ? 'bg-white' : 'bg-gray-50/30 dark:bg-gray-800/50'}
                                        `}
                                    >
                                        {isUnread && <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm ${isUnread ? 'font-black text-black dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                                                {activeTab === 'INBOX' ? msg.senderName : getRecipientName(msg)}
                                            </span>
                                            <span className="text-[10px] text-gray-400" dir="ltr">{msg.createdAt}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <h4 className={`text-sm truncate pr-2 ${isUnread ? 'font-black text-gray-900 dark:text-white' : 'font-normal text-gray-600 dark:text-gray-400'}`}>
                                                {msg.subject}
                                            </h4>
                                            {activeTab === 'SENT' && getReadStatusIcon(msg)}
                                        </div>
                                        <p className={`text-xs mt-1 truncate ${isUnread ? 'text-gray-800 dark:text-gray-300' : 'text-gray-400'}`}>{msg.body}</p>
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                                <Paperclip className="w-3 h-3" />
                                                <span>{msg.attachments.length} پیوست</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination Footer */}
                        {totalItems > 0 && (
                            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={rowsPerPage} 
                                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-1 outline-none"
                                    >
                                        <option value={10}>10</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                    <span className="text-gray-500">سطر</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <span className="font-mono">{currentPage} / {totalPages || 1}</span>
                                    <button 
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Detail Panel */}
                    {selectedMsg ? (
                        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
                            <div className="p-6 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold">{selectedMsg.subject}</h2>
                                    <button onClick={() => setSelectedMsg(null)} className="md:hidden text-sm text-blue-600">بازگشت</button>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                        {activeTab === 'INBOX' ? selectedMsg.senderName[0] : <UserIcon className="w-5 h-5"/>}
                                    </div>
                                    <div>
                                        <p><span className="font-bold">{activeTab === 'INBOX' ? selectedMsg.senderName : 'شما'}</span></p>
                                        <p className="text-xs opacity-70" dir="ltr">{selectedMsg.createdAt}</p>
                                    </div>
                                </div>
                                {activeTab === 'SENT' && (
                                     <div className="mt-4 pt-3 border-t dark:border-gray-700 text-xs text-gray-500">
                                         گیرنده: {getRecipientName(selectedMsg)}
                                         {selectedMsg.readBy.length > 0 && <span className="mr-2 text-blue-600 flex items-center gap-1 inline-flex"><CheckCheck className="w-3 h-3"/> خوانده شده</span>}
                                     </div>
                                )}
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                                    {selectedMsg.body}
                                </p>

                                {/* Display Attachments */}
                                {selectedMsg.attachments && selectedMsg.attachments.length > 0 && (
                                    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                            <Paperclip className="w-4 h-4" /> فایل‌های پیوست شده
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {selectedMsg.attachments.map((att, idx) => (
                                                <div key={idx} className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition">
                                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-500">
                                                        <FileIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 px-3 overflow-hidden">
                                                        <p className="text-sm font-medium truncate" title={att.name}>{att.name}</p>
                                                        <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                    <a 
                                                        href={att.data} 
                                                        download={att.name}
                                                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition"
                                                        title="دانلود"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                            {/* Empty state text removed as requested */}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Messages;
