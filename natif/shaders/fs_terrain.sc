$input v_monde, v_uv, v_splat
// Splatting 4 couches (document r88, § 7) + cartes de chaleur, lignes de niveau et brouillard d'information de la
// vue stratégique. u_mode.x = 1 : sortie thermique (température dans .r) pour la passe FLIR.
#include <bgfx_shader.sh>
uniform vec4 u_soleil, u_couleurSoleil, u_ciel, u_sol, u_brouillard, u_oeil, u_mode;
uniform vec4 u_params;        // x carte de chaleur, y lignes de niveau, z densité du brouillard, w brouillard d'information
SAMPLER2D(s_chaleur, 0);
SAMPLER2D(s_incertitude, 1);
SAMPLER2D(s_layerGrass, 2);
SAMPLER2D(s_layerDirt, 3);
SAMPLER2D(s_layerRock, 4);
SAMPLER2D(s_layerSnow, 5);
vec3 rampe(float t) { return mix(mix(vec3(0.12, 0.22, 0.55), vec3(0.15, 0.75, 0.55), smoothstep(0.0, 0.5, t)), vec3(0.98, 0.82, 0.25), smoothstep(0.5, 1.0, t)); }
void main() {
  vec3 n = normalize(cross(dFdx(v_monde), dFdy(v_monde)));
  if (n.y < 0.0) n = -n;
  vec4 w = v_splat; w /= max(w.x + w.y + w.z + w.w, 0.0001);
  vec2 uv = v_monde.xz * 0.1;   // tuilage à l'échelle du monde
  vec3 albedo = texture2D(s_layerGrass, uv).rgb * w.x + texture2D(s_layerDirt, uv).rgb * w.y + texture2D(s_layerRock, uv * 0.5).rgb * w.z + texture2D(s_layerSnow, uv).rgb * w.w;
  float lambert = max(dot(n, normalize(u_soleil.xyz)), 0.0);
  if (u_mode.x > 0.5) {   // température du sol : rayonnement solaire absorbé, roche et terre plus chaudes que l'herbe
    float t = 0.12 + 0.18 * lambert * length(u_couleurSoleil.xyz) * (0.6 + 0.4 * (w.y + w.z)) - 0.08 * w.w;
    gl_FragColor = vec4(t, t, t, 1.0); return;
  }
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
