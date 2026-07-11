"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import DashboardShell from "../DashboardShell";

export default function QrCodeClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const siteUrl = window.location.origin;
    setUrl(siteUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, siteUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#241712", light: "#ffffff" },
      });
    }
  }, []);

  return (
    <DashboardShell>
    <main className="min-h-screen p-4 sm:p-8 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gold/20 p-8 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Scan to order
        </p>
        <h1 className="font-serif text-2xl text-maroon mb-6">Mariscos Alta Vista</h1>
        <canvas ref={canvasRef} className="mx-auto" />
        <p className="mt-6 text-sm text-foreground/60 break-all">{url}</p>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 w-full bg-maroon text-white py-3 rounded-full font-semibold tracking-wide print:hidden"
      >
        Print
      </button>
      <p className="mt-3 text-xs text-center text-foreground/50 print:hidden">
        Print this and put it on tables, the counter, or a flyer — customers scan it
        to order.
      </p>
    </main>
    </DashboardShell>
  );
}
