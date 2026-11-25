#pragma once
// Shaders GLSL inspirés des logiciels de montage, exécutés en plein milieu de la liste de rendu ImGui
// par des callbacks ImDrawList (aucun framebuffer supplémentaire) :
//   - Backdrop : fonds procéduraux du tableau blanc (papier, pointillés, millimétré, ardoise, dégradé, nuit) ;
//   - Grade    : étalonnage appliqué à la zone déjà dessinée (copie du framebuffer puis passe plein cadre) :
//                exposition, contraste, saturation, température / teinte, fondu, netteté, vignettage,
//                grain argentique, aberration chromatique, bandes cinéma et « looks » prédéfinis ;
//   - Glass    : verre dépoli (flou gaussien + teinte) derrière les palettes flottantes.
// En cas d'échec de compilation, Available() renvoie false et l'interface retombe sur le rendu ImGui simple.
#include <SDL3/SDL.h>
#include <SDL3/SDL_opengl.h>
#include <imgui.h>
#include <algorithm>
#include <cstdio>
#include <cstring>

namespace cl::ui::fx {

struct Rect { float x0, y0, x1, y1; };      // coordonnées écran ImGui

struct BackdropParams { Rect r; int mode; int dark; float panX, panY, zoom; };
struct GradeParams {
    Rect r; int preset; float mix, exposure, contrast, saturation, temperature, tint, fade, sharpen, vignette, grain, aberration; int letterbox;
};
struct GlassParams { Rect r; float radius, blur; float tint[4]; };

namespace detail {

struct Api {
    PFNGLCREATESHADERPROC CreateShader = nullptr; PFNGLSHADERSOURCEPROC ShaderSource = nullptr; PFNGLCOMPILESHADERPROC CompileShader = nullptr;
    PFNGLGETSHADERIVPROC GetShaderiv = nullptr; PFNGLGETSHADERINFOLOGPROC GetShaderInfoLog = nullptr; PFNGLDELETESHADERPROC DeleteShader = nullptr;
    PFNGLCREATEPROGRAMPROC CreateProgram = nullptr; PFNGLATTACHSHADERPROC AttachShader = nullptr; PFNGLLINKPROGRAMPROC LinkProgram = nullptr;
    PFNGLGETPROGRAMIVPROC GetProgramiv = nullptr; PFNGLGETPROGRAMINFOLOGPROC GetProgramInfoLog = nullptr; PFNGLDELETEPROGRAMPROC DeleteProgram = nullptr;
    PFNGLUSEPROGRAMPROC UseProgram = nullptr; PFNGLGETUNIFORMLOCATIONPROC GetUniformLocation = nullptr;
    PFNGLUNIFORM1FPROC Uniform1f = nullptr; PFNGLUNIFORM2FPROC Uniform2f = nullptr; PFNGLUNIFORM4FPROC Uniform4f = nullptr; PFNGLUNIFORM1IPROC Uniform1i = nullptr;
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays = nullptr; PFNGLBINDVERTEXARRAYPROC BindVertexArray = nullptr; PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays = nullptr;
    PFNGLACTIVETEXTUREPROC ActiveTexture = nullptr;
};

struct State {
    Api gl; bool ok = false;
    GLuint vao = 0, progBackdrop = 0, progGrade = 0, progGlass = 0, copyTex = 0;
    int texW = 0, texH = 0;
};
inline State& St() { static State s; return s; }

// Triangle plein cadre généré sans tampon de sommets.
inline const char* kVs = R"(#version 150
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }
)";

inline const char* kCommon = R"(#version 150
out vec4 o;
uniform vec2 uOrigin;   // coin inférieur gauche de la zone (pixels du framebuffer)
uniform vec2 uSize;     // taille de la zone (pixels)
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; ++i) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
)";

