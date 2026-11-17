$input a_position, a_texcoord0
$output v_monde, v_uv, v_color0
// Jumeau bgfx du vertex shader de web/src/rendu/terrain.js. a_texcoord0.x : biome de la cellule.
#include <bgfx_shader.sh>
uniform vec4 u_monde;   // x : taille du monde, y/z : origine flottante
void main() {
  vec4 m = mul(u_model[0], vec4(a_position, 1.0));
  v_monde = m.xyz;
  v_uv = (vec2(m.x + u_monde.y, m.z + u_monde.z) + 0.5 * u_monde.x) / u_monde.x;
  v_color0 = vec4(a_texcoord0.x, 0.0, 0.0, 1.0);
  gl_Position = mul(u_viewProj, m);
}
