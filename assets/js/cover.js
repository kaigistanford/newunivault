const $=(s,r=document)=>r.querySelector(s);
const state={ theme: localStorage.getItem("univault_theme") || "light" };

function setTheme(next){
  state.theme=next;
  document.documentElement.setAttribute("data-theme", next==="dark"?"dark":"light");
  localStorage.setItem("univault_theme", next);
  $("#themeBtn") && ($("#themeBtn").textContent = next==="dark" ? "Light mode" : "Dark mode");
}

function fillPreview(){
  const f=(id)=>($("#"+id)?.value||"").trim();
  $("#pInstitution").textContent = f("institution") || "INSTITUTE / UNIVERSITY";
  $("#pDepartment").textContent = f("department") || "DEPARTMENT";
  $("#pCourse").textContent = f("course") || "COURSE / MODULE";
  $("#pTitle").textContent = f("title") || "TITLE OF WORK";
  $("#pName").textContent = f("name") || "STUDENT NAME";
  $("#pReg").textContent = f("reg") || "REG NO.";
  $("#pSupervisor").textContent = f("supervisor") ? ("Supervisor: " + f("supervisor")) : "";
  $("#pDate").textContent = f("date") || new Date().toLocaleDateString();
}

function printPage(){ window.print(); }

function init(){
  setTheme(state.theme);
  $("#themeBtn")?.addEventListener("click", ()=>setTheme(state.theme==="dark"?"light":"dark"));
  $$("#coverForm input").forEach(i=>i.addEventListener("input", fillPreview));
  $("#printBtn")?.addEventListener("click", printPage);
  fillPreview();
  $("#year") && ($("#year").textContent = new Date().getFullYear());
}
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
init();
