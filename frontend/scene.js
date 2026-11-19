import { fragment } from './material.js';

const sculpture = document.querySelector('.sculpture');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const rest = { x: -.31, y: -.10 };
let session;

async function illuminate() {
  const field = new Image();
  field.src = '/relief.png';
  await field.decode();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {
    alpha: true, depth: false, stencil: false, antialias: false, powerPreference: 'low-power'
  });
  if (!gl) return;
  const vertex = `attribute vec2 point; varying vec2 screen;
    void main(){screen=point; gl_Position=vec4(point,0.,1.);}`;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const point = gl.getAttribLocation(program, 'point');
  gl.enableVertexAttribArray(point);
  gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, field);
  for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, axis, gl.CLAMP_TO_EDGE);
  for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
  const angle = gl.getUniformLocation(program, 'angle');
  const exposure = gl.getUniformLocation(program, 'exposure');
  const controller = new AbortController();
  const on = (node, event, handler) => node.addEventListener(event, handler, {signal: controller.signal});
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  let frame = 0, previous = 0, start = 0, pulse = 0, pointer = null;
  let x = rest.x, y = rest.y, targetX = x, targetY = y;

  function render(now) {
    frame = 0;
    if (document.hidden) return;
    const dt = Math.min(64, now - previous || 16);
    previous = now;
    const mix = 1 - Math.exp(-dt / 100);
    x += (targetX - x) * mix;
    y += (targetY - y) * mix;
    const entrance = start ? Math.max(0, 1 - (now-start)/1600) : 0;
    const beat = pulse ? Math.min(1, Math.max(0,(now-pulse)/1250)) : 1;
    const sweep = Math.sin(beat*Math.PI) ** 2;
    const opening = Math.sin(entrance*Math.PI) ** 2;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(angle, x - .48*opening + .48*sweep, y + .085*opening);
    gl.uniform1f(exposure, .91 + .20*opening + .12*sweep);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if (entrance > 0 || beat < 1 || Math.abs(targetX-x)+Math.abs(targetY-y)>.001) request();
  }
  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() {
    const side = Math.min(1000, Math.max(1, Math.round(sculpture.clientWidth*Math.min(devicePixelRatio,1.6))));
    if (canvas.width !== side || canvas.height !== side) canvas.width = canvas.height = side;
    request();
  }
  function settle() { targetX=rest.x; targetY=rest.y; request(); }
  function shine() { pulse=performance.now(); start=0; request(); }
  function endPointer(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const tapped = event.type === 'pointerup' && pointer.travel < 7;
    pointer = null;
    delete sculpture.dataset.dragging;
    if (sculpture.hasPointerCapture(event.pointerId)) sculpture.releasePointerCapture(event.pointerId);
    if (tapped) shine();
    settle();
  }
  on(sculpture,'pointerdown',event=>{
    if (!event.isPrimary || event.button !== 0) return;
    pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, travel:0};
    start=0; pulse=0;
    sculpture.setPointerCapture(event.pointerId);
    sculpture.dataset.dragging='';
  });
  on(sculpture,'pointermove',event=>{
    if (pointer && event.pointerId===pointer.id) {
      const dx=event.clientX-pointer.x, dy=event.clientY-pointer.y;
      pointer.travel=Math.max(pointer.travel,Math.hypot(dx,dy));
      targetX=rest.x-clamp(dx/sculpture.clientWidth*2.1,1.05);
      targetY=rest.y+clamp(dy/sculpture.clientHeight*1.5,.55);
    } else if (!pointer && event.pointerType==='mouse') {
      const box=sculpture.getBoundingClientRect();
      targetX=rest.x+((event.clientX-box.left)/box.width-.5)*.31;
      targetY=rest.y+((event.clientY-box.top)/box.height-.5)*.18;
    } else return;
    request();
  });
  on(sculpture,'pointerleave',()=>{ if (!pointer) settle(); });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) on(sculpture,type,endPointer);
  on(sculpture,'keydown',event=>{
    if (event.key==='Enter' || event.key===' ') {
      event.preventDefault();
      if (!event.repeat) shine();
    }
  });
  on(sculpture,'click',event=>{ if (event.detail===0) shine(); });
  on(document,'visibilitychange',()=>{
    if (document.hidden) {
      cancelAnimationFrame(frame); frame=0; start=0; pulse=0;
    } else {previous=0; settle();}
  });
  const observer = new ResizeObserver(resize);
  const dispose = () => {
    controller.abort(); observer.disconnect(); cancelAnimationFrame(frame);
    delete sculpture.dataset.ready; delete sculpture.dataset.dragging;
    sculpture.removeAttribute('tabindex'); sculpture.setAttribute('role','img');
    sculpture.setAttribute('aria-label','A polished metal symbol floating above a pool of amber light.');
    canvas.remove(); session=null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  if (motion.matches) { dispose(); return; }
  session = {dispose};
  on(canvas,'webglcontextlost',dispose);
  sculpture.append(canvas);
  observer.observe(sculpture);
  resize();
  start = performance.now();
  sculpture.tabIndex=0;
  sculpture.setAttribute('role','button');
  sculpture.setAttribute('aria-label','Turn the light across the sculpture');
  // Keep the poster visible until the GPU has painted at least one frame.
  requestAnimationFrame(time=>{
    if (!canvas.isConnected) return;
    if (frame) {cancelAnimationFrame(frame); frame=0;}
    render(time);
    sculpture.dataset.ready='';
  });
}
let loading = false;
async function syncMotion() {
  if (motion.matches) {session?.dispose(); return;}
  if (session || loading) return;
  loading = true;
  try { await illuminate(); } catch { /* The rendered still is the baseline experience. */ }
  finally { loading=false; }
}
motion.addEventListener('change',syncMotion);
syncMotion();
