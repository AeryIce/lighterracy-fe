"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, MessageSquare } from "lucide-react";

type Msg = { role: "ai" | "user"; text: string; time: string };

function nowText(){ const d=new Date(); return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}); }
function greeting(){ const h=new Date().getHours(); if(h<11) return "Selamat pagi"; if(h<15) return "Selamat siang"; if(h<18) return "Selamat sore"; return "Selamat malam"; }

export default function ChatDock(){
  const [open,setOpen]=useState(false);
  // ⬇️ inisialisasi state langsung (hindari setState di effect)
  const [msgs,setMsgs]=useState<Msg[]>(()=>[
    { role:"ai", time: nowText(), text: `${greeting()} Kak 👋 Aku Lightcy. Sebutkan judul/penulis, atau gunakan tombol Scan ISBN di atas.` }
  ]);
  const [typing,setTyping]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const panelRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    function onDown(e:MouseEvent){
      if(!open) return;
      if(panelRef.current && !panelRef.current.contains(e.target as Node)){
        const trigger=document.getElementById("chat-trigger");
        if(trigger && trigger.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return ()=>document.removeEventListener("mousedown", onDown);
  },[open]);

  function mockReply(q:string){
    const lower=q.toLowerCase();
    if(lower.includes("anak")) return "Ide cepat: board book & activity book. Coba ketik 'anak 3-5 tahun'.";
    if(lower.includes("nyt")) return "Lihat 'Rekomendasi New York Times'—daftar best-seller minggu ini.";
    if(lower.includes("scan")) return "Klik tombol Scan ISBN di hero untuk menyalakan kamera.";
    return "Catat. Nanti kuhubungkan ke data asli untuk rekomendasi yang pas.";
  }
  function send(text:string){
    if(!text.trim()) return;
    setMsgs(m=>[...m, {role:"user", text, time: nowText()}]);
    setTyping(true);
    setTimeout(()=>{
      setMsgs(m=>[...m, {role:"ai", text: mockReply(text), time: nowText()}]);
      setTyping(false);
    },700);
  }
  const chips=["Buku anak","Best-seller NYT","Scan ISBN"];

  return (
    <>
      <Button id="chat-trigger" onClick={()=>setOpen(v=>!v)} className="fixed bottom-5 right-5 rounded-full h-12 w-12 bg-brand text-black shadow-soft" aria-label="Chat">
        <MessageSquare />
      </Button>
      {open && (
        <div ref={panelRef} className="fixed bottom-20 right-5 w-[min(92vw,380px)] h-[520px] rounded-2xl border bg-background shadow-soft flex flex-col overflow-hidden">
          <div className="h-11 px-3 flex items-center justify-between border-b">
            <div className="font-medium">Lightcy</div>
            <button className="p-1 rounded-md hover:bg-muted" onClick={()=>setOpen(false)} aria-label="Close"><X className="w-5 h-5"/></button>
          </div>
          <div className="flex-1 p-3 overflow-auto space-y-3">
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==="ai"?"max-w-[85%] rounded-2xl bg-muted p-3 text-sm":"max-w-[85%] rounded-2xl bg-brand p-3 ml-auto text-sm"}>
                <div className="text-xs text-muted-foreground mb-1" suppressHydrationWarning>{m.time}</div>
                {m.role==="ai"?<b>Lightcy: </b>:null}{m.text}
              </div>
            ))}
            {typing && (
              <div className="max-w-[85%] rounded-2xl bg-muted p-3 text-sm flex items-center gap-2" aria-live="polite" aria-atomic="true">
                <b>Lightcy</b>
                <span className="inline-flex items-center gap-1" role="status">
                  <span className="w-2 h-2 rounded-full bg-gray-400 typing-dot" style={{animationDelay:"0ms"}}/>
                  <span className="w-2 h-2 rounded-full bg-gray-400 typing-dot" style={{animationDelay:"200ms"}}/>
                  <span className="w-2 h-2 rounded-full bg-gray-400 typing-dot" style={{animationDelay:"400ms"}}/>
                </span>
              </div>
            )}
          </div>
          <div className="px-3 pb-2 flex gap-2 flex-wrap">
            {chips.map(c=>(
              <button key={c} onClick={()=>send(c)} className="text-xs border px-2 py-1 rounded-full hover:bg-gray-50" aria-label={`Kirim: ${c}`}>{c}</button>
            ))}
          </div>
          <div className="h-12 border-t px-3 flex items-center gap-2">
            <input ref={inputRef} placeholder="Ketik (mockup)..." className="flex-1 h-8 text-sm rounded-md border px-2"
              onKeyDown={(e)=>{ if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value; send(v); (e.target as HTMLInputElement).value=""; }}}/>
            <button className="text-sm px-3 h-8 rounded-md bg-brand text-black"
              onClick={()=>{ const v=inputRef.current?.value||""; send(v); if(inputRef.current) inputRef.current.value=""; }}>Kirim</button>
          </div>
        </div>
      )}
    </>
  );
}
