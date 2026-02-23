const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

const state={
  theme: localStorage.getItem("univault_theme") || "light",
  resources: [],
  filtered: [],
  query: "",
  filter: {category:"All", type:"All", level:"All", format:"All"},
  sort: "Recent"
};

function toast(msg){
  const el=$("#toast"); if(!el) return;
  el.textContent=msg;
  el.classList.add("show");
  clearTimeout(window.__toastT);
  window.__toastT=setTimeout(()=>el.classList.remove("show"), 2200);
}

function setTheme(next){
  state.theme=next;
  document.documentElement.setAttribute("data-theme", next==="dark" ? "dark" : "light");
  localStorage.setItem("univault_theme", next);
  const b=$("#themeBtn"); if(b) b.textContent = next==="dark" ? "Light mode" : "Dark mode";
}

function progress(){
  const d=document.documentElement;
  const v = d.scrollTop / (d.scrollHeight - d.clientHeight);
  $("#topProgress") && ($("#topProgress").style.width = `${Math.max(0, Math.min(1, v))*100}%`);
  const fab=$("#backToTop");
  if(fab){
    d.scrollTop>520 ? fab.classList.add("show") : fab.classList.remove("show");
  }
}

function fmt(p){
  const s=String(p||"").toLowerCase();
  if(/^https?:\/\//.test(s)) return "Link";
  if(s.endsWith(".pdf")) return "PDF";
  if(s.endsWith(".pptx")) return "PPTX";
  if(s.endsWith(".docx")) return "DOCX";
  if(s.endsWith(".xlsx")||s.endsWith(".xls")) return "Excel";
  if(/\.(png|jpg|jpeg|webp)$/.test(s)) return "Image";
  if(/\.(html|htm)$/.test(s)) return "HTML";
  return "File";
}
function viewerKind(p){
  const f=fmt(p);
  if(f==="Link") return "link";
  if(f==="PDF") return "pdf";
  if(f==="HTML") return "html";
  return "file";
}
function uniq(arr, key){
  return Array.from(new Set(arr.map(x=>x[key]).filter(Boolean))).sort();
}

async function loadResources(){
  const candidates=["assets/js/vault.generated.json","assets/js/vault.json"];
  for(const p of candidates){
    try{
      const r=await fetch(p,{cache:"no-store"});
      if(!r.ok) continue;
      const d=await r.json();
      if(Array.isArray(d)) return d;
    }catch(_){}
  }
  return [];
}

function applyFilters(){
  const q=state.query.trim().toLowerCase();
  const f=state.filter;

  let arr = state.resources.filter(r=>{
    const okC = f.category==="All" || r.category===f.category;
    const okT = f.type==="All" || r.type===f.type;
    const okL = f.level==="All" || r.level===f.level;
    const okF = f.format==="All" || r.format===f.format;
    const hay = (r.title+" "+(r.summary||"")+" "+(r.tags||[]).join(" ")).toLowerCase();
    const okQ = !q || hay.includes(q);
    return okC && okT && okL && okF && okQ;
  });

  if(state.sort==="A–Z") arr.sort((a,b)=>a.title.localeCompare(b.title));
  else if(state.sort==="Oldest") arr.sort((a,b)=>(a.added||"").localeCompare(b.added||""));
  else arr.sort((a,b)=>(b.added||"").localeCompare(a.added||"")); // Recent default

  state.filtered = arr;
}

function renderCounts(){
  const total=state.resources.length;
  const shown=state.filtered.length;
  $("#countTotal") && ($("#countTotal").textContent = total.toString());
  $("#resourceCount") && ($("#resourceCount").textContent = `${shown} shown`);
}

function renderLibrary(){
  const grid=$("#libraryGrid");
  if(!grid) return;

  applyFilters();
  renderCounts();

  grid.innerHTML="";
  if(!state.filtered.length){
    grid.innerHTML = `<div class="card box"><h3>No items found</h3><p>Try changing filters or search.</p></div>`;
    return;
  }

  for(const r of state.filtered){
    const el=document.createElement("article");
    el.className="card item";
    el.tabIndex=0;
    el.setAttribute("role","button");
    el.innerHTML=`
      <div class="spark" aria-hidden="true"></div>
      <span class="pill">${r.category || "Resource"}</span>
      <h4>${escapeHtml(r.title)}</h4>
      <p>${escapeHtml(r.summary || "Open to view.")}</p>
      <div class="badges">
        <span class="badge green">${escapeHtml(r.type || "Material")}</span>
        <span class="badge">${escapeHtml(r.level || "All")}</span>
        <span class="badge">${escapeHtml(r.format || fmt(r.path))}</span>
      </div>
    `;
    el.addEventListener("click", ()=>openModal(r));
    el.addEventListener("keydown",(e)=>{if(e.key==="Enter"||e.key===" ") openModal(r);});
    grid.appendChild(el);
  }
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

function openModal(r){
  const modal=$("#modal"); if(!modal) return;
  $("#mTitle").textContent = r.title;
  $("#mMeta").textContent = `${r.category || "Resource"} • ${r.type || "Material"} • ${r.level || "All"} • ${r.format || fmt(r.path)}`;
  $("#mTags").innerHTML = (r.tags||[]).slice(0,10).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("");
  $("#mSummary").textContent = r.summary || "";

  const v=$("#mViewer");
  const k=viewerKind(r.path);
  if(k==="link"){
    v.innerHTML = `<div class="notice">External link.</div><a class="btn primary" href="${r.path}" target="_blank" rel="noopener">Open link</a>`;
  }else if(k==="html"){
    v.innerHTML = `<div class="viewer"><iframe src="${r.path}" title="Viewer"></iframe></div>`;
  }else if(k==="pdf"){
    v.innerHTML = `<div class="viewer"><iframe src="${r.path}#toolbar=0&navpanes=0" title="PDF Viewer"></iframe></div>`;
  }else{
    v.innerHTML = `<div class="notice">Opens in a new tab.</div><a class="btn primary" href="${r.path}" target="_blank" rel="noopener">Open file</a>`;
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}

function closeModal(){
  const modal=$("#modal"); if(!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

function setActiveTab(cat){
  state.filter.category = cat;
  $$(".tab").forEach(t=>t.classList.toggle("active", t.dataset.cat===cat));
  renderLibrary();
  if(cat!=="All") toast(`${cat} selected`);
}

function initNavActive(){
  const path = location.pathname.split("/").pop() || "index.html";
  $$(".nav-links a").forEach(a=>{
    const href=(a.getAttribute("href")||"").split("/").pop();
    if(href && href===path) a.classList.add("active");
  });
}

async function init(){
  setTheme(state.theme);
  initNavActive();

  $("#themeBtn")?.addEventListener("click", ()=>setTheme(state.theme==="dark"?"light":"dark"));
  $("#backToTop")?.addEventListener("click", ()=>window.scrollTo({top:0,behavior:"smooth"}));
  window.addEventListener("scroll", progress, {passive:true});
  progress();

  // library page only
  if($("#libraryGrid")){
    state.resources = (await loadResources()).map(r=>({...r, format: r.format || fmt(r.path)}));
    if(!state.resources.length){
      toast("No files yet. Add documents to the vault folders and push to GitHub.");
    }

    // populate selects
    const types=["All", ...uniq(state.resources,"type")];
    const levels=["All", ...uniq(state.resources,"level")];
    const formats=["All", ...uniq(state.resources,"format")];

    $("#filterType").innerHTML = types.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
    $("#filterLevel").innerHTML = levels.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
    $("#filterFormat").innerHTML = formats.map(x=>`<option>${escapeHtml(x)}</option>`).join("");

    $("#searchInput").addEventListener("input",(e)=>{state.query=e.target.value; renderLibrary();});
    $("#filterType").addEventListener("change",(e)=>{state.filter.type=e.target.value; renderLibrary();});
    $("#filterLevel").addEventListener("change",(e)=>{state.filter.level=e.target.value; renderLibrary();});
    $("#filterFormat").addEventListener("change",(e)=>{state.filter.format=e.target.value; renderLibrary();});
    $("#sortBy").addEventListener("change",(e)=>{state.sort=e.target.value; renderLibrary();});

    $$(".tab").forEach(t=>t.addEventListener("click", ()=>setActiveTab(t.dataset.cat)));

    $("#closeModal")?.addEventListener("click", closeModal);
    $("#modal")?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closeModal(); });
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

    // home stats
    $("#statNotes") && ($("#statNotes").textContent = state.resources.filter(x=>x.category==="Notes").length);
    $("#statPapers") && ($("#statPapers").textContent = state.resources.filter(x=>x.category==="Past Papers").length);
    $("#statTutorials") && ($("#statTutorials").textContent = state.resources.filter(x=>x.category==="Tutorials").length);

    renderLibrary();
  }

  $("#year") && ($("#year").textContent = new Date().getFullYear());
}
init().catch(err=>{console.error(err); toast("Error loading UniVault. Check console.");});
