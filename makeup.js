// Nicole's makeup bag: a 3D vanity built with three.js.
// The bag (a clear train case) unzips, a strawberry hand mirror rises out with the intro on its glass,
// and each product opens to a section: contour palettes hold the projects, the eyeshadow palette the
// skills, the striped pouch "about me", the perfume the contact card.
// Without WebGL, on small screens or with reduced motion, the plain HTML cards are shown instead.
(function(){
  var root = document.documentElement, body = document.body;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- bits that work in both layouts ----------
  var roles = ['things i wish existed', 'things that make life easier'], typed = document.getElementById('typed');
  var typedText = roles[0];
  (function(){
    var ri = 0, ci = roles[0].length, del = false;
    function tick(){
      var word = roles[ri];
      if (!del) { ci++; if (ci > word.length) { del = true; return setTimeout(tick, 1600); } }
      else { ci--; if (ci < 0) { del = false; ri = (ri + 1) % roles.length; ci = 0; } }
      typedText = roles[ri].slice(0, Math.max(ci, 0)); typed.textContent = typedText;
      setTimeout(tick, del ? 45 : 90);
    }
    if (!reduce) setTimeout(tick, 1600);
  })();
  var dlg = document.getElementById('resumeDlg');
  function openResume(){ dlg.showModal(); }
  document.querySelectorAll('.resume-btn').forEach(function(b){ b.addEventListener('click', openResume); });
  document.getElementById('resumeClose').addEventListener('click', function(){ dlg.close(); });
  dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });

  var probe = document.createElement('canvas');
  var webgl = !!window.THREE && !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  var use3D = webgl && !reduce;
  function isFlat(){ return !use3D || innerWidth < 900 || innerHeight < 560; }
  function applyMode(){ var f = isFlat(); root.classList.toggle('flat', f); root.classList.toggle('is3d', !f); return f; }
  applyMode();
  if (!use3D) {
    // plain layout: the nav just scrolls
    document.querySelectorAll('[data-go]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = {top: 'top', about: 'about', projects: 'projects', contact: 'contact'}[a.dataset.go];
        var el = document.getElementById(id); if (!el) return;
        e.preventDefault(); el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
      });
    });
    return;
  }

  // ---------- read the content from the HTML cards (one source of truth) ----------
  var DATA = {};
  [].forEach.call(document.querySelectorAll('#cards article'), function(a){
    var d = {el: a, kicker: (a.querySelector('.kicker') || {}).textContent || '', title: a.querySelector('h2,h3').textContent};
    var muted = a.querySelector('.muted'); d.desc = muted ? muted.textContent.trim() : '';
    d.paras = [].map.call(a.querySelectorAll(':scope > p'), function(p){ return p.textContent.trim(); });
    d.bullets = [].map.call(a.querySelectorAll('li'), function(li){ return li.textContent.trim(); });
    d.chips = [].map.call(a.querySelectorAll('.chips span'), function(s){ return s.textContent.trim(); });
    d.links = [].map.call(a.querySelectorAll('.row2 a, .row2 button'), function(x){
      return {text: x.textContent.replace('→', '').trim(), href: x.getAttribute('href'), ext: x.target === '_blank', resume: x.classList.contains('resume-btn')};
    });
    DATA[a.dataset.item] = d;
  });

  // ---------- three.js setup ----------
  var canvas = document.getElementById('bag3d'), vanity = document.querySelector('.vanity');
  var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  var maxAniso = renderer.capabilities.getMaxAnisotropy();
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 22, 48);
  var camera = new THREE.PerspectiveCamera(38, 1, .1, 200);

  function lin(c){ var col = new THREE.Color(c); return col.convertSRGBToLinear(); }
  function mat(c, o){ o = o || {}; return new THREE.MeshStandardMaterial({color: lin(c), flatShading: !!o.flat, roughness: o.rough != null ? o.rough : .6, metalness: o.metal || 0, envMapIntensity: o.env != null ? o.env : .45,
    transparent: !!o.opacity, opacity: o.opacity || 1, depthWrite: o.opacity ? false : true, side: o.side || THREE.FrontSide}); }
  function mesh(geo, m, x, y, z){ var me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; return me; }
  var M = {
    pink: mat(0xF4B6C4, {rough: .55}), pinkD: mat(0xE79AAB, {rough: .55}), clear: mat(0xFFFFFF, {opacity: .22, rough: .08, side: THREE.DoubleSide}),
    silver: mat(0xD9DCE3, {metal: .75, rough: .28}), rose: mat(0xE8C6B8, {metal: .55, rough: .3}), cream: mat(0xFFF8EE, {rough: .6}),
    berry: mat(0x7A1E2C, {rough: .5}), satin: mat(0x8E2337, {rough: .35}), red: mat(0xC92D42, {rough: .35}), leaf: mat(0x2F6B3A, {rough: .6}),
    beige: mat(0xE9CBB1, {rough: .55}), nude: mat(0xF1DCCB, {rough: .6}), glass: mat(0xFAD3DC, {opacity: .5, rough: .05, side: THREE.DoubleSide}),
    liquid: mat(0xF7A9BC, {opacity: .7, rough: .1}), gold: mat(0xD9B45A, {metal: .8, rough: .25}), seed: mat(0xFFE8A3, {rough: .4})
  };

  (function(){
    var env = new THREE.Scene(), sky = new THREE.SphereGeometry(20, 32, 16), cols = [];
    for (var i = 0; i < sky.attributes.position.count; i++) { var y = sky.attributes.position.getY(i) / 20, c = new THREE.Color(0xFFF4F1).lerp(new THREE.Color(0xC9A7A9), Math.max(0, -y)); cols.push(c.r, c.g, c.b); }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({side: THREE.BackSide, vertexColors: true})));
    [[0, 14, 4, 16, 8], [-14, 6, 6, 6, 10], [14, 7, -4, 6, 10]].forEach(function(b){   // soft boxes
      var box = new THREE.Mesh(new THREE.PlaneGeometry(b[3], b[4]), new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.DoubleSide}));
      box.position.set(b[0], b[1], b[2]); box.lookAt(0, 0, 0); env.add(box);
    });
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xFFFFFF, lin(0xB89A9A), .5));
  var sun = new THREE.DirectionalLight(0xFFFFFF, .62); sun.position.set(6, 12, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 40;
  scene.add(sun);

  // the vanity table top, fading into the page
  var tableMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .9});
  var table = new THREE.Mesh(new THREE.CircleGeometry(90, 48), tableMat);
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  function paint(){
    var cs = getComputedStyle(root);
    scene.fog.color.set(cs.getPropertyValue('--bg').trim() || '#FCF5F2');      // fog is mixed after the sRGB step in r128
    tableMat.color.copy(lin(cs.getPropertyValue('--table').trim() || '#F7EEEA'));
  }
  paint();
  new MutationObserver(paint).observe(root, {attributes: true, attributeFilter: ['data-theme']});

  // ---------- small geometry helpers ----------
  function rr(w, d, r){   // rounded rectangle in the XY plane, centred
    var s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w, d, r, h, bevel){   // rounded box lying flat, bottom at y = 0
    var bv = bevel != null ? bevel : Math.min(.03, h / 3);   // every edge gets a soft rounded bevel
    var g = new THREE.ExtrudeGeometry(rr(w - 2 * bv, d - 2 * bv, Math.max(.01, r - bv)), {depth: Math.max(.001, h - 2 * bv), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 4, curveSegments: 14});
    g.translate(0, 0, bv);
    g.rotateX(-Math.PI / 2); return g;
  }
  function ring(w, d, r, t, h){   // rounded-rectangle wall of thickness t
    var s = rr(w, d, r), hole = rr(w - 2 * t, d - 2 * t, Math.max(.01, r - t));
    s.holes.push(hole);
    var g = new THREE.ExtrudeGeometry(s, {depth: h, bevelEnabled: false, curveSegments: 14});
    g.rotateX(-Math.PI / 2); return g;
  }
  function planarUV(g, w, h){   // map a flat shape's x/y to 0..1 texture coordinates
    var p = g.attributes.position, uv = [];
    for (var i = 0; i < p.count; i++) uv.push(p.getX(i) / w + .5, p.getY(i) / h + .5);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
  }

  // ---------- text textures ----------
  var surfaces = [];   // meshes with clickable spots drawn on them
  function texture(w, h, draw){
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'), t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    var T = {tex: t, w: w, h: h, hot: [], redraw: function(){ ctx.clearRect(0, 0, w, h); T.hot = []; draw(ctx, w, h, T); t.needsUpdate = true; }};
    T.redraw(); return T;
  }
  function lines(ctx, text, maxW){
    var words = text.split(' '), out = [], line = '';
    words.forEach(function(wd){ var test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW && line) { out.push(line); line = wd; } else line = test; });
    if (line) out.push(line); return out;
  }
  function para(ctx, text, x, y, maxW, lh, align){
    ctx.textAlign = align || 'left';
    lines(ctx, text, maxW).forEach(function(l){ ctx.fillText(l, x, y); y += lh; });
    return y;
  }
  function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pill(ctx, T, label, cx, cy, fill, ink, action, font){
    ctx.font = font || '800 34px Nunito'; var w = ctx.measureText(label).width + 56, h = 64, x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = 'rgba(59,42,44,.9)'; roundRect(ctx, x, y + 5, w, h, 32); ctx.fill();
    ctx.fillStyle = fill; roundRect(ctx, x, y, w, h, 32); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#3B2A2C'; ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, cy + 1); ctx.textBaseline = 'alphabetic';
    T.hot.push({x: x, y: y, w: w, h: h + 5, action: action});
    return w;
  }
  function feather(ctx, x, y, w, h, color){   // the embossed feather pattern from the palette
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    var cx = x + w * .55, cy = y + h * .5;
    for (var i = -9; i <= 9; i++) {
      ctx.beginPath(); ctx.moveTo(cx - w * .32, cy + h * .38); ctx.quadraticCurveTo(cx + i * w * .02, cy, cx + i * w * .045 + w * .25, cy - h * .36 + Math.abs(i) * h * .012); ctx.stroke();
    }
    ctx.restore();
  }
  var photos = {};
  function photo(src){ if (!photos[src]) { var im = new Image(); im.src = src; photos[src] = im; im.onload = function(){ redrawAll(); }; } return photos[src]; }
  var allTex = [];
  function redrawAll(){ allTex.forEach(function(T){ T.redraw(); }); }

  // ---------- the bag: a clear train case with pink trim ----------
  function stripes(w, h, a, b, n){
    return texture(w, h, function(ctx){ for (var i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(i * w / n, 0, w / n + 1, h); } });
  }
  var stripeTex = stripes(256, 64, '#F7C3CF', '#FFF4F6', 8).tex;
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
  var stripeMat = new THREE.MeshStandardMaterial({map: stripeTex, roughness: .7});
  function stripedPouch(w, h, d){
    var g = new THREE.BoxGeometry(w, h, d, 14, 10, 10), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {   // puff it up a little
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .12 * (1 - Math.abs(y) / (h / 2));
      p.setX(i, x * (1 + .04 * (1 - Math.abs(y) / (h / 2)))); p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    var m = mesh(g, stripeMat); return m;
  }

  var BW = 3.8, BD = 2.5, BR = .35;
  var bag = new THREE.Group(); bag.position.set(0, 0, -2.6); scene.add(bag);
  bag.add(mesh(slab(BW, BD, BR, .16), M.pink));                       // base tray
  bag.add(mesh(ring(BW, BD, BR, .04, 1.45), M.clear, 0, .16, 0));       // clear lower walls
  var mid = mesh(slab(BW + .04, BD + .04, BR, .2), M.pink, 0, 1.6, 0); bag.add(mid);   // middle band
  bag.add(mesh(new THREE.BoxGeometry(BW - .7, .04, .03), M.silver, 0, 1.7, BD / 2 + .03));  // middle zipper
  var p1 = stripedPouch(1.55, 1.2, 1.9); p1.position.set(-.85, .78, .05); bag.add(p1);    // striped pouches inside
  var p2 = stripedPouch(1.55, 1.2, 1.9); p2.position.set(.85, .78, .05); bag.add(p2);
  // heart charm where the logo would be
  var charm = new THREE.Group(); charm.position.set(0, 1.55, BD / 2 + .08); bag.add(charm);
  charm.add(mesh(new THREE.BoxGeometry(.5, .32, .04), M.pinkD, 0, -.02, -.02));
  [-1, 1].forEach(function(s){ charm.add(mesh(new THREE.SphereGeometry(.075, 16, 12), M.silver, s * .055, 0, .03)); });
  var tip = mesh(new THREE.ConeGeometry(.1, .14, 4), M.silver, 0, -.08, .03); tip.rotation.z = Math.PI; charm.add(tip);

  // the lid: upper clear tier + pink top, hinged along the back of the middle band
  var lid = new THREE.Group(); lid.position.set(0, 1.8, -BD / 2); bag.add(lid);
  var lidInner = new THREE.Group(); lidInner.position.set(0, 0, BD / 2); lid.add(lidInner);
  lidInner.add(mesh(ring(BW, BD, BR, .04, .72), M.clear));
  lidInner.add(mesh(slab(BW + .04, BD + .04, BR, .18), M.pink, 0, .72, 0));
  var lining = mesh(new THREE.PlaneGeometry(BW - .3, BD - .3), stripeMat); lining.rotation.x = Math.PI / 2; lining.position.y = .7; lidInner.add(lining);
  lidInner.add(mesh(new THREE.BoxGeometry(BW - .7, .04, .03), M.silver, 0, .1, BD / 2 + .03));   // top zipper
  var puller = mesh(new THREE.BoxGeometry(.12, .2, .04), M.silver, -1.4, .02, BD / 2 + .06); lidInner.add(puller);
  var handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.1, .9, 0), new THREE.Vector3(-.8, 1.55, 0), new THREE.Vector3(.8, 1.55, 0), new THREE.Vector3(1.1, .9, 0)]), 24, .07, 6), M.pinkD);
  handle.castShadow = true; lidInner.add(handle);

  // ---------- the strawberry hand mirror ----------
  var ORX = 1.0, ORY = 1.25;
  function ellipse(rx, ry){ var s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0); return s; }
  var mirror = new THREE.Group(), mirrorInner = new THREE.Group(); mirror.add(mirrorInner);
  mirrorInner.position.y = 2.9;    // oval centre height when the mirror stands on its handle tip
  var ovalFrame = mesh(new THREE.ExtrudeGeometry(ellipse(ORX, ORY), {depth: .16, bevelEnabled: true, bevelThickness: .05, bevelSize: .06, bevelSegments: 5, curveSegments: 72}), M.rose, 0, 0, -.08);
  mirrorInner.add(ovalFrame);
  // front: the glass, showing the intro
  var mirrorTex = null, glass = null;
  // back: cream piping, strawberries, a burgundy panel and a silver cameo with a bow
  var back = new THREE.Group(); back.position.z = -.14; back.rotation.y = Math.PI; mirrorInner.add(back);
  var rimShape = ellipse(.98, 1.22); rimShape.holes.push(ellipse(.74, .95));
  back.add(mesh(new THREE.ShapeGeometry(rimShape, 30), M.cream));
  var panel = mesh(new THREE.ShapeGeometry(ellipse(.75, .96), 30), M.berry, 0, 0, -.005); back.add(panel);
  // a piped meringue swirl: a lathe with ridges that gets narrower toward the tip
  var SWIRL = (function(){ var pts = []; for (var k = 0; k <= 16; k++) { var t = k / 16; pts.push(new THREE.Vector2((.095 * (1 - t * .92)) * (1 + .12 * Math.sin(t * 22)), t * .15)); } return new THREE.LatheGeometry(pts, 14); })();
  for (var i = 0; i < 18; i++) {   // piped cream swirls
    var a = i / 18 * Math.PI * 2, sw = mesh(SWIRL, M.cream, Math.cos(a) * .87, Math.sin(a) * 1.09, .02);
    sw.rotation.x = Math.PI / 2; sw.rotation.y = i; back.add(sw);
  }
  for (var j = 0; j < 8; j++) {   // strawberries
    var b = (j + .5) / 8 * Math.PI * 2, berry = new THREE.Group(); berry.position.set(Math.cos(b) * .86, Math.sin(b) * 1.07, .08);
    berry.rotation.z = b + Math.PI / 2;
    var body2 = mesh(new THREE.SphereGeometry(.11, 18, 14), M.red); body2.scale.set(.9, 1.3, .8); berry.add(body2);
    for (var sd = 0; sd < 7; sd++) { var sa = sd / 7 * Math.PI * 2; berry.add(mesh(new THREE.SphereGeometry(.012, 6, 4), M.seed, Math.cos(sa) * .07, Math.sin(sd * 1.7) * .06, .075)); }
    for (var lf = 0; lf < 5; lf++) { var leaf = mesh(new THREE.ConeGeometry(.035, .1, 4), M.leaf, 0, .14, 0); leaf.rotation.z = Math.PI / 2 + lf / 5 * Math.PI * 2; leaf.position.x = Math.cos(lf / 5 * Math.PI * 2) * .04; leaf.position.y = .135 + Math.sin(lf / 5 * Math.PI * 2) * .02; berry.add(leaf); }
    back.add(berry);
  }
  var cameo = mesh(new THREE.ExtrudeGeometry(ellipse(.3, .38), {depth: .05, bevelEnabled: true, bevelThickness: .025, bevelSize: .03, bevelSegments: 4, curveSegments: 48}), M.silver, 0, -.03, 0);
  back.add(cameo);
  var face = mesh(new THREE.ShapeGeometry(ellipse(.22, .29), 20), mat(0xEDEFF4, {rough: .4}), 0, -.03, .085); back.add(face);
  function bow(m, s, x, y, z){
    var g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
    [-1, 1].forEach(function(k){
      var loop = mesh(new THREE.TorusGeometry(.22, .075, 12, 28), m, k * .22, 0, 0); loop.scale.set(1.15, .7, .6); loop.rotation.z = k * .25; g.add(loop);
      var tail = mesh(new THREE.BoxGeometry(.13, .5, .04), m, k * .14, -.32, 0); tail.rotation.z = k * .35; g.add(tail);
    });
    g.add(mesh(new THREE.SphereGeometry(.1, 16, 12), m)); return g;
  }
  back.add(bow(M.silver, .55, 0, .46, .06));
  mirrorInner.add(bow(M.satin, 1.3, 0, -ORY - .12, 0));   // the big satin bow at the neck
  var handleProfile = [[.0, 0], [.1, .05], [.13, .25], [.09, .55], [.11, .8], [.07, 1.15], [.1, 1.35], [.12, 1.48], [.0, 1.5]].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
  var mhandle = mesh(new THREE.LatheGeometry(handleProfile, 32), M.rose, 0, -ORY - 1.62, 0); mirrorInner.add(mhandle);

  function drawMirror(ctx, w, h, T){
    ctx.save();
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.clip();
    var gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#FFF9FB'); gr.addColorStop(.55, '#F7E7EC'); gr.addColorStop(1, '#EED6DD');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(w * .16, h * .22); ctx.lineTo(w * .3, h * .12); ctx.lineTo(w * .12, h * .5); ctx.closePath(); ctx.fill();   // a glint
    var im = photo('matcha.jpg');
    if (im.complete && im.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(w / 2, 245, 165, 0, Math.PI * 2); ctx.clip();
      var s = Math.max(330 / im.naturalWidth, 330 / im.naturalHeight);
      ctx.drawImage(im, w / 2 - im.naturalWidth * s / 2, 245 - im.naturalHeight * s / 2 - 20, im.naturalWidth * s, im.naturalHeight * s); ctx.restore();
    }
    ctx.lineWidth = 8; ctx.strokeStyle = '#E8C6B8'; ctx.beginPath(); ctx.arc(w / 2, 245, 168, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7B6466'; ctx.font = '800 26px Nunito'; ctx.textAlign = 'center';
    ctx.fillText('UBC COMPUTER SCIENCE · VANCOUVER', w / 2, 482);
    ctx.fillStyle = '#3B2A2C'; ctx.font = '700 92px Fraunces'; ctx.fillText('hi, i’m ', w / 2 - 120, 580);
    ctx.fillStyle = '#C9577A'; ctx.font = 'italic 700 92px Fraunces'; ctx.textAlign = 'left'; ctx.fillText('Nicole', w / 2 + 25, 580);
    ctx.fillStyle = '#7B6466'; ctx.font = '600 38px Nunito'; ctx.textAlign = 'center';
    ctx.fillText('i make ' + typedText + (Math.floor(performance.now() / 400) % 2 ? '|' : ' '), w / 2, 650);
    ctx.fillStyle = '#3B2A2C'; ctx.font = '400 29px Nunito';
    para(ctx, 'Computer science student at the University of British Columbia who likes shipping small, polished apps for real life. An all-in-one iOS planner, search algorithms written from scratch in C++, and a privacy-first period tracker so far.', w / 2, 730, 700, 44, 'center');
    ctx.fillStyle = '#C9577A'; ctx.font = 'italic 600 36px Fraunces'; ctx.fillText('✦  looking for a summer 2027 internship  ✦', w / 2, 1040);
    ctx.restore();
  }

  // ---------- products ----------
  function surface(geo, T, extra){   // a flat mesh showing a canvas texture, with clickable spots
    var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: T.tex, transparent: true}));
    m.userData.T = T; surfaces.push(m); allTex.push(T); if (extra) extra(m); return m;
  }
  function flatPlane(w, h){ var g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); return g; }
  function hingeLid(lidMesh, depth, y){ var hinge = new THREE.Group(); hinge.position.set(0, y, -depth / 2); lidMesh.position.z += depth / 2; hinge.add(lidMesh); return hinge; }

  // square contour palette: the lid carries the project name, the pans hold the details
  var LIDS = [['#B98A62', '#EBD1AE'], ['#C48C82', '#F1D6CB'], ['#9C7A5D', '#DEC6A6'], ['#B27E72', '#EDCBBE'], ['#A68767', '#E7D2B5']];
  function contourPalette(key, n){
    var d = DATA[key], g = new THREE.Group(), S = 2.0;
    g.add(mesh(slab(S, S, .24, .2, .02), M.nude));
    g.add(mesh(slab(S - .14, S - .14, .18, .02), mat(0xF8EFE8), 0, .2, 0));
    var pans = [
      {x: -.47, z: -.45, w: .78, h: .8, bg: '#F3E6D6', ink: '#3B2A2C', kind: 'title'},
      {x: .42, z: -.45, w: .88, h: .8, bg: '#8A6650', ink: '#FFF4EA', kind: 'desc'},
      {x: -.47, z: .43, w: .78, h: .8, bg: '#EBC6BF', ink: '#3B2A2C', kind: 'links'},
      {x: .42, z: .43, w: .88, h: .8, bg: '#5C4538', ink: '#FFF4EA', kind: 'tech'}
    ];
    pans.forEach(function(pn){
      var W = 1024, H = Math.round(1024 * pn.h / pn.w);
      var T = texture(W, H, function(ctx, w, h, T){
        ctx.fillStyle = pn.bg; roundRect(ctx, 6, 6, w - 12, h - 12, 46); ctx.fill();
        feather(ctx, 0, 0, w, h, pn.kind === 'tech' || pn.kind === 'desc' ? 'rgba(255,255,255,.07)' : 'rgba(59,42,44,.06)');
        ctx.lineWidth = 10; ctx.strokeStyle = '#D9A68C'; roundRect(ctx, 6, 6, w - 12, h - 12, 46); ctx.stroke();
        ctx.fillStyle = pn.ink;
        if (pn.kind === 'title') {
          ctx.font = '800 34px Nunito'; ctx.textAlign = 'left'; ctx.globalAlpha = .7;
          ctx.fillText('PROJECT 0' + n, 70, 120); ctx.globalAlpha = 1;
          ctx.font = '700 ' + (d.title.length > 14 ? 96 : 120) + 'px Fraunces';
          para(ctx, d.title, 70, 260, w - 140, d.title.length > 14 ? 104 : 128);
          ctx.font = 'italic 600 34px Fraunces'; ctx.globalAlpha = .6; ctx.fillText('open the next pans →', 70, h - 80); ctx.globalAlpha = 1;
        } else if (pn.kind === 'desc') {
          ctx.font = '800 32px Nunito'; ctx.globalAlpha = .7; ctx.textAlign = 'left'; ctx.fillText('WHAT IT IS', 64, 108); ctx.globalAlpha = 1;
          ctx.font = '500 ' + (d.desc.length > 230 ? 44 : 50) + 'px Nunito';
          para(ctx, d.desc, 64, 180, w - 128, d.desc.length > 230 ? 60 : 68);
        } else if (pn.kind === 'tech') {
          ctx.font = '800 32px Nunito'; ctx.globalAlpha = .7; ctx.textAlign = 'left'; ctx.fillText('MADE WITH', 64, 108); ctx.globalAlpha = 1;
          var x = 64, y = 200; ctx.font = '800 46px Nunito';
          d.chips.forEach(function(c){
            var cw = ctx.measureText(c).width + 56; if (x + cw > w - 64) { x = 64; y += 96; }
            ctx.fillStyle = 'rgba(255,244,234,.16)'; roundRect(ctx, x, y - 52, cw, 74, 37); ctx.fill();
            ctx.strokeStyle = 'rgba(255,244,234,.6)'; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#FFF4EA'; ctx.textAlign = 'left'; ctx.fillText(c, x + 28, y); x += cw + 18;
          });
        } else {
          ctx.font = '800 32px Nunito'; ctx.globalAlpha = .7; ctx.textAlign = 'left'; ctx.fillText('TAKE A LOOK', 64, 108); ctx.globalAlpha = 1;
          d.links.forEach(function(l, i){
            pill(ctx, T, l.text + (i ? '' : ' →'), w / 2, 250 + i * 120, i ? '#FFFFFF' : '#F4AFC0', '#3B1A24', {href: l.href, ext: l.ext}, '800 46px Nunito');
          });
        }
      });
      g.add(mesh(slab(pn.w + .05, pn.h + .05, .07, .02), M.rose, pn.x, .21, pn.z));
      var s = surface(flatPlane(pn.w, pn.h), T); s.position.set(pn.x, .235, pn.z); g.add(s);
    });
    // clear tinted lid with the project's name
    var tint = LIDS[(n - 1) % LIDS.length];
    var lidT = texture(1024, 1024, function(ctx, w, h){
      var gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, tint[0]); gr.addColorStop(.6, tint[1]); gr.addColorStop(1, tint[0]);
      ctx.fillStyle = gr; roundRect(ctx, 0, 0, w, h, 120); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(0, h * .7); ctx.lineTo(w * .7, 0); ctx.lineTo(w * .85, 0); ctx.lineTo(0, h * .85); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,244,.92)'; ctx.font = '600 58px Nunito'; ctx.textAlign = 'center';
      var spaced = d.title.toUpperCase().split('').join(' '); ctx.fillText(spaced, w / 2, h / 2 + 20);
      ctx.font = 'italic 600 34px Fraunces'; ctx.fillText('n · l', w / 2, h / 2 + 90);
    });
    allTex.push(lidT);
    var lidG = new THREE.Group();
    lidG.add(mesh(slab(S, S, .24, .07), mat(0xF3E3D4, {opacity: .35, rough: .1})));
    var top = new THREE.Mesh(flatPlane(S - .02, S - .02), new THREE.MeshBasicMaterial({map: lidT.tex, transparent: true, opacity: .93})); top.position.y = .075; lidG.add(top);
    var hinge = hingeLid(lidG, S, .22); g.add(hinge);
    return {group: g, open: function(o){ hinge.rotation.x = -o * 1.85; },
            focus: {cam: [0, 3.55, 1.0], look: [0, .1, -.08]}};
  }

  // the 10-pan eyeshadow palette: one shade per skill
  function skillPalette(){
    var g = new THREE.Group(), W = 2.9, D = 1.4, skills = ['C++', 'Swift · SwiftUI', 'Java', 'Python', 'JavaScript · HTML/CSS', 'Git / GitHub', 'Xcode · VS Code', 'A* · Minimax', 'data structures · OOP', 'APIs · SDL2/CMake'];
    var shades = ['#F4DCCB', '#EDC9B4', '#E7BBA4', '#DDAA92', '#C98F78', '#F1D2C7', '#E3B5A6', '#D49E8E', '#B88070', '#8E5F52'];
    g.add(mesh(slab(W, D, .12, .18, .015), M.beige));
    skills.forEach(function(sk, i){
      var col = i % 5, row = Math.floor(i / 5), x = -1.12 + col * .56, z = -.3 + row * .62;
      var T = texture(512, 560, function(ctx, w, h){
        ctx.fillStyle = shades[i]; roundRect(ctx, 6, 6, w - 12, h - 12, 40); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; roundRect(ctx, 6, 6, w - 12, h - 12, 40); ctx.stroke();
        ctx.fillStyle = i % 5 > 3 || i === 9 ? '#FFF4EA' : '#3B2A2C'; ctx.font = '800 ' + (sk.length > 14 ? 54 : 70) + 'px Nunito';
        var parts = sk.split(' · '), y = h / 2 - (parts.length - 1) * 40 + 20;
        parts.forEach(function(p){ ctx.textAlign = 'center'; lines(ctx, p, w - 60).forEach(function(l){ ctx.fillText(l, w / 2, y); y += 78; }); });
      });
      var s = surface(flatPlane(.5, .55), T); s.position.set(x, .225, z); g.add(s);
    });
    var lidT = texture(1024, 500, function(ctx, w, h){
      ctx.fillStyle = '#E9CBB1'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '600 150px Nunito'; ctx.textAlign = 'center'; ctx.fillText('nicole', w / 2, h / 2 + 40);
      ctx.font = '800 34px Nunito'; ctx.fillText('S K I L L S', w / 2, h / 2 + 110);
    });
    allTex.push(lidT);
    var lidG = new THREE.Group(); lidG.add(mesh(slab(W, D, .12, .08), M.beige));
    var top = new THREE.Mesh(flatPlane(W - .04, D - .04), new THREE.MeshBasicMaterial({map: lidT.tex})); top.position.y = .085; lidG.add(top);
    var hinge = hingeLid(lidG, D, .19); g.add(hinge);
    return {group: g, open: function(o){ hinge.rotation.x = -o * 1.9; }, focus: {cam: [0, 3.3, 1.0], look: [0, .1, -.02]}};
  }

  // the striped pouch: unzips, and a note card and two polaroids pop out
  function aboutPouch(){
    var d = DATA.about, g = new THREE.Group();
    var pouch = stripedPouch(1.9, 1.1, 1.05); pouch.position.y = .55; g.add(pouch);
    g.add(mesh(new THREE.BoxGeometry(1.6, .04, .05), M.silver, 0, 1.12, 0));
    var pull = mesh(new THREE.BoxGeometry(.1, .22, .04), M.silver, -.8, 1.05, .06); g.add(pull);
    var noteT = texture(1024, 1300, function(ctx, w, h){
      ctx.fillStyle = '#FFFDF8'; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
      ctx.fillStyle = 'rgba(244,175,192,.75)'; ctx.save(); ctx.translate(w / 2, 26); ctx.rotate(-.04); ctx.fillRect(-120, -26, 240, 58); ctx.restore();
      ctx.fillStyle = '#7B6466'; ctx.font = '800 28px Nunito'; ctx.textAlign = 'left'; ctx.fillText('THE POUCH · ABOUT', 70, 130);
      ctx.fillStyle = '#3B2A2C'; ctx.font = '700 76px Fraunces'; ctx.fillText(d.title, 70, 220);
      ctx.font = '400 33px Nunito'; var y = para(ctx, d.paras[0], 70, 290, w - 140, 46) + 20;
      d.bullets.forEach(function(b){
        ctx.fillStyle = '#C9577A'; ctx.font = '800 30px Nunito'; ctx.textAlign = 'left'; ctx.fillText('✦', 70, y);
        ctx.fillStyle = '#3B2A2C'; ctx.font = '400 31px Nunito'; y = para(ctx, b, 112, y, w - 182, 43) + 12;
      });
    });
    var note = surface(new THREE.PlaneGeometry(2.0, 2.54), noteT); g.add(note);
    function polaroid(src, caption){
      var T = texture(512, 610, function(ctx, w, h){
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
        var im = photo(src);
        if (im.complete && im.naturalWidth) { var s = Math.max(452 / im.naturalWidth, 452 / im.naturalHeight); ctx.save(); ctx.beginPath(); ctx.rect(30, 30, 452, 452); ctx.clip(); ctx.drawImage(im, 256 - im.naturalWidth * s / 2, 256 - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); ctx.restore(); }
        ctx.fillStyle = '#7B6466'; ctx.font = 'italic 600 44px Fraunces'; ctx.textAlign = 'center'; ctx.fillText(caption, w / 2, 560);
      });
      return surface(new THREE.PlaneGeometry(.95, 1.13), T);
    }
    var pA = polaroid('arena.jpg', 'concert night'), pB = polaroid('matcha.jpg', 'matcha break'); g.add(pA); g.add(pB);
    var contents = [note, pA, pB];
    return {group: g, open: function(o){
      pull.position.x = -.8 + 1.6 * Math.min(1, o * 2.2);
      var e = Math.max(0, Math.min(1, (o - .35) / .65)), k = e * e * (3 - 2 * e);
      contents.forEach(function(c){ c.visible = e > 0; });
      note.position.set(0, .9 + k * 1.75, .1); note.scale.setScalar(.3 + .7 * k);
      pA.position.set(-1.35 * k, .9 + k * 1.35, .25); pA.rotation.z = .14 * k; pA.scale.setScalar(.3 + .7 * k);
      pB.position.set(1.35 * k, .9 + k * 1.15, .25); pB.rotation.z = -.12 * k; pB.scale.setScalar(.3 + .7 * k);
      if (k > 0) { pA.position.x -= .25 * k; pB.position.x += .25 * k; }
    }, focus: {cam: [0, 2.6, 6.0], look: [0, 2.15, 0]}};
  }

  // the perfume: a spritz, and the contact card appears
  var mist = [];
  function perfume(){
    var d = DATA.contact, g = new THREE.Group();
    var bottle = mesh(new THREE.CylinderGeometry(.42, .48, 1.0, 6), M.glass, 0, .5, 0); g.add(bottle);
    g.add(mesh(new THREE.CylinderGeometry(.34, .4, .72, 6), M.liquid, 0, .42, 0));
    g.add(mesh(new THREE.CylinderGeometry(.12, .14, .16, 8), M.gold, 0, 1.08, 0));
    var cap = mesh(new THREE.IcosahedronGeometry(.25, 0), mat(0xF7C9D4, {rough: .1, metal: .2}), 0, 1.36, 0); g.add(cap);
    g.add(bow(M.satin, .45, 0, 1.0, .32));
    var T = texture(1200, 800, function(ctx, w, h, T){
      ctx.fillStyle = '#FFFDF8'; roundRect(ctx, 0, 0, w, h, 44); ctx.fill();
      ctx.strokeStyle = '#F4AFC0'; ctx.lineWidth = 10; roundRect(ctx, 20, 20, w - 40, h - 40, 30); ctx.stroke();
      ctx.fillStyle = '#7B6466'; ctx.font = '800 28px Nunito'; ctx.textAlign = 'center'; ctx.fillText('THE PERFUME · SAY HI', w / 2, 110);
      ctx.fillStyle = '#3B2A2C'; ctx.font = '700 72px Fraunces'; ctx.fillText('let’s build something cute 🌱', w / 2, 200);
      ctx.fillStyle = '#7B6466'; ctx.font = '400 34px Nunito';
      para(ctx, 'Open to internships, collabs, and chatting about apps. nicole.li.2025@gmail.com, or nli28@student.ubc.ca for anything UBC.', w / 2, 270, w - 220, 48, 'center');
      pill(ctx, T, 'email me', w / 2 - 330, 560, '#F4AFC0', '#3B1A24', {href: 'mailto:nicole.li.2025@gmail.com'}, '800 40px Nunito');
      pill(ctx, T, 'github', w / 2 - 95, 560, '#FFFFFF', '#3B2A2C', {href: 'https://github.com/nicole-li7', ext: true}, '800 40px Nunito');
      pill(ctx, T, 'linkedin', w / 2 + 125, 560, '#FFFFFF', '#3B2A2C', {href: 'https://www.linkedin.com/in/nicole-l-445ab8330', ext: true}, '800 40px Nunito');
      pill(ctx, T, 'resume', w / 2 + 345, 560, '#FFFFFF', '#3B2A2C', {resume: true}, '800 40px Nunito');
      pill(ctx, T, 'nicole.li.2025@gmail.com', w / 2, 680, '#FBE1E8', '#3B2A2C', {href: 'mailto:nicole.li.2025@gmail.com'}, '600 32px Nunito');
    });
    var card = surface(new THREE.PlaneGeometry(2.7, 1.8), T); g.add(card);
    var mm = new THREE.MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: .7, depthWrite: false});
    for (var i = 0; i < 26; i++) { var p = new THREE.Mesh(new THREE.IcosahedronGeometry(.035, 0), mm.clone()); p.visible = false; p.userData.life = 0; g.add(p); mist.push(p); }
    var spraying = 0;
    return {group: g, open: function(o, dt){
      cap.position.y = 1.36 - .06 * Math.sin(Math.min(1, o * 3) * Math.PI);
      var e = Math.max(0, Math.min(1, (o - .3) / .7)), k = e * e * (3 - 2 * e);
      card.visible = e > 0; card.position.set(0, 1.0 + k * 1.55, -.35); card.scale.setScalar(.25 + .75 * k);
      if (o > .05 && o < .6) spraying = .5;
      spraying -= dt || 0;
      mist.forEach(function(p){
        if (!p.visible && spraying > 0 && Math.random() < .5) { p.visible = true; p.userData.life = 1; p.position.set(.1, 1.38, .2); p.userData.v = new THREE.Vector3(.6 + Math.random() * .8, .3 + Math.random() * .5, .3 + Math.random() * .6); }
        if (p.visible) { p.userData.life -= (dt || .016) * 1.1; p.position.addScaledVector(p.userData.v, dt || .016); p.material.opacity = Math.max(0, p.userData.life) * .7; p.scale.setScalar(1 + (1 - p.userData.life) * 2); if (p.userData.life <= 0) p.visible = false; }
      });
    }, focus: {cam: [0, 2.4, 5.4], look: [0, 1.8, 0]}};
  }

  // ---------- products that write, smear, paint and pat onto a card ----------
  var CW = 3.6, CD = 2.5, TW = 1600, TH = Math.round(1600 * CD / CW), CARD_Z = CD / 2 + .65;
  function roundedBox(w, h, d, r){
    var g = new THREE.BoxGeometry(w, h, d, 10, 10, 10), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    var ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)));
      v.sub(c); if (v.lengthSq() > 0) v.normalize().multiplyScalar(r); v.add(c); p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  }
  function lathe(profile, seg){ return new THREE.LatheGeometry(profile.map(function(q){ return new THREE.Vector2(q[0], q[1]); }), seg || 40); }
  function swatchCard(draw){
    var g = new THREE.Group();
    g.add(mesh(slab(CW + .14, CD + .14, .16, .05), M.cream));
    var T = texture(TW, TH, draw), s = surface(flatPlane(CW, CD), T); s.position.y = .057; g.add(s);
    g.position.z = CARD_Z; g.visible = false; return {group: g, T: T};
  }
  function onCard(px, py){ return new THREE.Vector3((px / TW - .5) * CW, .06, (py / TH - .5) * CD + CARD_Z); }
  function seg(o, a, b){ return Math.max(0, Math.min(1, (o - a) / (b - a))); }
  function smoothstep(x){ return x * x * (3 - 2 * x); }
  function paper(ctx, w, h){
    ctx.fillStyle = '#FFFBF6'; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.strokeStyle = 'rgba(217,166,140,.45)'; ctx.lineWidth = 6; roundRect(ctx, 22, 22, w - 44, h - 44, 26); ctx.stroke();
  }
  function placeTool(tool, rot, tipLocal, target){   // move a tilted tool so its tip lands on target
    tool.rotation.copy(rot);
    var off = tipLocal.clone().applyEuler(rot);
    tool.position.copy(target).sub(off);
  }
  function linkSpots(ctx, T, d, y, style){   // the links, drawn as little pills you can click
    var x = 110;
    d.links.forEach(function(l, i){
      ctx.font = '800 40px Nunito'; var label = l.text + (i ? '' : ' →'), w = ctx.measureText(label).width + 52;
      if (style) style(ctx, x, y, w, i); else { ctx.fillStyle = i ? '#FFFFFF' : '#F4AFC0'; roundRect(ctx, x, y - 44, w, 64, 32); ctx.fill(); ctx.strokeStyle = '#3B2A2C'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#3B2A2C'; ctx.textAlign = 'left'; ctx.fillText(label, x + 26, y);
      T.hot.push({x: x, y: y - 44, w: w, h: 64, action: {href: l.href, ext: l.ext}});
      x += w + 22;
    });
  }

  // the lipstick uncaps itself and writes the project out by hand
  function lipstick(key){
    var d = DATA[key], g = new THREE.Group(), ink = '#B23A5C';
    var stick = new THREE.Group(); g.add(stick);
    stick.add(mesh(new THREE.CylinderGeometry(.21, .21, .5, 48), M.rose, 0, .25, 0));
    [.06, .44].forEach(function(y){ var r2 = mesh(new THREE.TorusGeometry(.212, .01, 8, 48), M.gold, 0, y, 0); r2.rotation.x = Math.PI / 2; stick.add(r2); });
    stick.add(mesh(new THREE.CylinderGeometry(.168, .168, .2, 48), M.gold, 0, .6, 0));
    var bullet = new THREE.Group(); bullet.position.y = .55; stick.add(bullet);
    var bg = new THREE.CylinderGeometry(.13, .13, .42, 40, 8), bp = bg.attributes.position;
    for (var i = 0; i < bp.count; i++) { var y = bp.getY(i); if (y > .06) bp.setY(i, y - (bp.getX(i) + .13) * .62 * ((y - .06) / .15)); }   // the slanted tip
    bg.translate(0, .21, 0); bg.computeVertexNormals();
    bullet.add(mesh(bg, mat(0xB23A5C, {rough: .3, env: .6})));
    var capG = new THREE.Group(); g.add(capG);
    capG.add(mesh(new THREE.CylinderGeometry(.215, .215, .66, 48), M.rose, 0, .33, 0));
    var band = mesh(new THREE.TorusGeometry(.216, .018, 8, 48), mat(0xF4AFC0, {rough: .4}), 0, .05, 0); band.rotation.x = Math.PI / 2; capG.add(band);
    var card = swatchCard(function(ctx, w, h, T){
      paper(ctx, w, h);
      var p = card ? card.p || 0 : 0;
      ctx.fillStyle = ink; ctx.shadowColor = 'rgba(178,58,92,.35)'; ctx.shadowBlur = 3;
      // lay out every line first, then write as many characters as the progress allows
      var runs = [];
      ctx.font = '700 150px Caveat'; runs.push({t: d.title, x: 110, y: 205, f: '700 150px Caveat'});
      ctx.font = '600 58px Caveat'; lines(ctx, d.desc, w - 220).forEach(function(l, i){ runs.push({t: l, x: 110, y: 320 + i * 66, f: '600 58px Caveat'}); });
      var ly = 320 + lines(ctx, d.desc, w - 220).length * 66 + 50;
      runs.push({t: 'made with: ' + d.chips.join(' · '), x: 110, y: ly, f: '600 54px Caveat'});
      var total = runs.reduce(function(s2, r){ return s2 + r.t.length; }, 0), left = Math.floor(p * total), tip = null;
      runs.forEach(function(r){
        if (left <= 0) return;
        var part = r.t.slice(0, left); left -= r.t.length;
        ctx.font = r.f; ctx.textAlign = 'left'; ctx.fillText(part, r.x, r.y);
        tip = {x: r.x + ctx.measureText(part).width, y: r.y - 14};
      });
      ctx.shadowBlur = 0;
      if (p >= .999) {
        linkSpots(ctx, T, d, ly + 120, function(ctx2, x, y, w2){ ctx2.strokeStyle = ink; ctx2.lineWidth = 5; ctx2.beginPath(); ctx2.ellipse(x + w2 / 2, y - 14, w2 / 2 + 6, 46, -.03, 0, Math.PI * 2); ctx2.stroke(); });
        ctx.font = '700 70px Caveat'; ctx.fillStyle = ink; ctx.fillText('♡', w - 190, h - 90);
      }
      if (card) card.tip = tip || {x: 110, y: 190};
    });
    g.add(card.group);
    var idleRot = new THREE.Euler(0, 0, 0), writeRot = new THREE.Euler(-.5, 0, .55), tip = new THREE.Vector3(-.11, 0, 0), last = -1;
    return {group: g, dur: 7, open: function(o){
      var show = smoothstep(seg(o, 0, .1)); card.group.visible = show > 0; card.group.scale.setScalar(.3 + .7 * show);
      // cap off and laid down at the corner of the card
      var c = smoothstep(seg(o, .04, .14));
      capG.position.set(c * 1.45, .5 + Math.sin(c * Math.PI) * .8 + c * (-.5 + .27), c * -.85); capG.rotation.z = c * Math.PI / 2;
      // twist the bullet up
      var tw = smoothstep(seg(o, .12, .2)); bullet.position.y = .55 + tw * .26; bullet.rotation.y = tw * 4;
      tip.y = bullet.position.y + .42;
      var wr = seg(o, .24, .96);
      if (Math.abs(wr - last) > .002 || wr === 0 || wr === 1) { card.p = wr; card.T.redraw(); last = wr; }
      var mv = smoothstep(seg(o, .18, .24));
      if (mv <= 0) { stick.rotation.copy(idleRot); stick.position.set(0, 0, 0); return; }
      var target = onCard(card.tip.x, card.tip.y), wob = Math.sin(o * 220) * .015;
      target.x += wob; target.y += .01 + (o > .96 ? (o - .96) * 8 : 0);
      var rot = new THREE.Euler(writeRot.x * mv, 0, writeRot.z * mv);
      var pos = new THREE.Vector3(); placeTool(stick, rot, tip, target); pos.copy(stick.position);
      stick.position.lerpVectors(new THREE.Vector3(0, 0, 0), pos, mv);
    }, focus: {cam: [0, 5.3, 1.6 + CARD_Z], look: [0, .2, CARD_Z + .22]}};
  }

  // the liquid blush dots onto the card, then smears out, and the words show up in the smear
  function liquidBlush(key){
    var d = DATA[key], g = new THREE.Group();
    g.add(mesh(roundedBox(.52, .78, .34, .1), M.glass, 0, .39, 0));
    g.add(mesh(roundedBox(.42, .6, .25, .08), mat(0xE46F82, {rough: .25}), 0, .34, 0));
    var capG = new THREE.Group(); capG.position.y = .78; g.add(capG);
    capG.add(mesh(new THREE.CylinderGeometry(.12, .13, .62, 40), M.rose, 0, .31, 0));
    capG.add(mesh(new THREE.CylinderGeometry(.022, .022, .55, 12), M.cream, 0, -.27, 0));
    var foot = mesh(new THREE.SphereGeometry(.1, 20, 14), mat(0xE46F82, {rough: .3}), 0, -.6, 0); foot.scale.set(.85, 1.5, .45); capG.add(foot);
    var DOTS = [[420, 560], [800, 520], [1180, 580]];
    function smearPath(t){ return {x: 260 + t * 1080, y: 560 + Math.sin(t * 5) * 60}; }
    var card = swatchCard(function(ctx, w, h, T){
      paper(ctx, w, h);
      var p = card ? card.p || 0 : 0, dots = seg(p, 0, .33), sm = seg(p, .33, .75), tx = seg(p, .68, 1);
      // the smear: lots of soft blobs laid along the path as far as the wand has dragged
      ctx.save();
      for (var k = 0; k <= 80 * sm; k++) {
        var q = smearPath(k / 80), r = 250 + Math.sin(k * .7) * 30;
        var gr = ctx.createRadialGradient(q.x, q.y, 10, q.x, q.y, r); gr.addColorStop(0, 'rgba(232,112,132,.22)'); gr.addColorStop(1, 'rgba(232,112,132,0)');
        ctx.fillStyle = gr; ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
      }
      DOTS.forEach(function(dt2, i){
        var a = seg(dots, i / 3, (i + .6) / 3); if (!a) return;
        var r = 70 * a * (1 - sm * .6);
        ctx.fillStyle = 'rgba(228,96,120,' + (.95 - sm * .5) + ')'; ctx.beginPath(); ctx.ellipse(dt2[0], dt2[1], r, r * .85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(dt2[0] - r * .3, dt2[1] - r * .3, r * .25, r * .15, -.5, 0, Math.PI * 2); ctx.fill();
      });
      if (sm > 0) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 10; for (var s3 = -3; s3 <= 3; s3++) { ctx.beginPath(); for (var k2 = 0; k2 <= 40 * sm; k2++) { var q2 = smearPath(k2 / 40); k2 ? ctx.lineTo(q2.x, q2.y + s3 * 55) : ctx.moveTo(q2.x, q2.y + s3 * 55); } ctx.stroke(); } }
      ctx.restore();
      if (tx > 0) {
        ctx.globalAlpha = tx;
        ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(140,40,60,.35)'; ctx.shadowBlur = 12;
        ctx.font = 'italic 700 120px Fraunces'; ctx.textAlign = 'center'; ctx.fillText(d.title, w / 2, 300);
        ctx.shadowBlur = 0; ctx.fillStyle = '#5A2230'; ctx.font = '600 44px Nunito';
        var y = para(ctx, d.desc, w / 2, 410, w - 360, 58, 'center');
        ctx.font = '800 36px Nunito'; ctx.fillStyle = '#8E2337'; ctx.fillText(d.chips.join('  ·  ').toUpperCase(), w / 2, y + 40);
        ctx.globalAlpha = 1;
        if (tx >= .999) linkSpots(ctx, T, d, h - 110);
      }
      var tipAt = p < .33 ? DOTS[Math.min(2, Math.floor(dots * 3))] : null;
      if (card) card.tip = tipAt ? {x: tipAt[0], y: tipAt[1], down: (dots * 3) % 1 > .35} : (sm < 1 ? (function(){ var q = smearPath(sm); return {x: q.x, y: q.y, down: true}; })() : {x: 1340, y: 560, down: false});
    });
    g.add(card.group);
    var tipL = new THREE.Vector3(0, -.75, 0), rot = new THREE.Euler(-.45, 0, -.35), last = -1;
    return {group: g, dur: 6.5, open: function(o){
      var show = smoothstep(seg(o, 0, .1)); card.group.visible = show > 0; card.group.scale.setScalar(.3 + .7 * show);
      var pr = seg(o, .2, .97);
      if (Math.abs(pr - last) > .002 || pr === 0 || pr === 1) { card.p = pr; card.T.redraw(); last = pr; }
      var up = smoothstep(seg(o, .06, .2));
      if (up <= 0) { capG.position.set(0, .78, 0); capG.rotation.set(0, 0, 0); return; }
      var target = onCard(card.tip.x, card.tip.y); target.y += card.tip.down ? .02 : .35;
      var held = new THREE.Vector3(); var r2 = new THREE.Euler(rot.x * up, 0, rot.z * up);
      placeTool(capG, r2, tipL, target); held.copy(capG.position);
      capG.position.lerpVectors(new THREE.Vector3(0, .78 + up * .9, 0), held, smoothstep(seg(o, .12, .2)));
    }, focus: {cam: [0, 5.3, 1.6 + CARD_Z], look: [0, .2, CARD_Z + .22]}};
  }

  // the nail polish paints glossy strokes, and the text appears in the polish
  function nailPolish(key){
    var d = DATA[key], g = new THREE.Group(), polish = '#9B3F66';
    g.add(mesh(lathe([[0, 0], [.34, 0], [.42, .08], [.44, .3], [.38, .5], [.2, .58], [.14, .62], [0, .62]]), M.glass));
    g.add(mesh(lathe([[0, .02], [.3, .02], [.37, .1], [.39, .3], [.33, .46], [0, .48]]), mat(0x9B3F66, {rough: .15, env: 1.2})));
    var capG = new THREE.Group(); capG.position.y = .62; g.add(capG);
    capG.add(mesh(new THREE.CylinderGeometry(.13, .15, .72, 40), mat(0x2B2226, {rough: .15, env: 1.2}), 0, .36, 0));
    var ringG = mesh(new THREE.TorusGeometry(.15, .015, 8, 40), M.gold, 0, .02, 0); ringG.rotation.x = Math.PI / 2; capG.add(ringG);
    capG.add(mesh(new THREE.CylinderGeometry(.02, .02, .5, 10), M.cream, 0, -.25, 0));
    capG.add(mesh(roundedBox(.13, .2, .04, .018), mat(0x9B3F66, {rough: .2}), 0, -.58, 0));
    var BANDS = [{y: 120, h: 180}, {y: 330, h: 270}, {y: 630, h: 270}, {y: 930, h: 150}];
    var card = swatchCard(function(ctx, w, h, T){
      paper(ctx, w, h);
      var p = card ? card.p || 0 : 0;
      ctx.font = '600 44px Nunito'; var dl = lines(ctx, d.desc, w - 300), half = Math.ceil(dl.length / 2);
      var content = [
        function(b){ ctx.font = 'italic 700 110px Fraunces'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.fillText(d.title, 150, b.y + 130); },
        function(b){ ctx.font = '600 44px Nunito'; ctx.fillStyle = '#FFF4F7'; dl.slice(0, half).forEach(function(l, i){ ctx.textAlign = 'left'; ctx.fillText(l, 150, b.y + 80 + i * 60); }); },
        function(b){ ctx.font = '600 44px Nunito'; ctx.fillStyle = '#FFF4F7'; dl.slice(half).forEach(function(l, i){ ctx.textAlign = 'left'; ctx.fillText(l, 150, b.y + 80 + i * 60); }); ctx.font = '800 34px Nunito'; ctx.fillStyle = 'rgba(255,244,247,.8)'; ctx.fillText(d.chips.join('  ·  ').toUpperCase(), 150, b.y + b.h - 40); },
        null
      ];
      var tip = null;
      BANDS.forEach(function(b, i){
        var bp2 = seg(p, i / 4, (i + 1) / 4); if (!bp2) return;
        var x0 = 100, x1 = 100 + (w - 200) * bp2;
        ctx.save(); roundRect(ctx, x0, b.y, Math.max(b.h, x1 - x0), b.h, b.h / 2); ctx.clip();
        var gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, '#B4527D'); gr.addColorStop(.5, polish); gr.addColorStop(1, '#7E2F52');
        ctx.fillStyle = gr; ctx.fillRect(x0, b.y, w, b.h);
        ctx.fillStyle = 'rgba(255,255,255,.28)'; roundRect(ctx, x0 + 30, b.y + 16, Math.max(0, x1 - x0 - 60), 18, 9); ctx.fill();   // gloss
        if (content[i]) content[i](b);
        ctx.restore();
        if (i === 3 && bp2 >= .999) linkSpots(ctx, T, d, b.y + 98, function(c2, x, y, w2, k){ c2.fillStyle = k ? 'rgba(255,255,255,.92)' : '#F4AFC0'; roundRect(c2, x, y - 44, w2, 64, 32); c2.fill(); });
        if (bp2 < 1) tip = {x: x1, y: b.y + b.h / 2};
      });
      if (card) card.tip = tip || {x: w - 120, y: BANDS[3].y + 70};
    });
    g.add(card.group);
    var tipL = new THREE.Vector3(0, -.66, 0), rot = new THREE.Euler(-.35, 0, -.6), last = -1;
    return {group: g, dur: 6.5, open: function(o){
      var show = smoothstep(seg(o, 0, .1)); card.group.visible = show > 0; card.group.scale.setScalar(.3 + .7 * show);
      var pr = seg(o, .22, .97);
      if (Math.abs(pr - last) > .002 || pr === 0 || pr === 1) { card.p = pr; card.T.redraw(); last = pr; }
      var up = smoothstep(seg(o, .06, .2));
      if (up <= 0) { capG.position.set(0, .62, 0); capG.rotation.set(0, 0, 0); return; }
      var target = onCard(card.tip.x, card.tip.y); target.y += pr > 0 && pr < 1 ? .03 : .3;
      var held = new THREE.Vector3(); placeTool(capG, new THREE.Euler(rot.x * up, 0, rot.z * up), tipL, target); held.copy(capG.position);
      capG.position.lerpVectors(new THREE.Vector3(0, .62 + up * 1.0, 0), held, smoothstep(seg(o, .14, .22)));
    }, focus: {cam: [0, 5.3, 1.6 + CARD_Z], look: [0, .2, CARD_Z + .22]}};
  }

  // the powder compact: the puff pats the card, and every pat leaves a print with part of the project in it
  function powderCompact(key){
    var d = DATA[key], g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(.62, .62, .16, 64), M.rose, 0, .08, 0));
    g.add(mesh(new THREE.CylinderGeometry(.53, .53, .03, 64), mat(0xEBC8B0, {rough: 1, env: .2}), 0, .17, 0));
    var lidH = new THREE.Group(); lidH.position.set(0, .16, -.62); g.add(lidH);
    var lidM = new THREE.Group(); lidM.position.z = .62; lidH.add(lidM);
    lidM.add(mesh(new THREE.CylinderGeometry(.62, .62, .08, 64), M.rose, 0, .04, 0));
    var mir = mesh(new THREE.CircleGeometry(.54, 48), mat(0xEEF1F6, {rough: .05, metal: .9, env: 1.4}), 0, -.002, 0); mir.rotation.x = Math.PI / 2; lidM.add(mir);
    var puff = new THREE.Group(); puff.position.y = .19; g.add(puff);
    puff.add(mesh(new THREE.CylinderGeometry(.46, .46, .1, 48), mat(0xF6CDD5, {rough: 1, env: .2}), 0, .05, 0));
    var edge = mesh(new THREE.TorusGeometry(.46, .05, 12, 48), mat(0xF6CDD5, {rough: 1, env: .2}), 0, .05, 0); edge.rotation.x = Math.PI / 2; puff.add(edge);
    puff.add(mesh(new THREE.TorusGeometry(.14, .03, 8, 24), M.satin, 0, .16, 0));
    puff.scale.setScalar(.72);
    var PRINTS = [{x: 800, y: 230, rx: 600, ry: 150}, {x: 800, y: 570, rx: 720, ry: 210}, {x: 440, y: 905, rx: 360, ry: 135}, {x: 1160, y: 905, rx: 380, ry: 135}];
    var card = swatchCard(function(ctx, w, h, T){
      paper(ctx, w, h);
      var p = card ? card.p || 0 : 0, tip = null;
      PRINTS.forEach(function(pr, i){
        var a = seg(p, i / 4, (i + 1) / 4), pat = seg(a, .45, .6);
        if (a > 0 && a < 1) { var hop = Math.max(0, 1 - Math.abs(a - .52) / .5); tip = {x: pr.x, y: pr.y, h: 1 - hop}; }
        if (!pat) return;
        var gr = ctx.createRadialGradient(pr.x, pr.y, 10, pr.x, pr.y, pr.rx);
        gr.addColorStop(0, 'rgba(232,196,170,.85)'); gr.addColorStop(.7, 'rgba(240,206,190,.6)'); gr.addColorStop(1, 'rgba(240,206,190,0)');
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(1, pr.ry / pr.rx); ctx.translate(-pr.x, -pr.y);
        ctx.globalAlpha = pat; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.rx * (.85 + .15 * pat), 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.globalAlpha = pat; ctx.fillStyle = '#3B2A2C'; ctx.textAlign = 'center';
        if (i === 0) { ctx.font = 'italic 700 112px Fraunces'; ctx.fillText(d.title, pr.x, pr.y + 38); }
        if (i === 1) { ctx.font = '600 42px Nunito'; para(ctx, d.desc, pr.x, pr.y - 100, pr.rx * 1.5, 56, 'center'); }
        if (i === 2) { ctx.font = '800 34px Nunito'; ctx.fillStyle = '#8E2337'; ctx.fillText('MADE WITH', pr.x, pr.y - 30); ctx.fillStyle = '#3B2A2C'; ctx.font = '700 40px Nunito'; para(ctx, d.chips.join(' · '), pr.x, pr.y + 26, pr.rx * 1.6, 50, 'center'); }
        ctx.globalAlpha = 1;
        if (i === 3 && pat >= .999) {
          var y = pr.y - 30; d.links.forEach(function(l, k){
            ctx.font = '800 40px Nunito'; var label = l.text + (k ? '' : ' →'), bw = ctx.measureText(label).width + 52, x = pr.x - bw / 2;
            ctx.fillStyle = k ? '#FFFFFF' : '#F4AFC0'; roundRect(ctx, x, y + k * 78 - 44, bw, 64, 32); ctx.fill(); ctx.strokeStyle = '#3B2A2C'; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#3B2A2C'; ctx.fillText(label, pr.x, y + k * 78);
            T.hot.push({x: x, y: y + k * 78 - 44, w: bw, h: 64, action: {href: l.href, ext: l.ext}});
          });
        }
      });
      if (card) card.tip = tip || {x: 1160, y: 905, h: 1};
    });
    g.add(card.group);
    var last = -1;
    return {group: g, dur: 6.5, open: function(o){
      var show = smoothstep(seg(o, 0, .1)); card.group.visible = show > 0; card.group.scale.setScalar(.3 + .7 * show);
      lidH.rotation.x = -smoothstep(seg(o, .05, .14)) * 1.9;
      var pr = seg(o, .22, .97);
      if (Math.abs(pr - last) > .002 || pr === 0 || pr === 1) { card.p = pr; card.T.redraw(); last = pr; }
      var up = smoothstep(seg(o, .12, .22));
      if (up <= 0) { puff.position.set(0, .19, 0); puff.rotation.set(0, 0, 0); return; }
      var target = onCard(card.tip.x, card.tip.y); target.y += .02 + card.tip.h * .55;
      puff.position.lerpVectors(new THREE.Vector3(0, .19 + up * .8, 0), target, smoothstep(seg(o, .16, .22)));
      puff.rotation.z = Math.sin(o * 40) * .06;
    }, focus: {cam: [0, 5.3, 1.6 + CARD_Z], look: [0, .2, CARD_Z + .22]}};
  }

  // ---------- put everything on the vanity ----------
  var ORDER = ['about', 'lifetracker', 'internscout', 'search', 'cycle', 'robots', 'skills', 'contact'];
  var PROJ = ['lifetracker', 'internscout', 'search', 'cycle', 'robots'];
  var NAMES = {about: ['about me', 'the pouch'], lifetracker: ['LifeTracker', 'the lipstick'], internscout: ['InternScout', 'the contour palette'], search: ['Search Explorer', 'the nail polish'],
               cycle: ['Cycle', 'the liquid blush'], robots: ['Robot Router', 'the powder compact'], skills: ['skills', 'the eyeshadow palette'], contact: ['say hi', 'the perfume']};
  var BAG_TOP = new THREE.Vector3(0, 2.3, -2.6);
  var items = ORDER.map(function(key, i){
    var it = ({about: aboutPouch, skills: skillPalette, contact: perfume, lifetracker: lipstick, cycle: liquidBlush, search: nailPolish, robots: powderCompact,
               internscout: function(k){ return contourPalette(k, 2); }})[key](key);
    it.key = key; it.o = 0; it.lift = 0;
    var a = -1.2 + 2.4 * i / (ORDER.length - 1);
    it.home = new THREE.Vector3(Math.sin(a) * 6.5, 0, -2.6 + Math.cos(a) * 6.5);
    it.homeRot = -a * .5;
    it.group.visible = false;
    it.group.traverse(function(o){ if (o.isMesh) { o.userData.item = i; o.castShadow = true; } });
    scene.add(it.group);
    return it;
  });
  scene.add(mirror); mirror.visible = false;
  mirror.traverse(function(o){ if (o.isMesh) o.userData.item = 'mirror'; });
  var MIRROR_HOME = new THREE.Vector3(-4.3, 0, -4.6), MIRROR_ROT = .4, FOCUS_LIFT = 1.6;

  // ---------- camera moves ----------
  var view = {pos: new THREE.Vector3(.5, 4.4, 8.8), look: new THREE.Vector3(.3, 1.2, -2.6), off: -.2};
  var tween = null;
  function goView(pos, look, off, dur){
    tween = {fp: view.pos.clone(), fl: view.look.clone(), fo: view.off, tp: pos, tl: look, to: off, t: 0, d: dur || 1.1};
  }
  var V = {
    closed: function(){ return [new THREE.Vector3(.5, 4.4, 8.8), new THREE.Vector3(.3, 1.2, -2.6), -.2]; },
    overview: function(){ return [new THREE.Vector3(0, 10.8, 14.2), new THREE.Vector3(0, 1.0, -.6), 0]; },
    mirror: function(){
      var c = MIRROR_HOME.clone().add(new THREE.Vector3(0, 2.9, 0)), n = new THREE.Vector3(Math.sin(MIRROR_ROT), 0, Math.cos(MIRROR_ROT));
      return [c.clone().addScaledVector(n, 5.3).add(new THREE.Vector3(0, -.1, 0)), c.clone().add(new THREE.Vector3(0, -.45, 0)), 0];
    },
    item: function(i){ var it = items[i], f = it.focus, up = new THREE.Vector3(0, FOCUS_LIFT, 0); return [it.home.clone().add(up).add(new THREE.Vector3().fromArray(f.cam)), it.home.clone().add(up).add(new THREE.Vector3().fromArray(f.look)), 0]; }
  };

  // ---------- state ----------
  var state = 'closed', seqA = 0, seqB = 0, tA = 0, tB = 0, focusIdx = -1, closingStage = 0;
  var actions = document.getElementById('actions'), readout = document.getElementById('readout');
  function classes(){
    ['closed', 'opened', 'mirroring', 'overview', 'focused'].forEach(function(c){ body.classList.remove(c); });
    ({closed: ['closed'], opening: ['opened', 'mirroring'], mirror: ['opened', 'mirroring'], overview: ['opened', 'overview'], focus: ['opened', 'focused'], closing: ['opened']})[state]
      .forEach(function(c){ body.classList.add(c); });
  }
  function btn(label, cls, fn){ var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + (cls || ''); b.textContent = label; b.addEventListener('click', fn); return b; }
  function link(l){
    if (l.resume) return btn(l.text, 'alt', openResume);
    var a = document.createElement('a'); a.className = 'btn small alt'; a.href = l.href; a.textContent = l.text;
    if (l.ext) { a.target = '_blank'; a.rel = 'noopener'; } return a;
  }
  function setActions(){
    actions.innerHTML = '';
    if (state === 'mirror' || state === 'opening') {
      actions.append(btn('see what’s in my bag ✨', '', toOverview), btn('resume', 'alt', openResume), link({text: 'github', href: 'https://github.com/nicole-li7', ext: true}));
      readout.textContent = 'The mirror: hi, I’m Nicole. Computer science student at UBC. I make ' + roles.join(', and ') + '.';
    } else if (state === 'focus') {
      var it = items[focusIdx], d = DATA[it.key];
      actions.append(btn('← previous', 'alt', function(){ focus((focusIdx + items.length - 1) % items.length); }), btn('back to the bag', '', toOverview), btn('next →', 'alt', function(){ focus((focusIdx + 1) % items.length); }));
      d.links.forEach(function(l){ actions.append(link(l)); });
      readout.textContent = d.title + '. ' + (d.desc || d.paras.join(' ')) + ' ' + d.bullets.join(' ') + (d.chips.length ? ' Made with ' + d.chips.join(', ') + '.' : '');
    }
  }
  function open(){
    if (state === 'closed' || state === 'closing') { state = 'opening'; tA = 1; tB = 0; classes(); setActions(); }
  }
  function toMirror(){ state = 'mirror'; tA = 1; classes(); setActions(); var v = V.mirror(); goView(v[0], v[1], v[2]); }
  function toOverview(){ state = 'overview'; tA = 1; tB = 1; focusIdx = -1; classes(); setActions(); var v = V.overview(); goView(v[0], v[1], v[2], 1.2); }
  function focus(i){ if (seqB < 1) { tA = tB = 1; } state = 'focus'; focusIdx = i; classes(); setActions(); var v = V.item(i); goView(v[0], v[1], v[2], 1.0); }
  function zipUp(){ state = 'closing'; tB = 0; focusIdx = -1; closingStage = 1; classes(); var v = V.closed(); goView(v[0], v[1], v[2], 1.6); }
  function instantOpen(){ seqA = tA = 1; seqB = tB = 1; }
  document.getElementById('zipUp').addEventListener('click', zipUp);
  addEventListener('keydown', function(e){
    if (e.key === 'Escape' && state === 'focus') toOverview();
    if (state === 'focus' && e.key === 'ArrowRight') focus((focusIdx + 1) % items.length);
    if (state === 'focus' && e.key === 'ArrowLeft') focus((focusIdx + items.length - 1) % items.length);
  });

  // labels under each product (and the keyboard way in)
  var labelsEl = document.getElementById('labels'), labels = [];
  items.forEach(function(it, i){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lab';
    b.innerHTML = NAMES[it.key][0] + '<small>' + NAMES[it.key][1] + '</small>';
    b.addEventListener('click', function(){ focus(i); });
    b.addEventListener('mouseenter', function(){ hover = i; }); b.addEventListener('mouseleave', function(){ hover = -1; });
    labelsEl.appendChild(b); labels.push(b);
  });
  var mirrorLab = document.createElement('button'); mirrorLab.type = 'button'; mirrorLab.className = 'lab'; mirrorLab.innerHTML = 'hi, i’m Nicole<small>the mirror</small>';
  mirrorLab.addEventListener('click', toMirror); labelsEl.appendChild(mirrorLab);

  // nav + buttons
  document.querySelectorAll('[data-go]').forEach(function(a){
    a.addEventListener('click', function(e){
      var go = a.dataset.go;
      if (root.classList.contains('flat')) {
        var el = document.getElementById({top: 'top', about: 'about', projects: 'projects', contact: 'contact', open: 'projects'}[go]);
        if (el) { e.preventDefault(); el.scrollIntoView({behavior: 'smooth'}); } return;
      }
      e.preventDefault();
      if (go === 'contact') { document.getElementById('contact').scrollIntoView({behavior: 'smooth'}); return; }
      scrollTo({top: 0, behavior: 'smooth'});
      if (go === 'open') { if (state === 'closed') open(); else toMirror(); }
      else if (go === 'top') { if (state === 'closed') return; toMirror(); }
      else if (go === 'projects') toOverview();
      else if (go === 'about') focus(0);
    });
  });

  // ---------- pointer: hover and click in 3D ----------
  var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), hover = -1, hot = null, mouse = {x: 0, y: 0}, pending = false;
  function pick(e){
    var r = canvas.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    var hits = ray.intersectObjects(scene.children, true);
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i], o = h.object;
      if (!o.visible || o.userData.item === undefined && !o.userData.T && !isBag(o)) continue;
      return h;
    }
    return null;
  }
  function isBag(o){ while (o) { if (o === bag) return true; o = o.parent; } return false; }
  function spotAt(h){
    var T = h.object.userData.T; if (!T || !h.uv) return null;
    var x = h.uv.x * T.w, y = (1 - h.uv.y) * T.h;
    for (var i = 0; i < T.hot.length; i++) { var s = T.hot[i]; if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.action; }
    return null;
  }
  function owner(o){ while (o) { if (o.userData.item !== undefined) return o.userData.item; o = o.parent; } return undefined; }
  function act(a){
    if (!a) return;
    if (a.go === 'overview') return toOverview();
    if (a.resume) return openResume();
    if (a.href) { if (a.ext) window.open(a.href, '_blank', 'noopener'); else location.href = a.href; }
  }
  canvas.addEventListener('pointermove', function(e){
    mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1;
    var h = pick(e), point = false; hot = null;
    if (state === 'closed') point = !!h && isBag(h.object);
    else if (state === 'overview') { var ow = h ? owner(h.object) : undefined; hover = typeof ow === 'number' ? ow : -1; point = ow !== undefined; }
    else if (h && (state === 'mirror' || state === 'focus')) { hot = spotAt(h); point = !!hot; }
    canvas.classList.toggle('point', point);
    labels.forEach(function(l, i){ l.classList.toggle('hot', i === hover); });
  });
  canvas.addEventListener('click', function(e){
    var h = pick(e);
    if (state === 'closed') { if (h && isBag(h.object)) open(); return; }
    if (state === 'overview') { var ow = h ? owner(h.object) : undefined; if (ow === 'mirror') toMirror(); else if (typeof ow === 'number') focus(ow); return; }
    if (h && (state === 'mirror' || state === 'focus')) act(spotAt(h));
  });
  addEventListener('pointermove', function(e){ mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

  // ---------- each frame ----------
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function ease(x){ x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerpV(a, b, t){ return a.clone().lerp(b, t); }
  var last = performance.now(), mirrorClock = 0, tmp = new THREE.Vector3();
  function size(){
    var w = vanity.clientWidth, h = vanity.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  size(); addEventListener('resize', function(){ applyMode(); size(); });

  function poseMirror(){
    var s = clamp01((seqA - .38) / .62);
    mirror.visible = s > 0;
    if (!mirror.visible) return;
    var rise = ease(s / .5), go = ease((s - .5) / .5);
    var p0 = bag.position.clone().add(new THREE.Vector3(0, -1.6, 0)), p1 = new THREE.Vector3(0, 1.6, -1.6);
    var p = s < .5 ? lerpV(p0, p1, rise) : lerpV(p1, MIRROR_HOME, go);
    mirror.position.copy(p);
    mirror.scale.setScalar(.45 + .55 * rise);
    // it comes out showing its strawberry back, spins round to the glass, then settles turned toward the room
    mirror.rotation.y = s < .5 ? Math.PI + rise * Math.PI : MIRROR_ROT * go;
    mirror.position.y += Math.sin(performance.now() / 900) * .05 * go;
  }
  function poseItems(dt){
    items.forEach(function(it, i){
      var s = clamp01((seqB - i * .06) / .5);
      it.group.visible = s > 0;
      if (!it.group.visible) return;
      var e = ease(s), start = BAG_TOP.clone();
      var p = lerpV(start, it.home, e); p.y += Math.sin(Math.PI * e) * 3.2;
      var focused = state === 'focus' && focusIdx === i, hov = state === 'overview' && hover === i;
      // hovering lifts it a little; opening it lifts it up toward you, away from its neighbours
      it.lift += ((focused ? FOCUS_LIFT : hov ? .3 : 0) - it.lift) * Math.min(1, dt * (focused ? 4 : 10));
      p.y += it.lift;
      it.group.position.copy(p);
      it.group.scale.setScalar(.4 + .6 * e);
      var targetRot = focused ? 0 : it.homeRot;
      it.group.rotation.y = s < 1 ? it.homeRot + (1 - e) * 6.28 : it.group.rotation.y + (targetRot - it.group.rotation.y) * Math.min(1, dt * 6);
      if (it.dur) it.o = Math.max(0, Math.min(1, it.o + (focused ? dt / it.dur : -dt * 2.5)));
      else it.o += ((focused ? 1 : 0) - it.o) * Math.min(1, dt * (focused ? 1.8 : 3));
      it.open(it.o, dt);
    });
  }
  function poseBag(){
    var zip = ease(seqA / .22), lidO = ease((seqA - .18) / .28);
    puller.position.x = -1.4 + 2.8 * zip;
    lid.rotation.x = -1.95 * lidO;
  }
  function placeLabels(){
    if (state !== 'overview') return;
    var w = vanity.clientWidth, h = vanity.clientHeight;
    items.forEach(function(it, i){
      tmp.copy(it.group.position); tmp.y = -.05; tmp.z += 1.15; tmp.project(camera);
      labels[i].style.transform = 'translate(' + ((tmp.x + 1) / 2 * w).toFixed(0) + 'px,' + ((1 - tmp.y) / 2 * h).toFixed(0) + 'px) translate(-50%,0)';
    });
    tmp.copy(mirror.position); tmp.y += .2; tmp.project(camera);
    mirrorLab.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w).toFixed(0) + 'px,' + ((1 - tmp.y) / 2 * h).toFixed(0) + 'px) translate(-50%,0)';
  }

  function frame(now){
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    requestAnimationFrame(frame);
    if (root.classList.contains('flat') || document.hidden) return;

    // sequences: A = unzip + mirror out, B = everything else out
    var spA = state === 'closing' && seqB > 0 ? 0 : 1;
    seqA += Math.sign(tA - seqA) * Math.min(Math.abs(tA - seqA), dt / 2.4 * spA);
    seqB += Math.sign(tB - seqB) * Math.min(Math.abs(tB - seqB), dt / 2.0);
    if (state === 'closing' && seqB <= 0) tA = 0;
    if (state === 'closing' && seqA <= 0 && seqB <= 0) { state = 'closed'; classes(); setActions(); }
    if (state === 'opening' && seqA >= .62) toMirror();

    poseBag(); poseMirror(); poseItems(dt);

    // mirror text: redraw for the typing effect while it's on screen
    if (mirror.visible && (state === 'mirror' || state === 'opening')) { mirrorClock += dt; if (mirrorClock > .09) { mirrorClock = 0; mirrorTex.redraw(); } }

    // camera
    if (tween) {
      tween.t += dt / tween.d; var k = ease(tween.t);
      view.pos.copy(tween.fp).lerp(tween.tp, k); view.look.copy(tween.fl).lerp(tween.tl, k); view.off = tween.fo + (tween.to - tween.fo) * k;
      if (tween.t >= 1) tween = null;
    }
    var sway = state === 'closed' || state === 'overview' ? 1 : .25;
    camera.position.copy(view.pos).add(new THREE.Vector3(mouse.x * .8 * sway, -mouse.y * .4 * sway, 0));
    camera.lookAt(view.look);
    var w = vanity.clientWidth, h = vanity.clientHeight;
    camera.setViewOffset(w, h, view.off * w, 0, w, h);
    renderer.render(scene, camera);
    placeLabels();
  }

  // build the mirror glass now that the drawing function exists
  mirrorTex = texture(1000, 1250, drawMirror);
  glass = surface(planarUV(new THREE.ShapeGeometry(ellipse(.92, 1.15), 40), 1.84, 2.3), mirrorTex);
  glass.position.z = .14; glass.userData.item = 'mirror'; mirrorInner.add(glass);

  // fonts load after first paint; redraw the text once they're in
  if (document.fonts) Promise.all(['700 80px Fraunces', 'italic 700 80px Fraunces', 'italic 600 40px Fraunces', '800 40px Nunito', '600 40px Nunito', '400 40px Nunito', '500 40px Nunito', '700 60px Caveat', '600 60px Caveat'].map(function(f){ return document.fonts.load(f); })).then(redrawAll, redrawAll);

  classes(); setActions();
  // arriving from a project page (index.html#projects etc.) skips straight in
  var hash = location.hash.slice(1);
  if (hash === 'projects' || hash === 'about') {
    instantOpen();
    if (hash === 'projects') { state = 'overview'; var v = V.overview(); } else { state = 'focus'; focusIdx = 0; v = V.item(0); }
    view.pos.copy(v[0]); view.look.copy(v[1]); view.off = v[2]; classes(); setActions();
  }
  window.__bag = {get state(){ return state; }, open: open, toOverview: toOverview, focus: focus, zipUp: zipUp};   // for poking at it from the console
  requestAnimationFrame(frame);
})();
