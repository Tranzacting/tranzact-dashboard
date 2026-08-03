# Response-card component catalog

`template.html` ships with the default response representation (`.rr` rows). These are
the other proven patterns — copy the HTML into a `.rc` response card, wire the matching
JS reveal in `enter()`/`leave()`, and pick whichever fits the data shape.

All of them assume you're inside:
```html
<div class="rc" id="rcN">
  <div class="rtag">&#10022; AI response</div>
  <!-- pattern goes here -->
</div>
```
and that the surrounding `enter()` block already did `type(...)` on the input, then
`setTimeout(() => { document.getElementById('rcN').classList.add('show'); ... }, 1500)`.
Each pattern below only adds to what happens *inside* that `setTimeout`.

---

## 1. Rows (default) — `.rr`

Simple label-left / value-right list. Use for status summaries, financials, key-value facts.

```html
<div class="rr"><span class="rl">Order SO-1023: Steel Pipes 40mm</span><span class="rv t">On track</span></div>
<div class="rr"><span class="rl">Payment</span><span class="rv g">Cleared: Rs. 4.2L</span></div>
```
`.rv` color modifiers: `.g` green/success, `.a` amber/warning, `.t` orange/brand, `.r` red/error, `.i` blue/info.
No extra JS needed — the whole `.rc` reveals as one fade via `rc.show`.

**Do not** mix in a bigger/bolder value (e.g. a stat number at `--fs-h`) inside a row — it
blows past the shared `.chat-shell.wide` 460px height floor and the window renders visibly
taller than every other frame. Keep stat numbers to a `clamp(30px,3.5vw,42px)` custom size instead.

---

## 2. Vertical checklist — `.trow` + `.chk`

Step-by-step confirmation list (e.g. a traceability chain), each row lighting up in sequence.

```html
<div style="display:flex;flex-direction:column">
  <div class="trow" id="tn0"><div class="chk"><svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></div><span class="tl">Raw material <span style="color:rgba(218,93,55,.9)">&middot; Tata Steel</span></span><span class="td">27 Jun</span></div>
  <div class="trow" id="tn1"><div class="chk"><svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></div><span class="tl">Production <span style="color:rgba(255,255,255,.55)">&middot; Line 3</span></span><span class="td">29 Jun</span></div>
</div>
```
CSS needed (not in template.html, add if used):
```css
.trow{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);opacity:0;transform:translateX(-12px);transition:opacity .4s ease,transform .4s ease}
.trow:last-child{border-bottom:none}
.trow.lit{opacity:1;transform:translateX(0)}
.trow .tl{flex:1;font-family:'Outfit',sans-serif;font-size:var(--fs-p);color:#fff}
.trow .td{font-family:'Outfit',sans-serif;font-size:var(--fs-p);color:rgba(255,255,255,.6);white-space:nowrap}
.chk{width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.4);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chk svg{width:10px;height:10px;stroke:#34d399;fill:none;stroke-width:2.5}
```
Reveal JS: light each row up one at a time after the `.rc` shows —
```js
['tn0','tn1','tn2','tn3','tn4'].forEach((n,i)=>setTimeout(()=>{const e=document.getElementById(n);if(e)e.classList.add('lit');},i*220));
```
and clear on `leave()`: `.forEach(n=>{...e.classList.remove('lit')})`.

---

## 3. Boxed cards + CTA — `.apr` + `.fdot` + `.albl` + `.cta-row`

Multi-item list where each item needs a status dot, a title, a muted detail line, and an
action (Approve/Reject/Send reminder/etc).

```html
<div class="apr" id="ap1">
  <div class="fdot fred"></div>
  <div class="albl"><strong>Sharma Steel: price jumped 14%</strong><small>Last PO: &#8377;500/kg &middot; New quote: &#8377;570/kg &middot; PO-883 pending your approval</small></div>
  <span class="cta-row"><span class="cta-btn app">Approve</span><span class="cta-btn rej">Reject</span></span>
</div>
```
CSS needed:
```css
.apr{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:11px 16px;display:flex;align-items:center;gap:12px;opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease;margin-bottom:8px}
.apr:last-child{margin-bottom:0}
.apr.show{opacity:1;transform:translateY(0)}
.fdot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.fred{background:#F87171;box-shadow:0 0 10px rgba(248,113,113,.5)}
.famb{background:#fbbf24;box-shadow:0 0 10px rgba(251,191,36,.5)}
.fblu{background:#60A5FA;box-shadow:0 0 10px rgba(96,165,250,.5)}
.albl{flex:1;font-size:var(--fs-p);font-family:'Outfit',sans-serif;color:#fff;line-height:1.35}
.albl strong{font-weight:600;color:#fff;display:block;margin-bottom:2px;font-size:var(--fs-p)}
.albl small{font-size:var(--fs-p);color:rgba(255,255,255,.55)}
```
`.cta-btn` modifiers (already in template.html): `.app` green/approve, `.rej` red/reject-outline,
`.info` blue/informational action, `.pri` orange/primary brand action — pick per action, not
per row position; identical actions across rows should share a color for scannability.

Reveal JS: stagger the cards like the checklist above, using `.show` instead of `.lit`.

**Height budget**: 3 cards at this padding fit comfortably under the 460px floor. If you add
a 4th card or longer detail text, re-check against Frame 7's height (see SKILL.md pitfall).

---

