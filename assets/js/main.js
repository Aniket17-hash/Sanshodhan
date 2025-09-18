// Basic interactive behaviors for the demo
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Page transition effect on navigation
  $$('.site-nav a, .footer-nav a, .btn[href]')
    .forEach(link => {
      link.addEventListener('click', (e) => {
        const url = link.getAttribute('href');
        if(!url || url.startsWith('#') || url.startsWith('http')) return;
        e.preventDefault();
        document.body.classList.add('nav-out');
        setTimeout(()=>{ window.location.href = url; }, 300);
      });
    });

  // Button ripple micro-interaction
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if(!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(ripple);
    setTimeout(()=> ripple.remove(), 600);
  }, true);

  // Theme toggle (visual only)
  const themeToggle = $('#themeToggle');
  const applyTheme = (t) => {
    document.body.classList.remove('light','dark');
    const theme = t === 'light' ? 'light' : 'dark';
    document.body.classList.add(theme);
  };
  try{
    const saved = localStorage.getItem('theme');
    if(saved){
      applyTheme(saved);
    }else{
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
    }
  }catch(err){}
  if(themeToggle){
    themeToggle.addEventListener('click', ()=>{
      const current = document.body.classList.contains('dark') ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try{ localStorage.setItem('theme', next); }catch(err){}
    });
  }

  // Reveal features on scroll
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('in'); }
    });
  }, {threshold: 0.15});
  $$('.feature-card.reveal').forEach(el => observer.observe(el));

  // Count up stats (just a simple demo)
  const counters = $$('[data-count]');
  counters.forEach((el, i) => {
    const target = i === 0 ? 128 : 4; // demo values
    let c = 0;
    const step = () => {
      c += Math.ceil(target/40);
      if(c > target) c = target;
      el.textContent = c.toString();
      if(c < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // Page-specific behaviors
  const page = document.body.getAttribute('data-page');
  if(page === 'trip') initTripPage();
  if(page === 'consent') initConsentPage();
  if(page === 'feedback') initFeedbackPage();
  if(page === 'explore') initExplorePage();

  function initTripPage(){
    const form = $('#tripForm');
    const startTime = $('#startTime');
    const useCurrentOrigin = $('#useCurrentOrigin');
    const useRecentDestination = $('#useRecentDestination');
    const tripList = $('#tripList');
    const clearBtn = $('#clearTrips');
    // Feedback option fields present on Trip page now
    const fbFields = [
      'fb_hospitals','fb_toilets','fb_toilet_clean','fb_roads','fb_sidewalks','fb_lighting','fb_bus','fb_safety','fb_signage','fb_overall','fb_notes'
    ];

    // Prefill time
    const now = new Date();
    startTime.value = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);

    // Auto-fill origin (uses mock location to avoid permission prompts in demo)
    useCurrentOrigin?.addEventListener('click', async () => {
      const origin = $('#origin');
      try{
        const mock = await mockGetLocation();
        origin.value = mock.label;
        flashField(origin);
      }catch(err){
        origin.placeholder = 'Location unavailable';
        shake(origin);
      }
    });

    // Destination recent suggestions (demo)
    useRecentDestination?.addEventListener('click', () => {
      const dest = $('#destination');
      const recent = getTrips().slice(-3).map(t => t.destination).filter(Boolean);
      dest.value = recent.reverse()[0] || 'Office';
      flashField(dest);
    });

    // Submit handler -> store locally and render list
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const trip = {
        id: Date.now(),
        tripNumber: Number(data.tripNumber || 1),
        origin: data.origin || '',
        startTime: data.startTime,
        mode: data.mode || 'Walk',
        destination: data.destination || '',
        companions: Number(data.companions || 0),
        purpose: data.purpose || 'Other',
        notes: data.notes || '',
        feedback: {
          hospitals: data.fb_hospitals || '',
          toilets: data.fb_toilets || '',
          toiletClean: data.fb_toilet_clean || '',
          roads: data.fb_roads || '',
          sidewalks: data.fb_sidewalks || '',
          lighting: data.fb_lighting || '',
          bus: data.fb_bus || '',
          safety: data.fb_safety || '',
          signage: data.fb_signage || '',
          overall: data.fb_overall || '',
          notes: data.fb_notes || ''
        }
      };
      const list = getTrips();
      list.push(trip);
      setTrips(list);
      form.reset();
      startTime.value = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
      renderTrips();
      toast('Trip saved locally');
    });

    clearBtn?.addEventListener('click', () => {
      setTrips([]);
      renderTrips();
      toast('Cleared local trips');
    });

    // No live location or nearby logic here anymore

    function renderTrips(){
      const list = getTrips().slice(-8).reverse();
      tripList.innerHTML = list.map(t => `
        <li>
          <span class="trip-badge">#${t.tripNumber}</span>
          <div>
            <div>${escapeHtml(t.origin)} → ${escapeHtml(t.destination)}</div>
            <div class="trip-mode">${t.mode} • ${formatTime(t.startTime)} • ${t.companions} companion(s)</div>
          </div>
          <button class="btn tiny" data-del="${t.id}">Delete</button>
        </li>
      `).join('');
      $$('[data-del]')?.forEach(btn => btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-del'));
        const rest = getTrips().filter(t => t.id !== id);
        setTrips(rest);
        renderTrips();
      }));
    }
    renderTrips();
  }

  function initExplorePage(){
    const liveMap = document.getElementById('liveMap');
    const liveStatus = document.getElementById('liveStatus');
    const startLive = document.getElementById('startLive');
    const stopLive = document.getElementById('stopLive');
    const findNearby = document.getElementById('findNearby');
    const facilityType = document.getElementById('facilityType');
    const nearbyList = document.getElementById('nearbyList');
    let watchId = null;

    // Live location tracking
    startLive?.addEventListener('click', (e)=>{
      e.preventDefault();
      if(!('geolocation' in navigator)){
        liveStatus.textContent = 'Geolocation not available. Using mock path.';
        startMockPath();
        return;
      }
      liveStatus.textContent = 'Starting…';
      watchId = navigator.geolocation.watchPosition(pos => {
        const {latitude, longitude} = pos.coords;
        updateMap(latitude, longitude);
        liveStatus.textContent = `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
      }, err => {
        liveStatus.textContent = 'Permission denied. Using mock path.';
        startMockPath();
      }, {enableHighAccuracy:true, maximumAge:2000, timeout:8000});
    });
    stopLive?.addEventListener('click', (e)=>{
      e.preventDefault();
      if(watchId){ navigator.geolocation.clearWatch(watchId); watchId = null; }
      if(mockTimer){ clearInterval(mockTimer); mockTimer=null; }
      liveStatus.textContent = 'Stopped.';
    });

    let mockTimer=null, mockIdx=0; const mockRoute = [
      [10.0000, 76.3000],[10.0015,76.3025],[10.0035,76.3050],[10.0060,76.3075],[10.0080,76.3100]
    ];
    function startMockPath(){
      if(mockTimer) return;
      mockIdx = 0;
      mockTimer = setInterval(()=>{
        const [lat,lng] = mockRoute[mockIdx++ % mockRoute.length];
        updateMap(lat,lng);
        liveStatus.textContent = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)} (mock)`;
      }, 1500);
    }
    let lastDot=null;
    function updateMap(lat,lng){
      if(!liveMap) return;
      if(!lastDot){
        lastDot = document.createElement('div');
        Object.assign(lastDot.style,{position:'absolute', width:'10px', height:'10px', borderRadius:'50%', background:'#26ff9c', boxShadow:'0 0 20px rgba(38,255,156,.5)'});
        liveMap.style.position='relative';
        liveMap.appendChild(lastDot);
      }
      const r = liveMap.getBoundingClientRect();
      const x = ((lng+180)%360)/360 * r.width;
      const y = ((90-(lat+90)%180)/180) * r.height;
      lastDot.style.left = Math.max(6, Math.min(r.width-6, x))+'px';
      lastDot.style.top = Math.max(6, Math.min(r.height-6, y))+'px';
    }

    // Nearby facilities
    findNearby?.addEventListener('click', async (e)=>{
      e.preventDefault();
      nearbyList.innerHTML = '<li class="hint" style="padding:10px 14px">Searching…</li>';
      let center = null;
      try{
        center = await getCurrentPositionOnce(3000);
      }catch(err){
        center = {latitude:10.0035, longitude:76.3050};
      }
      const type = facilityType.value;
      let results=[];
      try{
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(type)}&limit=5&viewbox=&bounded=0&addressdetails=1&extratags=0&namedetails=0`;
        const res = await fetch(url, {headers:{'Accept':'application/json'}});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        results = data.map(d => ({name: d.display_name.split(',')[0], lat: Number(d.lat), lon: Number(d.lon)}));
      }catch(err){
        results = [
          {name:`Demo ${type} A`, lat:center.latitude+0.001, lon:center.longitude+0.001},
          {name:`Demo ${type} B`, lat:center.latitude-0.001, lon:center.longitude-0.001}
        ];
      }
      nearbyList.innerHTML = results.map((r,i)=>{
        const dist = distanceKm(center.latitude, center.longitude, r.lat, r.lon);
        return `<li><span class=\"trip-badge\">${i+1}</span><div><div>${escapeHtml(r.name)}</div><div class=\"trip-mode\">${dist.toFixed(2)} km away</div></div><a class=\"btn tiny\" href=\"https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}\" target=\"_blank\" rel=\"noopener\">Map</a></li>`
      }).join('');
    });

    function getCurrentPositionOnce(timeout=4000){
      return new Promise((resolve, reject)=>{
        if(!('geolocation' in navigator)) return reject(new Error('no geo'));
        const timer = setTimeout(()=> reject(new Error('timeout')), timeout);
        navigator.geolocation.getCurrentPosition(pos => {
          clearTimeout(timer);
          resolve(pos.coords);
        }, err => {
          clearTimeout(timer);
          reject(err);
        }, {enableHighAccuracy:true, maximumAge:0, timeout});
      });
    }
    function distanceKm(lat1,lon1,lat2,lon2){
      const R=6371; const toRad = d=>d*Math.PI/180;
      const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
      const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
      return 2*R*Math.asin(Math.sqrt(a));
    }
  }

  function initConsentPage(){
    const toggle = $('#consentToggle');
    const status = $('#consentStatus');
    try{
      const saved = localStorage.getItem('consent') === 'true';
      toggle.checked = saved;
      status.textContent = saved ? 'Consent: Given' : 'Consent: Not given';
    }catch(err){}
    toggle?.addEventListener('change', () => {
      const val = toggle.checked;
      status.textContent = val ? 'Consent: Given' : 'Consent: Not given';
      try{ localStorage.setItem('consent', String(val)); }catch(err){}
      toast(val ? 'Consent saved' : 'Consent revoked');
    });
  }

  function initFeedbackPage(){
    const form = document.getElementById('feedbackForm');
    const thanks = document.getElementById('feedbackThanks');
    // Render likert 1-5 for questions 1-14
    const likerts = $$('.likert');
    likerts.forEach(l => {
      const name = l.getAttribute('data-name');
      for(let i=1;i<=5;i++){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt';
        btn.textContent = String(i);
        btn.addEventListener('click', ()=>{
          l.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
          btn.classList.add('active');
          l.setAttribute('data-value', String(i));
        });
        l.appendChild(btn);
      }
    });
    form?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = {};
      likerts.forEach(l => {
        const name = l.getAttribute('data-name');
        data[name] = Number(l.getAttribute('data-value')||0);
      });
      data.q15 = (document.getElementById('q15')||{}).value || '';
      try{ localStorage.setItem('feedback', JSON.stringify(data)); }catch(err){}
      form.style.display = 'none';
      thanks.style.display = 'block';
      toast('Feedback saved locally');
    });
  }

  // Utilities
  function getTrips(){
    try{ return JSON.parse(localStorage.getItem('trips')||'[]'); }catch(e){ return []; }
  }
  function setTrips(list){
    try{ localStorage.setItem('trips', JSON.stringify(list)); }catch(e){}
  }
  function formatTime(v){
    try{ return new Date(v).toLocaleString(); }catch(e){ return v; }
  }
  function escapeHtml(s=''){
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }
  function toast(msg){
    let el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    Object.assign(el.style, {position:'fixed', left:'50%', bottom:'24px', transform:'translateX(-50%)', background:'rgba(20,26,50,.9)', color:'#cfe1ff', padding:'10px 14px', border:'1px solid rgba(255,255,255,.2)', borderRadius:'12px', zIndex:9999, opacity:0, transition:'opacity .2s, translate .2s'});
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity = 1; });
    setTimeout(()=>{ el.style.opacity = 0; setTimeout(()=> el.remove(), 200); }, 1600);
  }
  function flashField(input){
    const orig = input.style.boxShadow;
    input.style.boxShadow = '0 0 0 6px rgba(38,255,156,.15)';
    setTimeout(()=> input.style.boxShadow = orig, 300);
  }
  function shake(input){
    input.animate([
      {transform:'translateX(0)'}, {transform:'translateX(-4px)'}, {transform:'translateX(4px)'}, {transform:'translateX(0)'}
    ], {duration:250});
  }
  async function mockGetLocation(){
    await new Promise(r => setTimeout(r, 300));
    return {lat: 10.015, lng: 76.341, label: 'Near Kochi Metro Station'};
  }
})();


