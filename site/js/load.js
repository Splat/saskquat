/* ---------- load ---------- */
async function load(){
    updateCfg();
    const path = $("jsonPath").value.trim() || "results.json";
    const resp = await fetch(path, {cache:"no-store"});
    if(!resp.ok) throw new Error("Failed to load "+path+" ("+resp.status+")");
    const raw = await resp.json();

    // normalize with current base domain/scoring config
    RAW = raw.map(r=>normalizeRecord(r));
    applyFilters();
}

function reNormalizeAll(){
    updateCfg();
    RAW = RAW.map(x=>normalizeRecord(x._raw));
    applyFilters();
}

$("loadBtn").onclick = ()=>load().catch(err=>alert(err.message));
$("search").oninput = ()=>applyFilters();
$("variantFilter").onchange = ()=>applyFilters();
$("tldFilter").onchange = ()=>applyFilters();
$("minScore").oninput = ()=>applyFilters();
$("maxScore").oninput = ()=>applyFilters();
$("resolvableOnly").onchange = ()=>applyFilters();
$("httpAttempted").onchange = ()=>applyFilters();

$("baseDomain").onchange = ()=>reNormalizeAll();
$("sinkholeIps").onchange = ()=>reNormalizeAll();
$("parkingIndicators").onchange = ()=>reNormalizeAll();
$("knownIssuers").onchange = ()=>reNormalizeAll();

document.querySelectorAll("thead th[data-k]").forEach(th=>{
    th.addEventListener("click", ()=>{
        const k = th.dataset.k;
        if(SORT.k===k){ SORT.dir = (SORT.dir==="asc"?"desc":"asc"); }
        else { SORT.k = k; SORT.dir = (k==="domain"?"asc":"desc"); }
        render();
    });
});

// Auto-load if results.json is reachable
load().catch(()=>{ /* ignore auto-load failure; user can click Load */ });