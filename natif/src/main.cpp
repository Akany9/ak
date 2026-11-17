// « Game 1 » — hôte natif. SDL3 (fenêtre, entrées) + bgfx (rendu) + Dear ImGui (commandement), comme le Hub de r88.
// Toute la simulation est dans le cœur C++ (../coeur, API g1/api.h) : cet hôte est la contrepartie native de
// web/src/main.js et ne contient, comme lui, AUCUNE règle de jeu.
//   g1_natif [--data <dossier>] [--scenario berlin_1945.json] [--capture f.png] [--images n] [--distance m]
//            [--largeur l] [--hauteur h] [--avance s]
#include <SDL3/SDL.h>
#include <bgfx/bgfx.h>
#include <bx/math.h>
#include <g1/api.h>
#include <imgui.h>
#include <imgui_impl_sdl3.h>
#include <algorithm>
#include <cmath>
#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <deque>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include "imgui_bgfx.hpp"
#include "rendu_monde.hpp"

namespace fs = std::filesystem;
static std::string lire(const fs::path& p) { std::ifstream f(p, std::ios::binary); std::stringstream s; s << f.rdbuf(); return s.str(); }

// ------------------------------------------------------------------------------------------------ capture PNG (sans dépendance)
static uint32_t crc32(const uint8_t* d, size_t n, uint32_t c = 0xffffffffu) {
  for (size_t i = 0; i < n; ++i) { c ^= d[i]; for (int k = 0; k < 8; ++k) c = (c >> 1) ^ (0xedb88320u & (0u - (c & 1u))); }
  return c;
}
static void ecrirePNG(const char* chemin, uint32_t w, uint32_t h, uint32_t pitch, const uint8_t* bgra, bool yflip) {
  std::vector<uint8_t> brut; brut.reserve(size_t(h) * (w * 3 + 1));
  for (uint32_t y = 0; y < h; ++y) {
    const uint8_t* l = bgra + size_t(yflip ? h - 1 - y : y) * pitch; brut.push_back(0);
    for (uint32_t x = 0; x < w; ++x) { brut.push_back(l[x * 4 + 2]); brut.push_back(l[x * 4 + 1]); brut.push_back(l[x * 4]); }
  }
  std::vector<uint8_t> z = {0x78, 0x01}; uint32_t a = 1, b = 0;   // zlib, blocs « stockés »
  for (size_t p = 0; p < brut.size(); p += 65535) {
    uint16_t n = uint16_t(std::min<size_t>(65535, brut.size() - p)); z.push_back(p + n >= brut.size()); z.push_back(n & 255); z.push_back(n >> 8);
    z.push_back(~n & 255); z.push_back((~n >> 8) & 255); z.insert(z.end(), brut.begin() + p, brut.begin() + p + n);
  }
  for (uint8_t c : brut) { a = (a + c) % 65521; b = (b + a) % 65521; }
  for (int k = 3; k >= 0; --k) z.push_back(uint8_t(((b << 16) | a) >> (8 * k)));
  FILE* f = std::fopen(chemin, "wb"); if (!f) return;
  auto morceau = [&](const char* t, const std::vector<uint8_t>& d) {
    uint8_t L[4] = {uint8_t(d.size() >> 24), uint8_t(d.size() >> 16), uint8_t(d.size() >> 8), uint8_t(d.size())}; std::fwrite(L, 1, 4, f);
    std::vector<uint8_t> td(t, t + 4); td.insert(td.end(), d.begin(), d.end()); std::fwrite(td.data(), 1, td.size(), f);
    uint32_t c = ~crc32(td.data(), td.size()); uint8_t C[4] = {uint8_t(c >> 24), uint8_t(c >> 16), uint8_t(c >> 8), uint8_t(c)}; std::fwrite(C, 1, 4, f);
  };
  const uint8_t sig[8] = {137, 80, 78, 71, 13, 10, 26, 10}; std::fwrite(sig, 1, 8, f);
  morceau("IHDR", {uint8_t(w >> 24), uint8_t(w >> 16), uint8_t(w >> 8), uint8_t(w), uint8_t(h >> 24), uint8_t(h >> 16), uint8_t(h >> 8), uint8_t(h), 8, 2, 0, 0, 0});
  morceau("IDAT", z); morceau("IEND", {}); std::fclose(f);
}
struct Rappels : bgfx::CallbackI {
  bool capturee = false;
  ~Rappels() override {}
  void fatal(const char* f, uint16_t l, bgfx::Fatal::Enum, const char* s) override { std::fprintf(stderr, "bgfx fatal %s:%d %s\n", f, l, s); std::abort(); }
  void traceVargs(const char*, uint16_t, const char* fmt, va_list a) override { if (std::getenv("G1_TRACE")) std::vfprintf(stderr, fmt, a); }
  void profilerBegin(const char*, uint32_t, const char*, uint16_t) override {}
  void profilerBeginLiteral(const char*, uint32_t, const char*, uint16_t) override {}
  void profilerEnd() override {}
  uint32_t cacheReadSize(uint64_t) override { return 0; }
  bool cacheRead(uint64_t, void*, uint32_t) override { return false; }
  void cacheWrite(uint64_t, const void*, uint32_t) override {}
  void screenShot(const char* p, uint32_t w, uint32_t h, uint32_t pitch, bgfx::TextureFormat::Enum, const void* d, uint32_t, bool yflip) override {
    ecrirePNG(p, w, h, pitch, static_cast<const uint8_t*>(d), yflip); capturee = true; std::printf("capture : %s (%u × %u)\n", p, w, h);
  }
  void captureBegin(uint32_t, uint32_t, uint32_t, bgfx::TextureFormat::Enum, bool) override {}
  void captureEnd() override {}
  void captureFrame(const void*, uint32_t) override {}
};

