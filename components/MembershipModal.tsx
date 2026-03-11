"use client";

import { useState, useRef, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Loader2, UploadCloud, FileImage, ShieldCheck, Wallet } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';

interface MembershipModalProps {
    isOpen: boolean;
    userId: string | null;
    userName: string;
    onSuccess: () => void;
}

export default function MembershipModal({ isOpen, userId, userName, onSuccess }: MembershipModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [zainCash, setZainCash] = useState("جاري التحميل...");
    const [fastPay, setFastPay] = useState("جاري التحميل...");
    const [zainActive, setZainActive] = useState(true);
    const [fastActive, setFastActive] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('*');
                
                if (data && !error) {
                    const zainRow = data.find((s: any) => s.key === 'zain_cash');
                    const fastRow = data.find((s: any) => s.key === 'fast_pay');
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
            fetchSettings();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.type.startsWith('image/')) {
                setError("يرجى رفع صورة صالحة كإثبات الدفع.");
                return;
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError("حجم الصورة يجب أن لا يتجاوز 5 ميجابايت.");
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (!droppedFile.type.startsWith('image/')) {
                setError("يرجى رفع صورة صالحة كإثبات الدفع.");
                return;
            }
            setFile(droppedFile);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!userId) {
            setError("يرجى تسجيل الدخول أولاً.");
            return;
        }

        if (!file) {
            setError("يرجى إرفاق صورة إيصال الدفع.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Debug: Verify file and path before upload
            console.log('[MembershipModal] Target Bucket:', 'membership-proofs');
            console.log('[MembershipModal] File object:', file);
            console.log('[MembershipModal] File name:', file?.name, '| File size:', file?.size);

            const filePath = `${userId}/${Date.now()}_${file.name}`;
            console.log('[MembershipModal] Generated filePath:', filePath);

            const storageResponse = await supabase.storage
                .from('membership-proofs')
                .upload(filePath, file);
            
            console.log('[MembershipModal] Storage Upload Response:', storageResponse);

            const { error: uploadError } = storageResponse;

            if (uploadError) {
                console.error('[MembershipModal] Upload error detail:', JSON.stringify(uploadError, null, 2));
                alert(`Upload failed: ${uploadError.message}`);
                throw new Error("فشل رفع صورة الإيصال: " + uploadError.message);
            }

            // Get the public URL for the image
            const publicUrlResponse = supabase.storage
                .from('membership-proofs')
                .getPublicUrl(filePath);
            
            console.log('[MembershipModal] Storage Public URL Response:', publicUrlResponse);
            const { data: publicUrlData } = publicUrlResponse;

            const proofUrl = publicUrlData.publicUrl;

            // 2. Insert into membership_requests table
            const { error: insertError } = await supabase
                .from('membership_requests')
                .insert({
                    user_id: userId,
                    status: 'pending',
                    proof_url: proofUrl,
                });

            if (insertError) {
                throw new Error("حدث خطأ أثناء إرسال الطلب: " + insertError.message);
            }

            // 3. Optional Telegram Notification
            try {
                const message = `🌟 <b>New Membership Payment!</b>\n\n` +
                    `👤 <b>User:</b> ${userName}\n` +
                    `💰 <b>Amount:</b> $25 (33,000 د.ع)\n` +
                    `🔗 <a href="${proofUrl}">View Receipt Image</a>`;

                await fetch('/api/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
            } catch (err) {
                console.error("Failed to send telegram notification:", err);
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 3000);

        } catch (err: any) {
            console.error("Submission Error:", err);
            setError(err.message || "حدث خطأ غير متوقع.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            />

            <div className="relative w-full max-w-lg glass rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-amber-500/20">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/60 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"></div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck size={32} className="text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white">ترقية العضوية المطلوبة</h2>
                    <p className="text-zinc-400 text-sm mt-2">للوصول إلى المهام المدفوعة وبدء الأرباح، يتطلب الأمر تفعيل العضوية.</p>
                </div>

                <div className="p-8 space-y-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                                <CheckCircle2 size={40} />
                            </div>
                            <p className="text-2xl font-black text-white">تم استلام الدفعة!</p>
                            <p className="text-zinc-400 text-sm text-center">جاري مراجعة الإيصال. سيتم تفعيل حسابك كعضو مميز فور التأكد من الدفعة، وسيمكنك البدء بإنجاز المهام.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">الرسوم المطلوبة</h3>
                                        <p className="text-xs text-zinc-500">تدفع لمرة واحدة فقط</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-amber-500">$25</div>
                                        <div className="text-xs font-bold text-zinc-400">~ 33,000 د.ع</div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/30 rounded-2xl p-5 border border-zinc-800 space-y-3">
                                    <p className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-2">
                                        <Wallet size={16} className="text-amber-500" />
                                        طرق الدفع المتاحة
                                    </p>
                                    <div className={`grid gap-3 ${zainActive && fastActive ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {zainActive && (
                                            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                                <div className="text-xs text-zinc-500 mb-1">ZainCash (زين كاش)</div>
                                                <div className="font-mono text-sm text-white font-bold select-all tracking-wider">{zainCash}</div>
                                            </div>
                                        )}
                                        {fastActive && (
                                            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                                <div className="text-xs text-zinc-500 mb-1">FastPay</div>
                                                <div className="font-mono text-sm text-white font-bold select-all tracking-wider">{fastPay}</div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 text-center">يرجى تحويل المبلغ لأحد الأرقام أعلاه ثم رفع صورة الإيصال هنا.</p>
                                    
                                    <div className="pt-2 border-t border-zinc-800 flex flex-col items-center gap-2">
                                        <p className="text-[11px] text-zinc-400">تواجه مشكلة في الدفع؟ تواصل معنا</p>
                                        <a 
                                            href="https://t.me/OrInvestmentCompany" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-1.5 bg-sky-500/10 text-sky-400 rounded-full hover:bg-sky-500 hover:text-white transition-all text-xs font-bold"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                                            الدعم الفني عبر تليغرام
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                                        إيصال التحويل (لقطة شاشة)
                                    </label>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${file
                                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                                : 'border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/50 bg-zinc-900/30'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />

                                        {file ? (
                                            <>
                                                <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-500 mb-1">
                                                    <FileImage size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-emerald-500 truncate max-w-[200px]">
                                                    {file.name}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-zinc-800 rounded-full text-zinc-400 mb-1">
                                                    <UploadCloud size={24} />
                                                </div>
                                                <p className="text-sm font-medium text-zinc-300">اضغط لرفع الإيصال</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !file}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!file
                                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : "bg-amber-500 text-black hover:bg-amber-400 hover:shadow-amber-500/20"
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        جاري رفع الإيصال...
                                    </>
                                ) : (
                                    <>
                                        تأكيد الدفع وتفعيل العضوية
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
