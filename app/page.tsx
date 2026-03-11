"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Activity, Wallet, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

function StatCard({ title, value, change, isPositive, icon: Icon }: any) {
  return (
    <div className="glass p-6 rounded-3xl border border-zinc-800/50 hover:border-amber-500/30 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-zinc-900 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
          <Icon size={24} />
        </div>
      </div>
      <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white">{value}</h3>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [balance, setBalance] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [availableTasks, setAvailableTasks] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const userId = authData.user.id;

      // Fetch Profile Balance and Referral Code
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance, referral_code')
          .eq('id', userId)
          .single();
        
        if (profileError) throw profileError;

        if (profile) {
          setBalance(parseFloat(profile.balance));
          const origin = typeof window !== 'undefined' ? window.location.origin : '';

          if (profile.referral_code) {
            setReferralLink(`${origin}/auth/register?ref=${profile.referral_code}`);
          } else {
            console.log('[Dashboard] Referral code missing, generating one...');
            // Generate a code based on userId as a fallback, and update DB
            const newCode = userId.substring(0, 8).toUpperCase();
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ referral_code: newCode })
              .eq('id', userId);
            
            if (updateError) {
              console.error('[Dashboard] Failed to save generated referral code:', updateError);
              // Set state anyway so the UI isn't stuck
              setReferralLink(`${origin}/auth/register?ref=${newCode}`);
            } else {
              setReferralLink(`${origin}/auth/register?ref=${newCode}`);
            }
          }
        }
      } catch (err: any) {
        console.error('[Dashboard] Fetch error:', JSON.stringify(err, null, 2));
        setError("فشل تحميل بيانات الحساب. يرجى تحديث الصفحة.");
        // Set a default link so it's not stuck forever
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setReferralLink(`${origin}/auth/register?ref=error`);
      }

      // Fetch Stats
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('status, tasks(reward)')
        .eq('user_id', userId);

      let completed = 0;
      let pending = 0;

      if (userTasks) {
        userTasks.forEach((ut: any) => {
          if (ut.status === 'approved') completed++;
          if (ut.status === 'pending' && ut.tasks?.reward) pending += parseFloat(ut.tasks.reward);
        });
      }
      setCompletedTasks(completed);
      setPendingRewards(pending);

      // Fetch active tasks count
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      setAvailableTasks(count || 0);

      // Fetch recent history (simplified)
      const { data: recent } = await supabase
        .from('user_tasks')
        .select('id, status, completed_at, tasks(title, reward)')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(5);

      if (recent) setRecentActivity(recent);
    }
    fetchDashboardData();
  }, [supabase]);

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in mt-2">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">نظرة عامة</h1>
        <p className="text-zinc-500">مرحباً بك مرة أخرى! قم بإنجاز المهام لزيادة أرباحك.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الرصيد"
          value={`${balance.toLocaleString()} د.ع`}
          isPositive={true}
          icon={Wallet}
        />
        <StatCard
          title="المكافآت المعلقة"
          value={`${pendingRewards.toLocaleString()} د.ع`}
          isPositive={true}
          icon={TrendingUp}
        />
        <StatCard
          title="المهام المنجزة"
          value={`${completedTasks}`}
          isPositive={true}
          icon={CheckCircle2}
        />
        <StatCard
          title="المهام المتاحة"
          value={`${availableTasks}`}
          isPositive={true}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass p-8 rounded-3xl border border-zinc-800/50 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative">
            <h2 className="text-xl font-bold mb-2">تسريع الأرباح!</h2>
            <p className="text-zinc-400 mb-6 max-w-md">قم بدعوة أصدقائك واحصل على مكافأة فورية 5,000 د.ع لكل صديق يسجل ويبدأ إنجاز المهام.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-zinc-300 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                {referralLink || "جاري توليد الرابط..."}
              </div>
              <button
                onClick={copyToClipboard}
                className="bg-amber-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-amber-500/20"
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <Plus size={32} />
          </div>
          <h3 className="font-bold text-lg mb-2">إيداع رصيد</h3>
          <p className="text-zinc-500 text-sm mb-6">بطاقات الدفع والمحافظ الإلكترونية قريباً.</p>
          <button disabled className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-500 font-bold bg-zinc-900/50 cursor-not-allowed">
            غير متاح حالياً
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">آخر النشاطات</h2>
          <Link href="/tasks" className="text-amber-500 text-sm font-bold flex items-center gap-1 hover:text-amber-400">
            اكتشف المزيد <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <div className="glass rounded-3xl border border-zinc-800/50 overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">لا يوجد نشاط مسجل حتى الآن.</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {recentActivity.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-4 px-6 hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                      ${tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500'
                        : tx.status === 'rejected' ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'}
                    `}>
                      {tx.status === 'approved' ? <CheckCircle2 size={18} /> : <Activity size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200">{tx.tasks?.title || "مهمة غير معروفة"}</p>
                      <p className="text-xs text-zinc-500">{new Date(tx.completed_at).toLocaleDateString()} • {tx.status === 'pending' ? 'قيد المراجعة' : tx.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">+{tx.tasks?.reward?.toLocaleString() || "0"} د.ع</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