inline const char* kBackdropFs = R"(
uniform int uMode; uniform int uDark; uniform vec2 uPan; uniform float uZoom;
void main() {
  vec2 lp = vec2(gl_FragCoord.x - uOrigin.x, uSize.y - (gl_FragCoord.y - uOrigin.y));   // haut-gauche = 0
  vec2 w = (lp - uPan) / uZoom;                                                          // coordonnées monde
  vec2 uv = lp / uSize;
  bool dk = uDark != 0;
  vec3 c;
  if (uMode == 1) {                       // papier : fibres + grain doux, suit le déplacement
    vec3 base = dk ? vec3(0.17, 0.165, 0.155) : vec3(0.985, 0.972, 0.94);
    float f = fbm(w * 0.035) * 0.6 + fbm(w * vec2(0.6, 0.08)) * 0.4;
    c = base + (f - 0.5) * (dk ? 0.035 : 0.045) + (hash(floor(w * 1.5)) - 0.5) * 0.012;
  } else if (uMode == 2) {                // pointillés (bullet journal)
    vec3 base = dk ? vec3(0.13, 0.135, 0.15) : vec3(0.988, 0.988, 0.992);
    vec2 g = mod(w, 24.0) - 12.0; float d = length(g) * uZoom;
    float dot_ = 1.0 - smoothstep(1.0, 2.0, d);
    c = mix(base, dk ? vec3(0.32, 0.33, 0.37) : vec3(0.76, 0.77, 0.8), dot_);
  } else if (uMode == 3) {                // papier millimétré
    vec3 base = dk ? vec3(0.11, 0.13, 0.15) : vec3(0.985, 0.992, 0.99);
    vec3 ink = dk ? vec3(0.2, 0.42, 0.5) : vec3(0.36, 0.66, 0.72);
    vec2 g1 = abs(mod(w + 2.5, 5.0) - 2.5) * uZoom, g2 = abs(mod(w + 25.0, 50.0) - 25.0) * uZoom;
    float l1 = 1.0 - smoothstep(0.0, 1.0, min(g1.x, g1.y)), l2 = 1.0 - smoothstep(0.4, 1.6, min(g2.x, g2.y));
    c = mix(base, ink, l1 * (uZoom > 0.6 ? 0.22 : 0.0)); c = mix(c, ink, l2 * 0.55);
  } else if (uMode == 4) {                // ardoise : craie estompée
    vec3 base = vec3(0.16, 0.22, 0.2);
    float s = fbm(w * 0.004 + 3.0), t = fbm(w * vec2(0.012, 0.03) + 9.0);
    c = base + (s - 0.5) * 0.07 + smoothstep(0.62, 0.9, t) * 0.05 + (hash(floor(w * 2.0)) - 0.5) * 0.015;
    c *= 1.0 - 0.25 * pow(length(uv - 0.5) * 1.3, 2.0);
  } else if (uMode == 5) {                // dégradé maillé façon fond d'écran macOS (fixe à l'écran)
    vec3 a = dk ? vec3(0.13, 0.11, 0.3) : vec3(0.98, 0.84, 0.76), b = dk ? vec3(0.03, 0.2, 0.32) : vec3(0.76, 0.86, 1.0);
    vec3 d = dk ? vec3(0.3, 0.08, 0.22) : vec3(0.96, 0.78, 0.92), e = dk ? vec3(0.06, 0.06, 0.1) : vec3(0.92, 0.96, 0.9);
    float n = fbm(uv * 2.2 + 4.0);
    c = mix(mix(a, b, smoothstep(0.0, 1.0, uv.x + (n - 0.5) * 0.6)), mix(d, e, smoothstep(0.0, 1.0, uv.x - (n - 0.5) * 0.5)), smoothstep(0.0, 1.0, uv.y + (n - 0.5) * 0.4));
    c += (hash(lp) - 0.5) / 255.0 * 2.0;  // tramage anti-bandes
  } else {                                // nuit étoilée douce
    vec3 top = vec3(0.04, 0.05, 0.11), bot = vec3(0.1, 0.08, 0.2);
    c = mix(top, bot, uv.y);
    vec2 cell = floor(w * 0.08); float h = hash(cell);
    float star = step(0.985, h) * (1.0 - smoothstep(0.0, 0.08, length(fract(w * 0.08) - 0.5) / max(uZoom, 0.3)));
    c += star * vec3(0.9, 0.92, 1.0) * (0.5 + 0.5 * hash(cell + 7.0));
    c += fbm(w * 0.003) * vec3(0.05, 0.03, 0.08);
  }
  o = vec4(c, 1.0);
}
)";

