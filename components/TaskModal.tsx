"use client";

import { useState, useRef } from "react";
import { X, CheckCircle2, AlertCircle, Loader2, UploadCloud, FileImage } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';

interface Task {
    id: number;
    title: string;
    description: string;
    reward: number;
}

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    userId: string | null;
    userName: string;
    onSuccess: () => void;
}

export default function TaskModal({ isOpen, onClose, task, userId, userName, onSuccess }: TaskModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!isOpen || !task) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.type.startsWith('image/')) {
                setError("يرجى رفع صورة صالحة كإثبات.");
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
                setError("يرجى رفع صورة صالحة كإثبات.");
                return;
            }
            setFile(droppedFile);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!userId) {
            setError("You must be logged in to submit a task.");
            return;
        }

        if (!file) {
            setError("يرجى إرفاق صورة كإثبات لإتمام المهمة.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Upload the image to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${task.id}-${Date.now()}.${fileExt}`;
            const filePath = `proofs/${fileName}`;

            console.log('[TaskModal] Target Bucket:', 'membership-proofs');
            console.log('[TaskModal] File object:', file);
            console.log('[TaskModal] File path:', filePath);

            const storageResponse = await supabase.storage
                .from('membership-proofs')
                .upload(filePath, file);
            
            console.log('[TaskModal] Storage Upload Response:', storageResponse);

            const { error: uploadError } = storageResponse;

            if (uploadError) {
                console.error('[TaskModal] Upload error detail:', JSON.stringify(uploadError, null, 2));
                throw new Error("فشل رفع الصورة: " + uploadError.message);
            }

            // Get the public URL for the image
            const publicUrlResponse = supabase.storage
                .from('membership-proofs')
                .getPublicUrl(filePath);
            
            console.log('[TaskModal] Storage Public URL Response:', publicUrlResponse);
            const { data: publicUrlData } = publicUrlResponse;

            const proofUrl = publicUrlData.publicUrl;

            // 2. Insert into user_tasks table
            const { error: insertError } = await supabase
                .from('user_tasks')
                .insert({
                    user_id: userId,
                    task_id: task.id,
                    status: 'pending',
                    proof_url: proofUrl,
                });

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    throw new Error("لقد قمت بتقديم هذه المهمة مسبقاً.");
                }
                throw new Error("فشل تقديم المهمة: " + insertError.message);
            }

            // 3. Optional Telegram Notification
            try {
                const message = `🔔 <b>New Task Submission!</b>\n\n` +
                    `👤 <b>User:</b> ${userName}\n` +
                    `📋 <b>Task:</b> ${task.title}\n` +
                    `💵 <b>Reward:</b> ${task.reward.toLocaleString()} د.ع\n` +
                    `🔗 <a href="${proofUrl}">View Proof Image</a>`;

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
                onClose();
                setSuccess(false);
                setFile(null);
            }, 2500);

        } catch (err: any) {
            console.error("Submission Error:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={!isLoading ? onClose : undefined}
            />

            <div className="relative w-full max-w-md glass rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        تقديم المهمة
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 p-1.5 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                                <CheckCircle2 size={40} />
                            </div>
                            <p className="text-2xl font-black text-white">تم الإرسال بنجاح!</p>
                            <p className="text-zinc-400 text-sm text-center">المهمة الآن قيد المراجعة. سيتم إضافة الرصيد فور الموافقة عليها.</p>
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
                                <div className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-white">{task.title}</h3>
                                        <div className="bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 whitespace-nowrap">
                                            {task.reward.toLocaleString()} د.ع
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-400 leading-relaxed">{task.description}</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                                        إثبات المهمة (لقطة شاشة)
                                    </label>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${file
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
                                                    <FileImage size={28} />
                                                </div>
                                                <p className="text-sm font-bold text-emerald-500 truncate max-w-[200px]">
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] text-emerald-500/70">انقر لتغيير الصورة</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-zinc-800 rounded-full text-zinc-400 mb-1">
                                                    <UploadCloud size={28} />
                                                </div>
                                                <p className="text-sm font-medium text-zinc-300">اضغط لرفع الصورة أو اسحبها هنا</p>
                                                <p className="text-xs text-zinc-500">PNG, JPG, GIF حتى 5MB</p>
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
                                        : "bg-amber-500 text-black hover:bg-amber-400 hover:shadow-amber-500/20 hover:-translate-y-0.5"
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        جاري الرفع...
                                    </>
                                ) : (
                                    <>
                                        إرسال للمراجعة
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-center text-zinc-500">
                                بمجرد الموافقة، سيتم إضافة الرصيد لحسابك تلقائياً.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
