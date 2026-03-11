"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ArrowRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import TaskModal from "@/components/TaskModal";
import MembershipModal from "@/components/MembershipModal";

interface Task {
    id: number;
    title: string;
    description: string;
    reward: number;
    status: string;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("User");
    const [userBalance, setUserBalance] = useState<number>(0);
    const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
    const [isMember, setIsMember] = useState<boolean | null>(null);

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userSubmittedTaskIds, setUserSubmittedTaskIds] = useState<number[]>([]);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const currentUserId = authData.user?.id;

            if (currentUserId) {
                setUserId(currentUserId);

                // Fetch user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, balance, is_member')
                    .eq('id', currentUserId)
                    .single();

                if (profile) {
                    setUserName(profile.full_name || "User");
                    setUserBalance(parseFloat(profile.balance) || 0);
                    setIsMember(profile.is_member || false);
                }

                // Count tasks submitted today (rolling 24h)
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: recentTasks, error: recentTasksError } = await supabase
                    .from('user_tasks')
                    .select('id, task_id')
                    .eq('user_id', currentUserId)
                    .gte('completed_at', twentyFourHoursAgo);

                if (recentTasks) {
                    setCompletedTasksCount(recentTasks.length);
                }

                // Fetch ALL user submissions to know which ones they already did forever
                const { data: allUserTasks } = await supabase
                    .from('user_tasks')
                    .select('task_id')
                    .eq('user_id', currentUserId);

                if (allUserTasks) {
                    setUserSubmittedTaskIds(allUserTasks.map(ut => ut.task_id));
                }
            }

            // Fetch active tasks
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (tasksError) throw tasksError;

            if (tasksData) {
                setTasks(tasksData);
            }

        } catch (error: any) {
            console.error("Error fetching tasks:", error.message || JSON.stringify(error));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenModal = (task: Task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const hasReachedDailyLimit = completedTasksCount >= 5;

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-zinc-500">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="font-medium animate-pulse">جاري تحميل المهام المتاحة...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-2 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">المهام المتاحة</h1>
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-1.5 uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            نشط
                        </div>
                    </div>
                    <p className="text-zinc-500">أنجز المهام اليومية، ارفع الإثباتات، واربح المكافآت.</p>
                </div>

                <div className="glass px-6 py-4 rounded-2xl flex flex-col items-end border border-zinc-800/50 shadow-lg">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">الحد اليومي المنجز</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${hasReachedDailyLimit ? 'text-red-500' : 'text-amber-500'}`}>
                            {completedTasksCount}
                        </span>
                        <span className="text-zinc-600 font-bold">/ 5</span>
                    </div>
                </div>
            </div>

            {hasReachedDailyLimit && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-500">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-sm mb-1">لقد وصلت للحد اليومي الأعلى (5 مهام)!</h4>
                        <p className="text-xs text-red-500/80">يرجى العودة غداً للمزيد من المهام الجديدة. شكراً لجهودك.</p>
                    </div>
                </div>
            )}

            <div className="relative group max-w-md">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                </div>
                <input
                    type="text"
                    placeholder="ابحث عن مهمة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-2xl py-4 pl-12 pr-6 text-white transition-all shadow-xl font-medium"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">لا توجد مهام متاحة حالياً.</p>
                    </div>
                ) : (
                    filteredTasks.map((task, index) => {
                        const isSubmitted = userSubmittedTaskIds.includes(task.id);

                        return (
                            <div
                                key={task.id}
                                className="glass rounded-3xl p-6 border border-zinc-800/50 hover:border-amber-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col group animate-in slide-in-from-bottom"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-amber-500 border border-zinc-800 group-hover:scale-110 transition-transform shadow-inner">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {task.reward.toLocaleString()} د.ع
                                    </div>
                                </div>

                                <div className="mb-6 flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-amber-400 transition-colors">
                                        {task.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                                        {task.description}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-zinc-800">
                                    {isSubmitted ? (
                                        <button
                                            disabled
                                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                                        >
                                            <Clock size={18} />
                                            تم التقديم مسبقاً
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleOpenModal(task)}
                                            disabled={hasReachedDailyLimit}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${hasReachedDailyLimit
                                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800"
                                                : "bg-amber-500 text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 hover:-translate-y-0.5 active:translate-y-0"
                                                }`}
                                        >
                                            {hasReachedDailyLimit ? "عذراً تم بلوغ الحد اليومي" : "إنجاز المهمة"}
                                            {!hasReachedDailyLimit && <ArrowRight size={18} className="mr-1" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                userId={userId}
                userName={userName}
                onSuccess={fetchData}
            />

            <MembershipModal
                isOpen={isMember === false}
                userId={userId}
                userName={userName}
                onSuccess={fetchData}
            />
        </div>
    );
}