inline const char* kGradeFs = R"(
uniform sampler2D uTex; uniform vec2 uTexSize;
uniform int uPreset; uniform float uMix, uExposure, uContrast, uSaturation, uTemp, uTint, uFade, uSharpen, uVignette, uGrain, uAberr; uniform int uLetterbox;
vec3 tap(vec2 px) { return texture(uTex, clamp(px, vec2(0.5), uSize - 0.5) / uTexSize).rgb; }
vec3 look(vec3 c, int p) {
  float l = luma(c);
  if (p == 1) {                             // cinéma : ombres sarcelle, hautes lumières orangées
    vec3 sh = vec3(0.0, 0.42, 0.5), hi = vec3(1.0, 0.62, 0.32);
    c = mix(c, c * (0.75 + 0.5 * sh), (1.0 - l) * 0.55); c = mix(c, c * (0.8 + 0.4 * hi), l * 0.5);
    c = mix(vec3(l), c, 1.12); c = smoothstep(-0.04, 1.04, c);
  } else if (p == 2) {                      // argentique noir et blanc
    float g = luma(c * vec3(1.05, 1.0, 0.85)); g = smoothstep(0.02, 0.98, g); c = vec3(g);
  } else if (p == 3) {                      // sépia
    c = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
    c = mix(vec3(l), c, 0.9);
  } else if (p == 4) {                      // bleach bypass : contraste dur, couleurs lavées
    vec3 ov = mix(2.0 * c * l, 1.0 - 2.0 * (1.0 - c) * (1.0 - l), step(0.5, l));
    c = mix(c, ov, 0.7); c = mix(vec3(luma(c)), c, 0.55);
  } else if (p == 5) {                      // vintage chaud (pellicule inversible)
    c = c * vec3(1.08, 1.0, 0.86) + vec3(0.03, 0.02, 0.0); c.r = smoothstep(-0.05, 1.0, c.r); c.b = c.b * 0.9 + 0.05;
  } else if (p == 6) {                      // nuit américaine
    c = mix(vec3(l), c, 0.45) * vec3(0.62, 0.78, 1.15) * 0.8;
  } else if (p == 7) {                      // pastel / craie
    c = mix(vec3(l), c, 0.65) * 0.82 + 0.16;
  }
  return c;
}
void main() {
  vec2 px = gl_FragCoord.xy - uOrigin;      // origine bas-gauche, identique à la copie
  vec2 uv = px / uSize;
  vec2 dir = (uv - 0.5);
  vec3 c;
  if (uAberr > 0.0) { vec2 off = dir * uAberr * 6.0;
    c = vec3(tap(px + off).r, tap(px).g, tap(px - off).b); }
  else c = tap(px);
  if (uSharpen > 0.0) {
    vec3 n = tap(px + vec2(1, 0)) + tap(px - vec2(1, 0)) + tap(px + vec2(0, 1)) + tap(px - vec2(0, 1));
    c += (c - n * 0.25) * uSharpen * 1.5;
  }
  vec3 src = c;
  c *= exp2(uExposure);
  c *= vec3(1.0 + uTemp * 0.12, 1.0 + uTint * 0.08, 1.0 - uTemp * 0.12);
  c = (c - 0.5) * uContrast + 0.5;
  c = mix(vec3(luma(c)), c, uSaturation);
  c = mix(c, look(clamp(c, 0.0, 1.0), uPreset), uMix);
  c = c * (1.0 - uFade * 0.22) + uFade * 0.1;
  float d = length(dir * vec2(uSize.x / uSize.y, 1.0));
  c *= 1.0 - uVignette * smoothstep(0.3, 1.05, d * 1.25);
  if (uGrain > 0.0) { float g = hash(floor(px / 1.5)) + hash(floor(px / 1.5) + 31.7) - 1.0; c += g * uGrain * 0.09 * (1.0 - abs(luma(c) - 0.5)); }
  if (uLetterbox != 0) { float barH = max(0.0, (uSize.y - uSize.x / 2.39) * 0.5); if (px.y < barH || px.y > uSize.y - barH) c = vec3(0.0); }
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}
)";

