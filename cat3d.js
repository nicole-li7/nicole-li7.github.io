// Low-poly 3D cat for the intro (and a sleepy one by the contact section).
// Built from flat-shaded three.js primitives. If WebGL or three.js is missing,
// nothing happens and the drawn SVG cat stays.
(function(){
  if (!window.THREE) return;
  var probe = document.createElement('canvas');
  if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var C = {ginger: 0xF4A259, stripe: 0xD9803B, cream: 0xFFE8C7, inner: 0xFFC9A0, eye: 0x2B1D14, nose: 0xC8624A,
           collar: 0x4E9A35, bell: 0xFFE97A, yarn: 0x7CC35A, yarnD: 0x4E9A35, white: 0xFFFFFF};

  // colours are picked in sRGB; the renderer works in linear light, so convert them
  function lin(c){ var col = new THREE.Color(c); return col.convertSRGBToLinear ? col.convertSRGBToLinear() : col; }
  function mat(color){ return new THREE.MeshStandardMaterial({color: lin(color), flatShading: true, roughness: .85, metalness: 0}); }
  function mesh(geo, color, x, y, z){
    var m = new THREE.Mesh(geo, mat(color));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }
  function ico(r, detail){ return new THREE.IcosahedronGeometry(r, detail || 0); }

  // ---------- the cat ----------
  function makeCat(){
    var cat = new THREE.Group(), p = {};

    var body = mesh(ico(1, 1), C.ginger, 0, 1.05, 0); body.scale.set(.95, 1.1, .85); cat.add(body); p.body = body;
    var belly = mesh(ico(.62, 1), C.cream, 0, .98, .5); belly.scale.set(.9, 1.15, .6); cat.add(belly);
    [-1, 1].forEach(function(s){
      var haunch = mesh(ico(.5), C.ginger, s * .62, .42, -.05); haunch.scale.set(.8, .9, 1.1); cat.add(haunch);
      var foot = mesh(ico(.22), C.cream, s * .74, .1, .38); foot.scale.set(1, .6, 1.3); cat.add(foot);
      var stripe = mesh(new THREE.BoxGeometry(.07, .5, .3), C.stripe, s * .9, 1.15, .05); stripe.rotation.z = s * .25; cat.add(stripe);
    });

    // head
    var head = new THREE.Group(); head.position.set(0, 2.3, .15); cat.add(head); p.head = head;
    var skull = mesh(ico(.8, 1), C.ginger); skull.scale.set(1.12, .95, .98); head.add(skull);
    var muzzle = mesh(ico(.34), C.cream, 0, -.24, .62); muzzle.scale.set(1.3, .8, .75); head.add(muzzle);
    var nose = mesh(new THREE.ConeGeometry(.08, .08, 3), C.nose, 0, -.08, .86); nose.rotation.x = Math.PI; head.add(nose);
    [-1, 0, 1].forEach(function(i){
      var st = mesh(new THREE.BoxGeometry(.06, .24, .06), C.stripe, i * .15, .58, .46); st.rotation.x = -.7; st.rotation.z = -i * .15; head.add(st);
    });
    p.eyes = [];
    [-1, 1].forEach(function(s){
      var ear = new THREE.Group(); ear.position.set(s * .48, .6, 0); ear.rotation.z = -s * .35; head.add(ear);
      var outer = mesh(new THREE.ConeGeometry(.3, .58, 4), C.ginger, 0, .2, 0); outer.rotation.y = Math.PI / 4; ear.add(outer);
      var inner = mesh(new THREE.ConeGeometry(.17, .36, 4), C.inner, 0, .14, .12); inner.rotation.y = Math.PI / 4; ear.add(inner);
      if (s === 1) p.ear = ear;
      var eye = new THREE.Group(); eye.position.set(s * .3, .05, .7); head.add(eye);
      var ball = mesh(ico(.11), C.eye); ball.scale.set(1, 1.35, .6); eye.add(ball);
      var shine = mesh(ico(.035), C.white, .03, .05, .06); eye.add(shine);
      p.eyes.push(eye);
    });
    var wl = [];
    [-1, 1].forEach(function(s){ wl.push(s * .25, -.2, .78, s * .8, -.12, .7,  s * .25, -.26, .78, s * .8, -.32, .7); });
    var wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wl, 3));
    head.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({color: lin(0x3A2A20)})));

    // collar
    var collar = mesh(new THREE.TorusGeometry(.52, .07, 4, 10), C.collar, 0, 1.72, .05); collar.rotation.x = Math.PI / 2 - .15; cat.add(collar);
    cat.add(mesh(ico(.1), C.bell, 0, 1.6, .55));

    // front legs; the right one bats
    p.legs = [];
    [-1, 1].forEach(function(s){
      var leg = new THREE.Group(); leg.position.set(s * .36, 1.0, .45); cat.add(leg);
      leg.add(mesh(new THREE.CylinderGeometry(.17, .2, .85, 6), C.ginger, 0, -.42, 0));
      var paw = mesh(ico(.22), C.cream, 0, -.86, .06); paw.scale.set(1, .7, 1.2); leg.add(paw);
      p.legs.push(leg);
    });
    p.paw = p.legs[1];

    // tail: a chain of segments that each bend a little
    p.tail = [];
    var parent = new THREE.Group(); parent.position.set(0, .35, -.8); cat.add(parent);
    for (var i = 0; i < 7; i++) {
      var seg = new THREE.Group(); seg.position.y = i ? .3 : 0;
      seg.rotation.x = i ? .32 : -1.25;
      seg.add(mesh(new THREE.CylinderGeometry(.11 - i * .008, .12 - i * .008, .34, 5), C.ginger, 0, .15, 0));
      parent.add(seg); parent = seg; p.tail.push(seg);
    }
    return {group: cat, p: p};
  }

  function makeYarn(scale){
    var g = new THREE.Group();
    g.add(mesh(ico(.45, 1), C.yarn));
    [[0, 0, 0], [1.2, .4, 0], [.3, 1.3, .6], [-.8, .2, 1.1]].forEach(function(r){
      var t = mesh(new THREE.TorusGeometry(.455, .022, 3, 14), C.yarnD); t.rotation.set(r[0], r[1], r[2]); g.add(t);
    });
    g.scale.setScalar(scale || 1);
    return g;
  }

  // shared with the yarn trail on the home page
  window.LowPoly = {lin: lin, mat: mat, mesh: mesh, ico: ico, makeYarn: makeYarn};

  // ---------- one scene per canvas ----------
  function stage(canvas, opts){
    var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(lin(0xFFF3E0), lin(0x8A6A50), 1.1));
    var sun = new THREE.DirectionalLight(0xFFFFFF, .95); sun.position.set(4, 7, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 20;
    scene.add(sun);

    var floorMat = new THREE.MeshStandardMaterial({color: 0xFBEBD3, flatShading: true, roughness: 1});
    var floor = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, .12, 12), floorMat);
    floor.position.set(opts.floorX || 0, -.06, 0); floor.receiveShadow = true; scene.add(floor);
    function paintFloor(){
      floorMat.color.copy(lin(getComputedStyle(root).getPropertyValue('--floor').trim() || '#F2D6AE'));
    }
    paintFloor();
    new MutationObserver(function(){ paintFloor(); draw(); }).observe(root, {attributes: true, attributeFilter: ['data-theme']});

    var cat = makeCat(); scene.add(cat.group);
    var camera = new THREE.PerspectiveCamera(opts.fov || 32, 1, .1, 100);
    var target = new THREE.Vector3().fromArray(opts.target), base = new THREE.Vector3().fromArray(opts.cam).sub(target);

    function size(){
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function aim(yaw, pitch){
      var off = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      off.y += pitch;
      camera.position.copy(target).add(off); camera.lookAt(target);
    }
    function draw(){ renderer.render(scene, camera); }
    size(); aim(0, 0);
    addEventListener('resize', function(){ size(); draw(); });
    return {scene: scene, cat: cat, camera: camera, aim: aim, draw: draw, size: size, canvas: canvas};
  }

  function loop(st, update){
    var visible = true, last = performance.now(), t = 0;
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(st.canvas);
    (function tick(now){
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (visible && !document.hidden) { t += dt; update(t, dt); st.draw(); }
      requestAnimationFrame(tick);
    })(last);
  }

  // ---------- intro cat ----------
  var heroCanvas = document.getElementById('cat3d');
  if (heroCanvas) {
    var hero = stage(heroCanvas, {cam: [1.55, 2.9, 9.2], target: [.5, 1.15, 0], floorX: .5});
    var P = hero.cat.p, yarn = makeYarn(1), yarnHome = new THREE.Vector3(1.75, .45, .75);
    yarn.position.copy(yarnHome); hero.scene.add(yarn);
    var threadGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    var thread = new THREE.Line(threadGeo, new THREE.LineBasicMaterial({color: lin(C.yarnD)}));
    thread.visible = false; hero.scene.add(thread);
    var sceneEl = document.getElementById('scene');
    var px = 0, py = 0, sx = 0, sy = 0, batT = -1, flying = false, vx = 0, nextBlink = 3, blinkT = -1, nextTwitch = 5, twitchT = -1;

    addEventListener('pointermove', function(e){
      var r = heroCanvas.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
      py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * .35)) / (innerHeight / 2)));
    });

    function pose(t, dt){
      // ease toward the pointer: head follows, camera swings a little
      sx += (px - sx) * Math.min(1, dt * 4); sy += (py - sy) * Math.min(1, dt * 4);
      hero.aim(-sx * .32, -sy * .5);
      P.head.rotation.y = sx * .55; P.head.rotation.x = sy * .3;
      P.body.scale.y = 1.1 * (1 + .015 * Math.sin(t * 2.2));
      P.tail.forEach(function(s, i){ s.rotation.z = .22 * Math.sin(t * 2.4 - i * .55); });

      // blink and ear twitch now and then
      if (t > nextBlink) { blinkT = 0; nextBlink = t + 3 + Math.random() * 3; }
      if (blinkT >= 0) { blinkT += dt; var k = blinkT < .12 ? .12 : 1; P.eyes.forEach(function(e){ e.scale.y = k; }); if (blinkT > .2) { blinkT = -1; P.eyes.forEach(function(e){ e.scale.y = 1; }); } }
      if (t > nextTwitch) { twitchT = 0; nextTwitch = t + 5 + Math.random() * 4; }
      if (twitchT >= 0) { twitchT += dt; P.ear.rotation.x = -Math.sin(Math.min(1, twitchT / .25) * Math.PI) * .45; if (twitchT > .25) twitchT = -1; }

      // batting: wind up, swipe, ball goes flying
      var batting = sceneEl.classList.contains('batting');
      if (batting && batT < 0 && !flying) batT = 0;
      if (batT >= 0) {
        batT += dt;
        var u = batT / .5, th = u < .35 ? -.35 * (u / .35) : u < .6 ? -.35 + 1.55 * ((u - .35) / .25) : 1.2 * (1 - (u - .6) / .4);
        P.paw.rotation.z = th; P.paw.rotation.x = -Math.max(0, th) * .45;
        if (u > .5 && !flying) { flying = true; vx = 4.2; thread.visible = true; }
        if (u >= 1) { batT = -1; P.paw.rotation.set(0, 0, 0); }
      }
      if (flying) {
        yarn.position.x += vx * dt; yarn.rotation.z -= vx * dt / .45;
        yarn.position.y = yarnHome.y + Math.max(0, Math.sin(Math.min(1, (yarn.position.x - yarnHome.x) / 2) * Math.PI)) * .5;
        var a = threadGeo.attributes.position;
        a.setXYZ(0, .7, .1, .8); a.setXYZ(1, yarn.position.x, yarn.position.y - .3, yarn.position.z); a.needsUpdate = true;
      } else {
        yarn.rotation.z = Math.sin(t * 2.4) * .12; yarn.position.x = yarnHome.x + Math.sin(t * 2.4) * .04;
      }
      // scrolled back to the top: the ball comes home
      if (flying && !sceneEl.classList.contains('batted') && !batting) { flying = false; thread.visible = false; yarn.position.copy(yarnHome); }
    }

    heroCanvas.__yarn = yarn;   // handy for checking the animation from the console
    root.classList.add('has3d');
    if (reduce) { hero.draw(); addEventListener('resize', hero.draw); }
    else loop(hero, pose);
  }

  // ---------- sleepy cat by the contact section ----------
  var napCanvas = document.getElementById('nap3d');
  if (napCanvas) {
    var nap = stage(napCanvas, {cam: [.75, 2.8, 8.6], target: [.4, 1.1, 0], fov: 30, floorX: .4});
    var N = nap.cat.p, tiny = makeYarn(.45);
    tiny.position.set(1.5, .2, .9); nap.scene.add(tiny);
    N.eyes.forEach(function(e){ e.scale.set(1.4, .1, 1); e.position.y -= .03; });
    N.head.rotation.set(.32, .25, .12);
    N.ear.rotation.z = -.6;
    function snooze(t){
      N.body.scale.y = 1.1 * (1 + .03 * Math.sin(t * 1.3));
      N.head.position.y = 2.3 + .03 * Math.sin(t * 1.3);
      N.tail.forEach(function(s, i){ s.rotation.z = .06 * Math.sin(t * .9 - i * .5); });
    }
    if (reduce) { snooze(0); nap.draw(); addEventListener('resize', nap.draw); }
    else loop(nap, snooze);
  }
})();