## 4. Progress bars — `.whr` + `.whb`/`.whbf` + optional `.slow-badge`

Quantity breakdowns (stock levels, capacity, budget-used) as horizontal fill bars.

```html
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
  <div>
    <div style="font-family:'Inter',sans-serif;font-weight:500;font-size:var(--fs-p);letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:4px">MS Rods 12mm &mdash; total stock</div>
    <div style="font-family:'Montserrat',sans-serif;font-size:clamp(30px,3.5vw,42px);font-weight:600;color:#fff;line-height:1">2,840 <span style="font-size:var(--fs-p);color:rgba(255,255,255,.7);font-family:'Outfit',sans-serif;font-weight:400">kg</span></div>
  </div>
  <div class="slow-badge" id="slb">&#9888;&#65039; Below reorder level</div>
</div>
<div class="whr" id="wh1"><span class="whn">Main warehouse &mdash; Pune</span><div class="whb"><div class="whbf" id="wb1" data-w="68"></div></div><span class="whq">1,920 kg</span></div>
```
CSS needed:
```css
.whr{display:flex;align-items:center;gap:14px;padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);margin-bottom:8px;opacity:0;transform:translateY(12px);transition:opacity .4s ease,transform .4s ease}
.whr:last-child{margin-bottom:0}
.whr.show{opacity:1;transform:translateY(0)}
.whn{flex:1;font-size:var(--fs-p);font-family:'Outfit',sans-serif;color:#fff}
.whb{flex:2;height:7px;background:rgba(255,255,255,.09);border-radius:4px;overflow:hidden}
.whbf{height:100%;border-radius:4px;background:#DA5D37;width:0;transition:width 1.1s cubic-bezier(.16,1,.3,1)}
.whq{font-size:var(--fs-p);font-weight:600;color:#fff;font-family:'Outfit',sans-serif;min-width:70px;text-align:right}
.slow-badge{display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-p);font-family:'Outfit',sans-serif;color:#F87171;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.22);border-radius:8px;padding:8px 14px;opacity:0;transition:opacity .5s ease .85s}
.slow-badge.show{opacity:1}
```
Reveal JS: show each `.whr` staggered, then set `.whbf` width to its `data-w` (as a %) so the
fill animates via the CSS `transition:width`:
```js
['wh1','wh2','wh3'].forEach((w,i)=>setTimeout(()=>{const e=document.getElementById(w);if(e)e.classList.add('show');},300+i*250));
setTimeout(()=>['wb1','wb2','wb3'].forEach(b=>{const e=document.getElementById(b);if(e)e.style.width=e.dataset.w+'%';}),400);
```
**Do not** size the stat number with `var(--fs-h)` — same height-budget pitfall as pattern 1.

---

## 5. File-upload chip — `.file-chip` + `.upicon` + `.up-bar`/`.up-bar-fill`

For a demo where the input is "attach an image/file" rather than typed text — shows an icon
chip + filename + a progress bar that fills before any caption text types out.

```html
<div class="inp-row">
  <div class="file-chip" id="filechip">
    <div class="upicon" id="imgchip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>
    <div style="display:flex;flex-direction:column;gap:5px">
      <span class="file-name">invoice_sharma.jpg</span>
      <div class="up-bar" id="upbar"><div class="up-bar-fill" id="upfill"></div></div>
    </div>
  </div>
  <div class="inp-txt"><span id="tt10"></span><span class="cur"></span></div>
</div>
```
CSS needed:
```css
.file-chip{display:flex;align-items:center;gap:10px}
.upicon{width:30px;height:30px;background:#DA5D37;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0;transform:scale(.6);transition:opacity .4s ease,transform .4s ease}
.upicon.show{opacity:1;transform:scale(1)}
.file-name{font-family:'Outfit',sans-serif;font-size:var(--fs-p);color:#fff;opacity:0;transition:opacity .4s ease}
.file-name.show{opacity:1}
.up-bar{width:110px;height:3px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden;opacity:0;transition:opacity .3s ease}
.up-bar.show{opacity:1}
.up-bar-fill{height:100%;width:0;background:#DA5D37;border-radius:2px;transition:width .9s cubic-bezier(.4,0,.2,1)}
```
Reveal sequence — chip fades in → bar fills → *then* caption types → *then* response:
```js
document.getElementById('imgchip').classList.add('show');
document.querySelector('#sID .file-name').classList.add('show');
document.getElementById('upbar').classList.add('show');
setTimeout(()=>document.getElementById('upfill').style.width='100%',150);
setTimeout(async()=>{
  await type(document.getElementById('ttN'),'Create inward from this image',55);
  setTimeout(()=>document.getElementById('rcN').classList.add('show'),1500);
},1800); // wait for the bar fill (900ms) + buffer before typing starts
```

---

## Status color tokens (use consistently across every pattern)

| Meaning | Hex | Use on |
|---|---|---|
| Success / positive | `#34d399` | `.rv.g`, `.cta-btn.app`, `.fst.p` |
| Warning / caution | `#fbbf24` | `.rv.a`, `.famb` |
| Brand / primary action | `#DA5D37` | `.rv.t`, `.cta-btn.pri` |
| Error / negative | `#F87171` | `.rv.r`, `.cta-btn.rej`, `.fred` |
| Info / neutral action | `#60A5FA` | `.rv.i`, `.cta-btn.info`, `.fblu` |

Never invent a new hue — these five cover every status/action this deck system needs.