inline const char* kGlassFs = R"(
uniform sampler2D uTex; uniform vec2 uTexSize; uniform float uRadius, uBlur; uniform vec4 uTint;
float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 px = gl_FragCoord.xy - uOrigin;
  float sd = sdRound(px - uSize * 0.5, uSize * 0.5, uRadius);
  if (sd > 0.0) discard;
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int y = -3; y <= 3; ++y) for (int x = -3; x <= 3; ++x) {
    vec2 o2 = vec2(x, y); float w = exp(-dot(o2, o2) / 8.0);
    acc += texture(uTex, clamp(px + o2 * uBlur, vec2(0.5), uSize - 0.5) / uTexSize).rgb * w; wsum += w;
  }
  vec3 c = acc / wsum;
  c = mix(vec3(luma(c)), c, 1.35);            // vibrance façon NSVisualEffectView
  o = vec4(mix(c, uTint.rgb, uTint.a), 1.0);
}
)";

template <class F> inline void Load(F& f, const char* name) { f = reinterpret_cast<F>(SDL_GL_GetProcAddress(name)); }

inline GLuint Compile(GLenum type, const char* a, const char* b = "") {
    Api& g = St().gl;
    GLuint s = g.CreateShader(type);
    const char* srcs[2] = {a, b};
    g.ShaderSource(s, 2, srcs, nullptr); g.CompileShader(s);
    GLint ok = 0; g.GetShaderiv(s, GL_COMPILE_STATUS, &ok);
    if (!ok) { char log[2048]; g.GetShaderInfoLog(s, sizeof log, nullptr, log); std::fprintf(stderr, "[fx] shader : %s\n", log); g.DeleteShader(s); return 0; }
    return s;
}
inline GLuint Link(const char* fsBody) {
    Api& g = St().gl;
    GLuint vs = Compile(GL_VERTEX_SHADER, kVs), fs = Compile(GL_FRAGMENT_SHADER, kCommon, fsBody);
    if (!vs || !fs) return 0;
    GLuint p = g.CreateProgram(); g.AttachShader(p, vs); g.AttachShader(p, fs); g.LinkProgram(p);
    g.DeleteShader(vs); g.DeleteShader(fs);
    GLint ok = 0; g.GetProgramiv(p, GL_LINK_STATUS, &ok);
    if (!ok) { char log[2048]; g.GetProgramInfoLog(p, sizeof log, nullptr, log); std::fprintf(stderr, "[fx] édition de liens : %s\n", log); g.DeleteProgram(p); return 0; }
    return p;
}

