"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, Plus, Minus, Loader2, CheckCircle2, Target, ClipboardList, Trash2, Edit3, Eye, BadgeCheck, Settings } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("users");
    const [users, setUsers] = useState<any[]>([]);

    // Task Management
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskReward, setNewTaskReward] = useState("3.00");

    // Approvals
    const [pendingTasks, setPendingTasks] = useState<any[]>([]);
    const [pendingMemberships, setPendingMemberships] = useState<any[]>([]);

    // App Settings
    const [zainCash, setZainCash] = useState("");
    const [fastPay, setFastPay] = useState("");
    const [zainActive, setZainActive] = useState(true);
    const [fastActive, setFastActive] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        async function checkAdminAndFetch() {
            setIsLoading(true);
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (!authData.user) {
                    router.push('/auth/login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', authData.user.id)
                    .single();

                console.log('Fetched Profile (Admin):', profile);

                if (!profile || profile.role !== 'admin') {
                    alert('Access denied: Admin only');
                    router.push('/tasks');
                    return;
                }

                await fetchAllData();
            } catch (error) {
                console.error("Admin check failed:", error);
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        }
        checkAdminAndFetch();
    }, [router, supabase]);

    const fetchAllData = async () => {
        const [usersData, tasksData, pendingData, membershipData, settingsData] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('tasks').select('*').order('created_at', { ascending: false }),
            supabase.from('user_tasks').select('*, profiles(full_name, email), tasks(id, title, reward)').eq('status', 'pending').order('completed_at', { ascending: false }),
            supabase.from('membership_requests').select('id, user_id, status, proof_url, created_at, profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }),
            supabase.from('app_settings').select('*')
        ]);

        if (usersData.data) setUsers(usersData.data);
        if (tasksData.data) setTasks(tasksData.data);
        if (pendingData.data) {
            setPendingTasks(pendingData.data);
            if (pendingData.data.length > 0) {
                console.log('[Admin] FULL Sample Pending Task:', JSON.stringify(pendingData.data[0], null, 2));
            }
        }
        if (membershipData.data) setPendingMemberships(membershipData.data);
        if (settingsData.data) {
            console.log('Fetched data:', settingsData.data);
            const zainRow = settingsData.data?.find((s: any) => s.key === 'zain_cash');
            const fastRow = settingsData.data?.find((s: any) => s.key === 'fast_pay');
            if (zainRow) {
                setZainCash(zainRow.value);
                setZainActive(zainRow.is_active ?? true);
            }
            if (fastRow) {
                setFastPay(fastRow.value);
                setFastActive(fastRow.is_active ?? true);
            }
        }
    };

    const handleUpdateBalance = async (userId: string, amount: number) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const newBalance = parseFloat(user.balance) + amount;

        const { error } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
            alert(`تم تحديث الرصيد بنجاح! الرصيد الجديد: ${newBalance.toLocaleString()} د.ع`);
        } else {
            alert("حدث خطأ أثناء تحديث الرصيد: " + error.message);
        }
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle || !newTaskDesc || !newTaskReward) {
            alert("يرجى ملء جميع الحقول المطلوبة.");
            return;
        }
        
        setIsLoading(true);
        try {
            const { error } = await supabase.from('tasks').insert({
                title: newTaskTitle,
                description: newTaskDesc,
                reward: parseFloat(newTaskReward)
            });

            if (error) throw error;

            setNewTaskTitle("");
            setNewTaskDesc("");
            setNewTaskReward("3.00");
            await fetchAllData();
            alert("تم إضافة المهمة بنجاح!");
        } catch (error: any) {
            console.error('[Admin] Create Task Error:', error);
            alert("فشل إضافة المهمة: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm("هل أنت متأكد من حذف هذه المهمة؟")) return;
        
        setIsLoading(true);
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            
            if (error) {
                // Check for foreign key constraint errors
                if (error.code === '23503') {
                    throw new Error("لا يمكن حذف هذه المهمة لأنها مرتبطة بسجلات منجزة من قبل الزبائن. يجب حذف سجلات الإنجاز أولاً.");
                }
                throw error;
            }

            await fetchAllData();
            alert("تم حذف المهمة بنجاح.");
        } catch (error: any) {
            console.error('[Admin] Delete Task Error:', error);
            alert("خطأ أثناء الحذف: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveRejectTask = async (userTaskId: any, action: 'approved' | 'rejected') => {
        if (!userTaskId) {
            console.warn('[Admin] userTaskId is missing!');
            return;
        }

        setIsLoading(true);
        try {
            console.log(`[Admin] Decision for task ID: "${userTaskId}" type: (${typeof userTaskId})`);
            
            if (action === 'approved') {
                // Call the secure RPC function
                const { error } = await supabase.rpc('approve_task', { p_user_task_id: userTaskId });
                if (error) throw error;
            } else {
                // Just reject it
                const { error } = await supabase.from('user_tasks').update({ status: 'rejected' }).eq('id', userTaskId);
                if (error) throw error;
            }
            await fetchAllData();
        } catch (error: any) {
            console.error('[Admin] Task Decision Error:', JSON.stringify(error, null, 2));
            alert("Error: " + (error.message || JSON.stringify(error)));
        } finally {
            setIsLoading(false);
        }
    };

    const handleMembershipAction = async (requestId: string, action: 'approve' | 'reject') => {
        setIsLoading(true);
        try {
            console.log(`[Admin] Performing ${action} for Request ID:`, requestId);
            
            const { error } = await supabase.rpc('handle_membership_action', { 
                p_request_id: parseInt(requestId.toString()),
                p_action: action
            });

            if (error) throw error;
            
            alert(action === 'approve' ? "تم تفعيل العضوية بنجاح!" : "تم رفض الطلب بنجاح.");
            window.location.reload();
        } catch (error: any) {
            console.error('[Admin] Membership Action Error:', error);
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        setIsSavingSettings(true);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert([
                    { key: 'zain_cash', value: zainCash, is_active: zainActive },
                    { key: 'fast_pay', value: fastPay, is_active: fastActive }
                ]);

            if (error) throw error;
            alert("تم حفظ الإعدادات بنجاح!");
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsSavingSettings(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-amber-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-2 pb-16">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">لوحة الإدارة</h1>
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-widest">
                        <ShieldCheck size={14} />
                        صلاحيات المسؤول
                    </div>
                </div>
                <p className="text-zinc-500">قم بإدارة مهام المستخدمين، المراجعات، والموارد المالية.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800 flex-wrap">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "users" ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Users size={16} />
                    إدارة المستخدمين
                </button>
                <button
                    onClick={() => setActiveTab("tasks")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tasks" ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Target size={16} />
                    إعداد المهام
                </button>
                <button
                    onClick={() => setActiveTab("approvals")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "approvals" ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                >
                    <ClipboardList size={16} />
                    سجل المهام المنجزة ({pendingTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab("memberships")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "memberships" ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                >
                    <BadgeCheck size={16} />
                    طلبات العضوية ({pendingMemberships.length})
                </button>
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "settings" ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Settings size={16} />
                    إعدادات النظام
                </button>
            </div>

            {/* User Management Tab */}
            {activeTab === "users" && (
                <div className="glass rounded-3xl overflow-hidden animate-in">
                    <div className="p-6 border-b border-zinc-800/50">
                        <h2 className="text-xl font-bold">المستخدمين المسجلين</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-900/50 border-b border-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">المستخدم</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">البريد الإلكتروني</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">الدور</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">الرصيد (د.ع)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">أدوات مالية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm">{user.full_name || "بدون اسم"}</div>
                                            <div className="text-[10px] text-zinc-600 font-mono tracking-tighter">{user.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${user.user_role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {user.user_role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-sm text-white">
                                            {user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const amt = prompt("أدخل المبلغ المراد إضافته (د.ع):", "1000");
                                                        if (amt && !isNaN(parseFloat(amt))) {
                                                            handleUpdateBalance(user.id, parseFloat(amt));
                                                        }
                                                    }} 
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500" 
                                                    title="إضافة رصيد"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const amt = prompt("أدخل المبلغ المراد خصمه (د.ع):", "1000");
                                                        if (amt && !isNaN(parseFloat(amt))) {
                                                            handleUpdateBalance(user.id, -parseFloat(amt));
                                                        }
                                                    }} 
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-500" 
                                                    title="خصم رصيد"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Task Management Tab */}
            {activeTab === "tasks" && (
                <div className="grid md:grid-cols-3 gap-6 animate-in">
                    <div className="md:col-span-1 space-y-4">
                        <div className="glass rounded-3xl p-6 border border-zinc-800/50">
                            <h2 className="text-xl font-bold mb-4">إنشاء مهمة جديدة</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">عنوان المهمة</label>
                                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">المكافأة (د.ع)</label>
                                    <input type="number" step="0.5" value={newTaskReward} onChange={e => setNewTaskReward(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">الوصف أو المتطلبات</label>
                                    <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white min-h-[80px]" />
                                </div>
                                <button onClick={handleCreateTask} disabled={!newTaskTitle} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400">
                                    إضافة للمنصة
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 glass rounded-3xl border border-zinc-800/50 p-6">
                        <h2 className="text-xl font-bold mb-6">المهام المتاحة على المنصة</h2>
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <div key={task.id} className="flex justify-between items-center p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{task.title}</h3>
                                        <div className="text-sm text-zinc-500 line-clamp-1">{task.description}</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full text-sm">
                                            {task.reward} د.ع
                                        </div>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Queue Tab */}
            {activeTab === "approvals" && (
                <div className="glass rounded-3xl overflow-hidden animate-in">
                    <div className="p-6 border-b border-zinc-800/50">
                        <h2 className="text-xl font-bold">سجل المهام المنجزة للمراجعة</h2>
                    </div>
                    {pendingTasks.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 flex flex-col items-center">
                            <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" />
                            لايوجد أي مهام قيد المراجعة حالياً. رائع!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-zinc-900/50 border-b border-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">المهمة</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">المستخدم</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">الإثبات المرفق</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">القرار</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {pendingTasks.map((pt) => (
                                        <tr key={pt.id} className="hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-sm">{pt.tasks?.title}</div>
                                                <div className="text-amber-500 text-xs font-bold mt-1">المكافأة: {pt.tasks?.reward} د.ع</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm text-zinc-300">{pt.profiles?.full_name}</div>
                                                <div className="text-xs text-zinc-500">{new Date(pt.completed_at).toLocaleString('ar-IQ')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <a href={pt.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-xs font-bold">
                                                    <Eye size={14} />
                                                    عرض الصورة
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleApproveRejectTask(pt.id, 'approved')} 
                                                        className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-400"
                                                    >
                                                        قبول
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproveRejectTask(pt.id, 'rejected')} 
                                                        className="bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500"
                                                    >
                                                        رفض
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Membership Approvals Tab */}
            {activeTab === "memberships" && (
                <div className="glass rounded-3xl overflow-hidden animate-in">
                    <div className="p-6 border-b border-zinc-800/50">
                        <h2 className="text-xl font-bold">طلبات ترقية العضوية (25$)</h2>
                    </div>
                    {pendingMemberships.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 flex flex-col items-center">
                            <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" />
                            لا يوجد أي طلبات عضوية قيد المراجعة حالياً.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-zinc-900/50 border-b border-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">المستخدم</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">الإثبات المرفق</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">القرار</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {pendingMemberships.map((pm) => (
                                        <tr key={pm.id} className="hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-sm">{pm.profiles?.full_name}</div>
                                                <div className="text-xs text-zinc-500">{new Date(pm.created_at).toLocaleString('ar-IQ')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <a href={pm.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-xs font-bold">
                                                    <Eye size={14} />
                                                    عرض الصورة
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleMembershipAction(pm.id, 'approve')} className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-400">
                                                        قبول
                                                    </button>
                                                    <button onClick={() => handleMembershipAction(pm.id, 'reject')} className="bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500">
                                                        رفض
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            {/* System Settings Tab */}
            {activeTab === "settings" && (
                <div className="glass rounded-[2rem] p-8 border border-zinc-800/50 max-w-2xl animate-in">
                    <div className="flex items-center gap-3 mb-8 justify-end border-b border-zinc-800 pb-4">
                        <div className="text-right">
                            <h2 className="text-xl font-bold">إعدادات النظام</h2>
                            <p className="text-xs text-zinc-500 mt-1">إدارة معلومات الدفع والتفعيل</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                            <Settings size={24} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 text-right">
                                <div className="flex items-center justify-between gap-4">
                                    <button 
                                        onClick={() => setZainActive(!zainActive)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${zainActive ? 'bg-amber-500' : 'bg-zinc-800'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${zainActive ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <label className="text-sm font-bold text-zinc-400">رقم زين كاش (ZainCash)</label>
                                </div>
                                <input 
                                    type="text" 
                                    value={zainCash}
                                    onChange={(e) => setZainCash(e.target.value)}
                                    className={`w-full bg-zinc-900 border ${zainActive ? 'border-zinc-800' : 'border-zinc-800/20 opacity-30'} rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none text-left font-mono transition-all`}
                                    dir="ltr"
                                    disabled={!zainActive}
                                />
                            </div>
                            <div className="space-y-2 text-right">
                                <div className="flex items-center justify-between gap-4">
                                    <button 
                                        onClick={() => setFastActive(!fastActive)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${fastActive ? 'bg-amber-500' : 'bg-zinc-800'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${fastActive ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <label className="text-sm font-bold text-zinc-400">رقم FastPay</label>
                                </div>
                                <input 
                                    type="text" 
                                    value={fastPay}
                                    onChange={(e) => setFastPay(e.target.value)}
                                    className={`w-full bg-zinc-900 border ${fastActive ? 'border-zinc-800' : 'border-zinc-800/20 opacity-30'} rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none text-left font-mono transition-all`}
                                    dir="ltr"
                                    disabled={!fastActive}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleUpdateSettings}
                            disabled={isSavingSettings}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSavingSettings ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            حفظ التعديلات
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
