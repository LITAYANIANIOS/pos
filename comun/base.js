/* =====================================================================
   COMÚN · PANEL Y COMPRAS · DA BOX                                 v1.2
   Lo que comparten panel.html y compras.html, para no repetirlo en cada archivo:
   1. Utilidades   2. Sucursales   3. Avisos y tooltip   4. Conexión con la planilla
   5. Ingreso con clave (y cierre por inactividad)
   Todo queda en window.LA (Lita & Añaños).
   ===================================================================== */
(()=>{
"use strict";

/* ---------- 1. UTILIDADES ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$ " + Math.round(n || 0).toLocaleString("es-AR");
const millones = n => Math.abs(n) >= 1e6 ? "$ " + (n/1e6).toLocaleString("es-AR",{maximumFractionDigits:1}) + " M" : Math.abs(n) >= 1e3 ? "$ " + Math.round(n/1e3) + " mil" : money(n);
const pct = (a,b) => b ? Math.round(a/b*100) + "%" : "—";
const pad = n => String(n).padStart(2,"0");
const ymd = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fechaAR = f => f ? f.split("-").reverse().join("/") : "";
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const hace = ms => { const m = Math.round((Date.now()-ms)/60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m/60)} h` : `hace ${Math.round(m/1440)} d`; };
/* guardado en el navegador: localStorage = esta PC · sessionStorage = solo esta pestaña (la clave va acá) */
const leerLS = (k, d) => { try{ const v = localStorage.getItem("dabox."+k); return v == null ? d : v; }catch(e){ return d; } };
const guardarLS = (k, v) => { try{ localStorage.setItem("dabox."+k, v); }catch(e){} };
const leerSS = k => { try{ return sessionStorage.getItem("dabox."+k) || ""; }catch(e){ return ""; } };
const guardarSS = (k, v) => { try{ v ? sessionStorage.setItem("dabox."+k, v) : sessionStorage.removeItem("dabox."+k); }catch(e){} };

/* ---------- 2. SUCURSALES (el orden define el color, fijo) ---------- */
const SUCS = ["FALCON","MORENO","NACION","SOMISA","DEPOSITO"];   // v1.1: DEPOSITO (caja de atrás)
const NOMBRE_SUC = {FALCON:"Falcon", MORENO:"Moreno", NACION:"Nación", SOMISA:"Somisa", DEPOSITO:"Depósito"};
const SUC_COLOR = {FALCON:"var(--s1)", MORENO:"var(--s2)", NACION:"var(--s3)", SOMISA:"var(--s4)", DEPOSITO:"#8e6bd1"};
const sucNom = s => NOMBRE_SUC[s] || s || "";
const sucTag = s => `<span class="suc-tag"><i class="dot" style="background:${SUC_COLOR[s]||"var(--muted)"}"></i>${esc(sucNom(s))}</span>`;

/* ---------- 3. AVISO FLOTANTE Y TOOLTIP (cualquier elemento con data-tip) ---------- */
document.body.insertAdjacentHTML("beforeend", `<div class="toast" id="toast" hidden></div><div id="tip" hidden></div>`);
let toastT;
function toast(m, ms=2400){ const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
const tip = $("#tip");
document.addEventListener("pointerover", e => { const t = e.target.closest("[data-tip]"); if(!t){ tip.hidden = true; return; } tip.innerHTML = t.dataset.tip; tip.hidden = false; });
document.addEventListener("pointermove", e => { if(tip.hidden) return; tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = (e.clientY + 16) + "px"; });
document.addEventListener("scroll", () => tip.hidden = true, true);

/* ---------- 4. CONEXIÓN (Apps Script). La clave nunca se guarda en la PC: solo en esta pestaña ---------- */
/* Link para celulares: …/precios.html#s=<ID del script> guarda la dirección una sola vez y la borra de la barra.
   El ID no es una clave: para ver datos del panel o cambiar precios igual hace falta la clave. */
(() => { const m = location.hash.match(/[#&]s=([\w-]{20,})/); if(!m) return;
  try{ localStorage.setItem("dabox.url", `https://script.google.com/macros/s/${m[1]}/exec`); }catch(e){}
  history.replaceState(null, "", location.pathname + location.search); })();
let url = leerLS("url",""), clave = leerSS("clave");
const ERR = {clave:"🔑 Clave incorrecta (la clave de las cajas no sirve acá).", url:"🔗 La dirección no responde o el script está desactualizado.",
             tiempo:"⏳ La planilla tardó en responder. Probá de nuevo.", internet:"📡 Sin internet."};
/* ✏️ lápiz de "cargando" (igual que en la caja): aparece arriba si la espera pasa de 0,4 s */
const LAPIZ = (() => {
  const FR = ["Afilando lápices…", "Hablando con la planilla…", "Buscando en el cajón…", "Contando clips…", "Ordenando las biromes…", "Pegando con plasticola…", "Pasando en limpio…", "Sacando punta…"];
  let n = 0, t = null, f = null, el = null;
  const crear = () => {
    const st = document.createElement("style");
    st.textContent = `.lapiz{position:fixed;top:0;left:0;right:0;z-index:200;height:30px;pointer-events:none;display:flex;align-items:center;gap:10px;padding:0 14px;background:var(--surface,#fff);border-bottom:1px solid var(--line,#ddd);box-shadow:0 2px 8px rgb(0 0 0 / .06);font-size:12.5px;color:var(--muted,#666);font-weight:600}
.lapiz .pista{position:relative;flex:1;height:22px;overflow:hidden}.lapiz .linea{position:absolute;left:0;top:13px;height:2px;width:0;background:repeating-linear-gradient(90deg,var(--ink,#222) 0 10px,transparent 10px 14px);animation:lpLinea 1.8s ease-in-out infinite}
.lapiz svg{position:absolute;top:-9px;left:0;width:46px;height:22px;animation:lpMano 1.8s ease-in-out infinite}
@keyframes lpLinea{0%{width:0}80%{width:calc(100% - 30px)}100%{width:calc(100% - 30px);opacity:0}}@keyframes lpMano{0%{left:-6px;transform:rotate(-8deg)}40%{transform:rotate(4deg)}80%{left:calc(100% - 40px);transform:rotate(-6deg)}100%{left:calc(100% - 40px);opacity:0}}
@media (prefers-reduced-motion:reduce){.lapiz .linea,.lapiz svg{animation:none}.lapiz .linea{width:60%}}`;
    document.head.appendChild(st);
    el = document.createElement("div"); el.className = "lapiz"; el.hidden = true; el.setAttribute("aria-live", "polite");
    el.innerHTML = `<span></span><div class="pista"><div class="linea"></div><svg viewBox="0 0 34 16" aria-hidden="true"><path d="M2 12 L8 9 L30 1 L33 4 L11 12 Z" fill="#f6c445" stroke="#1f2a24" stroke-width="1.2"/><path d="M2 12 L8 9 L11 12 Z" fill="#e8c9a0" stroke="#1f2a24" stroke-width="1"/><path d="M2 12 L4 11 L5 12 Z" fill="#1f2a24"/><path d="M30 1 L33 4" stroke="#e46b6b" stroke-width="3"/></svg></div>`;
    document.body.appendChild(el);
  };
  return on => {
    n = Math.max(0, n + (on ? 1 : -1)); if(!el) crear();
    if(n && !t && el.hidden) t = setTimeout(() => { t = null; if(!n) return; let k = Math.floor(Math.random() * FR.length);
      el.firstChild.textContent = FR[k]; el.hidden = false; f = setInterval(() => { k = (k + 1) % FR.length; el.firstChild.textContent = FR[k]; }, 2200); }, 400);
    if(!n){ clearTimeout(t); t = null; clearInterval(f); el.hidden = true; }
  };
})();
async function api(accion, params={}, intento=1){
  if(intento === 1 && !params._silencio){ LAPIZ(true); try{ return await api(accion, params, 1.5); } finally{ LAPIZ(false); } }
  if(intento === 1.5) intento = 1;
  if(params._silencio){ params = {...params}; delete params._silencio; }
  const u = new URL(url); u.search = new URLSearchParams({accion, clave, ...params});
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
  try{
    const r = await fetch(u, {signal:ctl.signal, cache:"no-store"});
    if(!r.ok) throw "url";
    let j; try{ j = await r.json(); }catch(e){ throw "url"; }
    if(j.error === "clave incorrecta") throw "clave";
    if(j.error) throw {tipo:"respuesta", msg:j.error};
    return j;
  }catch(e){
    if(e && e.tipo === "respuesta") throw e;
    const tipo = typeof e === "string" ? e : e && e.name === "AbortError" ? "tiempo" : navigator.onLine === false ? "internet" : "url";
    if(intento === 1 && (tipo === "tiempo" || tipo === "url") && navigator.onLine !== false && !params._sinReintento) return api(accion, params, 2);
    throw tipo;
  }finally{ clearTimeout(t); }
}

/* ---------- 5. INGRESO ----------
   LA.ingreso({app, emoji, cargar, alEntrar, demo}):
     cargar()       → pide los datos a la planilla (devuelve una promesa)
     alEntrar(d)    → dibuja la página con esos datos
     demo()         → datos inventados para probar (opcional)              */
const MIN_INACTIVO = 30;               // sin tocar nada por esto, se vuelve a pedir la clave (PC compartida con cajeros)
let opts = null, dentro = false, enDemo = false, ultimoUso = Date.now();
function ingreso(o){
  opts = o;
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay" id="login" hidden>
    <form class="modal" id="fLogin" autocomplete="off">
      <div class="logo"><i class="emo">${o.emoji}</i><div>Lita &amp; Añaños<small>${esc(o.app)}</small></div></div>
      <h2>🔒 Entrar</h2>
      <p class="note">Cada clave muestra solo lo que le corresponde. Se olvida al cerrar la pestaña.</p>
      <label id="lUrl">Dirección de la planilla (Apps Script)<input class="campo" id="iUrl" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label>Clave <input class="campo secreto" id="iClave" type="text" spellcheck="false" autocomplete="off"></label>
      <div class="err" id="lErr" hidden></div>
      <button class="btn primary" id="bEntrar" type="submit">Entrar</button>
      <button class="link" id="bCambiarUrl" type="button" hidden>Cambiar la dirección de la planilla</button>
      ${o.demo ? `<button class="link" id="bDemo" type="button">Ver con datos de prueba</button>` : ""}
    </form></div>`);
  $("#bCambiarUrl").onclick = () => { $("#lUrl").hidden = false; $("#bCambiarUrl").hidden = true; $("#iUrl").focus(); };
  if(o.demo) $("#bDemo").onclick = () => { enDemo = true; entrar(o.demo()); };
  $("#fLogin").onsubmit = async e => {
    e.preventDefault();
    const u = $("#iUrl").value.trim(), c = $("#iClave").value.trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u)){ mostrar("La dirección tiene que ser la de Apps Script (termina en /exec)."); $("#lUrl").hidden = false; return; }
    if(c.length < 10){ mostrar("La clave tiene al menos 10 caracteres."); return; }
    url = u; clave = c; enDemo = false; $("#bEntrar").textContent = "Entrando…";
    try{ const d = await o.cargar(); guardarLS("url", url); guardarSS("clave", clave); entrar(d); }
    catch(err){ clave = ""; mostrar(ERR[err] || (err && err.msg) || "No se pudo entrar."); if(err !== "clave") $("#lUrl").hidden = false; }
    finally{ $("#bEntrar").textContent = "Entrar"; }
  };
  ["pointerdown","keydown"].forEach(ev => document.addEventListener(ev, () => ultimoUso = Date.now(), true));
  setInterval(() => { if(dentro && !enDemo && Date.now() - ultimoUso > MIN_INACTIVO*60000) salir(`🔒 Se cerró por ${MIN_INACTIVO} minutos sin uso.`); }, 60000);
  if(url && clave) o.cargar().then(entrar).catch(err => mostrar(err === "clave" ? ERR.clave : ""));
  else mostrar();
}
function mostrar(msg){
  dentro = false; $("#app").hidden = true; $("#login").hidden = false;
  $("#iUrl").value = url; $("#lUrl").hidden = !!url; $("#bCambiarUrl").hidden = !url;
  $("#lErr").hidden = !msg; $("#lErr").textContent = msg || "";
  setTimeout(() => (url ? $("#iClave") : $("#iUrl")).focus(), 30);
}
function entrar(d){
  dentro = true; ultimoUso = Date.now(); $("#login").hidden = true; $("#app").hidden = false; $("#iClave").value = "";
  opts.alEntrar(d);
}
function salir(msg){ clave = ""; guardarSS("clave", ""); enDemo = false; mostrar(msg); }

window.LA = {$, esc, money, millones, pct, pad, ymd, fechaAR, norm, hace, leerLS, guardarLS, toast,
  SUCS, NOMBRE_SUC, SUC_COLOR, sucNom, sucTag, api, ERR, ingreso, salir, get demo(){ return enDemo; }};
})();