// Zone en pixels du framebuffer (origine bas-gauche), intersectée avec le rectangle de découpe.
struct FbRect { int x, y, w, h; float sx, sy; };
inline bool ToFb(const Rect& r, const ImDrawCmd* cmd, FbRect& out) {
    ImDrawData* dd = ImGui::GetDrawData();
    if (!dd) return false;
    float sx = dd->FramebufferScale.x, sy = dd->FramebufferScale.y;
    int fbH = (int)(dd->DisplaySize.y * sy);
    // La zone d'effet reste celle demandée ; ce qui dépasse le rectangle de découpe est écarté par le scissor.
    if (r.x1 <= cmd->ClipRect.x || r.x0 >= cmd->ClipRect.z || r.y1 <= cmd->ClipRect.y || r.y0 >= cmd->ClipRect.w) return false;
    out.x = (int)((r.x0 - dd->DisplayPos.x) * sx); out.w = (int)((r.x1 - r.x0) * sx);
    out.h = (int)((r.y1 - r.y0) * sy); out.y = fbH - (int)((r.y1 - dd->DisplayPos.y) * sy);
    out.sx = sx; out.sy = sy;
    return out.w > 0 && out.h > 0;
}
inline void Scissor(const ImDrawCmd* cmd) {
    ImDrawData* dd = ImGui::GetDrawData();
    float sx = dd->FramebufferScale.x, sy = dd->FramebufferScale.y;
    int fbH = (int)(dd->DisplaySize.y * sy);
    int x0 = (int)((cmd->ClipRect.x - dd->DisplayPos.x) * sx), y0 = (int)((cmd->ClipRect.y - dd->DisplayPos.y) * sy);
    int x1 = (int)((cmd->ClipRect.z - dd->DisplayPos.x) * sx), y1 = (int)((cmd->ClipRect.w - dd->DisplayPos.y) * sy);
    glEnable(GL_SCISSOR_TEST); glScissor(x0, fbH - y1, std::max(0, x1 - x0), std::max(0, y1 - y0));
}
// Copie la zone du framebuffer courant dans la texture partagée (agrandie si nécessaire).
inline void CopyRegion(const FbRect& f) {
    State& s = St();
    ImDrawData* dd = ImGui::GetDrawData();
    int fbW = (int)(dd->DisplaySize.x * dd->FramebufferScale.x), fbH = (int)(dd->DisplaySize.y * dd->FramebufferScale.y);
    s.gl.ActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, s.copyTex);
    if (f.w > s.texW || f.h > s.texH) {
        s.texW = std::max(s.texW, f.w); s.texH = std::max(s.texH, f.h);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, s.texW, s.texH, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
    }
    int x = std::max(0, f.x), y = std::max(0, f.y);
    int w = std::min(f.x + f.w, fbW) - x, h = std::min(f.y + f.h, fbH) - y;
    if (w > 0 && h > 0) glCopyTexSubImage2D(GL_TEXTURE_2D, 0, x - f.x, y - f.y, x, y, w, h);
}
inline void Begin(GLuint prog, const FbRect& f) {
    State& s = St();
    glDisable(GL_BLEND);
    glViewport(f.x, f.y, f.w, f.h);
    s.gl.UseProgram(prog);
    s.gl.BindVertexArray(s.vao);
    s.gl.Uniform2f(s.gl.GetUniformLocation(prog, "uOrigin"), (float)f.x, (float)f.y);
    s.gl.Uniform2f(s.gl.GetUniformLocation(prog, "uSize"), (float)f.w, (float)f.h);
}
inline void End() { glDrawArrays(GL_TRIANGLES, 0, 3); glEnable(GL_BLEND); }

