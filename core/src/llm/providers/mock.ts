import type { LLMRequest } from "../../types.ts";
import { BaseProvider } from "../provider.ts";

const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>Змейка</title>
<style>
  html,body{margin:0;height:100%;background:#111;color:#eee;font-family:system-ui;overflow:hidden;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}
  canvas{display:block;position:fixed;inset:0;width:100%;height:100%;touch-action:none}
  #hud{position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:12px;font-size:22px;font-weight:bold;z-index:10;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:12px;pointer-events:none}
  #msg{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:20px;background:rgba(0,0,0,.78);color:#fff;font-size:28px;text-align:center;padding:20px;z-index:30}
  #msg button{font-size:22px;padding:16px 32px;border-radius:12px;border:none;background:#3e6;color:#000;font-weight:bold;cursor:pointer;min-height:60px;min-width:180px}
  #controls{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 24px);left:0;right:0;display:flex;justify-content:center;gap:16px;z-index:20;pointer-events:none;padding:0 12px}
  #controls button{
    pointer-events:auto;width:72px;height:72px;border-radius:50%;border:2px solid rgba(255,255,255,.35);
    background:rgba(60,60,60,.72);color:#fff;font-size:28px;font-weight:bold;
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
    touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
    transition:transform .08s,background .12s;
  }
  #controls button:active,#controls button.pressed{transform:scale(.92);background:rgba(100,200,120,.85)}
  @media (min-width:720px){#controls button{width:60px;height:60px;font-size:24px}}
</style>
</head><body>
<canvas id="c"></canvas>
<div id="hud">Счёт: <b id="s">0</b></div>
<div id="controls">
  <button id="btnLeft" aria-label="Влево">◀</button>
  <button id="btnUp" aria-label="Вверх">▲</button>
  <button id="btnDown" aria-label="Вниз">▼</button>
  <button id="btnRight" aria-label="Вправо">▶</button>
</div>
<div id="msg"><div id="mt"></div><button id="rb">Играть снова</button></div>
<script>
(function(){
  var c=document.getElementById('c');
  var ctx=c.getContext('2d');
  var S=20;
  var snake,dir,food,score,state,tick;
  var sEl=document.getElementById('s');
  var msg=document.getElementById('msg');
  var mt=document.getElementById('mt');
  var rb=document.getElementById('rb');

  function resize(){
    var dpr=window.devicePixelRatio||1;
    c.width=innerWidth*dpr;
    c.height=innerHeight*dpr;
    c.style.width=innerWidth+'px';
    c.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',function(){setTimeout(resize,300)});

  function reset(){
    snake=[{x:10,y:10}];
    dir={x:1,y:0};
    food={x:15,y:10};
    score=0;
    sEl.textContent='0';
    state='playing';
    tick=0;
    msg.style.display='none';
  }

  function placeFood(){
    while(true){
      var f={x:Math.floor(Math.random()*S),y:Math.floor(Math.random()*S)};
      if(!snake.some(function(s){return s.x===f.x&&s.y===f.y})){food=f;return}
    }
  }

  function setDir(nx,ny){
    if((dir.x===0&&nx!==0)||(dir.y===0&&ny!==0))dir={x:nx,y:ny};
  }

  function step(){
    var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(h.x<0||h.y<0||h.x>=S||h.y>=S||snake.some(function(s){return s.x===h.x&&s.y===h.y})){
      state='gameover';
      mt.textContent='Игра окончена. Счёт: '+score;
      msg.style.display='flex';
      return;
    }
    snake.unshift(h);
    if(h.x===food.x&&h.y===food.y){score++;sEl.textContent=score;placeFood()}
    else snake.pop();
  }

  function draw(){
    var cell=Math.min(innerWidth,innerHeight)/S;
    var offX=(innerWidth-cell*S)/2;
    var offY=(innerHeight-cell*S)/2;
    ctx.fillStyle='#111';
    ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(offX,offY,cell*S,cell*S);
    ctx.fillStyle='#e33';
    ctx.fillRect(offX+food.x*cell+3,offY+food.y*cell+3,cell-6,cell-6);
    for(var i=0;i<snake.length;i++){
      ctx.fillStyle=i===0?'#4f8':'#3e6';
      ctx.fillRect(offX+snake[i].x*cell+2,offY+snake[i].y*cell+2,cell-4,cell-4);
    }
  }

  function loop(t){
    requestAnimationFrame(loop);
    if(state==='playing'&&t-tick>140){tick=t;step()}
    draw();
  }

  // Клавиатура
  window.addEventListener('keydown',function(e){
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')setDir(0,-1);
    else if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')setDir(0,1);
    else if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')setDir(-1,0);
    else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')setDir(1,0);
  });

  // Свайпы по всему окну
  var tx=0,ty=0,swiped=false;
  document.addEventListener('touchstart',function(e){
    tx=e.touches[0].clientX;
    ty=e.touches[0].clientY;
    swiped=false;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    // Блокируем скролл/свайп-закрытие Telegram
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',function(e){
    if(swiped)return;
    var t=e.changedTouches[0];
    var dx=t.clientX-tx,dy=t.clientY-ty;
    if(Math.abs(dx)<20&&Math.abs(dy)<20)return;
    swiped=true;
    if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?1:-1,0);
    else setDir(0,dy>0?1:-1);
  },{passive:false});

  // Экранные кнопки
  function bind(id,nx,ny){
    var b=document.getElementById(id);
    var fire=function(e){
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('pressed');
      setTimeout(function(){b.classList.remove('pressed')},120);
      setDir(nx,ny);
    };
    b.addEventListener('touchstart',fire,{passive:false});
    b.addEventListener('mousedown',fire);
  }
  bind('btnLeft',-1,0);
  bind('btnRight',1,0);
  bind('btnUp',0,-1);
  bind('btnDown',0,1);

  // Рестарт
  function doReset(e){e.preventDefault();e.stopPropagation();reset()}
  rb.addEventListener('click',doReset);
  rb.addEventListener('touchstart',doReset,{passive:false});

  reset();
  requestAnimationFrame(loop);
})();
</script></body></html>`;

export class MockProvider extends BaseProvider {
  readonly name = "mock";
  constructor(private readonly delayMs = 100) { super(); }
  isAvailable(): boolean { return true; }
  async generate(_req: LLMRequest): Promise<string> {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    return FIXTURE_HTML;
  }
}