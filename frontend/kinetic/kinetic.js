const $=s=>document.querySelector(s),canvas=$('#visual'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
const shapes=['Bloom','Orbit','Crown','Web','Ribbon','Helix','Mandala','Spokes'];
const palettes={Ultraviolet:['#8a5cff','#f0a5ff','#4bdcff','#ff4fc8'],Ember:['#ff3d24','#ff9d19','#ffd36b','#b20f55'],Aquatic:['#00e8ff','#2c74ff','#7c3dff','#8effd7'],Aurora:['#34ffad','#0ca8ff','#ce70ff','#ffe77a'],Monochrome:['#ffffff','#aeb9d0','#677187','#e7ecff'],Inferno:['#ffed48','#ff4d00','#d000ff','#fff0cc']};
const presets=[
 {name:'Lucid Bloom',a:'Bloom',b:'Orbit',sa:.16,sb:-.11,ca:13,cb:9,za:.82,zb:.58,p:'Ultraviolet',g:1.15,t:.82,u:.34,blend:'lighter'},
 {name:'Solar Engine',a:'Crown',b:'Spokes',sa:.08,sb:-.28,ca:17,cb:22,za:.88,zb:.67,p:'Ember',g:1.45,t:.68,u:.52,blend:'screen'},
 {name:'Deep Current',a:'Ribbon',b:'Helix',sa:.05,sb:-.07,ca:11,cb:8,za:1.06,zb:.72,p:'Aquatic',g:1.2,t:.9,u:.25,blend:'lighter'},
 {name:'Ghost Circuit',a:'Web',b:'Crown',sa:.13,sb:-.19,ca:24,cb:12,za:.91,zb:.64,p:'Monochrome',g:.75,t:.78,u:.18,blend:'difference'},
 {name:'Northern Halo',a:'Mandala',b:'Bloom',sa:.07,sb:-.12,ca:8,cb:15,za:.84,zb:.62,p:'Aurora',g:1.5,t:.88,u:.46,blend:'screen'}
];
let dpr=1,w=0,h=0,t=0,last=performance.now(),frames=0,lastFps=last,pointer={x:.5,y:.5,down:false},audioLevel=0,audioCtx,analyser,source,data;
let state={...presets[0]};
const controls={shapeA:$('#shapeA'),shapeB:$('#shapeB'),speedA:$('#speedA'),speedB:$('#speedB'),complexityA:$('#complexityA'),complexityB:$('#complexityB'),scaleA:$('#scaleA'),scaleB:$('#scaleB'),palette:$('#palette'),glow:$('#glow'),trail:$('#trail'),pulse:$('#pulse'),blend:$('#blend')};

function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#020207';ctx.fillRect(0,0,w,h)}
function options(el,arr){el.innerHTML=arr.map(v=>`<option value="${v}">${v}</option>`).join('')}
options(controls.shapeA,shapes);options(controls.shapeB,shapes);options(controls.palette,Object.keys(palettes));
const mapping={shapeA:'a',shapeB:'b',speedA:'sa',speedB:'sb',complexityA:'ca',complexityB:'cb',scaleA:'za',scaleB:'zb',palette:'p',glow:'g',trail:'t',pulse:'u',blend:'blend'};
Object.entries(controls).forEach(([id,el])=>el.addEventListener('input',()=>{state[mapping[id]]=el.type==='range'?+el.value:el.value;state.name='Custom Signal';syncLabels()}));
function sync(){Object.entries(mapping).forEach(([id,key])=>controls[id].value=state[key]);syncLabels()}
function syncLabels(){
 $('#presetName').textContent=state.name;$('#shapeALabel').textContent=state.a;$('#shapeBLabel').textContent=state.b;$('#paletteLabel').textContent=state.p;
 [['speedAOut',state.sa.toFixed(2)],['speedBOut',state.sb.toFixed(2)],['complexityAOut',state.ca],['complexityBOut',state.cb],['scaleAOut',Math.round(state.za*100)+'%'],['scaleBOut',Math.round(state.zb*100)+'%'],['glowOut',Math.round(state.g*100)+'%'],['trailOut',Math.round(state.t*100)+'%'],['pulseOut',Math.round(state.u*100)+'%']].forEach(([id,v])=>$('#'+id).textContent=v);
 document.documentElement.style.setProperty('--hot',palettes[state.p][1]);document.querySelectorAll('.preset').forEach((b,i)=>b.classList.toggle('active',state.name===presets[i].name));
}
function setPreset(i){state={...presets[i]};sync()}
$('#presets').innerHTML=presets.map((p,i)=>`<button class="preset" data-i="${i}" title="${p.name}" aria-label="${p.name}" style="--swatch:radial-gradient(circle,${palettes[p.p][1]},${palettes[p.p][0]} 34%,#070711 70%)"></button>`).join('');
$('#presets').addEventListener('click',e=>{const b=e.target.closest('.preset');if(b)setPreset(+b.dataset.i)});

function point(shape,a,k,r,time){let rr=r,x,y;const wobble=Math.sin(a*k+time)*.17;
 switch(shape){
  case'Bloom':rr=r*(.58+.37*Math.cos(k*a));x=Math.cos(a)*rr;y=Math.sin(a)*rr;break;
  case'Orbit':rr=r*(.67+.14*Math.sin(k*a*2+time));x=Math.cos(a)*rr;y=Math.sin(a)*rr;break;
  case'Crown':rr=r*(.62+.3*Math.abs(Math.cos(k*a/2)));x=Math.cos(a)*rr;y=Math.sin(a)*rr;break;
  case'Web':rr=r*(.28+.7*((a%(Math.PI*2/k))/(Math.PI*2/k)));x=Math.cos(a+wobble)*rr;y=Math.sin(a+wobble)*rr;break;
  case'Ribbon':x=Math.sin(a*k*.5+time)*r*.7;y=Math.sin(a*(k+2)*.5)*r*.7;break;
  case'Helix':x=Math.sin(a*k*.25)*r*.76;y=Math.sin(a)*r*(.25+.65*Math.cos(a*k*.12));break;
  case'Mandala':rr=r*(.48+.28*Math.cos(k*a)+.12*Math.cos((k+3)*a));x=Math.cos(a)*rr;y=Math.sin(a)*rr;break;
  default:rr=r*(.2+.78*Math.abs(Math.sin(k*a*.5)));x=Math.cos(a)*rr;y=Math.sin(a)*rr;
 }return[x,y]}
function layer(shape,k,scale,rot,colors,index,energy){
 const R=Math.min(w,h)*.49*scale*(1+energy*state.u*.32),steps=Math.max(360,k*48),rings=shape==='Orbit'?5:3;
 ctx.save();ctx.translate(w*(.5+(pointer.x-.5)*.07),h*(.5+(pointer.y-.5)*.07));ctx.rotate(rot);ctx.globalCompositeOperation=state.blend;ctx.lineCap='round';ctx.lineJoin='round';
 for(let ring=0;ring<rings;ring++){
  const alpha=.18+(ring/rings)*.4,rad=R*(1-ring*.115),phase=ring*.13+index*.4;
  ctx.beginPath();for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2;const [x,y]=point(shape,a+phase,k,rad,t*(.22+ring*.025));i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.strokeStyle=colors[(ring+index)%colors.length];ctx.globalAlpha=alpha+.2*energy;ctx.lineWidth=(.65+ring*.55)*(1+energy);ctx.shadowColor=colors[(ring+index)%colors.length];ctx.shadowBlur=(8+ring*7)*state.g*(1+energy*1.8);ctx.stroke();
 }
 ctx.globalAlpha=.26+.18*energy;ctx.rotate(-rot*1.7);ctx.beginPath();for(let i=0;i<=k*3;i++){const a=i/(k*3)*Math.PI*2,rr=R*(i%3? .78:.25);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.strokeStyle=colors[(index+2)%colors.length];ctx.lineWidth=.55;ctx.stroke();ctx.restore();
}
function audioTick(){if(!analyser)return 0;analyser.getByteFrequencyData(data);let sum=0;const n=Math.min(96,data.length);for(let i=2;i<n;i++)sum+=data[i];const raw=sum/n/255;audioLevel+=(raw-audioLevel)*.16;return audioLevel}
function draw(now){const dt=Math.min(.04,(now-last)/1000);last=now;t+=dt;const energy=audioTick()||(.5+.5*Math.sin(t*1.3))*state.u*.12;
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(2,2,7,${Math.max(.025,1-state.t)})`;ctx.fillRect(0,0,w,h);
 const cols=palettes[state.p];layer(state.a,state.ca,state.za,t*state.sa,cols,0,energy);layer(state.b,state.cb,state.zb,t*state.sb,cols,1,energy);
 frames++;if(now-lastFps>800){$('#fps').textContent=Math.round(frames*1000/(now-lastFps))+' FPS';frames=0;lastFps=now}requestAnimationFrame(draw)}

async function useMic(){try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});setupAudio(audioCtx?.createMediaStreamSource(stream)||null);$('#audioBtn').classList.add('active');$('#audioStatus').textContent='MIC REACTIVE'}catch{$('#audioStatus').textContent='MIC BLOCKED'}}
function setupAudio(node){audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(!node)return;analyser=audioCtx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.82;node.connect(analyser);data=new Uint8Array(analyser.frequencyBinCount)}
$('#audioBtn').addEventListener('click',useMic);$('#audioFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const audio=$('#audio');audio.src=URL.createObjectURL(f);audio.loop=true;audio.play();audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();source=source||audioCtx.createMediaElementSource(audio);analyser=audioCtx.createAnalyser();analyser.fftSize=512;source.connect(analyser);analyser.connect(audioCtx.destination);data=new Uint8Array(analyser.frequencyBinCount);$('#audioStatus').textContent=f.name.toUpperCase().slice(0,20)});
function toggleUI(){document.body.classList.toggle('controls-hidden')}
function fullscreen(){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.()}
function randomise(){const keys=Object.keys(palettes);state={name:'Wild Signal',a:shapes[Math.random()*shapes.length|0],b:shapes[Math.random()*shapes.length|0],sa:(Math.random()*.7+.04)*(Math.random()<.5?-1:1),sb:(Math.random()*.7+.04)*(Math.random()<.5?-1:1),ca:5+Math.random()*25|0,cb:5+Math.random()*25|0,za:.45+Math.random()*.7,zb:.35+Math.random()*.65,p:keys[Math.random()*keys.length|0],g:.65+Math.random()*1.3,t:.62+Math.random()*.32,u:.15+Math.random()*.7,blend:['lighter','screen','difference'][Math.random()*3|0]};sync()}
$('#hideBtn').onclick=$('#restoreBtn').onclick=toggleUI;$('#fullscreenBtn').onclick=fullscreen;$('#randomBtn').onclick=randomise;
const castDialog=$('#castDialog');let presentationRequest;
function openCast(){castDialog.showModal()}
async function launchCast(){
 try{
  if('PresentationRequest'in window){presentationRequest=presentationRequest||new PresentationRequest([location.href.split('?')[0]+'?display=1']);const connection=await presentationRequest.start();$('#castMessage').textContent='Connected. Keep this tab open as the controller.';$('#castBtn').classList.add('active');connection.onterminate=()=>$('#castBtn').classList.remove('active')}
  else{$('#castMessage').textContent='Direct display discovery is unavailable in this browser. Use Chrome’s Cast tab option below.'}
 }catch(e){$('#castMessage').textContent=e.name==='NotFoundError'?'No display selected. You can also use Chrome’s Cast tab option below.':'Your browser blocked direct discovery. Use Chrome’s Cast tab option below.'}
}
$('#castBtn').onclick=openCast;$('#castLaunch').onclick=launchCast;$('.dialog-close').onclick=()=>castDialog.close();castDialog.addEventListener('click',e=>{if(e.target===castDialog)castDialog.close()});
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')toggleUI();if(e.key.toLowerCase()==='f')fullscreen();if(e.key.toLowerCase()==='r')randomise();if(e.code==='Space'){e.preventDefault();setPreset((presets.findIndex(p=>p.name===state.name)+1)%presets.length)}});
canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX/w;pointer.y=e.clientY/h});canvas.addEventListener('dblclick',toggleUI);canvas.addEventListener('pointerdown',e=>{pointer.down=true;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointerup',()=>pointer.down=false);
addEventListener('resize',resize);resize();sync();if(new URLSearchParams(location.search).has('display'))document.body.classList.add('controls-hidden');requestAnimationFrame(draw);
