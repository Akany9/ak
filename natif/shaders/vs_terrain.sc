$input a_position, a_color1
$output v_monde, v_uv, v_splat
// Terrain par chunks (document r88, § 7 : TerrainRenderer, chunks 32 × 32, tampons dynamiques).
// a_color1 : poids de la splatmap du cœur (herbe, terre, roche, neige). Jumeau de web/src/rendu/terrain.js.
#include <bgfx_shader.sh>
uniform vec4 u_monde;   // x : taille du monde, y/z : origine flottante
void main() {
  vec4 m = mul(u_model[0], vec4(a_position, 1.0));
  v_monde = m.xyz; v_splat = a_color1;
  v_uv = (vec2(m.x + u_monde.y, m.z + u_monde.z) + 0.5 * u_monde.x) / u_monde.x;
  gl_Position = mul(u_viewProj, m);
}
