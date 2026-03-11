"use client";

import { useEffect, useState } from "react";

export default function PriceChart({ symbol, color = "#f59e0b" }: { symbol: string, color?: string }) {
    const [points, setPoints] = useState<number[]>([]);

    useEffect(() => {
        // Generate some random points for the simulation
        const basePoints = Array.from({ length: 20 }, () => Math.random() * 40 + 60);
        setPoints(basePoints);

        const interval = setInterval(() => {
            setPoints(prev => {
                const next = [...prev.slice(1), Math.random() * 40 + 60];
                return next;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (points.length === 0) return <div className="h-24 w-full bg-zinc-900/50 animate-pulse rounded-lg" />;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min;

    const width = 300;
    const height = 100;

    const pathData = points.map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

    return (
        <div className="w-full h-24 mt-4 overflow-hidden rounded-lg relative">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id={`grad-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={areaData}
                    fill={`url(#grad-${symbol})`}
                    className="transition-all duration-500"
                />
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                />
            </svg>
        </div>
    );
}
