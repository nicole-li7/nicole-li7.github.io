// Home page: cat intro, typed tagline, resume viewer and the 3D yarn trail.
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- the cat (drawn once, used twice) ----------
  var CAT = '' +
    '<g class="tail"><path d="M212 236 C262 236 272 186 250 160 C240 148 226 152 232 166 C246 192 236 214 206 214" fill="#E7A462" stroke="#3A2A20" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M246 168 l10 -4 M250 186 l11 0 M246 204 l10 5" stroke="#CF8A4E" stroke-width="4" stroke-linecap="round"/></g>' +
    '<ellipse cx="150" cy="222" rx="70" ry="60" fill="#E7A462" stroke="#3A2A20" stroke-width="4"/>' +
    '<ellipse cx="150" cy="236" rx="40" ry="40" fill="#F7DAB2"/>' +
    '<path d="M90 206 l14 4 M88 226 l15 1 M210 206 l-14 4 M212 226 l-15 1" stroke="#CF8A4E" stroke-width="4" stroke-linecap="round"/>' +
    '<g><path d="M96 92 L88 36 L132 66 Z" fill="#E7A462" stroke="#3A2A20" stroke-width="4" stroke-linejoin="round"/><path d="M100 80 L96 50 L120 66 Z" fill="#F2ABA2"/></g>' +
    '<g class="ear-r"><path d="M204 92 L212 36 L168 66 Z" fill="#E7A462" stroke="#3A2A20" stroke-width="4" stroke-linejoin="round"/><path d="M200 80 L204 50 L180 66 Z" fill="#F2ABA2"/></g>' +
    '<circle cx="150" cy="118" r="62" fill="#E7A462" stroke="#3A2A20" stroke-width="4"/>' +
    '<path d="M138 62 q2 12 0 20 M150 58 v22 M162 62 q-2 12 0 20" stroke="#CF8A4E" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="150" cy="142" rx="34" ry="24" fill="#F7DAB2"/>' +
    '<g class="eyes-open"><g class="eyes"><ellipse cx="127" cy="116" rx="9" ry="12" fill="#3A2A20"/><ellipse cx="173" cy="116" rx="9" ry="12" fill="#3A2A20"/>' +
      '<circle cx="130" cy="111" r="3.5" fill="#fff"/><circle cx="176" cy="111" r="3.5" fill="#fff"/></g>' +
      '<g class="lids"><rect x="114" y="102" width="26" height="28" rx="12" fill="#E7A462"/><rect x="160" y="102" width="26" height="28" rx="12" fill="#E7A462"/></g></g>' +
    '<g class="zz"><path d="M116 118 q11 9 22 0 M162 118 q11 9 22 0" stroke="#3A2A20" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<text x="205" y="62">z</text><text x="222" y="42">z</text><text x="240" y="24">z</text></g>' +
    '<circle cx="111" cy="138" r="8" fill="#FFB38A" opacity=".7"/><circle cx="189" cy="138" r="8" fill="#FFB38A" opacity=".7"/>' +
    '<path d="M144 132 h12 l-6 7 z" fill="#E8907E" stroke="#3A2A20" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M150 139 q-5 8 -12 4 M150 139 q5 8 12 4" stroke="#3A2A20" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M110 134 l-32 -6 M110 142 l-32 4 M190 134 l32 -6 M190 142 l32 4" stroke="#3A2A20" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M104 172 q46 18 92 0" stroke="#2A2228" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="141" y="179" width="18" height="13" rx="3" fill="#F2A7C3" stroke="#3A2A20" stroke-width="3"/><ellipse cx="152" cy="200" rx="9" ry="6" fill="#FFFDF8"/>' +
    '<ellipse cx="124" cy="276" rx="18" ry="12" fill="#F7DAB2" stroke="#3A2A20" stroke-width="4"/>' +
    '<g class="paw"><path d="M178 205 C186 230 186 255 176 266" stroke="#3A2A20" stroke-width="4" fill="none"/><ellipse cx="176" cy="276" rx="18" ry="12" fill="#F7DAB2" stroke="#3A2A20" stroke-width="4"/></g>';
  var catEl = document.getElementById('cat');
  catEl.innerHTML = CAT;
  document.getElementById('napcat').innerHTML = CAT;

  // her eyes follow your pointer
  var eyes = catEl.querySelector('.eyes');
  if (!reduce) addEventListener('pointermove', function(e){
    var r = catEl.getBoundingClientRect(), cx = r.left + r.width * .5, cy = r.top + r.height * .39;
    var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
    eyes.setAttribute('transform', 'translate(' + (dx / d * 4).toFixed(1) + ' ' + (dy / d * 4).toFixed(1) + ')');
  });

  // ---------- typed tagline ----------
  var roles = ['things i wish existed', 'things that make life easier'];
  var el = document.getElementById('typed'), ri = 0, ci = roles[0].length, del = false;
  function tick(){
    var word = roles[ri];
    if (!del) { ci++; if (ci > word.length) { del = true; return setTimeout(tick, 1600); } }
    else { ci--; if (ci < 0) { del = false; ri = (ri + 1) % roles.length; ci = 0; } }
    el.textContent = roles[ri].slice(0, Math.max(ci, 0));
    setTimeout(tick, del ? 45 : 90);
  }
  if (!reduce) setTimeout(tick, 1600);

  // ---------- resume viewer ----------
  var dlg = document.getElementById('resumeDlg');
  document.querySelectorAll('.resume-btn').forEach(function(b){ b.addEventListener('click', function(){ dlg.showModal(); }); });
  document.getElementById('resumeClose').addEventListener('click', function(){ dlg.close(); });
  dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });

  // ---------- the yarn trail: a low-poly ball rolling across a 3D floor ----------
  var trail = document.getElementById('trail'), canvas3 = document.getElementById('trail3d');
  var stops = [].slice.call(document.querySelectorAll('.stop'));
  var progress = document.getElementById('progress');
  var LP = window.LowPoly, GAP = 15, TRAVEL = 1, DWELL = .75, R0 = .62, SEGS = 900, SIDE_GAP = 115, SWAT = .14, LAG = 1.9, CAT_S = .6;
  var mode = '', T = null, len = 0, stopLen = [], stopPt = [], segs = [], cardH = [], cardW = [];

  stops.forEach(function(s, i){
    var b = document.createElement('button'); b.type = 'button';
    b.setAttribute('aria-label', 'Go to ' + s.querySelector('h2,h3').textContent);
    b.addEventListener('click', function(){ goStop(i); });
    progress.appendChild(b);
  });

  function cssColor(name, fallback){ return LP.lin(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback); }

  // tiny seeded random so the floor looks the same every visit
  var seed = 7; function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function build3D(){
    if (T) return;
    var renderer = new THREE.WebGLRenderer({canvas: canvas3, antialias: true, alpha: true});
    renderer.setClearColor(0x000000, 0);   // the page background shows through above the horizon
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 14, 34);
    scene.add(new THREE.HemisphereLight(0xFFFFFF, LP.lin(0x8A6A50), .8));
    var sun = new THREE.DirectionalLight(0xFFFFFF, .7); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30;
    scene.add(sun); scene.add(sun.target);

    // the path the ball follows, wandering left and right between stops
    var pts = [new THREE.Vector3(0, 0, 0)];
    stops.forEach(function(s, i){ pts.push(new THREE.Vector3(GAP * (i + 1), 0, i % 2 ? 2.4 : -2.4)); });
    pts.push(new THREE.Vector3(GAP * (stops.length + 1), 0, 0));
    var curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
    len = curve.getLength();
    stopPt = pts.slice(1, -1);
    stopLen = stopPt.map(function(q){
      var best = 0, bd = Infinity;
      for (var k = 0; k <= 3000; k++) { var c = curve.getPointAt(k / 3000), d = c.distanceToSquared(q); if (d < bd) { bd = d; best = k / 3000; } }
      return best * len;
    });

    // faceted floor: a grid with every vertex nudged up or down a little
    var W = len + 90, ground = new THREE.PlaneGeometry(W, 80, Math.round(W / 2.2), 36);
    ground.rotateX(-Math.PI / 2);
    var gp = ground.attributes.position;
    for (var v = 0; v < gp.count; v++) gp.setY(v, (rnd() - .5) * .16);
    ground.computeVertexNormals();
    var groundMat = new THREE.MeshStandardMaterial({flatShading: true, roughness: 1});
    var floor = new THREE.Mesh(ground, groundMat); floor.position.set(len / 2, -.1, 0); floor.receiveShadow = true; scene.add(floor);

    // the thread: one tube for the whole path, drawn only as far as the ball has gone
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, SEGS, .07, 5, false), LP.mat(0x7CC35A));
    tube.position.y = .06; tube.castShadow = true; scene.add(tube);
    // dotted line showing the way ahead
    var routeGeo = new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(700));
    var route = new THREE.Line(routeGeo, new THREE.LineDashedMaterial({color: LP.lin(0x7A6253), dashSize: .12, gapSize: .32, transparent: true, opacity: .55}));
    route.computeLineDistances(); route.position.y = .04; scene.add(route);

    // paw prints beside the path
    var nPrints = Math.floor(len / 1.7), pad = new THREE.InstancedMesh(new THREE.CircleGeometry(.16, 6), new THREE.MeshBasicMaterial({color: 0x3A2A20, transparent: true, opacity: .12}), nPrints * 5);
    var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), k5 = 0;
    for (var n = 0; n < nPrints; n++) {
      var u = (n + .5) / nPrints, c0 = curve.getPointAt(u), t0 = curve.getTangentAt(u), side = n % 2 ? 1 : -1;
      var nx = -t0.z * side * .55, nz = t0.x * side * .55, ang = Math.atan2(t0.x, t0.z);
      [[0, 0, 1], [-.17, .2, .45], [-.06, .27, .45], [.06, .27, .45], [.17, .2, .45]].forEach(function(o){
        var ox = o[0] * Math.cos(ang) + o[1] * Math.sin(ang), oz = -o[0] * Math.sin(ang) + o[1] * Math.cos(ang);
        e4.set(-Math.PI / 2, 0, ang); q4.setFromEuler(e4);
        m4.compose(new THREE.Vector3(c0.x + nx + ox, .02, c0.z + nz + oz), q4, new THREE.Vector3(o[2], o[2] * 1.15, 1));
        pad.setMatrixAt(k5++, m4);
      });
    }
    scene.add(pad);

    // a few low-poly bits scattered around: grass tufts and pebbles
    function scatter(geo, color, count, sy){
      var im = new THREE.InstancedMesh(geo, LP.mat(color), count); im.castShadow = true;
      for (var i = 0; i < count; i++) {
        var x = rnd() * (len + 20) - 10, z = (rnd() < .5 ? -1 : 1) * (3.2 + rnd() * 9);
        e4.set(0, rnd() * 6.28, 0); q4.setFromEuler(e4);
        var s = .6 + rnd() * .9;
        m4.compose(new THREE.Vector3(x, sy * s, z), q4, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4);
      }
      scene.add(im);
    }
    scatter(new THREE.ConeGeometry(.13, .42, 4), 0x7CC35A, 90, .2);
    scatter(new THREE.ConeGeometry(.1, .3, 4), 0x4E9A35, 70, .14);
    scatter(new THREE.IcosahedronGeometry(.16, 0), 0xE9C99C, 50, .08);
    scatter(new THREE.IcosahedronGeometry(.12, 0), 0xF4A259, 24, .07);

    var ball = LP.makeYarn(1); ball.traverse(function(o){ o.castShadow = true; }); scene.add(ball);
    var kitty = LP.makeCat(); kitty.group.scale.setScalar(CAT_S); scene.add(kitty.group);
    var camera = new THREE.PerspectiveCamera(38, 1, .1, 200);

    function paint(){
      // fog is mixed in after the sRGB step in this three.js version, so it takes the raw page colour
      scene.fog.color.set(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#FFF7EA');
      groundMat.color.copy(cssColor('--ground', '#F3DDBD'));
    }
    paint();
    new MutationObserver(function(){ paint(); frame(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

    T = {renderer: renderer, scene: scene, sun: sun, curve: curve, tube: tube, ball: ball, kitty: kitty, camera: camera, lastL: 0, t0: performance.now(),
         up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion(), v: new THREE.Vector3()};
  }

  function layout(){
    var wide = !reduce && !!LP && innerWidth >= 900 && innerHeight >= 560;
    var keepP = (mode === 'trail' && segs.length) ? scrollP() : null;
    mode = wide ? 'trail' : 'stacked';
    document.body.classList.toggle('stacked', !wide);
    if (!wide) { trail.style.height = ''; reveal(); return; }

    build3D();
    T.renderer.setSize(innerWidth, innerHeight, false);
    T.camera.aspect = innerWidth / innerHeight; T.camera.updateProjectionMatrix();
    stops.forEach(function(s, i){ var c = s.firstElementChild; cardH[i] = c.offsetHeight; cardW[i] = c.offsetWidth; });

    // scroll position -> distance along the yarn: roll, then pause at each stop
    segs = []; var lastL = 0;
    stopLen.forEach(function(L){ segs.push({w: TRAVEL, a: lastL, b: L, travel: true}); segs.push({w: DWELL, a: L, b: L, travel: false}); lastL = L; });
    segs.push({w: TRAVEL * .8, a: lastL, b: len, travel: true});
    var total = segs.reduce(function(s, g){ return s + g.w; }, 0), acc = 0;
    segs.forEach(function(g){ g.p0 = acc / total; acc += g.w; g.p1 = acc / total; });
    trail.style.height = (total * 85 + 100) + 'vh';
    if (keepP !== null && keepP > 0 && keepP < 1) window.scrollTo(0, trail.offsetTop + keepP * (trail.offsetHeight - innerHeight));
    frame();
  }

  function smooth(t){ return t * t * (3 - 2 * t); }
  function scrollP(){
    var h = trail.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, (scrollY - trail.offsetTop) / h));
  }
  function at(p){
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (p <= g.p1 || i === segs.length - 1) {
        var u = Math.min(1, Math.max(0, (p - g.p0) / (g.p1 - g.p0)));
        // each roll starts with the cat's swipe; the ball only moves once her paw connects
        var v = g.travel ? Math.min(1, Math.max(0, (u - SWAT) / (1 - SWAT))) : 0;
        return {L: g.a + (g.b - g.a) * smooth(v), travel: g.travel ? Math.sin(Math.PI * v) : 0, rolling: g.travel, u: u, v: v};
      }
    }
  }

  // ---------- the cat chases the ball ----------
  var catDir = new THREE.Vector3(), catPos = new THREE.Vector3();
  function pointAt(L){
    if (L >= 0) return T.curve.getPointAt(Math.min(1, L / len));
    var t0 = T.curve.getTangentAt(0); return T.curve.getPointAt(0).addScaledVector(t0, L);   // before the start: keep going straight back
  }
  function kittyPose(st, L, ballPos){
    var K = T.kitty.p, g = T.kitty.group, t = (performance.now() - T.t0) / 1000;
    // she trails the ball: falls behind while it rolls, catches up by the next stop
    var lag = LAG + (st.rolling ? 2.6 * Math.sin(Math.PI * st.v) : 0);
    var cL = L - lag;
    catPos.copy(pointAt(cL));
    g.position.set(catPos.x, 0, catPos.z);
    catDir.subVectors(ballPos, catPos); catDir.y = 0;
    // face the ball, but turned a little toward the camera so you see her face (more so while she sits)
    var moving0 = st.rolling ? Math.sin(Math.PI * st.v) : 0;
    if (catDir.lengthSq() > 1e-4) {
      var face = Math.atan2(catDir.x, catDir.z);
      while (face > Math.PI) face -= 2 * Math.PI; while (face < -Math.PI) face += 2 * Math.PI;
      g.rotation.y = face * (.55 + .35 * moving0);
    }

    // trotting: legs swing with distance travelled, so faster scrolling = faster steps
    var moving = st.rolling ? Math.sin(Math.PI * st.v) : 0, ph = cL * 2.4;
    K.legs[0].rotation.x = .75 * moving * Math.sin(ph);
    K.legs[1].rotation.x = -.75 * moving * Math.sin(ph);
    K.legs[1].rotation.z = 0;
    K.feet.forEach(function(f, i){ f.position.z = .38 + .22 * moving * Math.sin(ph + (i ? 0 : Math.PI)); });
    g.position.y = Math.abs(Math.sin(ph)) * .12 * moving;
    K.body.rotation.x = .12 * moving;
    K.head.rotation.set(-.1 * moving, 0, 0);
    K.tail.forEach(function(sg, i){ sg.rotation.z = (moving ? .35 : .2) * Math.sin(t * (moving ? 5 : 2.2) - i * .55); });

    // the swipe at the start of every roll: paw up and forward, then down onto the ball
    if (st.rolling && st.u < SWAT + .03) {
      var s = Math.min(1, st.u / SWAT), paw = K.legs[1];
      paw.rotation.x = s < .55 ? -1.5 * (s / .55) : -1.5 + 1.5 * ((s - .55) / .45);
      paw.rotation.z = -.25 * Math.sin(Math.PI * s);
      K.head.rotation.x = .25 * Math.sin(Math.PI * s);
      K.body.rotation.x = -.08 * Math.sin(Math.PI * s);
    }
    // sitting at a stop: little blink now and then
    var blink = (t % 4.3) < .12 ? .12 : 1;
    K.eyes.forEach(function(e){ e.scale.y = blink; });
  }

  // keep drawing while the trail is on screen so she can breathe and swish her tail
  var trailOnScreen = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ trailOnScreen = es[0].isIntersecting; }).observe(trail);
  (function idle(){ if (trailOnScreen && mode === 'trail' && !document.hidden) frame(); requestAnimationFrame(idle); })();

  var ticking = false;
  function frame(){
    ticking = false;
    if (mode !== 'trail' || !T) return;
    var w = innerWidth, h = innerHeight, p = scrollP(), st = at(p), L = st.L, u = L / len;
    var pos = T.curve.getPointAt(u), tan = T.curve.getTangentAt(u);

    // roll: turn the ball about the axis across its direction of travel, by distance / radius
    var r = R0 * (1 - .45 * u), dL = L - T.lastL; T.lastL = L;
    if (dL) { T.v.crossVectors(T.up, tan).normalize(); T.q.setFromAxisAngle(T.v, dL / r); T.ball.quaternion.premultiply(T.q); }
    T.ball.position.set(pos.x, r, pos.z); T.ball.scale.setScalar(r / .45);
    T.tube.geometry.setDrawRange(0, Math.floor(u * SEGS) * 30);
    kittyPose(st, L, pos);

    // which stop are we at, and which side does its card go?
    var near = -1, nearC = 0;
    stops.forEach(function(s, i){ var c = Math.max(0, 1 - Math.abs(L - stopLen[i]) / (GAP * .42)); if (c > nearC) { nearC = c; near = i; } });
    var side = 1, dw = smooth(nearC);

    // tracking shot: the camera glides along behind the ball, easing back a little while it rolls
    var tf = st.travel, cam = T.camera;
    cam.position.set(pos.x - 1.2, 5.4 + 1.4 * tf, pos.z + 9.2 + 1.6 * tf);
    cam.lookAt(pos.x, 1.2, pos.z);
    // slide the frame sideways so the ball and its card sit together in the middle
    var fit = near < 0 ? 1 : Math.min(1, (h - 160) / cardH[near], (w - 120) / (cardW[near] + SIDE_GAP + 140));
    var shift = near < 0 ? 0 : side * dw * ((cardW[near] * fit + SIDE_GAP) / 2 - 150);
    cam.setViewOffset(w, h, shift, 0, w, h);
    T.sun.position.set(pos.x + 5, 9, pos.z + 6); T.sun.target.position.set(pos.x, 0, pos.z);
    T.renderer.render(T.scene, cam);

    // the cards glide in next to the ball
    var bp = T.ball.position.clone().project(cam), bx = (bp.x + 1) / 2 * w, current = -1;
    stops.forEach(function(s, i){
      var c = Math.max(0, 1 - Math.abs(L - stopLen[i]) / (GAP * .42));
      if (c <= 0) { s.style.visibility = 'hidden'; s.classList.remove('live'); return; }
      var e = smooth(c), sd = 1, f = Math.min(1, (h - 160) / cardH[i], (w - 120) / (cardW[i] + SIDE_GAP + 140));
      var cx = bx + sd * (SIDE_GAP + cardW[i] * f / 2) + sd * (1 - e) * 80, cy = h / 2 + 24 + (1 - e) * 30;
      s.style.visibility = 'visible';
      s.style.opacity = e.toFixed(3);
      s.style.transform = 'translate(' + (cx - cardW[i] / 2).toFixed(1) + 'px,' + (cy - cardH[i] / 2).toFixed(1) + 'px) scale(' + (f * (.9 + .1 * e)).toFixed(3) + ')';
      s.classList.toggle('live', c > .6);
      if (Math.abs(L - stopLen[i]) < 1) current = i;
    });

    progress.classList.toggle('on', p > 0 && p < 1);
    [].forEach.call(progress.children, function(b, i){ b.setAttribute('aria-current', i === current ? 'true' : 'false'); });
  }
  addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, {passive: true});
  addEventListener('resize', function(){ clearTimeout(layout.t); layout.t = setTimeout(layout, 150); });

  // stacked layout: cards tip up as they scroll into view
  function reveal(){
    if (mode !== 'stacked') return;
    stops.forEach(function(s){ if (reduce || s.getBoundingClientRect().top < innerHeight * .9) s.classList.add('in'); });
  }
  addEventListener('scroll', reveal, {passive: true});

  // ---------- going places ----------
  function stopY(i){
    if (mode !== 'trail') return stops[i].getBoundingClientRect().top + scrollY - 80;
    var g = segs[i * 2 + 1];
    return trail.offsetTop + (g.p0 + g.p1) / 2 * (trail.offsetHeight - innerHeight);
  }
  function scrollToY(y, instant){ window.scrollTo({top: y, behavior: instant || reduce ? 'auto' : 'smooth'}); }
  function goStop(i){ scrollToY(stopY(i)); }
  function target(name){
    if (name === 'top') return 0;
    if (name === 'contact') return document.getElementById('contact').offsetTop;
    return stopY(name === 'about' ? 0 : 1);
  }

  var scene = document.getElementById('scene'), batting = false;
  function bat(dest){
    if (batting) return;
    if (reduce || scrollY > innerHeight * .5) { scrollToY(target(dest)); return; }
    batting = true;
    scene.classList.add('batting');
    setTimeout(function(){ scene.classList.add('batted'); }, 230);
    setTimeout(function(){ scrollToY(target(dest)); batting = false; }, 850);
  }
  catEl.addEventListener('click', function(){ bat('projects'); });
  catEl.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bat('projects'); } });
  document.getElementById('ballwrap').addEventListener('click', function(){ bat('projects'); });
  var cat3d = document.getElementById('cat3d');
  cat3d.addEventListener('click', function(){ bat('projects'); });
  cat3d.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bat('projects'); } });
  document.querySelectorAll('[data-go]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var dest = a.dataset.go;
      if (a.classList.contains('tagbtn')) bat(dest); else scrollToY(target(dest));
      history.replaceState(null, '', dest === 'top' ? location.pathname : '#' + dest);
    });
  });
  // the ball comes back when you scroll up to the cat
  addEventListener('scroll', function(){ if (scrollY < 40 && !batting) scene.classList.remove('batting', 'batted'); }, {passive: true});

  layout();
  if (document.fonts) document.fonts.ready.then(layout);
  addEventListener('load', layout);
  // arriving from a project page (index.html#projects etc.) skips the intro
  var h = location.hash.slice(1);
  if (h === 'projects' || h === 'about' || h === 'contact') {
    scene.classList.add('batted');
    var jump = function(){ layout(); scrollToY(target(h), true); frame(); };
    requestAnimationFrame(jump);
    if (document.fonts) document.fonts.ready.then(jump);
  }
})();
