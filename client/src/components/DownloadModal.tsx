import React, { useState } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import JSZip from 'jszip'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  logo: { id: string; url: string; logo_url?: string; prompt?: string }
  isPremiumUser: boolean
  businessName?: string
  onSave?: (logo: { id: string; url: string; prompt: string }) => void
}

type PS = 'pending' | 'waiting' | 'processing' | 'completed' | 'error'

const glass = { background:'rgba(5,5,8,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' } as const

const FORMATS = [
  { id:'png-hd',    name:'PNG Standard',     desc:'1024×1024 · digital use' },
  { id:'png',       name:'PNG 8K',            desc:'Upscaled · print & professional' },
  { id:'png-no-bg', name:'PNG Transparent',   desc:'Background removed' },
  { id:'svg',       name:'SVG Vector',        desc:'Infinite scalability' },
  { id:'favicon',   name:'Favicon',           desc:'32×32 · browser tab' },
  { id:'profile',   name:'Profile Picture',   desc:'512×512 · social media' },
]

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, logo, isPremiumUser, businessName='logo', onSave }) => {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [sel, setSel] = useState<string[]>(['png-hd','png'])
  const [loading, setLoading] = useState(false)
  const [prog, setProg] = useState<Record<string,PS>>({})
  const safe = (businessName||'logo').replace(/[^a-z0-9]/gi,'-').toLowerCase()

  const toggle = (id: string) => {
    if (!isPremiumUser) return
    setSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])
  }

  const handleDownload = async () => {
    if (!user || sel.length===0) return
    setLoading(true)
    const has8K = sel.includes('png')
    const initProg: Record<string,PS> = {}
    sel.forEach(f => { initProg[f] = (f==='png'||f==='png-hd') ? 'pending' : has8K ? 'waiting' : 'pending' })
    setProg(initProg)
    try {
      const zip = new JSZip(); const folder = zip.folder(safe)!
      let bestUrl = logo.logo_url||logo.url; let best4k: string|null = null
      const p1: Promise<void>[] = []
      if (sel.includes('png')) {
        setProg(p=>({...p,png:'processing'}))
        p1.push((async()=>{ try {
          const token = await getToken()
          const r = await fetch(`/api/logos/${logo.id}/upscale`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({logoUrl:logo.logo_url||logo.url})})
          const d = await r.json()
          if(d.success){bestUrl=d.upscaledUrl;if(d.upscaled4kUrl)best4k=d.upscaled4kUrl;folder.file(`${safe}-8k.png`,await fetch(d.upscaledUrl).then(r=>r.blob()));setProg(p=>({...p,png:'completed'}))}
          else setProg(p=>({...p,png:'error'}))
        } catch{setProg(p=>({...p,png:'error'}))}}
        )())
      }
      if (sel.includes('png-hd')) {
        setProg(p=>({...p,'png-hd':'processing'}))
        p1.push((async()=>{ try { folder.file(`${safe}-standard.png`,await fetch(logo.logo_url||logo.url).then(r=>r.blob()));setProg(p=>({...p,'png-hd':'completed'})) } catch{setProg(p=>({...p,'png-hd':'error'}))} })())
      }
      await Promise.all(p1)
      for (const fid of sel) {
        if(fid==='png'||fid==='png-hd') continue
        setProg(p=>({...p,[fid]:'processing'}))
        try {
          const token = await getToken()
          if(fid==='png-no-bg'){
            const d=(await (await fetch(`/api/logos/${logo.id}/remove-background`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({logoUrl:bestUrl})})).json())
            if(d.success)folder.file(`${safe}-no-bg.png`,await fetch(d.processedUrl).then(r=>r.blob()));else throw new Error()
          } else if(fid==='svg'){
            const bgD=(await (await fetch(`/api/logos/${logo.id}/remove-background`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({logoUrl:best4k||bestUrl})})).json())
            const vD=(await (await fetch(`/api/logos/${logo.id}/vectorize`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({logoUrl:bgD.success?bgD.processedUrl:(best4k||bestUrl),curveFitting:'polygon'})})).json())
            if(vD.success)folder.file(`${safe}-vector.svg`,vD.svgData);else throw new Error()
          } else {
            const d=(await (await fetch(`/api/logos/${logo.id}/formats`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({formats:[fid],logoUrl:bestUrl})})).json())
            if(d.success&&d.formats[fid]){const f=d.formats[fid];folder.file(`${safe}-${fid}.${fid==='favicon'?'ico':'png'}`,Uint8Array.from(atob(f.data),c=>c.charCodeAt(0)))}else throw new Error()
          }
          setProg(p=>({...p,[fid]:'completed'}))
        } catch{setProg(p=>({...p,[fid]:'error'}))}
      }
      const blob = await zip.generateAsync({type:'blob'})
      const a = document.createElement('a'); a.style.display='none'; a.href=URL.createObjectURL(blob); a.download=`${safe}-logos.zip`
      document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(a.href)},100)
      if(onSave&&logo.prompt) onSave({id:logo.id,url:logo.logo_url||logo.url,prompt:logo.prompt})
    } catch(e){console.error(e)} finally{setLoading(false)}
  }

  if (!isOpen) return null

  const icon = (s:PS) => s==='completed'?<span style={{color:'#6ee7b7'}}>✓</span>:s==='error'?<span style={{color:'#f87171'}}>✕</span>:s==='processing'?<span style={{color:'#fcd34d',display:'inline-block',animation:'dmSpin 1s linear infinite'}}>◌</span>:s==='waiting'?<span style={{color:'#4b5563'}}>◌</span>:null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl flex flex-col overflow-hidden"
        style={{...glass,border:'1px solid rgba(255,255,255,0.08)',maxHeight:'88vh'}} onClick={e=>e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase text-white">Download Center</h2>
            <p className="text-xs mt-0.5" style={{color:'#374151'}}>{safe}</p>
          </div>
          <button onClick={onClose} className="hover:text-gray-400 transition-colors" style={{color:'#4b5563'}}>✕</button>
        </div>

        <div className="px-6 py-4 flex justify-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <img src={logo.logo_url||logo.url} alt="Logo" className="w-full h-full object-contain p-2" />
          </div>
        </div>

        {!isPremiumUser && (
          <p className="text-xs text-center pb-2 px-6" style={{color:'#f472b6'}}>Premium required · upgrade to download</p>
        )}

        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-2 pb-4">
          {FORMATS.map(f => {
            const selected = sel.includes(f.id)
            const p = prog[f.id]
            return (
              <div key={f.id} onClick={()=>toggle(f.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150"
                style={{cursor:isPremiumUser?'pointer':'not-allowed',background:selected?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${selected?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.06)'}`,opacity:isPremiumUser?1:0.4}}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0"
                  style={{background:selected?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.04)',border:`1px solid ${selected?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`}}>
                  {selected && <span style={{color:'#a5b4fc',fontSize:'10px'}}>✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                  <p className="text-xs" style={{color:'#374151'}}>{f.desc}</p>
                </div>
                {p && <div className="text-sm shrink-0">{icon(p)}</div>}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="capsule-wrap w-full">
            <button onClick={handleDownload} disabled={sel.length===0||loading||!user} className="capsule-btn w-full"
              style={{color:sel.length>0&&!loading?'#9ca3af':'#4b5563',cursor:sel.length>0&&!loading?'pointer':'not-allowed',fontSize:'0.8rem',fontWeight:700,letterSpacing:'0.1em'}}>
              {loading?'◈ Preparing…':`Download ${sel.length} format${sel.length!==1?'s':''} →`}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes dmSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default DownloadModal