inline void BackdropCb(const ImDrawList*, const ImDrawCmd* cmd) {
    State& s = St(); if (!s.progBackdrop) return;
    const auto* p = static_cast<const BackdropParams*>(cmd->UserCallbackData);
    FbRect f; if (!ToFb(p->r, cmd, f)) return;
    Scissor(cmd); Begin(s.progBackdrop, f);
    Api& g = s.gl; GLuint pr = s.progBackdrop;
    g.Uniform1i(g.GetUniformLocation(pr, "uMode"), p->mode); g.Uniform1i(g.GetUniformLocation(pr, "uDark"), p->dark);
    g.Uniform2f(g.GetUniformLocation(pr, "uPan"), p->panX * f.sx, p->panY * f.sy);
    g.Uniform1f(g.GetUniformLocation(pr, "uZoom"), p->zoom * f.sx);
    End();
}
inline void GradeCb(const ImDrawList*, const ImDrawCmd* cmd) {
    State& s = St(); if (!s.progGrade) return;
    const auto* p = static_cast<const GradeParams*>(cmd->UserCallbackData);
    FbRect f; if (!ToFb(p->r, cmd, f)) return;
    CopyRegion(f); Scissor(cmd); Begin(s.progGrade, f);
    Api& g = s.gl; GLuint pr = s.progGrade;
    g.Uniform1i(g.GetUniformLocation(pr, "uTex"), 0);
    g.Uniform2f(g.GetUniformLocation(pr, "uTexSize"), (float)s.texW, (float)s.texH);
    g.Uniform1i(g.GetUniformLocation(pr, "uPreset"), p->preset); g.Uniform1f(g.GetUniformLocation(pr, "uMix"), p->mix);
    g.Uniform1f(g.GetUniformLocation(pr, "uExposure"), p->exposure); g.Uniform1f(g.GetUniformLocation(pr, "uContrast"), p->contrast);
    g.Uniform1f(g.GetUniformLocation(pr, "uSaturation"), p->saturation); g.Uniform1f(g.GetUniformLocation(pr, "uTemp"), p->temperature);
    g.Uniform1f(g.GetUniformLocation(pr, "uTint"), p->tint); g.Uniform1f(g.GetUniformLocation(pr, "uFade"), p->fade);
    g.Uniform1f(g.GetUniformLocation(pr, "uSharpen"), p->sharpen); g.Uniform1f(g.GetUniformLocation(pr, "uVignette"), p->vignette);
    g.Uniform1f(g.GetUniformLocation(pr, "uGrain"), p->grain); g.Uniform1f(g.GetUniformLocation(pr, "uAberr"), p->aberration * f.sx);
    g.Uniform1i(g.GetUniformLocation(pr, "uLetterbox"), p->letterbox);
    End();
}
inline void GlassCb(const ImDrawList*, const ImDrawCmd* cmd) {
    State& s = St(); if (!s.progGlass) return;
    const auto* p = static_cast<const GlassParams*>(cmd->UserCallbackData);
    FbRect f; if (!ToFb(p->r, cmd, f)) return;
    CopyRegion(f); Scissor(cmd); Begin(s.progGlass, f);
    Api& g = s.gl; GLuint pr = s.progGlass;
    g.Uniform1i(g.GetUniformLocation(pr, "uTex"), 0);
    g.Uniform2f(g.GetUniformLocation(pr, "uTexSize"), (float)s.texW, (float)s.texH);
    g.Uniform1f(g.GetUniformLocation(pr, "uRadius"), p->radius * f.sx); g.Uniform1f(g.GetUniformLocation(pr, "uBlur"), p->blur * f.sx);
    g.Uniform4f(g.GetUniformLocation(pr, "uTint"), p->tint[0], p->tint[1], p->tint[2], p->tint[3]);
    End();
}

} // namespace detail

