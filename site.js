// shared by every page: theme toggle + sparkle cursor
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // theme: light green by default, dark only if the visitor chose it
  var root = document.documentElement, btn = document.getElementById('themeBtn');
  var saved=null; try{ saved = localStorage.getItem('theme'); }catch(e){}
  root.setAttribute('data-theme', saved==='dark' ? 'dark' : 'light');
  function isDark(){ return root.getAttribute('data-theme')==='dark'; }
  function paint(){ btn.textContent = isDark() ? '☀️' : '🌙'; }
  paint();
  btn.addEventListener('click', function(){
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next); paint();
    try{ localStorage.setItem('theme', next); }catch(e){}
  });

  // sparkle cursor
  if(!reduce && matchMedia('(pointer:fine)').matches){
    var c = document.getElementById('sparkles'), ctx = c.getContext('2d'), parts = [], colors = ['#8AD25F','#B4E58F','#E6F2A8','#5FB244','#EEF9E4'];
    function size(){ c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
    size(); addEventListener('resize', size);
    var last = 0;
    addEventListener('mousemove', function(e){
      var now = performance.now(); if(now - last < 28) return; last = now;
      parts.push({x:e.clientX, y:e.clientY, vx:(Math.random()-.5)*1.4, vy:-Math.random()*1.2-.3, life:1, r:Math.random()*5+3, rot:Math.random()*Math.PI, col:colors[(Math.random()*colors.length)|0]});
      if(parts.length > 80) parts.shift();
    });
    function star(x,y,r,rot){ ctx.beginPath(); for(var i=0;i<10;i++){ var rr = i%2?r*.45:r, a = rot + i*Math.PI/5; ctx.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); } ctx.closePath(); }
    (function loop(){
      ctx.clearRect(0,0,innerWidth,innerHeight);
      for(var i=parts.length-1;i>=0;i--){ var p=parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=.03; p.life-=.022; p.rot+=.05;
        if(p.life<=0){ parts.splice(i,1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.col; star(p.x,p.y,p.r*p.life,p.rot); ctx.fill(); }
      ctx.globalAlpha = 1; requestAnimationFrame(loop);
    })();
  }
})();
