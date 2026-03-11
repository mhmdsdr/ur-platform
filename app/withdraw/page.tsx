"use client";

import { useState, useEffect } from "react";
import { Wallet, Send, Loader2, AlertCircle, CheckCircle2, History } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { sendTelegramNotification } from "@/lib/actions";

export default function WithdrawPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<number>(0);
    const [telegramHandle, setTelegramHandle] = useState("");
    const [amount, setAmount] = useState("");
    const [profile, setProfile] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchUserAndData();
    }, []);

    const fetchUserAndData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/auth/login');
            return;
        }

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileData) {
            setProfile(profileData);
            setBalance(profileData.balance || 0);
        }

        const { data: withdrawalData } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (withdrawalData) {
            setWithdrawals(withdrawalData);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            alert("يرجى إدخال مبلغ صحيح.");
            return;
        }

        if (withdrawAmount > balance) {
            alert("عذراً، رصيدك غير كافٍ لهذا المبلغ.");
            return;
        }

        if (!telegramHandle) {
            alert("يرجى إدخال معرف التليغرام الخاص بك.");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Insert withdrawal request
            const { error: insertError } = await supabase
                .from('withdrawals')
                .insert({
                    user_id: user.id,
                    telegram_handle: telegramHandle,
                    amount: withdrawAmount,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            // 2. Send Telegram Notification
            const message = `
💰 <b>طلب سحب جديد</b> 💰

👤 المستخدم: <b>${profile?.full_name || 'غير معروف'}</b>
🆔 المعرف: <code>${user.id}</code>
📱 تليغرام: <b>${telegramHandle}</b>
💵 المبلغ: <b>${withdrawAmount.toLocaleString()} د.ع</b>
🕒 الوقت: <b>${new Date().toLocaleString('ar-IQ')}</b>

يرجى مراجعة لوحة الإدارة لمعالجة الطلب.
            `;

            await sendTelegramNotification(message);

            alert("تم إرسال طلب السحب بنجاح! سيتم مراجعته من قبل الإدارة.");
            setAmount("");
            setTelegramHandle("");
            fetchUserAndData();
        } catch (error: any) {
            console.error("Withdrawal error:", error);
            alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <Wallet size={24} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">سحب الأموال</h1>
                </div>
                <p className="text-zinc-500 text-right">يمكنك طلب سحب أرباحك عندما تصل للحد الأدنى.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-right">
                {/* Withdrawal Form */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass rounded-[2rem] p-8 border border-zinc-800/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[80px] rounded-full" />
                        
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 justify-end">
                            تفاصيل السحب
                            <Send size={18} className="text-amber-500" />
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-zinc-400 mb-2 block">معرف التليغرام (@username)</label>
                                    <input 
                                        type="text" 
                                        placeholder="@yourhandle"
                                        value={telegramHandle}
                                        onChange={(e) => setTelegramHandle(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-700 outline-none focus:border-amber-500/50 transition-all text-left"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-zinc-400 mb-2 block">المبلغ المطلوب (د.ع)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-700 outline-none focus:border-amber-500/50 transition-all font-mono text-lg"
                                        />
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">IQD</div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 px-2">الرصيد المتاح حالياً: <span className="text-amber-500 font-bold">{balance.toLocaleString()} د.ع</span></p>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                إرسال طلب السحب
                            </button>
                        </form>
                    </div>
                </div>

                {/* Info Card & Stats */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glass rounded-[2rem] p-6 border border-zinc-800/50 bg-amber-500/5">
                        <div className="flex items-center gap-3 mb-4 justify-end">
                            <h3 className="font-bold text-amber-500">تنبيهات هامة</h3>
                            <AlertCircle size={20} className="text-amber-500" />
                        </div>
                        <ul className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                            <li>• تأكد من صحة معرف التليغرام للتواصل عند إتمام الدفع.</li>
                            <li>• تتم مراجعة طلبات السحب خلال 24-48 ساعة.</li>
                            <li>• يتم الخصم من الرصيد تلقائياً بعد الموافقة على الطلب.</li>
                        </ul>
                    </div>

                    <div className="glass rounded-[2rem] p-6 border border-zinc-800/50">
                        <div className="flex items-center gap-3 mb-6 justify-end">
                            <h3 className="font-bold">حالة الطلبات الأخيرة</h3>
                            <History size={20} className="text-zinc-500" />
                        </div>
                        
                        <div className="space-y-4">
                            {withdrawals.length === 0 ? (
                                <p className="text-xs text-center text-zinc-600 py-4">لا توجد طلبات سابقة</p>
                            ) : (
                                withdrawals.slice(0, 5).map((w) => (
                                    <div key={w.id} className="flex flex-col gap-1 text-right p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                w.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {w.status === 'approved' ? 'مكتمل' : w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                            </span>
                                            <span className="font-bold text-xs text-white">{w.amount.toLocaleString()} د.ع</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-600">{new Date(w.created_at).toLocaleDateString('ar-IQ')}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
