$input v_texcoord0
// Vision thermique FLIR (document r88, § 4 : fs_thermal). Température lue dans la cible de la passe thermique,
// palette Ironbow, bruit de capteur CCD infrarouge animé, vignettage.
#include <bgfx_shader.sh>
SAMPLER2D(s_gBufferThermal, 0);
SAMPLER2D(s_noiseTex, 1);
uniform vec4 u_thermalTimeParams;   // x : temps, y : échelle du bruit
vec3 ironbow(float t) {
  t = clamp(t, 0.0, 1.0); vec3 c;
  c.r = smoothstep(0.0, 0.5, t); c.g = smoothstep(0.3, 0.8, t); c.b = smoothstep(0.7, 1.0, t) + (1.0 - smoothstep(0.0, 0.3, t)) * 0.2;
  return c;
}
void main() {
  float raw_temp = texture2D(s_gBufferThermal, v_texcoord0).r;
  vec2 noise_uv = v_texcoord0 * u_thermalTimeParams.y + vec2_splat(u_thermalTimeParams.x * 0.05);
  float noise = texture2D(s_noiseTex, noise_uv).r * 0.08 - 0.04;
  vec3 heat_color = ironbow(clamp(raw_temp + noise, 0.0, 1.0));
  vec2 uv = v_texcoord0 * (1.0 - v_texcoord0.yx);
  float vig = pow(uv.x * uv.y * 15.0, 0.25);
  gl_FragColor = vec4(heat_color * vig, 1.0);
}
