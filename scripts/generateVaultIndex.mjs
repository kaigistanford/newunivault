#!/usr/bin/env node
/**
 * UniVault index generator.
 * Scans /vault and generates assets/js/vault.generated.json
 *
 * Suggested file naming (optional):
 *   Category__Type__Level__Title.ext
 * Example:
 *   Notes__Lecture-Note__Diploma__Population-Density.pdf
 *
 * If you don't follow naming, UniVault will still list the file.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VAULT = path.join(ROOT, "vault");
const OUT = path.join(ROOT, "assets", "js", "vault.generated.json");

const exts = new Set([".pdf",".pptx",".docx",".xlsx",".xls",".png",".jpg",".jpeg",".webp",".html",".htm"]);

function walk(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(full));
    else if(e.isFile()){
      const ext=path.extname(e.name).toLowerCase();
      if(exts.has(ext)) out.push(full);
    }
  }
  return out;
}
function format(ext){
  return({".pdf":"PDF",".pptx":"PPTX",".docx":"DOCX",".xlsx":"Excel",".xls":"Excel",".png":"Image",".jpg":"Image",".jpeg":"Image",".webp":"Image",".html":"HTML",".htm":"HTML"}[ext]||"File");
}
function clean(s){return String(s||"").replace(/[-_]+/g," ").replace(/\s+/g," ").trim();}
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,90);}

function categoryFromPath(full){
  const rel = path.relative(VAULT, full);
  const seg = rel.split(path.sep)[0] || "Resources";
  return clean(seg);
}
function parseName(filename, categoryFallback){
  const base=filename.replace(/\.[^.]+$/,"");
  const parts=base.split("__").map(x=>x.trim()).filter(Boolean);

  let category=categoryFallback, type="Material", level="All", title=clean(base);
  if(parts.length>=4){
    category=clean(parts[0]);
    type=clean(parts[1]);
    level=clean(parts[2]);
    title=clean(parts.slice(3).join(" "));
  }else if(parts.length===3){
    category=clean(parts[0]);
    type=clean(parts[1]);
    title=clean(parts[2]);
  }else if(parts.length===2){
    category=clean(parts[0]);
    title=clean(parts[1]);
  }
  return {category, type, level, title};
}
function relWeb(full){
  return path.relative(ROOT, full).split(path.sep).join("/");
}

if(!fs.existsSync(VAULT)){
  console.error("Missing /vault folder");
  process.exit(1);
}

const now = new Date().toISOString().slice(0,10);
const files = walk(VAULT).sort((a,b)=>a.localeCompare(b));

const items = files.map(full=>{
  const ext = path.extname(full).toLowerCase();
  const categoryFallback = categoryFromPath(full);
  const meta = parseName(path.basename(full), categoryFallback);
  const fmt = format(ext);
  const id = slug(`${meta.category}-${meta.type}-${meta.level}-${meta.title}-${path.basename(full)}`);
  return {
    id,
    title: meta.title,
    category: meta.category,
    type: meta.type,
    level: meta.level,
    format: fmt,
    tags: [meta.category, meta.type, meta.level, fmt].filter(Boolean),
    summary: "",
    path: relWeb(full),
    added: now
  };
});

fs.mkdirSync(path.dirname(OUT), {recursive:true});
fs.writeFileSync(OUT, JSON.stringify(items, null, 2), "utf-8");
console.log(`UniVault: generated ${items.length} items -> ${path.relative(ROOT, OUT)}`);
