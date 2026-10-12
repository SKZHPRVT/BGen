import type { LLMRequest } from "../../types.ts";
import { BaseProvider } from "../provider.ts";

const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock Snake</title>
<style>html,body{margin:0;height:100%;background:#111;color:#eee;font-family:system-ui}
canvas{display:block;width:100vw;height:100vh;touch-action:none}
#hud{position:fixed;top:12px;left:12px;font-size:20px}
#msg{position:fixed;inset:0;display:none;align-items:center;justify-content:center;font-size:32px;background:rgba(0,0,0,.6);flex-direction:column;gap:16px}</style>
</head><body>
<canvas id="c"></canvas>
<div id="hud">Score: <b id="s">0</b></div>
<div id="msg"><div id="mt"></div><button id="rb" style="font-size:24px;padding:12px 24px">Restart</button></div>
<script>
(function(){
  var c=document.getElementById('c'),ctx=c.getContext('2d');
  var S=20,snake,dir,food,score,state,tick;
  var sEl=document.getElementById('s'),msg=document.getElementById('msg'),mt=document.getElementById('mt'),rb=document.getElementById('rb');
  function resize(){c.width=innerWidth;c.height=innerHeight}
  resize();addEventListener('resize',resize);
  function reset(){snake=[{x:10,y:10}];dir={x:1,y:0};food={x:15,y:10};score=0;sEl.textContent='0';state='playing';tick=0;msg.style.display='none'}
  function placeFood(){while(true){var f={x:Math.floor(Math.random()*S),y:Math.floor(Math.random()*S)};if(!snake.some(function(s){return s.x===f.x&&s.y===f.y})){food=f;return}}}
  function step(){var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.y<0||h.x>=S||h.y>=S||snake.some(function(s){return s.x===h.x&&s.y===h.y})){state='gameover';mt.textContent='Game over. Score: '+score;msg.style.display='flex';return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;sEl.textContent=score;placeFood()}else snake.pop()}
  function draw(){var cell=Math.min(c.width,c.height)/S;ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e33';ctx.fillRect(food.x*cell,food.y*cell,cell-2,cell-2);ctx.fillStyle='#3e6';for(var i=0;i<snake.length;i++)ctx.fillRect(snake[i].x*cell,snake[i].y*cell,cell-2,cell-2)}
  function loop(t){requestAnimationFrame(loop);if(state!=='playing')return;if(t-tick>120){tick=t;step()}draw()}
  addEventListener('keydown',function(e){if(['ArrowUp','w'].indexOf(e.key)>=0&&dir.y===0)dir={x:0,y:-1};else if(['ArrowDown','s'].indexOf(e.key)>=0&&dir.y===0)dir={x:0,y:1};else if(['ArrowLeft','a'].indexOf(e.key)>=0&&dir.x===0)dir={x:-1,y:0};else if(['ArrowRight','d'].indexOf(e.key)>=0&&dir.x===0)dir={x:1,y:0}});
  var tx=0,ty=0;
  addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY});
  addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&dir.x===0)dir={x:1,y:0};else if(dx<0&&dir.x===0)dir={x:-1,y:0}}else{if(dy>0&&dir.y===0)dir={x:0,y:1};else if(dy<0&&dir.y===0)dir={x:0,y:-1}}});
  rb.onclick=reset;reset();requestAnimationFrame(loop);
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
