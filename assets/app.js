/* ================================================================
   好好吃饭 · PORTFOLIO  —  共享脚本（多页面版）
   ① 后端配置（Supabase）   ② 通用动效
   ③ 星空节点导航（首页）    ④ 数字分身    ⑤ 反馈留言
   ================================================================ */

/* ================================================================
   ① 后端配置 —— 把 Supabase 项目的 URL 与 anon key 填到下面。
   未填写时，页面自动使用「本地演示模式」，留言存在浏览器里。
   ================================================================ */
const SUPABASE_URL = "在这里粘贴你的Supabase项目URL";      /* 形如 https://xxxx.supabase.co */
const SUPABASE_ANON_KEY = "在这里粘贴你的anon_public_key";

/* ---- 反馈后台（admin.html）的口令：改成你自己记得住的 ----
   注意：这是「页面上的门帘」，能挡住随手点进来的路人，但不是军用级加密。
   想让留言彻底不公开，见 docs/supabase-setup.md 的「私密模式」。 */
const ADMIN_PASS = "chenfan2008";

/* ---- 小工具：把云端 / 本地的时间统一显示成 2026-09-17 20:31 ---- */
function fmtTime(v){
  if(v === null || v === undefined || v === "") return "";
  const d = new Date(v);
  if(isNaN(d.getTime())) return "";
  const p = n => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) +
         " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* ---- 短格式（后台统计卡用，避免折行）：09-17 20:31 ---- */