// ------------------------------------------------------------------------------------------------ caméra TPS → carte (port de camera.js)
struct Camera {
  float lacet = 0, tangage = -0.1f, distance = 3.2f, cible = 3.2f, eye[3] = {}, fwd[3] = {}; bool vise = false;
  int mode() const { return distance > 450 ? 2 : distance > 60 ? 1 : 0; }
  void maj(float dt, const float* p, const RenduMonde& R) {
    distance += (cible - distance) * (1 - std::exp(-dt * 6));
    float t = std::clamp((distance - 8) / (450.f - 8), 0.f, 1.f), tang = tangage * (1 - t) - 1.25f * t, d = distance * (vise ? 0.55f : 1);
    float f[3] = {std::sin(lacet) * std::cos(tang), std::sin(tang), std::cos(lacet) * std::cos(tang)}, rx = -std::cos(lacet), rz = std::sin(lacet), ep = 0.55f * (1 - t);
    float foc[3] = {p[0], p[1] + 1.55f * (1 - t), p[2]};
    eye[0] = foc[0] - f[0] * d + rx * ep; eye[1] = foc[1] - f[1] * d + 0.25f * (1 - t); eye[2] = foc[2] - f[2] * d + rz * ep;
    eye[1] = std::max(eye[1], R.hauteur(eye[0], eye[2]) + 0.6f); std::memcpy(fwd, f, sizeof f); visee = tang;
  }
  float visee = 0;
};

