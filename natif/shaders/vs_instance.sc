$input a_position, i_data0, i_data1, i_data2, i_data3, i_data4
$output v_monde, v_color0
// Boîtes instanciées (bâtiments, soldats, camions) : une matrice + une couleur par instance (instanciation GPU, § 4).
#include <bgfx_shader.sh>
void main() {
  mat4 modele = mtxFromCols(i_data0, i_data1, i_data2, i_data3);
  vec4 m = mul(modele, vec4(a_position, 1.0));
  v_monde = m.xyz; v_color0 = i_data4;
  gl_Position = mul(u_viewProj, m);
}
