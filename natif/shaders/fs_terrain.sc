$input v_monde, v_uv, v_color0
// Jumeau bgfx du fragment shader de web/src/rendu/terrain.js : mêmes calculs, uniformes regroupés en vec4.
#include <bgfx_shader.sh>
uniform vec4 u_soleil, u_couleurSoleil, u_ciel, u_sol, u_brouillard, u_oeil;
uniform vec4 u_params;        // x carte de chaleur, y lignes de niveau, z densité du brouillard, w brouillard d'information
uniform vec4 u_biomes[7];
SAMPLER2D(s_chaleur, 0);
SAMPLER2D(s_incertitude, 1);
vec3 rampe(float t) { return mix(mix(vec3(0.12, 0.22, 0.55), vec3(0.15, 0.75, 0.55), smoothstep(0.0, 0.5, t)), vec3(0.98, 0.82, 0.25), smoothstep(0.5, 1.0, t)); }
void main() {
  vec3 n = normalize(cross(dFdx(v_monde), dFdy(v_monde)));
  if (n.y < 0.0) n = -n;
  float pente = 1.0 - n.y;
  int b = int(v_color0.x + 0.5);
  vec3 albedo = u_biomes[0].xyz;
  for (int i = 1; i < 7; i++) { if (i == b) albedo = u_biomes[i].xyz; }
  albedo = mix(albedo, u_biomes[2].xyz, smoothstep(0.25, 0.55, pente));
  float grain = fract(sin(dot(floor(v_monde.xz * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
  albedo *= 0.94 + 0.12 * grain;
  float lambert = max(dot(n, normalize(u_soleil.xyz)), 0.0);
  vec3 ambiant = mix(u_sol.xyz, u_ciel.xyz, n.y * 0.5 + 0.5);
  vec3 c = albedo * (u_couleurSoleil.xyz * lambert + ambiant);
  float h = texture2D(s_chaleur, v_uv).x;
  c = mix(c, rampe(h) * (0.55 + 0.45 * lambert), u_params.x * 0.75);
  float niv = abs(fract(v_monde.y / 10.0 - 0.5) - 0.5) / max(fwidth(v_monde.y / 10.0), 1e-4);
  c = mix(c, c * 0.55, u_params.y * (1.0 - min(niv, 1.0)));
  float inc = texture2D(s_incertitude, v_uv).x * u_params.w;
  c = mix(c, vec3_splat(dot(c, vec3(0.3, 0.59, 0.11))) * 0.45, inc * 0.8);
  float d = length(v_monde - u_oeil.xyz);
  c = mix(c, u_brouillard.xyz, 1.0 - exp(-d * u_params.z));
  gl_FragColor = vec4(c, 1.0);
}
