"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TrendingUp, Mail, Lock, Loader2, AlertCircle, User } from "lucide-react";
import { sendTelegramNotification } from "@/lib/actions";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [referredBy, setReferredBy] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const refCode = searchParams.get("ref");
    const supabase = createClient();

    useEffect(() => {
        if (refCode) {
            const resolveReferrer = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('referral_code', refCode)
                    .single();
                
                if (data) {
                    setReferredBy(data.id);
                    console.log('[Register] Referred by:', data.id);
                }
            };
            resolveReferrer();
        }
    }, [refCode, supabase]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        referred_by: referredBy,
                    },
                },
            });

            if (error) {
                setError(error.message);
                setIsLoading(false);
                return;
            }

            // Send Telegram Notification silently in the background
            const message = `🔔 <b>New User Sign-up!</b>\n\n` +
                `👤 <b>Name:</b> ${fullName}\n` +
                `📧 <b>Email:</b> ${email}\n` +
                `📅 <b>Date:</b> ${new Date().toLocaleDateString()}\n` +
                `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

            sendTelegramNotification(message).catch(console.error);

            // If email confirmation is disabled, user is usually logged in immediately
            // We force a router refresh and redirect
            if (data.session) {
                router.refresh(); // Crucial for middleware to pick up the new cookie
                router.push("/");
            } else {
                // Fallback: If for some reason session isn't available immediately but no error
                // Force a manual sign in attempt just in case, or redirect to login
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    // If it fails, maybe email confirmation IS actually required by the server
                    setError("Registration successful. Please check your email to verify your account or try logging in.");
                    setIsLoading(false);
                } else {
                    router.refresh();
                    router.push("/");
                }
            }

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mb-6">
                        <TrendingUp className="text-black" size={28} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">إنشاء حساب جديد</h1>
                    <p className="text-zinc-500">انضم إلى منصة المهام وابدأ بتحقيق الأرباح.</p>
                </div>

                <div className="glass rounded-3xl p-8 space-y-6">
                    {error && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400 ml-1">الاسم الكامل</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                    placeholder="محمد علي"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400 ml-1">البريد الإلكتروني</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400 ml-1">كلمة المرور</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "إنشاء الحساب"}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center text-xs uppercase">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#050505] px-2 text-zinc-500">By signing up, you agree to our</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-center text-zinc-600 px-4">
                        Terms of Service, Privacy Policy, and Risk Disclosure Statement.
                    </p>
                </div>

                <p className="text-center text-sm text-zinc-500">
                    لديك حساب بالفعل؟;{" "}
                    <Link href="/auth/login" className="text-amber-500 hover:text-amber-400 font-medium">
                        تسجيل الدخول
                    </Link>
                </p>
            </div>
        </div>
    );
}
