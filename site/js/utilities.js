/* ---------- utilities ---------- */
const $ = (id)=>document.getElementById(id);

function splitAny(s){
    return (s||"")
        .split(/[^0-9A-Za-z\-\.\:]+/g)
        .map(x=>x.trim())
        .filter(Boolean);
}

function shannonEntropy(str){
    if(!str) return 0;
    const s = String(str);
    const freq = {};
    for(const ch of s){ freq[ch] = (freq[ch]||0)+1; }
    let ent = 0;
    const n = s.length;
    for(const k in freq){
        const p = freq[k]/n;
        ent -= p * Math.log2(p);
    }
    // normalize a bit to a 0..8-ish range for typical issuer strings
    return Math.min(8, Math.max(0, ent));
}

function parseDomainParts(d){
    const s = (d||"").trim().toLowerCase();
    const parts = s.split(".").filter(Boolean);
    if(parts.length < 2) return {sld:s, tld:""};
    const tld = parts[parts.length-1];
    const sld = parts.slice(0, parts.length-1).join(".");
    return {sld, tld, parts};
}

function registrableHint(domain){
    // Simple heuristic: last two labels. For many TLDs this is good enough for triage UI.
    const parts = (domain||"").toLowerCase().split(".").filter(Boolean);
    if(parts.length < 2) return domain||"";
    return parts.slice(-2).join(".");
}

function levenshtein(a,b){
    a = a||""; b = b||"";
    const n=a.length, m=b.length;
    const dp = Array.from({length:n+1}, ()=>Array(m+1).fill(0));
    for(let i=0;i<=n;i++) dp[i][0]=i;
    for(let j=0;j<=m;j++) dp[0][j]=j;
    for(let i=1;i<=n;i++){
        for(let j=1;j<=m;j++){
            const cost = a[i-1]===b[j-1]?0:1;
            dp[i][j] = Math.min(
                dp[i-1][j]+1,
                dp[i][j-1]+1,
                dp[i-1][j-1]+cost
            );
            // transposition (Damerau-lite)
            if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]){
                dp[i][j] = Math.min(dp[i][j], dp[i-2][j-2]+1);
            }
        }
    }
    return dp[n][m];
}

function classifyVariant(baseDomain, candidateDomain){
    const base = parseDomainParts(baseDomain||"");
    const cand = parseDomainParts(candidateDomain||"");
    if(!baseDomain) return {variantClass:"unknown", editDistance:null, tld:cand.tld, tldOnly:false};

    // Compare SLDs only; treat TLD-only separately
    const baseSLD = base.sld;
    const candSLD = cand.sld;
    const tldOnly = (baseSLD === candSLD) && (base.tld !== cand.tld);
    const dist = levenshtein(baseSLD, candSLD);

    if(tldOnly) return {variantClass:"tld", editDistance:0, tld:cand.tld, tldOnly:true};

    // quick classifiers for single-edit categories
    if(dist === 1){
        if(baseSLD.length + 1 === candSLD.length) return {variantClass:"insert", editDistance:1, tld:cand.tld, tldOnly:false};
        if(baseSLD.length - 1 === candSLD.length) return {variantClass:"delete", editDistance:1, tld:cand.tld, tldOnly:false};
        if(baseSLD.length === candSLD.length) return {variantClass:"substitute", editDistance:1, tld:cand.tld, tldOnly:false};
    }

    // transpose check: distance 1 with same length often captures adjacent transpositions already, but be explicit
    if(baseSLD.length === candSLD.length){
        let diffs = [];
        for(let i=0;i<baseSLD.length;i++){
            if(baseSLD[i] !== candSLD[i]) diffs.push(i);
            if(diffs.length>2) break;
        }
        if(diffs.length===2){
            const [i,j]=diffs;
            if(j===i+1 && baseSLD[i]===candSLD[j] && baseSLD[j]===candSLD[i]){
                return {variantClass:"transpose", editDistance:dist, tld:cand.tld, tldOnly:false};
            }
        }
    }

    return {variantClass: dist<=2 ? "other" : "other", editDistance:dist, tld:cand.tld, tldOnly:false};
}

function scoreRecord(r, cfg){
    const sinkholes = cfg.sinkholes;
    const indicators = cfg.indicators;
    const knownIssuers = cfg.knownIssuers;

    const dns = r.dns || {};
    const tls = r.tls || {};
    const http = r.http || {};

    const ips = []
        .concat(dns.A || [])
        .concat(dns.AAAA || [])
        .filter(Boolean);

    const ns = (dns.NS || []).filter(Boolean);
    const mx = (dns.MX || []).filter(Boolean);
    const cname = (dns.CNAME || "");
    const loc = (http.Location || "");
    const issuer = (tls.Issuer || "");

    const joined = (ns.join(" ") + " " + mx.join(" ") + " " + cname + " " + loc).toLowerCase();

    let score = 0;
    const tags = [];

    // sinkhole IPs
    const hitIp = ips.find(ip => sinkholes.has(ip));
    if(hitIp){ score += 25; tags.push("sinkhole_ip"); }

    // parking/registrar indicators
    let indicatorHit = null;
    for(const ind of indicators){
        if(joined.includes(ind)){ indicatorHit = ind; break; }
    }
    if(indicatorHit){ score += 15; tags.push("parking_indicator:"+indicatorHit); }

    // redirect-to-brand
    if(cfg.baseRegistrable){
        const locHost = (loc||"").toLowerCase();
        if(locHost.includes(cfg.baseRegistrable)){
            score += 12; tags.push("redirect_to_brand");
        } else if(cfg.brandToken && locHost.includes(cfg.brandToken)){
            score += 12; tags.push("redirect_to_brand_token");
        }
    }

    // HTTP behavior
    const sc = Number(http.StatusCode||0);
    if(http.Attempted){
        if([301,302,303,307,308].includes(sc)){
            score += 10; tags.push("redirect");
        } else if(sc===200){
            score += 8; tags.push("http_200");
        } else if(sc===405){
            score += 4; tags.push("http_405");
        } else if(sc>=400 && sc<500){
            score += 1; tags.push("http_4xx");
        }
    }

    // email surface
    if(r.resolvable && (dns.HasMX || (mx.length>0))){
        score += 8; tags.push("has_mx");
    }

    // TLS issuer heuristics
    if(tls.Connected){
        const issuerLower = issuer.toLowerCase();
        const isKnown = Array.from(knownIssuers).some(k => issuerLower.includes(k));
        if(!isKnown){
            score += 8; tags.push("tls_unfamiliar_issuer");
        } else {
            tags.push("tls_known_issuer");
        }
        const ent = shannonEntropy(issuer);
        const entPoints = Math.min(8, Math.round(ent));
        score += entPoints;
        tags.push("tls_entropy:"+ent.toFixed(2));
    } else if(r.resolvable) {
        // resolvable but no TLS: still might be parking/phish; minor bump
        score += 2; tags.push("no_tls");
    }

    return {score, tags};
}

function scoreClass(score){
    if(score>=45) return "bad";
    if(score>=25) return "warn";
    return "good";
}

function safe(x){ return (x===null || x===undefined) ? "" : String(x); }

function escapeHtml(s){
    return String(s)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}
function escapeAttr(s){
    return escapeHtml(s).replaceAll("`","&#096;");
}