// ---------------------------------------------------------------- API publique
inline bool Init() {
    using namespace detail;
    State& s = St();
    Api& g = s.gl;
    Load(g.CreateShader, "glCreateShader"); Load(g.ShaderSource, "glShaderSource"); Load(g.CompileShader, "glCompileShader");
    Load(g.GetShaderiv, "glGetShaderiv"); Load(g.GetShaderInfoLog, "glGetShaderInfoLog"); Load(g.DeleteShader, "glDeleteShader");
    Load(g.CreateProgram, "glCreateProgram"); Load(g.AttachShader, "glAttachShader"); Load(g.LinkProgram, "glLinkProgram");
    Load(g.GetProgramiv, "glGetProgramiv"); Load(g.GetProgramInfoLog, "glGetProgramInfoLog"); Load(g.DeleteProgram, "glDeleteProgram");
    Load(g.UseProgram, "glUseProgram"); Load(g.GetUniformLocation, "glGetUniformLocation");
    Load(g.Uniform1f, "glUniform1f"); Load(g.Uniform2f, "glUniform2f"); Load(g.Uniform4f, "glUniform4f"); Load(g.Uniform1i, "glUniform1i");
    Load(g.GenVertexArrays, "glGenVertexArrays"); Load(g.BindVertexArray, "glBindVertexArray"); Load(g.DeleteVertexArrays, "glDeleteVertexArrays");
    Load(g.ActiveTexture, "glActiveTexture");
    void* all[] = {(void*)g.CreateShader, (void*)g.ShaderSource, (void*)g.CompileShader, (void*)g.GetShaderiv, (void*)g.GetShaderInfoLog, (void*)g.DeleteShader,
                   (void*)g.CreateProgram, (void*)g.AttachShader, (void*)g.LinkProgram, (void*)g.GetProgramiv, (void*)g.GetProgramInfoLog, (void*)g.DeleteProgram,
                   (void*)g.UseProgram, (void*)g.GetUniformLocation, (void*)g.Uniform1f, (void*)g.Uniform2f, (void*)g.Uniform4f, (void*)g.Uniform1i,
                   (void*)g.GenVertexArrays, (void*)g.BindVertexArray, (void*)g.DeleteVertexArrays, (void*)g.ActiveTexture};
    for (void* f : all) if (!f) { std::fprintf(stderr, "[fx] fonctions OpenGL 3.3 indisponibles : effets désactivés\n"); return false; }
    s.progBackdrop = Link(kBackdropFs); s.progGrade = Link(kGradeFs); s.progGlass = Link(kGlassFs);
    g.GenVertexArrays(1, &s.vao);
    glGenTextures(1, &s.copyTex); glBindTexture(GL_TEXTURE_2D, s.copyTex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, 0x812F); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, 0x812F);
    glBindTexture(GL_TEXTURE_2D, 0);
    s.ok = s.progBackdrop && s.progGrade && s.progGlass;
    return s.ok;
}
inline void Shutdown() {
    using namespace detail;
    State& s = St(); if (!s.gl.DeleteProgram) return;
    for (GLuint p : {s.progBackdrop, s.progGrade, s.progGlass}) if (p) s.gl.DeleteProgram(p);
    if (s.vao) s.gl.DeleteVertexArrays(1, &s.vao);
    if (s.copyTex) glDeleteTextures(1, &s.copyTex);
    s = State{};
}
inline bool Available() { return detail::St().ok; }

// Les callbacks modifient l'état OpenGL : on demande au moteur ImGui de restaurer le sien juste après.
inline void Backdrop(ImDrawList* dl, const BackdropParams& p) {
    if (!Available()) return;
    dl->AddCallback(detail::BackdropCb, (void*)&p, sizeof p); dl->AddCallback(ImDrawCallback_ResetRenderState, nullptr);
}
inline void Grade(ImDrawList* dl, const GradeParams& p) {
    if (!Available()) return;
    dl->AddCallback(detail::GradeCb, (void*)&p, sizeof p); dl->AddCallback(ImDrawCallback_ResetRenderState, nullptr);
}
inline void Glass(ImDrawList* dl, const GlassParams& p) {
    if (!Available()) return;
    dl->AddCallback(detail::GlassCb, (void*)&p, sizeof p); dl->AddCallback(ImDrawCallback_ResetRenderState, nullptr);
}

inline const char* const* BackdropNames() { static const char* n[] = {"Grille", "Papier", "Pointillés", "Millimétré", "Ardoise", "Dégradé", "Nuit"}; return n; }
inline constexpr int kBackdropCount = 7;
inline const char* const* PresetNames() { static const char* n[] = {"Neutre", "Cinéma", "Argentique N&B", "Sépia", "Bleach bypass", "Vintage chaud", "Nuit américaine", "Pastel"}; return n; }
inline constexpr int kPresetCount = 8;
inline bool BackdropIsDark(int mode, bool dark) { return mode == 4 || mode == 6 || (dark && mode != 0); }

} // namespace cl::ui::fx
