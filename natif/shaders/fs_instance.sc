$input v_monde, v_color0
#include <bgfx_shader.sh>
uniform vec4 u_soleil, u_couleurSoleil, u_ciel, u_sol, u_brouillard, u_oeil, u_params;
void main() {
  vec3 n = normalize(cross(dFdx(v_monde), dFdy(v_monde)));   // facettes plates
  if (dot(n, u_oeil.xyz - v_monde) < 0.0) n = -n;
  float lambert = max(dot(n, normalize(u_soleil.xyz)), 0.0);
  vec3 c = v_color0.xyz * (u_couleurSoleil.xyz * lambert + mix(u_sol.xyz, u_ciel.xyz, n.y * 0.5 + 0.5));
  float d = length(v_monde - u_oeil.xyz);
  gl_FragColor = vec4(mix(c, u_brouillard.xyz, 1.0 - exp(-d * u_params.z)), v_color0.w);
}