int main(int argc, char** argv) {
  std::string data, scenario = "berlin_1945.json", capture; int images = 120, W = 1600, H = 900; float distance = 3.2f, avance = 0, lacetArg = -999;
  fs::path exe = fs::absolute(argc ? argv[0] : ".");
  for (fs::path p : {exe.parent_path() / "data", exe.parent_path() / "../coeur/data", exe.parent_path() / "../../coeur/data", fs::path("coeur/data"), fs::path("../coeur/data")})
    if (data.empty() && fs::exists(p / "armes.json")) data = p.string();
  for (int i = 1; i < argc; ++i) {
    std::string a = argv[i]; auto suite = [&]() { return i + 1 < argc ? std::string(argv[++i]) : std::string(); };
    if (a == "--data") data = suite(); else if (a == "--scenario") scenario = suite(); else if (a == "--capture") capture = suite();
    else if (a == "--images") images = std::atoi(suite().c_str()); else if (a == "--distance") distance = float(std::atof(suite().c_str()));
    else if (a == "--largeur") W = std::atoi(suite().c_str()); else if (a == "--hauteur") H = std::atoi(suite().c_str());
    else if (a == "--avance") avance = float(std::atof(suite().c_str())); else if (a == "--lacet") lacetArg = float(std::atof(suite().c_str()));
  }
  if (scenario.find(".json") == std::string::npos) scenario += ".json";
  fs::path D(data);
  if (!g1_load(lire(D / "materiaux.json").c_str(), lire(D / "armes.json").c_str(), lire(D / "scenarios" / scenario).c_str(), lire(D / "reglages.json").c_str())) {
    std::fprintf(stderr, "cœur : %s (données : %s)\n", g1_error(), data.c_str()); return 1;
  }
  for (int i = 0; i < int(avance * 20); ++i) { g1_tick(); g1_events(); }   // avance rapide (captures automatiques)

  if (!SDL_Init(SDL_INIT_VIDEO)) { std::fprintf(stderr, "SDL : %s\n", SDL_GetError()); return 1; }
  SDL_Window* win = SDL_CreateWindow("Game 1 — hôte natif (SDL3 · bgfx · Dear ImGui) — cœur C++ partagé avec le prototype three.js", W, H, SDL_WINDOW_RESIZABLE);
  if (!win) { std::fprintf(stderr, "fenêtre : %s\n", SDL_GetError()); return 1; }
  bgfx::Init init; Rappels rappels; init.callback = &rappels; SDL_PropertiesID pr = SDL_GetWindowProperties(win);
#if defined(_WIN32)
  init.swapChain.nwh = SDL_GetPointerProperty(pr, SDL_PROP_WINDOW_WIN32_HWND_POINTER, nullptr);
#elif defined(__APPLE__)
  init.swapChain.nwh = SDL_GetPointerProperty(pr, SDL_PROP_WINDOW_COCOA_WINDOW_POINTER, nullptr);
#else
  init.swapChain.ndt = SDL_GetPointerProperty(pr, SDL_PROP_WINDOW_X11_DISPLAY_POINTER, nullptr);
  init.swapChain.nwh = (void*)(uintptr_t)SDL_GetNumberProperty(pr, SDL_PROP_WINDOW_X11_WINDOW_NUMBER, 0);
  init.type = bgfx::RendererType::OpenGL;   // comme r88 : OpenGL pour le développement sous Linux
#endif
  int pw, ph; SDL_GetWindowSizeInPixels(win, &pw, &ph); init.swapChain.width = uint32_t(pw); init.swapChain.height = uint32_t(ph); init.swapChain.flags = BGFX_SWAP_CHAIN_MSAA_X4; init.reset = BGFX_RESET_VSYNC;   // API bgfx récente : fenêtre = SwapChain
  bgfx::renderFrame();   // mode mono-thread (BGFX_CONFIG_MULTITHREADED=0), comme r88
  if (!bgfx::init(init)) { std::fprintf(stderr, "bgfx : initialisation impossible\n"); return 1; }
  std::printf("bgfx : %s\n", bgfx::getRendererName(bgfx::getRendererType()));

  IMGUI_CHECKVERSION(); ImGui::CreateContext(); ImGuiIO& io = ImGui::GetIO(); io.IniFilename = nullptr; ImGui::StyleColorsDark();
  ImGui::GetStyle().WindowRounding = 6; ImGui_ImplSDL3_InitForOther(win); imgui_bgfx::init();
  RenduMonde rendu; rendu.init(); Camera cam; cam.distance = cam.cible = distance;
  { const float* U = g1_unites(); cam.lacet = lacetArg > -900 ? lacetArg : U[int(g1_etat()[7]) * G1_STRIDE_UNITE + 3]; }

  const char* DECRETS[] = {"État d'urgence", "Couvre-feu", "Conscription", "Nationalisation", "Liberté de la presse", "Planche à billets", "Travail forcé"};
  const char* POSTES[] = {"Éducation", "Défense", "Santé", "Infrastructures", "Dette"};
  const char* HEAT[] = {"aucune", "PIB local", "Chômage", "Pollution", "Densité", "Ressources", "Contrôle", "Incertitude"};
  const char* MODES[] = {"tactique 1:1", "exploration ×10", "stratégique 1 s = 1 h"}; const char* STATUTS[] = {"Voyageur", "Agent", "Commandant"};
  int heat = 0, modeDemande = -1, image = 0; bool fin = false, tir = false, viser = false, souris = false; float minuteur = 0; std::deque<std::string> fil;
  uint64_t avant = SDL_GetTicksNS(); const int fj = int(g1_etat()[16]);
  struct Demande { int de, vers; std::string texte; }; std::vector<Demande> demandes;

  while (!fin) {
    SDL_Event e;
    while (SDL_PollEvent(&e)) {
      ImGui_ImplSDL3_ProcessEvent(&e);
      if (e.type == SDL_EVENT_QUIT) fin = true;
      if (e.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) { pw = e.window.data1; ph = e.window.data2; bgfx::SwapChain sc = init.swapChain; sc.width = uint32_t(pw); sc.height = uint32_t(ph); bgfx::reset(BGFX_RESET_VSYNC, &sc); }
      if (e.type == SDL_EVENT_MOUSE_MOTION && souris) { float s = cam.vise ? 0.0011f : 0.0022f; cam.lacet -= e.motion.xrel * s; cam.tangage = std::clamp(cam.tangage - e.motion.yrel * s, -1.2f, 1.0f); }
      if (e.type == SDL_EVENT_MOUSE_WHEEL && !io.WantCaptureMouse) cam.cible = std::clamp(cam.cible * std::exp(-e.wheel.y * 0.15f), 2.2f, 3000.f);
      if (e.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !io.WantCaptureMouse) {
        if (!souris && cam.mode() < 2) { souris = true; SDL_SetWindowRelativeMouseMode(win, true); }
        else { if (e.button.button == SDL_BUTTON_LEFT) tir = true; if (e.button.button == SDL_BUTTON_RIGHT) viser = true; }
      }
      if (e.type == SDL_EVENT_MOUSE_BUTTON_UP) { if (e.button.button == SDL_BUTTON_LEFT) tir = false; if (e.button.button == SDL_BUTTON_RIGHT) viser = false; }
      if (e.type == SDL_EVENT_KEY_DOWN && e.key.scancode == SDL_SCANCODE_ESCAPE) { souris = false; SDL_SetWindowRelativeMouseMode(win, false); }
      if (e.type == SDL_EVENT_KEY_DOWN && e.key.scancode == SDL_SCANCODE_M) cam.cible = cam.mode() == 2 ? 3.2f : 1200.f;
    }
    uint64_t now = SDL_GetTicksNS(); float dt = std::min(0.1f, float(now - avant) * 1e-9f); avant = now;
    if (cam.mode() != modeDemande) { modeDemande = cam.mode(); g1_mode(modeDemande); if (modeDemande == 2 && souris) { souris = false; SDL_SetWindowRelativeMouseMode(win, false); } }
    const bool* K = SDL_GetKeyboardState(nullptr); cam.vise = viser; cam.maj(dt, rendu.joueur, rendu);
    float avantAxe = (K[SDL_SCANCODE_W] ? 1.f : 0.f) - (K[SDL_SCANCODE_S] ? 1.f : 0.f), cote = (K[SDL_SCANCODE_D] ? 1.f : 0.f) - (K[SDL_SCANCODE_A] ? 1.f : 0.f);
    if (cam.mode() == 2 || io.WantCaptureKeyboard) avantAxe = cote = 0;
    unsigned b = (K[SDL_SCANCODE_LSHIFT] ? 1u : 0u) | (K[SDL_SCANCODE_C] ? 2u : 0u) | (tir && souris ? 4u : 0u) | (viser ? 8u : 0u) | (K[SDL_SCANCODE_R] ? 16u : 0u);
    g1_input(avantAxe, cote, cam.lacet, cam.visee, cam.eye[0], cam.eye[1], cam.eye[2], b);
    g1_step(dt);
    // événements du cœur → fil d'actualité (le texte détaillé est construit comme dans web/src/main.js)
    std::string ev = g1_events();
    for (size_t p = 0; (p = ev.find("\"type\":\"", p)) != std::string::npos;) {
      p += 8; size_t q = ev.find('"', p); std::string t = ev.substr(p, q - p); size_t a = ev.rfind('{', p), z = ev.find('}', q);
      if (t == "terraformation" || t == "terrain") rendu.majTerrain();
      if (t == "llm_requis") {   // niveau 2 de l'IA : texte de repli local (un connecteur LLM peut remplacer cette ligne)
        auto champ = [&](const char* k) { size_t s = ev.find(std::string("\"") + k + "\":", a); return s < z ? std::atoi(ev.c_str() + s + std::strlen(k) + 3) : -1; };
        int de = champ("de"), vers = champ("vers"); std::string txt = std::string(g1_faction_nom(de)) + " propose un cessez-le-feu immédiat à " + g1_faction_nom(vers) + ".";
        if (vers == fj) demandes.push_back({de, vers, txt}); else g1_reponse_diplomatique(de, vers, 1, txt.c_str());
      }
      if (t != "touche" && t != "impact" && t != "structure" && t != "tuiles" && t != "explosion") { fil.push_front(ev.substr(a, z - a + 1)); if (fil.size() > 8) fil.pop_back(); }
    }
    if ((minuteur -= dt) <= 0) { minuteur = 0.25f; rendu.majTextures(heat - 1, true); }

    // ---------------------------------------------------------------- 3D
    const float* E = g1_etat(); float h = std::fmod(E[0], 24.f) / 24.f, el = std::sin((h - 0.25f) * 6.2831853f), az = h * 6.2831853f, jour = std::max(0.f, el), nuit = 0.22f;
    float sd[3] = {std::cos(az) * 0.6f, std::max(0.12f, el), std::sin(az) * 0.6f}, sl = std::sqrt(sd[0] * sd[0] + sd[1] * sd[1] + sd[2] * sd[2]);
    float amb = nuit + (1 - nuit) * jour, ks = std::max(0.03f, el) * 1.15f;
    Eclairage L = {{sd[0] / sl, sd[1] / sl, sd[2] / sl, 0}, {1.f * ks, 0.95f * ks, 0.85f * ks, 0}, {0.42f * amb, 0.5f * amb, 0.62f * amb, 0}, {0.22f, 0.2f, 0.18f, 0},
                   {0.62f * amb, 0.68f * amb, 0.74f * amb, 0}, {heat > 0 && cam.distance > 40 ? 0.8f : 0.f, std::min(1.f, cam.distance / 300.f), cam.mode() == 2 ? 0.00012f : 0.0009f, std::min(1.f, cam.distance / 150.f)}};
    uint32_t fond = (uint32_t(L.brouillard[0] * 255) << 24) | (uint32_t(L.brouillard[1] * 255) << 16) | (uint32_t(L.brouillard[2] * 255) << 8) | 0xff;
    bgfx::setViewClear(0, BGFX_CLEAR_COLOR | BGFX_CLEAR_DEPTH, fond, 1.0f, 0); bgfx::setViewRect(0, 0, 0, uint16_t(pw), uint16_t(ph));
    float view[16], proj[16]; bx::Vec3 oeil = {cam.eye[0], cam.eye[1], cam.eye[2]}, vers = {cam.eye[0] + cam.fwd[0], cam.eye[1] + cam.fwd[1], cam.eye[2] + cam.fwd[2]};
    bx::mtxLookAt(view, oeil, vers, {0, 1, 0}, bx::Handedness::Right);
    bx::mtxProj(proj, cam.vise && cam.distance < 8 ? 45.f : 65.f, float(pw) / float(std::max(1, ph)), cam.distance > 200 ? 2.f : 0.1f, 2000.f + cam.distance * 4,
                bgfx::getCaps()->homogeneousDepth, bx::Handedness::Right);
    bgfx::setViewTransform(0, view, proj); bgfx::touch(0);
    rendu.dessiner(0, cam.eye, L, std::max(1.f, cam.distance / 60.f), cam.mode() == 2);

    // ---------------------------------------------------------------- interface (HUD + commandement)
    ImGui_ImplSDL3_NewFrame(); ImGui::NewFrame();
    ImGui::SetNextWindowPos({12, 12}); ImGui::SetNextWindowBgAlpha(0.6f);
    ImGui::Begin("etat", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoInputs);
    ImGui::Text("Jour %d, %02d h %02d · %s", int(E[0] / 24) + 1, int(E[0]) % 24, int(std::fmod(E[0], 1.f) * 60), MODES[std::clamp(int(E[2]), 0, 2)]);
    ImGui::Text("Acte %d · statut %s · suspicion %.0f %%", int(E[4]), STATUTS[std::clamp(int(E[5]), 0, 2)], E[6] * 100);
    ImGui::Text("origine flottante (%.0f, %.0f) · %d tuiles actives · %s", E[8], E[9], int(E[17]), bgfx::getRendererName(bgfx::getRendererType()));
    ImGui::End();
    ImGui::SetNextWindowPos({float(pw) - 12, float(ph) - 12}, 0, {1, 1}); ImGui::SetNextWindowBgAlpha(0.6f);
    ImGui::Begin("vitals", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoInputs);
    ImGui::Text("%d / %d %s", int(E[10]), int(E[11]), E[13] ? "ENRAYÉ — R" : E[12] > 0 ? "rechargement…" : ""); ImGui::ProgressBar(std::max(0.f, E[14]) / 100.f, {180, 6}, "");
    ImGui::End();
    if (cam.mode() < 2) ImGui::GetForegroundDrawList()->AddCircle({pw * 0.5f, ph * 0.5f}, 8, IM_COL32(255, 255, 255, 200));
    ImGui::SetNextWindowPos({float(pw) - 12, 12}, ImGuiCond_FirstUseEver, {1, 0}); ImGui::SetNextWindowSize({340, 0}, ImGuiCond_FirstUseEver);
    ImGui::Begin("Commandement");
    ImGui::Combo("carte de chaleur", &heat, HEAT, 8);
    if (ImGui::Button("tactique")) cam.cible = 3.2f; ImGui::SameLine(); if (ImGui::Button("exploration")) cam.cible = 200; ImGui::SameLine(); if (ImGui::Button("carte")) cam.cible = 1200;
    if (ImGui::CollapsingHeader("Décrets", ImGuiTreeNodeFlags_DefaultOpen)) {
      const float* Dc = g1_decrets(fj);
      for (int d = 0; d < 7; ++d) { bool v = Dc[d] > 0.5f; if (ImGui::Checkbox(DECRETS[d], &v)) g1_decret(fj, d, v); }
    }
    if (ImGui::CollapsingHeader("Budget")) {
      const float* Dc = g1_decrets(fj); for (int p = 0; p < 5; ++p) { float v = Dc[7 + p]; if (ImGui::SliderFloat(POSTES[p], &v, 0, 1)) g1_budget(fj, p, v); }
    }
    if (ImGui::CollapsingHeader("Factions", ImGuiTreeNodeFlags_DefaultOpen) && ImGui::BeginTable("f", 5, ImGuiTableFlags_RowBg)) {
      const float* F = g1_factions(); ImGui::TableSetupColumn("faction"); ImGui::TableSetupColumn("trésor"); ImGui::TableSetupColumn("infl."); ImGui::TableSetupColumn("stab."); ImGui::TableSetupColumn("unités"); ImGui::TableHeadersRow();
      for (int f = 0; f < g1_factions_count(); ++f) {
        const float* x = F + f * G1_STRIDE_FACTION; uint32_t c = uint32_t(x[22]); ImGui::TableNextRow();
        ImGui::TableNextColumn(); ImGui::TextColored({((c >> 16) & 255) / 255.f, ((c >> 8) & 255) / 255.f, (c & 255) / 255.f, 1}, "%s", g1_faction_id(f));
        ImGui::TableNextColumn(); ImGui::Text("%.0f", x[0]); ImGui::TableNextColumn(); ImGui::Text("%.1f %%", x[3] * 100); ImGui::TableNextColumn(); ImGui::Text("%.2f", x[7]); ImGui::TableNextColumn(); ImGui::Text("%.0f", x[14]);
      }
      ImGui::EndTable();
    }
    for (size_t k = 0; k < demandes.size(); ++k) {
      ImGui::Separator(); ImGui::TextWrapped("%s", demandes[k].texte.c_str());
      if (ImGui::Button(("Accepter##" + std::to_string(k)).c_str())) { g1_reponse_diplomatique(demandes[k].de, demandes[k].vers, 1, demandes[k].texte.c_str()); demandes.erase(demandes.begin() + k); break; }
      ImGui::SameLine(); if (ImGui::Button(("Refuser##" + std::to_string(k)).c_str())) { g1_reponse_diplomatique(demandes[k].de, demandes[k].vers, 0, demandes[k].texte.c_str()); demandes.erase(demandes.begin() + k); break; }
    }
    if (ImGui::CollapsingHeader("Journal", ImGuiTreeNodeFlags_DefaultOpen)) for (auto& l : fil) ImGui::TextWrapped("%s", l.c_str());
    ImGui::End();
    ImGui::Render(); imgui_bgfx::render(250, ImGui::GetDrawData());

    if (!capture.empty() && ++image == images) bgfx::requestScreenShot(BGFX_INVALID_HANDLE, capture.c_str());
    bgfx::frame();
    if (!capture.empty() && (rappels.capturee || image > images + 10)) fin = true;
  }
  rendu.shutdown(); imgui_bgfx::shutdown(); ImGui_ImplSDL3_Shutdown(); ImGui::DestroyContext(); bgfx::shutdown(); SDL_DestroyWindow(win); SDL_Quit();
  return 0;
}
