#pragma once
// Polices de l'interface :
//   - texte : SF Pro (Text) si présente, sinon DejaVu Sans ; DejaVu est fusionnée derrière pour les glyphes
//     mathématiques, flèches et symboles absents de SF Pro ;
//   - titres : Valky si présente (titres d'application, de module, éléments « Titre » et « Bandeau » du tableau blanc),
//     sinon SF Pro Display, sinon DejaVu Serif ;
//   - code : SF Mono si présente, sinon DejaVu Sans Mono ;
//   - formules : DejaVu Serif (romain + italique), inchangé.
// SF Pro et Valky ne sont pas redistribuables avec le logiciel : déposez les fichiers .otf/.ttf dans assets/fonts/
// (ou installez-les sur le système). Les dossiers de polices de macOS, Windows et Linux sont aussi parcourus.
#include "MathRender.hpp"
#include <SDL3/SDL.h>
#include <imgui.h>
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <string>
#include <vector>

namespace cl::ui {

struct FontReport { std::string ui, title, mono; };
inline FontReport& FontInfo() { static FontReport r; return r; }

// Familles proposées pour le texte du tableau blanc (menu « Police » du ruban, aperçu dans la police elle-même).
// Chaque famille est rastérisée en grand (kCanvasPx) pour rester nette au zoom.
struct FontFamily { std::string key, label; ImFont* font = nullptr; };
inline std::vector<FontFamily>& Families() { static std::vector<FontFamily> f; return f; }
inline constexpr float kCanvasPx = 34.0f;
inline ImFont* FamilyFont(const std::string& key) {
    for (auto& f : Families()) if (f.key == key) return f.font;
    return Families().empty() ? ImGui::GetFont() : Families()[0].font;
}
inline const char* FamilyLabel(const std::string& key) {
    for (auto& f : Families()) if (f.key == key) return f.label.c_str();
    return key.c_str();
}

inline std::vector<std::filesystem::path> FontDirs() {
    namespace fs = std::filesystem;
    std::vector<fs::path> d;
    if (const char* b = SDL_GetBasePath()) { d.push_back(fs::path(b) / "assets" / "fonts"); d.push_back(fs::path(b) / ".." / "assets" / "fonts"); }
    d.push_back(fs::path("assets") / "fonts");
#ifdef FINANCELAB_ASSET_DIR
    d.push_back(fs::path(FINANCELAB_ASSET_DIR) / "fonts");
#endif
#if defined(__APPLE__)
    d.push_back("/Library/Fonts"); d.push_back("/System/Library/Fonts");
    if (const char* h = std::getenv("HOME")) d.push_back(fs::path(h) / "Library" / "Fonts");
#elif defined(_WIN32)
    if (const char* w = std::getenv("WINDIR")) d.push_back(fs::path(w) / "Fonts");
    if (const char* l = std::getenv("LOCALAPPDATA")) d.push_back(fs::path(l) / "Microsoft" / "Windows" / "Fonts");
#else
    if (const char* h = std::getenv("HOME")) { d.push_back(fs::path(h) / ".local" / "share" / "fonts"); d.push_back(fs::path(h) / ".fonts"); }
    d.push_back("/usr/share/fonts/opentype"); d.push_back("/usr/share/fonts/truetype"); d.push_back("/usr/local/share/fonts");
#endif
    return d;
}

inline std::string Lower(std::string s) { for (auto& c : s) c = (char)std::tolower((unsigned char)c); return s; }

// Premier fichier .ttf/.otf dont le nom (sans extension, insensible à la casse) correspond à l'un des candidats,
// dans l'ordre de priorité des candidats. Un candidat terminé par '*' accepte tout suffixe.
inline std::string FindFontFile(std::initializer_list<const char*> names) {
    namespace fs = std::filesystem;
    std::vector<fs::path> files;
    for (auto& dir : FontDirs()) {
        std::error_code ec;
        if (!fs::is_directory(dir, ec)) continue;
        for (fs::recursive_directory_iterator it(dir, fs::directory_options::skip_permission_denied, ec), end; it != end && !ec; it.increment(ec)) {
            if (it.depth() > 2) { it.disable_recursion_pending(); continue; }
            std::string ext = Lower(it->path().extension().string());
            if (ext == ".ttf" || ext == ".otf") files.push_back(it->path());
        }
    }
    for (const char* n : names) {
        std::string want = Lower(n); bool prefix = !want.empty() && want.back() == '*';
        if (prefix) want.pop_back();
        for (auto& f : files) {
            std::string stem = Lower(f.stem().string());
            if (prefix ? stem.rfind(want, 0) == 0 : stem == want) return f.string();
        }
    }
    return "";
}

inline const ImWchar* UiRanges() {
    static const ImWchar r[] = {0x20, 0x17F, 0x2C6, 0x2DC, 0x370, 0x3FF, 0x2000, 0x206F, 0x20AC, 0x20AC, 0x2100, 0x214F, 0x2190, 0x21FF,
                                0x2200, 0x22FF, 0x2300, 0x23FF, 0x25A0, 0x25FF, 0x2600, 0x26FF, 0x2700, 0x27BF, 0x27E8, 0x27E9, 0};
    return r;
}

// rasterScale : taille de rastérisation (échelle x densité de pixels) ; les tailles logiques restent en points.
inline void LoadFonts(float rasterScale) {
    ImGuiIO& io = ImGui::GetIO();
    MathFonts& f = Fonts();
    FontReport& rep = FontInfo();
    f = MathFonts{};
    static std::string sfText, sfDisplay, valky, sfMono, dejaSans, dejaSerif, dejaItal, dejaMono;
    static bool searched = false;
    if (!searched) {
        searched = true;
        sfText = FindFontFile({"SF-Pro-Text-Regular", "SFProText-Regular", "SF Pro Text Regular", "SF-Pro", "SF-Pro-Regular", "SFNS", "SF-Pro-Display-Regular", "SFProDisplay-Regular"});
        sfDisplay = FindFontFile({"SF-Pro-Display-Semibold", "SFProDisplay-Semibold", "SF-Pro-Display-Medium", "SF-Pro-Display-Regular", "SFProDisplay-Regular"});
        valky = FindFontFile({"Valky-Regular", "Valky", "Valky*"});
        sfMono = FindFontFile({"SF-Mono-Regular", "SFMono-Regular", "SFNSMono", "SF-Mono*"});
        dejaSans = FindFontFile({"DejaVuSans"}); dejaSerif = FindFontFile({"DejaVuSerif"});
        dejaItal = FindFontFile({"DejaVuSerif-Italic"}); dejaMono = FindFontFile({"DejaVuSansMono"});
    }
    auto add = [&](const std::string& path, float px, bool merge = false, const ImWchar* ranges = nullptr) -> ImFont* {
        if (path.empty()) return nullptr;
        ImFontConfig c; c.MergeMode = merge; c.OversampleH = 2; c.OversampleV = 1; c.PixelSnapH = false;
        if (merge) c.GlyphMinAdvanceX = 0;
        return io.Fonts->AddFontFromFileTTF(path.c_str(), px * rasterScale, &c, ranges ? ranges : UiRanges());
    };
    const float uiPx = 14.0f;     // SF Pro : 13 pt sous macOS ; légèrement plus grand pour les écrans non Retina
    // Texte de l'interface : SF Pro puis DejaVu Sans fusionnée (glyphes manquants uniquement).
    if (!sfText.empty()) { f.ui = add(sfText, uiPx); if (f.ui) add(dejaSans, uiPx, true); rep.ui = "SF Pro (" + std::filesystem::path(sfText).filename().string() + ")"; }
    if (!f.ui) { f.ui = add(dejaSans, uiPx + 0.5f); rep.ui = f.ui ? "DejaVu Sans (SF Pro introuvable)" : "police intégrée"; }
    if (!f.ui) f.ui = io.Fonts->AddFontDefault();
    io.FontDefault = f.ui;
    f.roman = add(dejaSerif, 15.0f); f.italic = add(dejaItal, 15.0f);
    // Code
    if (!sfMono.empty()) { f.mono = add(sfMono, 13.0f); if (f.mono) add(dejaMono, 13.0f, true); rep.mono = "SF Mono"; }
    if (!f.mono) { f.mono = add(dejaMono, 13.5f); rep.mono = "DejaVu Sans Mono"; }
    // Titres : Valky, sinon SF Pro Display, sinon DejaVu Serif. « display » est rastérisée plus grande pour le tableau blanc.
    static const ImWchar latin[] = {0x20, 0x17F, 0x2000, 0x206F, 0x20AC, 0x20AC, 0};
    const std::string& tfile = !valky.empty() ? valky : (!sfDisplay.empty() ? sfDisplay : dejaSerif);
    rep.title = !valky.empty() ? "Valky (" + std::filesystem::path(valky).filename().string() + ")" : (!sfDisplay.empty() ? "SF Pro Display (Valky introuvable)" : "DejaVu Serif (Valky introuvable)");
    f.title = add(tfile, 19.0f, false, latin); if (f.title) add(dejaSans, 19.0f, true, latin);
    f.display = add(tfile, 44.0f, false, latin); if (f.display) add(dejaSans, 44.0f, true, latin);
    if (!f.roman) f.roman = f.ui;
    if (!f.italic) f.italic = f.roman;
    if (!f.title) f.title = f.ui;
    if (!f.display) f.display = f.title;

    // ---- familles du canevas
    static const ImWchar canvas[] = {0x20, 0x17F, 0x370, 0x3FF, 0x2000, 0x206F, 0x20AC, 0x20AC, 0x2190, 0x21FF, 0x2200, 0x22FF, 0x25A0, 0x25FF, 0};
    float cs = rasterScale / std::max(0.5f, Scale());           // densité seule : la taille du canevas ne dépend pas de l'échelle d'interface
    auto addCanvas = [&](const std::string& path) -> ImFont* {
        if (path.empty()) return nullptr;
        ImFontConfig c; c.OversampleH = 1; c.OversampleV = 1;
        ImFont* r = io.Fonts->AddFontFromFileTTF(path.c_str(), kCanvasPx * cs, &c, canvas);
        if (r && !dejaSans.empty() && path != dejaSans) { ImFontConfig m; m.MergeMode = true; m.OversampleH = 1; io.Fonts->AddFontFromFileTTF(dejaSans.c_str(), kCanvasPx * cs, &m, canvas); }
        return r;
    };
    auto& fam = Families(); fam.clear();
    auto push = [&](const char* key, const std::string& label, const std::string& path) { if (ImFont* ft = addCanvas(path)) fam.push_back({key, label, ft}); };
    push("ui", sfText.empty() ? "Sans (DejaVu Sans)" : "SF Pro Text", sfText.empty() ? dejaSans : sfText);
    if (!sfDisplay.empty()) push("display", "SF Pro Display", sfDisplay);
    push("title", !valky.empty() ? "Valky" : "Titres (" + std::string(sfDisplay.empty() ? "DejaVu Serif" : "SF Pro Display") + ")", tfile);
    push("serif", "Serif (DejaVu Serif)", dejaSerif);
    push("italic", "Serif italique", dejaItal);
    push("mono", sfMono.empty() ? "Mono (DejaVu Sans Mono)" : "SF Mono", sfMono.empty() ? dejaMono : sfMono);
    // polices déposées par l'utilisateur dans assets/fonts (hors familles déjà listées)
    static std::vector<std::filesystem::path> extra; static bool scanned = false;
    if (!scanned) {
        scanned = true;
        namespace fs = std::filesystem;
        std::vector<fs::path> dirs;
        if (const char* b = SDL_GetBasePath()) dirs.push_back(fs::path(b) / "assets" / "fonts");
        dirs.push_back(fs::path("assets") / "fonts");
#ifdef FINANCELAB_ASSET_DIR
        dirs.push_back(fs::path(FINANCELAB_ASSET_DIR) / "fonts");
#endif
        for (auto& d : dirs) {
            std::error_code ec;
            for (fs::directory_iterator it(d, ec), end; it != end && !ec; it.increment(ec)) {
                std::string ext = Lower(it->path().extension().string()), stem = Lower(it->path().stem().string());
                if (ext != ".ttf" && ext != ".otf") continue;
                if (stem.rfind("dejavu", 0) == 0 || stem.rfind("sf", 0) == 0 || stem.rfind("valky", 0) == 0) continue;
                bool dup = false; for (auto& e : extra) if (Lower(e.stem().string()) == stem) dup = true;
                if (!dup && extra.size() < 10) extra.push_back(it->path());
            }
        }
    }
    for (auto& e : extra) push(e.stem().string().c_str(), e.stem().string(), e.string());
}

// Texte dans la police de titre (Valky) au fil de la mise en page ImGui.
inline void TitleText(const char* text, ImVec4 col) {
    ImFont* t = Fonts().title;
    if (t) ImGui::PushFont(t);
    ImGui::PushStyleColor(ImGuiCol_Text, col);
    ImGui::TextUnformatted(text);
    ImGui::PopStyleColor();
    if (t) ImGui::PopFont();
}

} // namespace cl::ui