function fmtShort(v){
  if(v === null || v === undefined || v === "") return "";
  const d = new Date(v);
  if(isNaN(d.getTime())) return "";
  const p = n => (n < 10 ? "0" : "") + n;
  return p(d.getMonth()+1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* ---- 内置默认问答（想加问题，直接往这里加一条） ---- */
const DEFAULT_TWIN = [
  { q:["你是谁","介绍一下","hello","你好","hi","自我介绍"], a:"我是好好吃饭，真名陈帆。一个刚进大学、天天向上、相信'天天进步'的人。" },
  { q:["为什么叫好好吃饭","网名","名字来源"], a:"'好好吃饭'是对自己最朴素的要求——再难的日子，也先把饭好好吃了，才能有力气往前走。" },
  { q:["想赢","不会笑","slogan","口号"], a:"'想赢的人是不会笑的'是我的座右铭。认真做一件事的时候，我就会收起嬉笑，全神贯注地拼一把。" },
  { q:["爱好","喜欢什么","兴趣"], a:"平时爱打篮球，也爱宅着打游戏。虽然人菜，但是瘾比较大，哈哈。" },
  { q:["篮球","比赛","球馆"], a:"篮球是我解压和锻炼的方式，我会在球馆里记录每次训练和比赛，见证自己的进步。" },
  { q:["学习","上课","微积分","线代","线性代数","高数","英语","专业"], a:"最近正被微积分、线性代数和英语轮番'折磨'，但也是和它们较劲的过程中，我在一点点变强。" },
  { q:["编程","代码","写代码"], a:"我对编程很有兴趣，正在用 Vibe Coding 边做边学。虽然还没感觉到明显进步，但我在坚持每天敲一点。" },
  { q:["项目","作品","做过什么"], a:"目前站内展示了几个项目：云端留言/分身接口、球馆手账、自习小屋。等有更多真实作品我会持续更新。" },
  { q:["联系方式","qq","微信","联系","怎么找我"], a:"QQ：2350776866；微信：13807430106。想找我聊天，欢迎随时留言或加我。" },
  { q:["鼓励","加油","坚持","动力","为什么不放弃"], a:"保持初心，天天开心，保持向上。想赢的人，是不舍得停下来笑太久的人——加油。" }
];

/* ================================================================
   数据层：云端优先，未配置时回退本地
   ================================================================ */
const Store = {
  sb:null, FEEDS:[], TWIN:[], cached:false,

  isCloud(){ return !!this.sb; },

  init(){
    const bad = !window.supabase || !SUPABASE_URL.startsWith("http") || SUPABASE_ANON_KEY.startsWith("在这里");
    if(bad){
      console.warn("[homepage] Supabase 未配置，使用本地演示模式。");
      this.TWIN = DEFAULT_TWIN.slice();
      this.FEEDS = this.loadLocal();
      this.cached = true;
      return;
    }
    this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },

  loadLocal(){
    try{ return JSON.parse(localStorage.getItem("chifan_feeds") || "[]"); }catch(e){ return []; }
  },
  saveLocal(){
    try{ localStorage.setItem("chifan_feeds", JSON.stringify(this.FEEDS)); }catch(e){}
  },
  nextLocalId(){
    let n = 1;
    try{ n = parseInt(localStorage.getItem("chifan_feed_seq") || "1", 10) || 1; }catch(e){}
    try{ localStorage.setItem("chifan_feed_seq", String(n + 1)); }catch(e){}
    return n;
  },

  /* ---- 设备钥匙 ----------------------------------------------------
     每台设备第一次打开网页时，本地生成一串随机字符存在浏览器里。
     留言提交时会把它一起写进数据库，数据库只认「钥匙对不对」来决定
     你能不能改 / 撤回这条留言，所以：
       · 别人的留言，你改不了也删不掉（你没他的钥匙）
       · 你的留言，换台设备也改不了（钥匙在这台设备上）
     钥匙本身永远不会被读回来，服务器只返回它的**末 12 位指纹**，
     用来在页面上认出「这条是我发的」。 */
  token(){
    let t = "";
    try{ t = localStorage.getItem("chifan_token") || ""; }catch(e){}
    if(!t){
      const pool = "abcdefghijklmnopqrstuvwxyz0123456789";
      t = "k";
      for(let i = 0; i < 40; i++) t += pool[Math.floor(Math.random() * pool.length)];
      try{ localStorage.setItem("chifan_token", t); }catch(e){}
    }
    return t;
  },
  fingerprint(){
    const t = this.token();
    return t.slice(-12);
  },

  /* 拉取留言（默认 100 条，后台用 200）
     云端走 list_feeds 函数：它只返回能公开的字段，永远不吐钥匙 */
  fetchFeeds(done, limit){
    if(!this.isCloud()){
      /* 本地演示模式：从 localStorage 重新读一次，这样后台的「刷新」也有用 */
      this.FEEDS = this.loadLocal();
      this.TWIN.length || (this.TWIN = DEFAULT_TWIN.slice());
      return done && done();
    }
    const fp = this.fingerprint();
    this.sb.rpc("list_feeds", { p_limit: limit || 100 }).then(res=>{
      if(res.error){
        console.error("读取留言失败:", res.error.message);
        this.FEEDS = [];
      } else {
        this.FEEDS = (res.data || []).map(r=>({
          id: r.id,
          name: r.name || "",
          text: r.body,
          anon: !!r.anon,
          edited: !!r.edited,
          t: r.created_at,
          mine: r.fp === fp
        }));
      }
      done && done();
    });
  },

  /* 新增留言 */
  submitFeed(m){
    if(this.isCloud()){
      return this.sb.from("feeds").insert([{
        name: m.name || "", text: m.text, anon: !!m.anon, owner_token: this.token()
      }]).then(res=>{
        if(res.error) return Promise.reject(res.error);
        return Promise.resolve();
      });
    }
    m.id = this.nextLocalId();
    m.mine = true;
    m.edited = false;
    this.FEEDS.push(m);
    this.saveLocal();
    return Promise.resolve();
  },

  /* 编辑自己的留言（云端会在数据库里比对钥匙，不是你的会直接报错） */
  editFeed(id, text){
    if(this.isCloud()){
      return this.sb.rpc("edit_feed", { p_id: id, p_token: this.token(), p_text: text })
        .then(res=>{
          if(res.error) return Promise.reject(res.error);
          return Promise.resolve();
        });
    }
    const it = this.FEEDS.find(x=>String(x.id) === String(id));
    if(!it || !it.mine) return Promise.reject(new Error("这条留言不是当前设备发的，改不了"));
    it.text = text;
    it.edited = true;
    this.saveLocal();
    return Promise.resolve();
  },

  /* 撤回自己的留言 */
  deleteFeed(id){
    if(this.isCloud()){
      return this.sb.rpc("delete_feed", { p_id: id, p_token: this.token() })
        .then(res=>{
          if(res.error) return Promise.reject(res.error);
          return Promise.resolve();
        });
    }
    const i = this.FEEDS.findIndex(x=>String(x.id) === String(id));
    if(i < 0 || !this.FEEDS[i].mine) return Promise.reject(new Error("这条留言不是当前设备发的，撤不了"));
    this.FEEDS.splice(i, 1);
    this.saveLocal();
    return Promise.resolve();
  },

  /* 拉取分身问答 */
  fetchTwin(done){
    if(!this.isCloud()){ this.TWIN = DEFAULT_TWIN.slice(); return done && done(); }
    this.sb.from("twin").select("keywords,answer").limit(200)
      .then(res=>{
        if(res.error){ console.warn("云端问答读取失败，使用默认问答:", res.error.message); this.TWIN = DEFAULT_TWIN.slice(); }
        else if(res.data && res.data.length){
          const list = res.data.map(r=>({ q:(r.keywords||[]).map(String), a:r.answer||"" }))
                              .filter(x=>x.q.length && x.a);
          if(list.length) this.TWIN = list;
        }
        done && done();
      });
  },

  matchAnswer(text){
    const q = (text||"").toLowerCase();
    const list = this.TWIN.length ? this.TWIN : DEFAULT_TWIN;
    for(let i=0;i<list.length;i++){
      for(let j=0;j<list[i].q.length;j++){
        if(q.indexOf(String(list[i].q[j]).toLowerCase()) > -1) return list[i].a;
      }
    }
    return "这个问题我还不知道怎么回。你可以从上方选一个问题，或者到「反馈意见」页面留言，我会看到并补充到我的记忆里。";
  }
};

/* ================================================================
   ② 通用动效：开场 / 十字光标 / 渐显 / 导航高亮
   ================================================================ */
function initChrome(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 开场：巨型字体逐行浮现，然后整屏向上滑出（仅首页有 #intro） --- */
  const intro = document.getElementById("intro");
  if(intro){
    const lines = intro.querySelectorAll(".i-line");
    const en = intro.querySelector(".i-en");
    const hide = ()=> intro.classList.add("done");
    if(reduce){ hide(); }
    else{
      lines.forEach((el,i)=> setTimeout(()=> el.classList.add("on"), 260 + i*330));
      if(en) setTimeout(()=> en.classList.add("on"), 260 + lines.length*330);
      setTimeout(hide, 260 + lines.length*330 + 1500);
      setTimeout(hide, 5000);            /* 兜底：最多 5 秒一定进入页面 */
    }
  }

  /* --- 十字准星光标 --- */
  const cur = document.getElementById("cursor");
  if(cur && window.matchMedia("(hover:hover)").matches){
    let cx=0, cy=0, tx=0, ty=0;
    document.addEventListener("mousemove", e=>{
      tx=e.clientX; ty=e.clientY; cur.classList.add("on");
      const hot = e.target.closest && e.target.closest("a,button,input,textarea,label,.proj");
      cur.classList.toggle("hot", !!hot);
    });
    (function loop(){
      cx += (tx-cx)*.22; cy += (ty-cy)*.22;
      cur.style.transform = "translate("+cx+"px,"+cy+"px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseleave", ()=> cur.classList.remove("on"));
  }

  /* --- 滚动渐显 --- */
  const targets = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window){
    const io = new IntersectionObserver(es=>{
      es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold:.12, rootMargin:"0px 0px -8% 0px" });
    targets.forEach(el=> io.observe(el));
  } else {
    targets.forEach(el=> el.classList.add("in"));
  }

  /* --- 顶栏高亮当前页 --- */
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("header.top a[href]").forEach(a=>{
    const href = a.getAttribute("href").split("#")[0].toLowerCase();
    if(href && href === here) a.classList.add("active");
  });
}

/* ================================================================
   ③ 星空节点导航（首页）—— 点击节点 = 真·跳转页面
   ================================================================ */
function initGraph(){
  const cv = document.getElementById("graph");
  if(!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  let W=0, H=0, DPR=1, offX=0, offY=0, tOffX=0, tOffY=0;
  let mx=-9999, my=-9999;
  let stars=[], nodes=[], shots=[];

  /* ★ 每个节点 = 一个真实页面 */
  const NODES = [
    { t:"· 关于我", p:"about.html",            x:-.36, y:-.28 },
    { t:"· 项目",   p:"projects.html",         x: .08, y:-.30 },
    { t:"· 技能",   p:"about.html#skills",     x: .36, y:-.10 },
    { t:"· 经历",   p:"about.html#journey",    x:-.46, y: .06 },
    { t:"· 反馈",   p:"feedback.html",         x: .26, y: .22 },
    { t:"· 分身",   p:"twin.html",             x:-.12, y: .38 },
    { t:"· 联系",   p:"contact.html",          x: .40, y: .34 }
  ];

  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 2);
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width  = Math.floor(W*DPR);
    cv.height = Math.floor(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  function seed(){
    stars = [];
    const n = Math.round(Math.min(620, (W*H)/3200));
    for(let i=0;i<n;i++){
      const big = Math.random() < .14;
      const col = Math.random()<.14 ? "170,215,255" : (Math.random()<.08 ? "255,228,190" : "255,255,255");
      stars.push({
        x:Math.random(), y:Math.random(),
        r: big ? Math.random()*1.6+1.5 : Math.random()*1.0+.35,
        s:(big?.00006:.00022) + Math.random()*.00016,
        o:Math.random()*.55+.35, ph:Math.random()*6.28,
        sp:Math.random()*.0025+.0006, c:col, big:big,
        par: Math.random()*.5+.18
      });
    }
    nodes = NODES.map(d=>({
      t:d.t, p:d.p, x:d.x, y:d.y, r:3.4, ox:0, oy:0,
      vx:(Math.random()-.5)*.00004, vy:(Math.random()-.5)*.00004, hover:0
    }));
  }

  function pos(n){ return { x: W*(.5+n.x) + n.ox + offX, y: H*(.5+n.y) + n.oy + offY }; }
  function hitNode(cx, cy, tol){
    let best=null, bd=1e9;
    nodes.forEach(n=>{
      const p = pos(n), d = Math.hypot(p.x-cx, p.y-cy);
      if(d < bd){ bd = d; best = n; }
    });
    return (best && bd < tol) ? best : null;
  }

  resize(); seed();
  window.addEventListener("resize", ()=>{ resize(); seed(); });

  /* --- 拖动探索（拖动时不触发跳转） --- */
  let dragging=false, lx=0, ly=0, moved=0;
  cv.addEventListener("mousedown", e=>{ dragging=true; moved=0; lx=e.clientX; ly=e.clientY; });
  window.addEventListener("mouseup", ()=>{ dragging=false; tOffX=offX; tOffY=offY; });
  cv.addEventListener("mousemove", e=>{
    mx=e.clientX; my=e.clientY;
    if(dragging){
      offX += e.clientX-lx; offY += e.clientY-ly;
      tOffX=offX; tOffY=offY;
      moved += Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly);
      lx=e.clientX; ly=e.clientY;
    }
    /* 悬停到节点上时，光标变成手型，提示"可以点进去" */
    const over = hitNode(e.clientX, e.clientY, 70);
    cv.style.cursor = over ? "pointer" : "crosshair";
    cv.title = over ? ("进入：" + over.p) : "";
  });
  cv.addEventListener("mouseleave", ()=>{ mx=my=-9999; cv.style.cursor="crosshair"; });

  /* ★ 点击节点 → 真·跳转（浏览器加载新页面） */
  cv.addEventListener("click", e=>{
    if(moved > 6) return;                    /* 刚才是拖动，不算点击 */
    const n = hitNode(e.clientX, e.clientY, 70);
    if(!n || !n.p) return;
    cv.style.cursor = "wait";
    location.href = n.p;                     /* ← 关键：整页跳转，不是滚动 */
  });

  function frame(ts){
    const t = ts||0;
    ctx.clearRect(0,0,W,H);

    /* 星点：多层视差 + 闪烁 + 大星发光 */
    for(let i=0;i<stars.length;i++){
      const s = stars[i];
      s.y += s.s*16; if(s.y > 1) s.y = 0;
      const al = s.o*(.42 + .58*(.5 + .5*Math.sin(t*s.sp + s.ph)));
      const sx = s.x*W + offX*s.par, sy = s.y*H + offY*s.par;
      if(s.big){
        const gg = ctx.createRadialGradient(sx,sy,0,sx,sy,s.r*7);
        gg.addColorStop(0, "rgba("+s.c+","+(al*.5)+")");
        gg.addColorStop(1, "rgba("+s.c+",0)");
        ctx.beginPath(); ctx.fillStyle=gg; ctx.arc(sx,sy,s.r*7,0,6.283); ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = "rgba("+s.c+","+al+")";
      ctx.arc(sx,sy,s.r,0,6.283);
      ctx.fill();
    }

    /* 流星 */
    if(Math.random() < .005 && shots.length < 3){
      const dir = Math.random() < .5 ? 1 : -1;
      shots.push({ x:(Math.random()*.7+.15)*W, y:Math.random()*.45*H,
                   vx:dir*(5+Math.random()*4), vy:2.2+Math.random()*1.6,
                   life:1, len:100+Math.random()*140 });
    }
    for(let k=shots.length-1;k>=0;k--){
      const sh = shots[k];
      sh.x += sh.vx; sh.y += sh.vy; sh.life -= .012;
      if(sh.life <= 0 || sh.x < -200 || sh.x > W+200 || sh.y > H+200){ shots.splice(k,1); continue; }
      const sp = Math.hypot(sh.vx, sh.vy);
      const ex = sh.x - sh.vx*(sh.len/sp), ey = sh.y - sh.vy*(sh.len/sp);
      const lg = ctx.createLinearGradient(sh.x,sh.y,ex,ey);
      lg.addColorStop(0, "rgba(255,255,255,"+(sh.life*.95)+")");
      lg.addColorStop(.4,"rgba(180,220,255,"+(sh.life*.5)+")");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle=lg; ctx.lineWidth=1.7; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(ex,ey); ctx.stroke();
    }

    /* 惯性回正 */
    offX += (tOffX-offX)*.06; offY += (tOffY-offY)*.06;

    /* 节点漂移 */
    nodes.forEach(n=>{
      n.x += n.vx*16; n.y += n.vy*16;
      if(n.x < -.62 || n.x > .62) n.vx *= -1;
      if(n.y < -.62 || n.y > .62) n.vy *= -1;
      n.ox = Math.sin(t*.0005 + n.x*10)*7;
      n.oy = Math.cos(t*.0006 + n.y*10)*7;
    });

    /* 连线 */
    for(let a=0;a<nodes.length;a++){
      for(let b=a+1;b<nodes.length;b++){
        const pa = pos(nodes[a]), pb = pos(nodes[b]);
        const d = Math.hypot(pa.x-pb.x, pa.y-pb.y);
        const max = Math.min(W,H)*.52;
        if(d < max){
          ctx.strokeStyle = "rgba(255,255,255,"+((1-d/max)*.55)+")";
          ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
        }
      }
    }

    /* 节点 + 标签（hover 显示"进入 →"） */
    nodes.forEach(n=>{
      const p = pos(n), d = Math.hypot(p.x-mx, p.y-my);
      const near = d < 95 ? 1-(d/95) : 0;
      n.hover += (near - n.hover)*.15;
      const rr = n.r + n.hover*2.4;

      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,18+n.hover*14);
      g.addColorStop(0, "rgba(255,255,255,"+(0.26 + n.hover*0.34)+")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.fillStyle=g; ctx.arc(p.x,p.y,18+n.hover*14,0,6.283); ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,"+(0.88 + n.hover*0.12)+")";
      ctx.arc(p.x,p.y,rr,0,6.283); ctx.fill();

      if(n.hover > .02){
        ctx.beginPath();
        ctx.strokeStyle = "rgba(48,184,255,"+(n.hover*.7)+")";
        ctx.lineWidth = 1; ctx.arc(p.x,p.y,16+n.hover*12,0,6.283); ctx.stroke();
      }

      const label = n.hover > .35 ? (n.t + "  进入 →") : n.t;
      ctx.font = "500 12.5px 'Space Grotesk','Noto Sans SC',sans-serif";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(label).width;
      /* 靠右边缘时标签翻到左边，保证不出画布 */
      const flip = (p.x + 10 + tw + 8 > W);
      if(flip) ctx.textAlign = "right"; else ctx.textAlign = "left";
      const bx = flip ? p.x - 14 - tw - 8 : p.x + 10;
      const tx = flip ? p.x - 14 : p.x + 14;
      ctx.fillStyle = "rgba(8,9,12,"+(0.6 + n.hover*0.3)+")";
      ctx.fillRect(bx, p.y-9, tw+8, 18);
      ctx.fillStyle = n.hover > .35 ? "rgba(48,184,255,.98)" : "rgba(255,255,255,"+(0.74 + n.hover*0.26)+")";
      ctx.fillText(label, tx, p.y);
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ================================================================
   ④ 数字分身（仅 twin.html）
   ================================================================ */
function initTwin(){
  const chatBox = document.getElementById("chatBox");
  if(!chatBox) return;
  const quickBox = document.getElementById("quick");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  function addMsg(text, who){
    const d = document.createElement("div");
    d.className = "msg " + who;
    d.textContent = text;
    chatBox.appendChild(d);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  function ask(q){
    q = (q||"").trim();
    if(!q) return;
    addMsg(q, "user");
    setTimeout(()=> addMsg(Store.matchAnswer(q), "bot"), 220);
  }
  function buildQuick(){
    quickBox.innerHTML = "";
    const list = ["你是谁","你喜欢什么","想赢的人不会笑","最近在学什么","做过的项目","怎么联系你","给我一句鼓励"];
    list.forEach(text=>{
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = ()=> ask(text);
      quickBox.appendChild(b);
    });
  }
  sendBtn.onclick = ()=>{ ask(chatInput.value); chatInput.value = ""; };
  chatInput.addEventListener("keydown", e=>{
    if(e.key === "Enter"){ ask(chatInput.value); chatInput.value = ""; }
  });

  buildQuick();
  addMsg("你好，我是好好吃饭的数字分身。关于我，你想问点什么？", "bot");
  addMsg("（试试下方问题，或输入你想知道的）", "bot");
  Store.fetchTwin(()=>{ /* 云端问答就绪后即可命中 */ });
}

/* ================================================================
   ⑤ 反馈留言（仅 feedback.html）
   ================================================================ */
function initFeedback(){
  const form = document.getElementById("feedForm");
  if(!form) return;
  const feedName = document.getElementById("feedName");
  const feedText = document.getElementById("feedText");
  const feedAnon = document.getElementById("feedAnon");
  const msgList  = document.getElementById("msgList");
  const statusEl = document.getElementById("feedStatus");
  const countEl  = document.getElementById("feedCount");
  const btn      = form.querySelector('button[type="submit"]');

  let editingId = null;   /* 正在编辑的留言 id */
  let busy = false;       /* 提交中，防连点 */

  function errText(err){ return (err && err.message) ? err.message : "请稍后再试"; }

  function setStatus(text, cls){
    if(!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "feed-status" + (cls ? " " + cls : "");
  }

  function refresh(){ return Store.fetchFeeds(render); }

  /* ---- 单条留言：自己的那条带「我的」标签 + 编辑 / 撤回 ---- */
  function msgNode(m){
    const it = document.createElement("div");
    it.className = "msg-item" + (m.mine ? " mine" : "");

    const head = document.createElement("div");
    head.className = "msg-head";
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = (m.anon || !m.name) ? "· 匿名访客 ·" : (m.name + " · 访客");
    head.appendChild(who);
    if(m.mine){
      const tag = document.createElement("span");
      tag.className = "mine-tag"; tag.textContent = "我的";
      head.appendChild(tag);
    }
    if(m.edited){
      const tag = document.createElement("span");
      tag.className = "edited-tag"; tag.textContent = "已编辑";
      head.appendChild(tag);
    }
    const time = fmtTime(m.t);
    if(time){
      const t = document.createElement("span");
      t.className = "time"; t.textContent = time;
      head.appendChild(t);
    }
    it.appendChild(head);

    /* ---- 编辑态：换成文本框 + 保存 / 取消 ---- */
    if(m.mine && editingId !== null && String(editingId) === String(m.id)){
      const box = document.createElement("div");
      box.className = "edit-box";
      const ta = document.createElement("textarea");
      ta.className = "edit-input"; ta.rows = 2; ta.value = m.text;
      const ops = document.createElement("div");
      ops.className = "ops";
      const save = document.createElement("button");
      save.type = "button"; save.className = "op primary"; save.textContent = "保存";
      const cancel = document.createElement("button");
      cancel.type = "button"; cancel.className = "op"; cancel.textContent = "取消";
      ops.appendChild(save); ops.appendChild(cancel);
      box.appendChild(ta); box.appendChild(ops);
      it.appendChild(box);

      save.onclick = ()=>{
        const nv = ta.value.trim();
        if(!nv){ setStatus("留言不能为空", "err"); ta.focus(); return; }
        if(nv === m.text){ editingId = null; render(); return; }
        save.disabled = cancel.disabled = true;
        setStatus("正在保存…", "busy");
        Store.editFeed(m.id, nv).then(()=>{
          editingId = null;
          setStatus("已保存修改", "ok");
          return refresh();
        }).catch(err=>{
          setStatus("保存失败：" + errText(err), "err");
          render();
        });
      };
      cancel.onclick = ()=>{ editingId = null; render(); };
      setTimeout(()=> ta.focus(), 0);
      return it;
    }

    const body = document.createElement("div");
    body.className = "body";
    body.textContent = m.text;
    it.appendChild(body);

    /* ---- 只有自己的留言才有操作按钮（别人的看不到、也改不了） ---- */
    if(m.mine){
      const ops = document.createElement("div");
      ops.className = "ops";
      const edit = document.createElement("button");
      edit.type = "button"; edit.className = "op"; edit.textContent = "编辑";
      const del = document.createElement("button");
      del.type = "button"; del.className = "op danger"; del.textContent = "撤回";
      ops.appendChild(edit); ops.appendChild(del);
      it.appendChild(ops);

      edit.onclick = ()=>{ editingId = m.id; render(); };
      del.onclick = ()=>{
        if(!window.confirm("确定撤回这条留言吗？撤回后无法恢复。")) return;
        edit.disabled = del.disabled = true;
        setStatus("正在撤回…", "busy");
        Store.deleteFeed(m.id).then(()=>{
          setStatus("已撤回", "ok");
          return refresh();
        }).catch(err=>{
          setStatus("撤回失败：" + errText(err), "err");
          render();
        });
      };
    }
    return it;
  }

  function render(){
    msgList.innerHTML = "";
    if(countEl){
      countEl.textContent = Store.FEEDS.length
        ? ("已收到 " + Store.FEEDS.length + " 条留言" + (Store.isCloud() ? "" : "（本地演示模式）"))
        : "";
    }
    if(!Store.FEEDS.length){
      msgList.innerHTML = '<div class="empty">还没有留言，来写第一条吧～</div>';
      return;
    }
    Store.FEEDS.forEach(m=> msgList.appendChild(msgNode(m)));
  }

  form.onsubmit = e=>{
    e.preventDefault();
    if(busy) return;
    const text = feedText.value.trim();
    if(!text){ setStatus("写点什么再提交吧", "err"); feedText.focus(); return; }
    const m = { name: feedName.value.trim(), text, anon: feedAnon.checked, t: Date.now() };
    busy = true;
    if(btn) btn.disabled = true;
    setStatus("正在提交…", "busy");
    Store.submitFeed(m).then(()=>{
      feedText.value = ""; feedName.value = "";
      setStatus(Store.isCloud()
        ? "已收到，谢谢你的反馈！"
        : "已收到（当前是本地演示模式，配置云端后才会跨设备保存）", "ok");
      return refresh();
    }).catch(err=>{
      setStatus("提交失败：" + errText(err), "err");
      render();
    }).then(()=>{ busy = false; if(btn) btn.disabled = false; });
  };

  render();
  Store.fetchFeeds(render);
}

/* ================================================================
   ⑥ 反馈后台 admin（仅 admin.html）
   —— 口令进门 → 统计 → 全部留言列表 → 导出 CSV / 复制全部
   ================================================================ */
function initAdmin(){
  const gate = document.getElementById("adminGate");
  if(!gate) return;
  const passInput = document.getElementById("adminPass");
  const enterBtn  = document.getElementById("adminEnter");
  const gateTip   = document.getElementById("gateTip");
  const panel     = document.getElementById("adminPanel");
  const listEl    = document.getElementById("adminList");
  const stTotal   = document.getElementById("stTotal");
  const stToday   = document.getElementById("stToday");
  const stLast    = document.getElementById("stLast");
  const stSrc     = document.getElementById("stSrc");
  const btnRefresh= document.getElementById("btnRefresh");
  const btnCsv    = document.getElementById("btnCsv");
  const btnCopy   = document.getElementById("btnCopy");

  function sameDay(ts){
    if(!ts) return false;
    const d = new Date(ts), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
        && d.getDate() === n.getDate();
  }
  function whoOf(m){ return (m.anon || !m.name) ? "匿名访客" : m.name; }

  function unlock(){
    gate.hidden = true;
    panel.hidden = false;
    load();
  }

  function load(){
    if(stSrc) stSrc.textContent = Store.isCloud() ? "云端 Supabase" : "本地演示";
    listEl.innerHTML = '<div class="empty">正在读取…</div>';
    Store.fetchFeeds(function(){
      const list = Store.FEEDS;
      if(stTotal) stTotal.textContent = list.length;
      if(stToday) stToday.textContent = list.filter(m=>sameDay(m.t)).length;
      if(stLast)  stLast.textContent  = list.length ? fmtShort(list[0].t) : "—";
      listEl.innerHTML = "";
      if(!list.length){
        listEl.innerHTML = '<div class="empty">还没有留言。把网址发出去，等第一条反馈吧。</div>';
        return;
      }
      list.forEach(m=>{
        const it = document.createElement("div");
        it.className = "msg-item";
        const who = document.createElement("div");
        who.className = "who";
        const tm = fmtTime(m.t);
        who.textContent = whoOf(m) + (tm ? "  ·  " + tm : "");
        const body = document.createElement("div");
        body.textContent = m.text;
        it.appendChild(who); it.appendChild(body);
        listEl.appendChild(it);
      });
    }, 200);
  }

  function exportCsv(){
    const list = Store.FEEDS;
    if(!list.length){ alert("还没有留言"); return; }
    const esc = v => '"' + String(v === null || v === undefined ? "" : v).replace(/"/g,'""') + '"';
    const lines = ["时间,称呼,内容,是否匿名"];
    list.forEach(m=>{
      lines.push([fmtTime(m.t), whoOf(m), m.text, m.anon ? "是" : "否"].map(esc).join(","));
    });
    /* 前面加 \ufeff（BOM），Excel 打开中文才不乱码 */
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "反馈留言_" + fmtTime(Date.now()).replace(/[: ]/g,"-") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  }

  function copyAll(){
    const list = Store.FEEDS;
    if(!list.length){ alert("还没有留言"); return; }
    const txt = list.map(m=>"[" + fmtTime(m.t) + "] " + whoOf(m) + "：" + m.text).join("\n\n");
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt)
        .then(()=> alert("已复制 " + list.length + " 条留言"))
        .catch(()=> alert("浏览器不允许复制，请改用「导出 CSV」"));
    } else {
      alert("浏览器不支持复制，请改用「导出 CSV」");
    }
  }

  enterBtn.onclick = ()=>{
    if(passInput.value === ADMIN_PASS){
      try{ sessionStorage.setItem("chifan_admin","1"); }catch(e){}
      unlock();
    } else {
      gateTip.textContent = "口令不对。默认口令写在 assets/app.js 的 ADMIN_PASS，你可以自己改。";
      gateTip.className = "gate-tip err";
    }
  };
  passInput.addEventListener("keydown", e=>{ if(e.key === "Enter") enterBtn.click(); });
  if(btnRefresh) btnRefresh.onclick = load;
  if(btnCsv) btnCsv.onclick = exportCsv;
  if(btnCopy) btnCopy.onclick = copyAll;

  let opened = false;
  try{ opened = sessionStorage.getItem("chifan_admin") === "1"; }catch(e){}
  if(opened) unlock();
}

/* ================================================================
   启动
   ================================================================ */
document.addEventListener("DOMContentLoaded", ()=>{
  Store.init();
  initChrome();
  initGraph();
  initTwin();
  initFeedback();
  initAdmin();
});
