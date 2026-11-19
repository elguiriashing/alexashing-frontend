// The field stores signed distance to the silhouette. Rounding the extrusion
// in object space gives the same continuous bevel around all three contours.
export const fragment = `
precision highp float;
uniform sampler2D relief;
uniform vec2 angle;
uniform float exposure;

varying vec2 screen;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}
vec3 toLocal(vec3 p) {
  p.xy = rot(-0.038) * p.xy;
  p.yz = rot(-angle.y) * p.yz;
  p.xz = rot(-angle.x) * p.xz;
  return p;
}
vec3 toWorld(vec3 p) {
  p.xz = rot(angle.x) * p.xz;
  p.yz = rot(angle.y) * p.yz;
  p.xy = rot(0.038) * p.xy;
  return p;
}
float outline(vec2 xy) {
  vec2 uv = xy * 0.5 + 0.5;
  vec2 sampleValue = texture2D(relief, clamp(uv, 0.0, 1.0)).rg;
  float d = (sampleValue.r*255.0 + sampleValue.g*(15.0/16.0) - 128.0) * (1.3 / 640.0);
  return d + length(max(abs(xy) - 1.0, 0.0));
}
float solid(vec3 p) {
  float d = outline(p.xy);
  // Slight crown, like a die-formed surface. The face picks up a broad
  // reflection while the much tighter radius on the rim catches a thin line.
  float crown = 0.012 * sin(p.x * 3.6 + p.y * 1.8) + 0.006 * cos(5.1 * p.y);
  crown += .023 * (1.0 - exp(min(d,0.0)*32.0));
  float bevel = 0.032;
  vec2 section = vec2(d + bevel, abs(p.z - crown) - 0.078 + bevel);
  return min(max(section.x, section.y), 0.0) + length(max(section, 0.0)) - bevel;
}
vec3 normalAt(vec3 p) {
  const float e = 0.0037;
  return normalize(vec3(
    solid(p+vec3(e,0.,0.))-solid(p-vec3(e,0.,0.)),
    solid(p+vec3(0.,e,0.))-solid(p-vec3(0.,e,0.)),
    solid(p+vec3(0.,0.,e))-solid(p-vec3(0.,0.,e))
  ));
}
float band(float x, float width) {
  return exp(-x*x/(width*width));
}
vec3 finish(vec3 p, vec3 n, vec3 v) {
  vec3 reflection = reflect(-v, n);
  // Finite studio cards, reflected on brushed black nickel. Using position
  // as well as direction gives a moving reflection across the flat face.
  vec2 q = reflection.xy + vec2(.90*p.x, .68*p.y);
  float diagonal = q.x + .64*q.y;
  float longCard = band(diagonal + .31, .37);
  float pearl = band(diagonal + .14, .15);
  float warm = band(diagonal - .53, .225);
  float rim = pow(1.0 - max(dot(n,v),0.0), 2.3);
  vec3 metal = vec3(.014,.018,.026);
  metal += vec3(.22,.25,.28)*longCard + vec3(.63,.66,.65)*pearl;
  metal += vec3(.72,.124,.021)*warm;
  metal += vec3(1.50,.40,.11)*band(q.y+.71-.21*q.x,.10);
  metal += vec3(.52,.49,.43)*band(q.y-.80+.12*q.x,.095);
  metal += rim * (vec3(.075,.079,.083) + vec3(.27,.115,.042)*smoothstep(-.6,.75,p.x));
  // Grazing bounce from the warm floor and a white strip behind the object.
  metal += vec3(.29,.080,.018)*max(0.,-n.y)*(.4+.6*rim);
  metal += vec3(.80,.81,.78)*pow(max(0., dot(n,normalize(vec3(-.65,.72,.26)))),16.);
  return pow(clamp(metal * exposure, 0., 1.), vec3(1./2.2));
}
void main() {
  vec3 eye = toLocal(vec3(0.,0.,3.65));
  vec3 ray = normalize(toLocal(vec3(screen * 1.19,-3.65)));
  // Clip to the thin bounding slab before sampling the distance field.
  vec3 inv = 1.0 / (ray + vec3(.0000001));
  vec3 box = vec3(.94,.75,.133);
  vec3 t1 = (-box-eye)*inv, t2 = (box-eye)*inv;
  vec3 lo = min(t1,t2), hi = max(t1,t2);
  float t = max(max(lo.x,lo.y),lo.z), end = min(min(hi.x,hi.y),hi.z);
  if (end < t) discard;
  vec3 p = eye + ray*t;
  float d = 1.0;
  for(int i=0;i<44;i++) {
    p = eye + ray*t;
    d = solid(p);
    if (d < .00085 || t > end) break;
    t += max(d*.90, .0005);
  }
  if(d > .0018 || t > end+.001) discard;
  vec3 world = toWorld(p);
  vec3 rgb = finish(world, normalize(toWorld(normalAt(p))), normalize(vec3(0.,0.,3.65)-world));
  float grain = fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor = vec4(rgb + grain*.009,1.);
}`;
