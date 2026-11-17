$input a_position, a_normal, i_data0, i_data1, i_data2, i_data3, i_data4
$output v_color0
// Contour d'escouade à travers les murs (document r88, § 4 : vs_outline). Version instanciée : extrusion dans
// l'espace écran proportionnelle à w (épaisseur constante à l'écran). Couleur et épaisseur par instance (i_data4).
#include <bgfx_shader.sh>
uniform vec4 u_outline_params;   // x : épaisseur
void main() {
  mat4 modele = mtxFromCols(i_data0, i_data1, i_data2, i_data3);
  vec4 pos_cs = mul(u_viewProj, mul(modele, vec4(a_position, 1.0)));
  vec3 normal_cs = mul(u_viewProj, mul(modele, vec4(a_normal, 0.0))).xyz;
  float l = length(normal_cs.xy);
  if (l > 1e-5) pos_cs.xy += normal_cs.xy / l * (u_outline_params.x * pos_cs.w * 0.002);
  v_color0 = i_data4;
  gl_Position = pos_cs;
}
