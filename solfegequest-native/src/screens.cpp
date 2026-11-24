// Écrans de la version 1.6 en C++ natif : barre du haut, transport, accueil en carrousel,
// Éducation (programme, chapitres, glossaire), Studio (barre latérale, console, vumètres), Composition.
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cctype>
#include <cstring>

#include "../third_party/imgui/imgui_internal.h"
#include "app.hpp"
#include "audio.hpp"
#include "catalog.hpp"
#include "icons.hpp"
#include "resource_ids.h"
#include "skeuo.hpp"
#include "svgicons.hpp"
#include "theme.hpp"
#include "util.hpp"

namespace sq {

float& screenScale(int mode);  // app.cpp

namespace {

// ------------------------------------------------------------------ petits outils

void beginRoot(const char* name, ImU32 bg = col::bg0) {
    ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(vp->WorkPos);
    ImGui::SetNextWindowSize(vp->WorkSize);
    ImGui::SetNextWindowViewport(vp->ID);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, ImGui::ColorConvertU32ToFloat4(bg));
    ImGui::Begin(name, nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                    ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoSavedSettings);
    ImGui::PopStyleColor();
    ImGui::PopStyleVar(3);
}

// bouton texte transparent (lien bleu, « ‹ Accueil »)
bool linkButton(const char* id, const char* label, ImU32 color) {
    ImGui::PushID(id);
    ImVec2 ls = labelSize(label);
    ImVec2 pad = ImGui::GetStyle().FramePadding;
    ImVec2 sz(ls.x + pad.x * 2, ImGui::GetFrameHeight());
    ImVec2 a = ImGui::GetCursorScreenPos();
    bool r = ImGui::InvisibleButton("##l", sz);
    if (ImGui::IsItemHovered()) ImGui::GetWindowDrawList()->AddRectFilled(a, ImVec2(a.x + sz.x, a.y + sz.y), IM_COL32(255, 255, 255, 14), 6 * theme().scale);
    drawLabel(ImGui::GetWindowDrawList(), ImVec2(a.x + sz.x / 2, a.y + sz.y / 2), color, label);
    ImGui::PopID();
    return r;
}

// petit titre de section en capitales grises (« PROGRAMME », « SOURCE »…)
void capsLabel(ImDrawList* dl, ImVec2 p, const char* t, ImU32 c = col::ink3) {
    ImFont* f = theme().f.tiny;
    dl->AddText(f, f->FontSize, ImVec2(std::round(p.x), std::round(p.y)), c, t);
}

// carré d'icône (tuile)
void iconTile(ImDrawList* dl, ImVec2 a, float size, const char* icon, ImU32 bg, ImU32 fg, float rounding) {
    dl->AddRectFilled(a, ImVec2(a.x + size, a.y + size), bg, rounding);
    svg::drawCentered(dl, icon, ImVec2(a.x + size / 2, a.y + size / 2), size * 0.56f, fg, 1.f);
}

// commande d'échelle « − 85 % + » (reprise de la version 2.0)
void scaleBox(Mode m) {
    float s = theme().scale;
    float& sc = screenScale(int(m));
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float h = ImGui::GetFrameHeight(), bw = h - 2 * s, pw = 50 * s;
    ImVec2 a = ImGui::GetCursorScreenPos();
    ImVec2 b(a.x + bw * 2 + pw + 4 * s, a.y + h);
    dl->AddRectFilled(a, b, IM_COL32(255, 255, 255, 14), 8 * s);
    dl->AddRect(ImVec2(a.x + 0.5f, a.y + 0.5f), ImVec2(b.x - 0.5f, b.y - 0.5f), IM_COL32(255, 255, 255, 20), 8 * s);
    auto btn = [&](const char* id, const char* icon, ImVec2 p, ImVec2 sz, const char* tip) {
        ImGui::SetCursorScreenPos(p);
        bool r = ImGui::InvisibleButton(id, sz);
        if (ImGui::IsItemHovered()) dl->AddRectFilled(p, ImVec2(p.x + sz.x, p.y + sz.y), IM_COL32(255, 255, 255, 24), 6 * s);
        drawLabel(dl, ImVec2(p.x + sz.x / 2, p.y + sz.y / 2), ImGui::IsItemHovered() ? col::ink : col::ink2, icon);
        tooltip(tip);
        return r;
    };
    float old = sc;
    ImVec2 sz(bw, h - 4 * s);
    if (btn("scm", ICON_MINUS, ImVec2(a.x + 2 * s, a.y + 2 * s), sz, "Réduire l'échelle (Ctrl+Alt+−)")) sc = std::max(0.7f, sc - 0.05f);
    char pct[16];
    std::snprintf(pct, sizeof pct, "%d %%", int(std::lround(sc * 100)));
    ImGui::PushFont(theme().f.bold);
    if (btn("scr", pct, ImVec2(a.x + 2 * s + bw, a.y + 2 * s), ImVec2(pw, h - 4 * s), "Échelle de l'interface (cliquer : 100 %)")) sc = 1;
    ImGui::PopFont();
    if (btn("scp", ICON_PLUS, ImVec2(a.x + 2 * s + bw + pw, a.y + 2 * s), sz, "Agrandir l'échelle (Ctrl+Alt+=)")) sc = std::min(1.4f, sc + 0.05f);
    if (sc != old) theme().setUserScale(sc);
    ImGui::SetCursorScreenPos(ImVec2(b.x, a.y));
    ImGui::Dummy(ImVec2(0, h));
}

float scaleBoxWidth() { return (ImGui::GetFrameHeight() - 2 * theme().scale) * 2 + 54 * theme().scale; }

std::string fmtTime(double sec) {
    char b[32];
    int m = int(sec / 60);
    std::snprintf(b, sizeof b, "%02d:%04.1f", m, sec - m * 60);
    return b;
}

std::string lower(const std::string& x) {
    std::string r = x;
    for (auto& c : r) c = char(std::tolower(static_cast<unsigned char>(c)));
    return r;
}

const char* kKeysEn[] = {"C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"};
const char* kKeysFr[] = {"Do", "Do♯", "Ré", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"};

}  // namespace

// ================================================================== barre du haut (1.6)
void App::topBar(const char* title, const char* icon, bool) {
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 p0 = ImGui::GetCursorScreenPos();
    float h = 52 * s;
    ImVec2 p1(p0.x + ImGui::GetContentRegionAvail().x, p0.y + h);
    dl->AddRectFilled(p0, p1, col::bg0);
    dl->AddLine(ImVec2(p0.x, p1.y - 0.5f), ImVec2(p1.x, p1.y - 0.5f), col::rgb(255, 255, 255, 16));
    float fh = ImGui::GetFrameHeight();
    float cy = p0.y + (h - fh) / 2;
    ImGui::SetCursorScreenPos(ImVec2(p0.x + 12 * s, cy));
    ImGui::PushFont(theme().f.big);
    ImGui::PopFont();
    {
        ImFont* uf = theme().f.ui;
        ImGui::PushFont(uf);
        if (linkButton("back", ICON_CHEVRON_LEFT " Accueil", col::link)) go(Mode::Home);
        tooltip("Menu principal");
        ImGui::PopFont();
    }
    ImGui::SameLine(0, 14 * s);
    {
        // icône de l'écran (couleur d'accent) + titre en Fraunces
        ImVec2 ip = ImGui::GetCursorScreenPos();
        float isz = 22 * s;
        svg::drawCentered(dl, icon, ImVec2(ip.x + isz / 2, p0.y + h / 2), isz, col::accent, 1.f);
        ImFont* tf = theme().f.title;
        ImVec2 tsz = tf->CalcTextSizeA(tf->FontSize, FLT_MAX, 0, title);
        dl->AddText(tf, tf->FontSize, ImVec2(std::round(ip.x + isz + 12 * s), std::round(p0.y + (h - tsz.y) / 2 - 1 * s)), col::ink, title);
        ImGui::Dummy(ImVec2(isz + 12 * s + tsz.x + 4 * s, fh));
        ImGui::SameLine(0, 14 * s);
    }
    if (mode == Mode::Comp || mode == Mode::Studio) {
        // pastille du projet (cliquer pour renommer)
        static char buf[96];
        static bool editing = false;
        if (!editing) {
            std::string label = std::string(ICON_FOLDER "  ") + doc.P.name + (doc.dirty ? "  •" : "");
            ImGui::PushFont(theme().f.small);
            ImVec2 ls = labelSize(label.c_str());
            ImVec2 a = ImGui::GetCursorScreenPos();
            a.y = std::round(p0.y + (h - 24 * s) / 2);
            ImGui::SetCursorScreenPos(a);
            ImVec2 sz(std::min(220 * s, ls.x + 22 * s), 24 * s);
            if (ImGui::InvisibleButton("proj", sz)) {
                editing = true;
                std::snprintf(buf, sizeof buf, "%s", doc.P.name.c_str());
            }
            dl->AddRectFilled(a, ImVec2(a.x + sz.x, a.y + sz.y), ImGui::IsItemHovered() ? col::rgb(58, 58, 60) : col::rgb(44, 44, 46), 6 * s);
            dl->AddRect(a, ImVec2(a.x + sz.x, a.y + sz.y), col::rgb(255, 255, 255, 20), 6 * s);
            dl->PushClipRect(a, ImVec2(a.x + sz.x - 6 * s, a.y + sz.y), true);
            drawLabel(dl, ImVec2(a.x + std::min(sz.x, ls.x + 22 * s) / 2, a.y + sz.y / 2), col::ink2, label.c_str());
            dl->PopClipRect();
            ImGui::PopFont();
            tooltip("Nom du projet (cliquer pour renommer)");
        } else {
            ImGui::SetNextItemWidth(200 * s);
            ImGui::SetKeyboardFocusHere();
            if (ImGui::InputText("##pname", buf, sizeof buf, ImGuiInputTextFlags_EnterReturnsTrue | ImGuiInputTextFlags_AutoSelectAll) ||
                ImGui::IsItemDeactivated()) {
                if (*buf && doc.P.name != buf) doc.edit("Renommer le projet", [&](Project& P) { P.name = buf; });
                editing = false;
            }
        }
        ImGui::SameLine();
    }
    if (mode == Mode::Edu) {
        // niveau et points d'expérience (pastille)
        ImVec2 a = ImGui::GetCursorScreenPos();
        a.y = std::round(p0.y + (h - 28 * s) / 2);
        ImVec2 sz(178 * s, 28 * s);
        dl->AddRectFilled(a, ImVec2(a.x + sz.x, a.y + sz.y), col::rgb(28, 28, 30), sz.y / 2);
        dl->AddRect(a, ImVec2(a.x + sz.x, a.y + sz.y), col::rgb(255, 255, 255, 20), sz.y / 2);
        svg::drawCentered(dl, ICON_AWARD, ImVec2(a.x + 16 * s, a.y + sz.y / 2), 16 * s, col::orange, 1.f);
        ImFont* bf = theme().f.bold;
        dl->AddText(bf, bf->FontSize, ImVec2(a.x + 30 * s, std::round(a.y + (sz.y - bf->FontSize) / 2)), col::ink, "Niv. 1");
        dl->AddRectFilled(ImVec2(a.x + 84 * s, a.y + sz.y / 2 - 2 * s), ImVec2(a.x + 132 * s, a.y + sz.y / 2 + 2 * s), col::rgb(255, 255, 255, 30), 2 * s);
        ImFont* sf = theme().f.small;
        dl->AddText(sf, sf->FontSize, ImVec2(a.x + 140 * s, std::round(a.y + (sz.y - sf->FontSize) / 2)), col::ink3, "0 XP");
        ImGui::SetCursorScreenPos(a);
        ImGui::Dummy(sz);
        tooltip("Niveau et points d'expérience");
        ImGui::SameLine();
    }

    // à droite : sélecteur d'écran, échelle, piano
    const char* names[] = {ICON_GRAD " ÉDUCATION", ICON_MIXER " STUDIO", ICON_KEYBOARD " COMPOSITION"};
    ImGui::PushFont(theme().f.small);
    float wMode = 4 * s;
    for (auto n : names) wMode += std::round(labelSize(n).x + 26 * s);
    ImGui::PopFont();
    float wRight = wMode + 10 * s + scaleBoxWidth() + 10 * s + fh + 6 * s;
    float right = p1.x - 14 * s - wRight;
    ImGui::SetCursorScreenPos(ImVec2(std::max(ImGui::GetCursorScreenPos().x, right), cy));
    ImGui::PushFont(theme().f.small);
    {
        Mode modes[] = {Mode::Edu, Mode::Studio, Mode::Comp};
        int sel = mode == Mode::Edu ? 0 : mode == Mode::Studio ? 1 : mode == Mode::Comp ? 2 : -1;
        if (skeuo::segmented("modes", names, 3, &sel)) go(modes[sel]);
    }
    ImGui::PopFont();
    ImGui::SameLine(0, 10 * s);
    ImGui::SetCursorScreenPos(ImVec2(ImGui::GetCursorScreenPos().x, cy));
    scaleBox(mode);
    ImGui::SameLine(0, 10 * s);
    ImGui::SetCursorScreenPos(ImVec2(ImGui::GetCursorScreenPos().x, cy));
    if (skeuo::glossButton("pianobtn", ICON_PIANO, piano.open, ImVec2(fh + 6 * s, fh), false,
                           piano.open ? "Fermer le clavier numérique (Ctrl+K)" : "Ouvrir le clavier numérique (Ctrl+K)"))
        piano.open = !piano.open;
    ImGui::SetCursorScreenPos(ImVec2(p0.x, p1.y));
    ImGui::Dummy(ImVec2(1, 0));
}

// ================================================================== transport (1.6)
void App::transportBar(bool full) {
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 p0 = ImGui::GetCursorScreenPos();
    p0.y -= ImGui::GetStyle().ItemSpacing.y;
    float h = 62 * s;
    ImVec2 p1(p0.x + ImGui::GetContentRegionAvail().x, p0.y + h);
    dl->AddRectFilled(p0, p1, col::bg1);
    dl->AddLine(ImVec2(p0.x, p1.y - 0.5f), ImVec2(p1.x, p1.y - 0.5f), col::rgb(0, 0, 0, 200));
    float bh = 30 * s;
    float by = std::round(p0.y + (h - bh) / 2);
    ImVec2 sq(bh, bh);
    Audio& au = audio();

    // ---- à gauche : fichier + affichage des panneaux (Composition)
    ImGui::SetCursorScreenPos(ImVec2(p0.x + 14 * s, by));
    if (skeuo::glossButton("new", ICON_NEW, false, sq, false, "Nouveau projet (Ctrl+N)")) newProject();
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("open", ICON_OPEN, false, sq, false, "Ouvrir un projet .sqproj (Ctrl+O)")) openProject();
    if (full) {
        ImGui::SameLine(0, 14 * s);
        panels.toggleBar();
    }

    // ---- au centre : transport + écran
    const float lcdW = 520 * s, lcdH = 46 * s;
    float tw = bh * 5 + 4 * s * 4 + 14 * s;
    float groupW = tw + lcdW;
    float gx = std::round(p0.x + (p1.x - p0.x - groupW) / 2);
    gx = std::max(gx, ImGui::GetCursorScreenPos().x + 18 * s);
    ImGui::SetCursorScreenPos(ImVec2(gx, by));
    if (skeuo::glossButton("rew", ICON_SKIP_BACK, false, sq, false, "Retour au début (Entrée)")) au.seek(0);
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("play", au.playing() ? ICON_PAUSE : ICON_PLAY, au.playing(), sq, false, "Lecture / pause (Espace)")) au.toggle();
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("stop", ICON_STOP, false, sq, false, "Arrêt")) { au.stop(); au.seek(0); }
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("loop", ICON_REPEAT, doc.P.loopOn, sq, false, "Boucle — sur la région sélectionnée ou les 4 premières mesures")) {
        doc.edit("Boucle", [&](Project& P) {
            P.loopOn = !P.loopOn;
            if (P.loopOn) {
                Region* r = doc.selRegion.empty() ? nullptr : P.region(doc.selRegion);
                if (r) { P.loopS = r->s; P.loopE = r->s + r->len; }
                else if (P.loopE <= P.loopS + 0.5) { P.loopS = 0; P.loopE = P.barBeats() * 4; }
            }
        });
    }
    ImGui::SameLine(0, 4 * s);
    bool met = au.metronome;
    if (skeuo::glossButton("met", ICON_METRONOME, met, sq, false, "Métronome")) au.metronome = !met;
    ImGui::SameLine(0, 14 * s);

    // écran : MESURE · TEMPS · TEMPO · TONALITÉ · MESURE (chiffrage)
    {
        ImVec2 c0(ImGui::GetCursorScreenPos().x, std::round(p0.y + (h - lcdH) / 2));
        ImVec2 c1(c0.x + lcdW, c0.y + lcdH);
        skeuo::lcd(dl, c0, c1, 10 * s);
        double pos = au.position();
        double bb = doc.P.barBeats();
        int bar = int(pos / bb) + 1;
        double inBar = pos - (bar - 1) * bb;
        int beat = int(inBar * doc.P.tsDen / 4.0) + 1;
        int sub = int(std::fmod(inBar, 4.0 / doc.P.tsDen) / 0.25) + 1;
        char v0[32], v2[16], v4[16];
        std::snprintf(v0, sizeof v0, "%03d.%d.%d", bar, beat, sub);
        std::string v1 = fmtTime(pos * 60 / doc.P.bpm);
        std::snprintf(v2, sizeof v2, "%d", int(std::lround(doc.P.bpm)));
        std::string v3 = std::string(kKeysEn[(doc.P.keyRoot % 12 + 12) % 12]) + (doc.P.keyMode == "min" ? "min" : "maj");
        std::snprintf(v4, sizeof v4, "%d/%d", doc.P.tsNum, doc.P.tsDen);
        const char* vals[] = {v0, v1.c_str(), v2, v3.c_str(), v4};
        const char* labs[] = {"MESURE", "TEMPS", "TEMPO", "TONALITÉ", "MESURE"};
        const float ws[] = {0.25f, 0.25f, 0.15f, 0.19f, 0.16f};
        ImFont* bf = theme().f.big;
        ImFont* tf = theme().f.tiny;
        float x = c0.x;
        for (int i = 0; i < 5; ++i) {
            float w = lcdW * ws[i];
            float cx = x + w / 2;
            ImVec2 vs = bf->CalcTextSizeA(bf->FontSize, FLT_MAX, 0, vals[i]);
            ImVec2 lsz = tf->CalcTextSizeA(tf->FontSize, FLT_MAX, 0, labs[i]);
            float vy = c0.y + 4 * s;
            dl->AddText(bf, bf->FontSize, ImVec2(std::round(cx - vs.x / 2), std::round(vy)), col::ink, vals[i]);
            dl->AddText(tf, tf->FontSize, ImVec2(std::round(cx - lsz.x / 2), std::round(c1.y - lsz.y - 4 * s)), col::rgb(235, 235, 245, 90), labs[i]);
            if (i > 0) dl->AddLine(ImVec2(std::round(x) + 0.5f, c0.y + 10 * s), ImVec2(std::round(x) + 0.5f, c1.y - 10 * s), col::rgb(255, 255, 255, 26));
            ImGui::SetCursorScreenPos(ImVec2(x, c0.y));
            ImGui::PushID(i);
            if (i == 2) {  // tempo : glisser
                ImGui::InvisibleButton("tempo", ImVec2(w, lcdH));
                if (ImGui::IsItemActive()) {
                    float d = ImGui::GetIO().MouseDelta.x - ImGui::GetIO().MouseDelta.y;
                    static float acc = 0;
                    acc += d * 0.25f;
                    if (std::fabs(acc) >= 1) {
                        int step = int(acc);
                        acc -= step;
                        doc.editCoalesced("tempo", [&](Project& P) { P.bpm = std::clamp(std::round(P.bpm) + step, 30.0, 260.0); });
                    }
                }
                if (ImGui::IsItemDeactivated()) doc.endCoalesce();
                if (ImGui::IsItemHovered()) ImGui::SetMouseCursor(ImGuiMouseCursor_ResizeEW);
                tooltip("Tempo : glisser pour régler");
            } else if (i == 3) {  // tonalité
                if (ImGui::InvisibleButton("key", ImVec2(w, lcdH))) ImGui::OpenPopup("keypop");
                tooltip("Tonalité");
                if (ImGui::BeginPopup("keypop")) {
                    for (int m = 0; m < 2; ++m) {
                        if (m) ImGui::Separator();
                        for (int k = 0; k < 12; ++k) {
                            std::string l = std::string(kKeysFr[k]) + (m ? " mineur" : " majeur");
                            if (ImGui::Selectable(l.c_str(), doc.P.keyRoot == k && (doc.P.keyMode == "min") == bool(m)))
                                doc.edit("Tonalité", [&](Project& P) { P.keyRoot = k; P.keyMode = m ? "min" : "maj"; });
                        }
                    }
                    ImGui::EndPopup();
                }
            } else if (i == 4) {  // chiffrage
                if (ImGui::InvisibleButton("ts", ImVec2(w, lcdH))) ImGui::OpenPopup("tspop");
                tooltip("Chiffrage de la mesure");
                if (ImGui::BeginPopup("tspop")) {
                    int opts[][2] = {{4, 4}, {3, 4}, {2, 4}, {6, 8}, {5, 4}, {7, 8}, {12, 8}};
                    for (auto& o : opts) {
                        char l[16];
                        std::snprintf(l, sizeof l, "%d/%d", o[0], o[1]);
                        if (ImGui::Selectable(l, doc.P.tsNum == o[0] && doc.P.tsDen == o[1]))
                            doc.edit("Mesure", [&](Project& P) { P.tsNum = o[0]; P.tsDen = o[1]; });
                    }
                    ImGui::EndPopup();
                }
            } else {
                ImGui::Dummy(ImVec2(w, lcdH));
            }
            ImGui::PopID();
            x += w;
        }
    }

    // ---- à droite : annuler / rétablir, enregistrer
    {
        ImGui::PushFont(theme().f.bold);
        const char* sv = ICON_SAVE "  Enregistrer";
        float wsv = std::round(labelSize(sv).x + 24 * s);
        ImGui::PopFont();
        float rx = p1.x - 14 * s - wsv - 8 * s - sq.x * 2 - 4 * s;
        ImGui::SetCursorScreenPos(ImVec2(rx, by));
        ImGui::BeginDisabled(!doc.canUndo());
        if (skeuo::glossButton("undo", ICON_UNDO, false, sq, false, ("Annuler " + doc.undoLabel() + " (Ctrl+Z)").c_str())) doc.undo();
        ImGui::EndDisabled();
        ImGui::SameLine(0, 4 * s);
        ImGui::BeginDisabled(!doc.canRedo());
        if (skeuo::glossButton("redo", ICON_REDO, false, sq, false, "Rétablir (Ctrl+Maj+Z)")) doc.redo();
        ImGui::EndDisabled();
        ImGui::SameLine(0, 8 * s);
        ImGui::PushFont(theme().f.bold);
        if (skeuo::glossButton("save", sv, true, ImVec2(wsv, bh), false, "Enregistrer le projet (Ctrl+S) — Maj : enregistrer sous")) saveProject(ImGui::GetIO().KeyShift);
        ImGui::PopFont();
    }
    ImGui::SetCursorScreenPos(ImVec2(p0.x, p1.y));
    ImGui::Dummy(ImVec2(1, 0));
}

// ================================================================== Composition
void App::compScreen() {
    beginRoot("##comp");
    topBar("Composition", ICON_KEYBOARD);
    transportBar(true);
    float s = theme().scale;
    ImGui::SetCursorPos(ImVec2(8 * s, ImGui::GetCursorPosY() + 6 * s));
    ImGui::BeginChild("##dockhost", ImVec2(-8 * s, -8 * s), ImGuiChildFlags_None, ImGuiWindowFlags_NoBackground);
    panels.dockspace();
    ImGui::EndChild();
    ImGui::End();

    if (panels.begin(P_Playlist)) playlistPanel();
    panels.end();
    if (panels.begin(P_PianoRoll)) pianoRollPanel();
    panels.end();
    if (panels.begin(P_Score)) scorePanel();
    panels.end();
    if (panels.begin(P_Mixer)) mixerPanel(false);
    panels.end();
    if (panels.begin(P_Browser)) browserPanel();
    panels.end();
    if (panels.begin(P_Chords)) chordsPanel();
    panels.end();
}

// ================================================================== Studio
namespace {
struct StudioItem { const char* section; const char* icon; const char* title; const char* sub; };
const StudioItem kStudio[] = {
    {"SOURCE", ICON_PIANO, "Instruments", "Choisir le son"},
    {nullptr, ICON_SPEAKER, "Pédalier & amplis", "Effets d'instrument"},
    {nullptr, ICON_MIC, "Enregistrement", "Micro & prises"},
    {nullptr, ICON_DRUM, "Boîte à rythmes", "Motifs & pads"},
    {"MIXAGE", ICON_MIXER, "Console", "Volume et panoramique"},
    {"OUTILS", ICON_TUNER, "Accordeur", "Chromatique"},
};

// vumètre à aiguille (cadran clair, zone rouge à droite)
void vuMeter(ImDrawList* dl, ImVec2 a, ImVec2 b, float level, const char* ch, float& needle) {
    float s = theme().scale;
    dl->AddRectFilled(a, b, col::rgb(232, 232, 235), 8 * s);
    dl->AddRect(a, b, col::rgb(0, 0, 0, 120), 8 * s, 0, 1.f);
    float w = b.x - a.x, h = b.y - a.y;
    ImVec2 pv(a.x + w / 2, b.y - 8 * s);
    float R = std::min(w * 0.46f, h * 0.78f);
    const float a0 = -IM_PI * 0.80f, a1 = -IM_PI * 0.20f;
    // échelle
    dl->PathArcTo(pv, R, a0, a0 + (a1 - a0) * 0.72f, 24);
    dl->PathStroke(col::rgb(30, 30, 32), 0, 1.4f * s);
    dl->PathArcTo(pv, R, a0 + (a1 - a0) * 0.72f, a1, 12);
    dl->PathStroke(col::rgb(214, 54, 48), 0, 2.4f * s);
    for (int i = 0; i <= 10; ++i) {
        float t = a0 + (a1 - a0) * i / 10.f;
        float l = i % 2 ? 5 * s : 9 * s;
        dl->AddLine(ImVec2(pv.x + std::cos(t) * R, pv.y + std::sin(t) * R), ImVec2(pv.x + std::cos(t) * (R - l), pv.y + std::sin(t) * (R - l)),
                    i >= 8 ? col::rgb(214, 54, 48) : col::rgb(30, 30, 32), 1.2f * s);
    }
    ImFont* tf = theme().f.title;
    float fs = tf->FontSize * 0.62f;
    ImVec2 ts = tf->CalcTextSizeA(fs, FLT_MAX, 0, "VU");
    dl->AddText(tf, fs, ImVec2(std::round(pv.x - ts.x / 2), std::round(pv.y - R * 0.55f)), col::rgb(30, 30, 32), "VU");
    ImFont* sf = theme().f.tiny;
    dl->AddText(sf, sf->FontSize, ImVec2(a.x + 8 * s, a.y + 6 * s), col::rgb(30, 30, 32), ch);
    // aiguille (balistique douce)
    float db = 20 * std::log10(std::max(1e-4f, level));
    float target = std::clamp((db + 20) / 23.f, 0.f, 1.f);
    float dt = ImGui::GetIO().DeltaTime;
    needle += (target - needle) * std::min(1.f, dt * (target > needle ? 14.f : 5.f));
    float an = a0 + (a1 - a0) * needle;
    dl->AddLine(pv, ImVec2(pv.x + std::cos(an) * (R + 2 * s), pv.y + std::sin(an) * (R + 2 * s)), col::rgb(20, 20, 22), 1.6f * s);
    dl->AddCircleFilled(pv, 4 * s, col::rgb(20, 20, 22));
}

void pageHeader(const char* title, const char* desc, float rightReserve) {
    ImGui::PushFont(theme().f.title);
    ImGui::TextUnformatted(title);
    ImGui::PopFont();
    ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::ink2));
    ImGui::PushTextWrapPos(ImGui::GetContentRegionMax().x - rightReserve);
    ImGui::TextWrapped("%s", desc);
    ImGui::PopTextWrapPos();
    ImGui::PopStyleColor();
}

void notPorted(const char* icon, const char* what) {
    float s = theme().scale;
    ImVec2 av = ImGui::GetContentRegionAvail();
    ImVec2 p = ImGui::GetCursorScreenPos();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float cy = p.y + std::max(120 * s, av.y * 0.35f);
    svg::drawCentered(dl, icon, ImVec2(p.x + av.x / 2, cy), 44 * s, col::ink3, 1.f);
    std::string t = std::string(what) + " : cette partie de la 1.6 n'est pas encore portée en C++ natif.";
    centeredText(dl, theme().f.ui, theme().f.ui->FontSize, p.x + av.x / 2, cy + 40 * s, std::min(av.x - 40 * s, 520 * s), col::ink2, t.c_str());
    ImGui::Dummy(ImVec2(av.x, cy + 80 * s - p.y));
}
}  // namespace

void App::studioScreen() {
    beginRoot("##studio", col::rgb(35, 36, 38));
    topBar("Studio", ICON_MIXER);
    transportBar(false);
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    float y0 = ImGui::GetCursorScreenPos().y - ImGui::GetStyle().ItemSpacing.y + 14 * s;
    float sw = std::round(220 * s), m = 14 * s;
    // ---- barre latérale : SOURCE / MIXAGE / OUTILS
    ImVec2 sa(wp.x + m, y0), sb(wp.x + m + sw, wp.y + ws.y - m);
    dl->AddRectFilled(sa, sb, col::rgb(45, 45, 49), Theme::kRadius * s);
    dl->AddRect(sa, sb, col::border, Theme::kRadius * s);
    float y = sa.y + 14 * s;
    for (int i = 0; i < 6; ++i) {
        const StudioItem& it = kStudio[i];
        if (it.section) {
            if (i) y += 6 * s;
            capsLabel(dl, ImVec2(sa.x + 20 * s, y), it.section);
            y += 18 * s;
        }
        ImVec2 a(sa.x + 10 * s, y), b(sb.x - 10 * s, y + 52 * s);
        ImGui::SetCursorScreenPos(a);
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("it", ImVec2(b.x - a.x, b.y - a.y))) studioPage = i;
        bool hov = ImGui::IsItemHovered();
        ImGui::PopID();
        bool sel = studioPage == i;
        if (sel) dl->AddRectFilled(a, b, col::accent, 8 * s);
        else if (hov) dl->AddRectFilled(a, b, col::rgb(255, 255, 255, 12), 8 * s);
        iconTile(dl, ImVec2(a.x + 8 * s, a.y + 10 * s), 32 * s, it.icon, sel ? col::rgb(255, 255, 255, 50) : col::rgb(60, 60, 64), IM_COL32_WHITE, 7 * s);
        ImFont* bf = theme().f.bold;
        ImFont* sf = theme().f.small;
        dl->PushClipRect(a, ImVec2(b.x - 4 * s, b.y), true);
        dl->AddText(bf, bf->FontSize, ImVec2(a.x + 50 * s, a.y + 9 * s), IM_COL32_WHITE, it.title);
        dl->AddText(sf, sf->FontSize, ImVec2(a.x + 50 * s, a.y + 28 * s), sel ? col::rgb(255, 255, 255, 200) : col::ink3, it.sub);
        dl->PopClipRect();
        y += 56 * s;
    }
    // ---- page principale
    ImVec2 ma(sb.x + m, y0), mb(wp.x + ws.x - m, wp.y + ws.y - m);
    dl->AddRectFilled(ma, mb, col::rgb(49, 49, 54), Theme::kRadius * s);
    dl->AddRect(ma, mb, col::border, Theme::kRadius * s);
    ImGui::SetCursorScreenPos(ma);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(22 * s, 18 * s));
    ImGui::BeginChild("##stpage", ImVec2(mb.x - ma.x, mb.y - ma.y), ImGuiChildFlags_AlwaysUseWindowPadding, ImGuiWindowFlags_NoBackground);
    ImGui::PopStyleVar();
    switch (studioPage) {
        case 0:
            pageHeader("Instruments", "Choisissez le son de la piste sélectionnée ; double-cliquez ou « + » pour créer une nouvelle piste.", 0);
            ImGui::Dummy(ImVec2(1, 6 * s));
            browserPanel();
            break;
        case 4: {
            float rr = 340 * s;
            ImVec2 hp = ImGui::GetCursorScreenPos();
            pageHeader("Console de mixage", "Volume, panoramique, muet et solo de chaque piste. Double-clic sur un fader : retour au niveau par défaut.", rr);
            // vumètres + « + Piste »
            ImDrawList* cdl = ImGui::GetWindowDrawList();
            float right = ImGui::GetWindowPos().x + ImGui::GetWindowContentRegionMax().x;
            static float nd[2] = {0, 0};
            ImVec2 v0(right - rr, hp.y - 4 * s);
            vuMeter(cdl, v0, ImVec2(v0.x + 140 * s, v0.y + 86 * s), audio().masterLevel(0), "G", nd[0]);
            vuMeter(cdl, ImVec2(v0.x + 152 * s, v0.y), ImVec2(v0.x + 292 * s, v0.y + 86 * s), audio().masterLevel(1), "D", nd[1]);
            ImVec2 keep = ImGui::GetCursorScreenPos();
            ImGui::SetCursorScreenPos(ImVec2(right - 40 * s, v0.y + 24 * s));
            if (skeuo::glossButton("addtrk", ICON_PLUS, true, ImVec2(36 * s, 30 * s), false, "Nouvelle piste (piano)")) addTrack("grand", "Piano");
            ImGui::SetCursorScreenPos(ImVec2(keep.x, std::max(keep.y, v0.y + 100 * s)));
            mixerPanel(true);
            break;
        }
        default:
            pageHeader(kStudio[studioPage].title, kStudio[studioPage].sub, 0);
            notPorted(kStudio[studioPage].icon, kStudio[studioPage].title);
            break;
    }
    ImGui::EndChild();
    ImGui::End();
}

// ================================================================== Éducation
void App::eduScreen() {
    beginRoot("##edu");
    topBar("Éducation musicale", ICON_GRAD);
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    auto& cat = catalog();
    float y0 = ImGui::GetCursorScreenPos().y - ImGui::GetStyle().ItemSpacing.y;
    // ---- onglets : Cours, Exercices, Outils, Partitions, Glossaire
    {
        const char* tabs[] = {ICON_BOOK "  Cours", ICON_TARGET "  Exercices", ICON_SLIDERS "  Outils", ICON_SCORE "  Partitions", ICON_LIST "  Glossaire"};
        ImGui::PushFont(theme().f.bold);
        float tw = 4 * s;
        for (auto t : tabs) tw += std::round(labelSize(t).x + 26 * s);
        ImGui::SetCursorScreenPos(ImVec2(std::round(wp.x + (ws.x - tw) / 2), y0 + 8 * s));
        ImGuiStyle& st = ImGui::GetStyle();
        float fy = st.FramePadding.y;
        st.FramePadding.y = 9 * s;
        skeuo::segmented("edutabs", tabs, 5, &eduTab);
        st.FramePadding.y = fy;
        ImGui::PopFont();
    }
    float top = y0 + 8 * s + ImGui::GetFontSize() + 18 * s + 4 * s + 14 * s;
    float m = 14 * s;
    float sideW = eduTab == 0 ? std::round(290 * s) : 0;
    // ---- programme (barre latérale)
    if (eduTab == 0) {
        ImVec2 sa(wp.x + m, top), sb(wp.x + m + sideW, wp.y + ws.y - m);
        dl->AddRectFilled(sa, sb, col::bg1, Theme::kRadius * s);
        dl->AddRect(sa, sb, col::border, Theme::kRadius * s);
        ImGui::SetCursorScreenPos(sa);
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(12 * s, 14 * s));
        ImGui::BeginChild("##prog", ImVec2(sideW, sb.y - sa.y), ImGuiChildFlags_AlwaysUseWindowPadding, ImGuiWindowFlags_NoBackground);
        ImGui::PopStyleVar();
        ImDrawList* cdl = ImGui::GetWindowDrawList();
        capsLabel(cdl, ImVec2(ImGui::GetCursorScreenPos().x + 8 * s, ImGui::GetCursorScreenPos().y), "PROGRAMME");
        ImGui::Dummy(ImVec2(1, 16 * s));
        float iw = ImGui::GetContentRegionAvail().x;
        for (size_t i = 0; i < cat.chapters.size(); ++i) {
            const Chapter& c = cat.chapters[i];
            ImVec2 a = ImGui::GetCursorScreenPos();
            ImGui::PushID(int(i));
            bool click = ImGui::InvisibleButton("ch", ImVec2(iw, 52 * s));
            bool hov = ImGui::IsItemHovered();
            ImGui::PopID();
            if (click) eduChapter = int(i);
            ImVec2 b(a.x + iw, a.y + 52 * s);
            bool sel = eduChapter == int(i);
            cdl->AddRectFilled(a, b, sel ? col::rgb(48, 209, 88, 40) : hov ? col::rgb(48, 48, 51) : col::rgb(38, 38, 40), 9 * s);
            cdl->AddRect(a, b, sel ? col::accent : col::rgb(255, 255, 255, 18), 9 * s, 0, sel ? 1.5f : 1.f);
            iconTile(cdl, ImVec2(a.x + 10 * s, a.y + 10 * s), 32 * s, Catalog::chapterIcon(c.icon), col::rgb(52, 52, 55), col::ink2, 7 * s);
            ImFont* bf = theme().f.bold;
            ImFont* sf = theme().f.small;
            std::string nm = std::to_string(i + 1) + ". " + c.name;
            std::string sub = "0 / " + std::to_string(c.lessons) + " leçons";
            cdl->PushClipRect(a, ImVec2(b.x - 6 * s, b.y), true);
            cdl->AddText(bf, bf->FontSize, ImVec2(a.x + 52 * s, a.y + 9 * s), col::ink, nm.c_str());
            cdl->AddText(sf, sf->FontSize, ImVec2(a.x + 52 * s, a.y + 28 * s), col::ink3, sub.c_str());
            cdl->PopClipRect();
            ImGui::Dummy(ImVec2(1, 6 * s));
        }
        ImGui::EndChild();
    }
    // ---- contenu
    ImVec2 ma(wp.x + m + (sideW > 0 ? sideW + m : 0), top), mb(wp.x + ws.x - m, wp.y + ws.y - m);
    dl->AddRectFilled(ma, mb, col::panel, Theme::kRadius * s);
    dl->AddRect(ma, mb, col::border, Theme::kRadius * s);
    ImGui::SetCursorScreenPos(ma);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(40 * s, 22 * s));
    ImGui::BeginChild("##edumain", ImVec2(mb.x - ma.x, mb.y - ma.y), ImGuiChildFlags_AlwaysUseWindowPadding, ImGuiWindowFlags_NoBackground);
    ImGui::PopStyleVar();
    ImDrawList* cdl = ImGui::GetWindowDrawList();
    float W = ImGui::GetContentRegionAvail().x;
    ImFont* bf = theme().f.bold;
    ImFont* sf = theme().f.small;
    ImFont* bigf = theme().f.big;
    if (eduTab == 0 && eduChapter < 0) {
        // sommaire
        ImGui::PushFont(theme().f.hero);
        ImGui::TextUnformatted("Cours de solfège");
        ImGui::PopFont();
        ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::ink2));
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + W * 0.66f);
        ImGui::TextWrapped("De la première note jusqu'à la lecture de partitions complètes : rythmes, mesures, nuances, gammes, intervalles, accords…");
        ImGui::PopTextWrapPos();
        ImGui::PopStyleColor();
        ImGui::Dummy(ImVec2(1, 12 * s));
        // carte « Commencer »
        {
            ImVec2 a = ImGui::GetCursorScreenPos(), b(a.x + W, a.y + 168 * s);
            cdl->AddRectFilled(a, b, col::card, 12 * s);
            cdl->AddRect(a, b, col::border, 12 * s);
            const Chapter* c0 = cat.chapters.empty() ? nullptr : &cat.chapters[0];
            const Lesson* l0 = c0 && !c0->list.empty() ? &c0->list[0] : nullptr;
            capsLabel(cdl, ImVec2(a.x + 26 * s, a.y + 26 * s), "COMMENCER");
            std::string ln = l0 ? l0->name : "Les bases";
            cdl->AddText(bigf, bigf->FontSize * 1.35f, ImVec2(a.x + 26 * s, a.y + 44 * s), col::ink, ln.c_str());
            std::string sub = c0 ? "Chapitre 1 · " + c0->name + (l0 ? " · " + std::to_string(l0->minutes) + " min" : "") : "";
            cdl->AddText(theme().f.ui, theme().f.ui->FontSize, ImVec2(a.x + 26 * s, a.y + 86 * s), col::ink2, sub.c_str());
            ImGui::SetCursorScreenPos(ImVec2(a.x + 26 * s, a.y + 116 * s));
            const char* go1 = ICON_PLAY "  Commencer le cours";
            if (skeuo::glossButton("start", go1, true, ImVec2(labelSize(go1).x + 28 * s, 28 * s))) {
                eduChapter = 0;
                notify("Les leçons interactives ne sont pas encore portées en C++ natif : voici le programme du chapitre.");
            }
            // anneau de progression + bilan
            ImVec2 rc(b.x - 270 * s, a.y + 84 * s);
            float rr = 44 * s;
            cdl->AddCircleFilled(rc, rr, col::rgb(28, 28, 30));
            cdl->AddCircle(rc, rr - 5 * s, col::rgb(255, 255, 255, 22), 0, 7 * s);
            ImVec2 ps = bigf->CalcTextSizeA(bigf->FontSize, FLT_MAX, 0, "0%");
            cdl->AddText(bigf, bigf->FontSize, ImVec2(rc.x - ps.x / 2, rc.y - ps.y / 2 - 6 * s), col::ink, "0%");
            ImVec2 dc = sf->CalcTextSizeA(sf->FontSize * 0.85f, FLT_MAX, 0, "du cours");
            cdl->AddText(sf, sf->FontSize * 0.85f, ImVec2(rc.x - dc.x / 2, rc.y + 10 * s), col::ink3, "du cours");
            float tx = rc.x + rr + 22 * s;
            std::string tot = "0 / " + std::to_string(cat.totalLessons());
            cdl->AddText(bigf, bigf->FontSize * 0.85f, ImVec2(tx, a.y + 34 * s), col::ink, tot.c_str());
            cdl->AddText(sf, sf->FontSize, ImVec2(tx, a.y + 60 * s), col::ink2, "leçons terminées");
            cdl->AddText(bigf, bigf->FontSize * 0.85f, ImVec2(tx, a.y + 86 * s), col::ink, "Niveau 1");
            cdl->AddText(sf, sf->FontSize, ImVec2(tx, a.y + 112 * s), col::ink2, "0 XP · prochain : 30");
            ImGui::SetCursorScreenPos(ImVec2(a.x, b.y + 22 * s));
        }
        ImGui::PushFont(theme().f.big);
        ImGui::TextUnformatted("Les chapitres");
        ImGui::PopFont();
        ImGui::Dummy(ImVec2(1, 6 * s));
        // grille des chapitres (3 colonnes)
        int cols = W > 900 * s ? 3 : W > 560 * s ? 2 : 1;
        float gap = 16 * s, cw = (W - gap * (cols - 1)) / cols, chh = 222 * s;
        for (size_t i = 0; i < cat.chapters.size(); ++i) {
            const Chapter& c = cat.chapters[i];
            if (i % size_t(cols)) ImGui::SameLine(0, gap);
            ImVec2 a = ImGui::GetCursorScreenPos(), b(a.x + cw, a.y + chh);
            ImGui::PushID(int(i));
            if (ImGui::InvisibleButton("card", ImVec2(cw, chh))) eduChapter = int(i);
            bool hov = ImGui::IsItemHovered();
            ImGui::PopID();
            cdl->AddRectFilled(a, b, hov ? col::rgb(42, 42, 44) : col::card, 12 * s);
            cdl->AddRect(a, b, col::border, 12 * s);
            iconTile(cdl, ImVec2(a.x + 16 * s, a.y + 16 * s), 46 * s, Catalog::chapterIcon(c.icon), col::accent, IM_COL32_WHITE, 9 * s);
            std::string ch = "CHAPITRE " + std::to_string(i + 1);
            capsLabel(cdl, ImVec2(a.x + 16 * s, a.y + 76 * s), ch.c_str());
            cdl->AddText(bigf, bigf->FontSize * 0.86f, ImVec2(a.x + 16 * s, a.y + 92 * s), col::ink, c.name.c_str());
            cdl->AddText(theme().f.ui, theme().f.ui->FontSize * 0.93f, ImVec2(a.x + 16 * s, a.y + 122 * s), col::ink2, c.desc.c_str(), nullptr, cw - 32 * s);
            cdl->AddRectFilled(ImVec2(a.x + 16 * s, b.y - 38 * s), ImVec2(b.x - 16 * s, b.y - 35 * s), col::rgb(255, 255, 255, 20), 2 * s);
            std::string l = "0 / " + std::to_string(c.lessons) + " leçons";
            cdl->AddText(sf, sf->FontSize, ImVec2(a.x + 16 * s, b.y - 26 * s), col::ink3, l.c_str());
            if (i % size_t(cols) == size_t(cols - 1)) ImGui::Dummy(ImVec2(1, gap - ImGui::GetStyle().ItemSpacing.y));
        }
    } else if (eduTab == 0) {
        // chapitre ouvert : liste des leçons
        const Chapter& c = cat.chapters[size_t(std::clamp(eduChapter, 0, int(cat.chapters.size()) - 1))];
        ImGui::PushFont(theme().f.ui);
        if (linkButton("sommaire", ICON_CHEVRON_LEFT " Sommaire", col::link)) eduChapter = -1;
        ImGui::PopFont();
        ImVec2 tp = ImGui::GetCursorScreenPos();
        iconTile(cdl, ImVec2(tp.x, tp.y + 6 * s), 52 * s, Catalog::chapterIcon(c.icon), col::accent, IM_COL32_WHITE, 11 * s);
        std::string ch = "CHAPITRE " + std::to_string(eduChapter + 1);
        capsLabel(cdl, ImVec2(tp.x + 68 * s, tp.y + 6 * s), ch.c_str());
        ImFont* hf = theme().f.hero;
        cdl->AddText(hf, hf->FontSize * 0.8f, ImVec2(tp.x + 68 * s, tp.y + 18 * s), col::ink, c.name.c_str());
        ImGui::Dummy(ImVec2(1, 70 * s));
        ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::ink2));
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + W * 0.8f);
        ImGui::TextWrapped("%s", c.desc.c_str());
        ImGui::PopTextWrapPos();
        ImGui::PopStyleColor();
        ImGui::Dummy(ImVec2(1, 10 * s));
        for (size_t k = 0; k < c.list.size(); ++k) {
            const Lesson& l = c.list[k];
            ImVec2 a = ImGui::GetCursorScreenPos(), b(a.x + W, a.y + 54 * s);
            cdl->AddRectFilled(a, b, col::card, 10 * s);
            cdl->AddRect(a, b, col::border, 10 * s);
            ImVec2 cc(a.x + 28 * s, a.y + 27 * s);
            cdl->AddCircle(cc, 13 * s, col::rgb(255, 255, 255, 60), 0, 1.5f * s);
            std::string num = std::to_string(k + 1);
            ImVec2 ns = bf->CalcTextSizeA(bf->FontSize, FLT_MAX, 0, num.c_str());
            cdl->AddText(bf, bf->FontSize, ImVec2(std::round(cc.x - ns.x / 2), std::round(cc.y - ns.y / 2)), col::ink2, num.c_str());
            cdl->AddText(bf, bf->FontSize, ImVec2(a.x + 56 * s, a.y + 10 * s), col::ink, l.name.c_str());
            std::string sub = std::to_string(l.minutes) + " min";
            cdl->AddText(sf, sf->FontSize, ImVec2(a.x + 56 * s, a.y + 30 * s), col::ink3, sub.c_str());
            const char* st = "Leçon interactive à venir";
            ImVec2 ss = sf->CalcTextSizeA(sf->FontSize, FLT_MAX, 0, st);
            cdl->AddText(sf, sf->FontSize, ImVec2(b.x - ss.x - 18 * s, a.y + (54 * s - ss.y) / 2), col::ink3, st);
            ImGui::Dummy(ImVec2(W, 54 * s));
            ImGui::Dummy(ImVec2(1, 2 * s));
        }
    } else if (eduTab == 4) {
        // glossaire
        ImGui::PushFont(theme().f.hero);
        ImGui::TextUnformatted("Glossaire");
        ImGui::PopFont();
        static int gcat = -1;
        std::vector<std::string> cats;
        for (auto& g : cat.gloss)
            if (std::find(cats.begin(), cats.end(), g.cat) == cats.end()) cats.push_back(g.cat);
        ImGui::SetNextItemWidth(std::min(W, 360 * s));
        ImGui::InputTextWithHint("##gq", ICON_SEARCH "  Rechercher un terme…", glossQuery, sizeof glossQuery);
        ImGui::Dummy(ImVec2(1, 4 * s));
        if (pillButton("Tous", gcat < 0)) gcat = -1;
        for (size_t i = 0; i < cats.size(); ++i) {
            ImGui::SameLine();
            if (ImGui::GetCursorPosX() + labelSize(cats[i].c_str()).x + 30 * s > W) ImGui::NewLine();
            if (pillButton(cats[i].c_str(), gcat == int(i))) gcat = int(i);
        }
        ImGui::Dummy(ImVec2(1, 8 * s));
        std::string q = lower(glossQuery);
        for (auto& g : cat.gloss) {
            if (gcat >= 0 && g.cat != cats[size_t(gcat)]) continue;
            if (!q.empty() && lower(g.term).find(q) == std::string::npos && lower(g.desc).find(q) == std::string::npos) continue;
            ImVec2 a = ImGui::GetCursorScreenPos();
            float tw = std::min(220 * s, W * 0.3f);
            cdl->AddText(bf, bf->FontSize, a, col::ink, g.term.c_str(), nullptr, tw - 10 * s);
            std::string d = g.desc + (g.extra.empty() ? "" : "  (" + g.extra + ")");
            ImVec2 ds = theme().f.ui->CalcTextSizeA(theme().f.ui->FontSize, FLT_MAX, W - tw - 120 * s, d.c_str());
            cdl->AddText(theme().f.ui, theme().f.ui->FontSize, ImVec2(a.x + tw, a.y), col::ink2, d.c_str(), nullptr, W - tw - 120 * s);
            ImVec2 cs = sf->CalcTextSizeA(sf->FontSize, FLT_MAX, 0, g.cat.c_str());
            cdl->AddText(sf, sf->FontSize, ImVec2(a.x + W - cs.x, a.y + 2 * s), col::ink3, g.cat.c_str());
            float rh = std::max(ds.y, bf->FontSize) + 12 * s;
            cdl->AddLine(ImVec2(a.x, a.y + rh - 6 * s), ImVec2(a.x + W, a.y + rh - 6 * s), col::sep);
            ImGui::Dummy(ImVec2(W, rh));
        }
    } else {
        const char* names[] = {"Cours", "Exercices", "Outils", "Partitions", "Glossaire"};
        const char* icons[] = {ICON_BOOK, ICON_TARGET, ICON_SLIDERS, ICON_SCORE, ICON_LIST};
        ImGui::PushFont(theme().f.hero);
        ImGui::TextUnformatted(names[eduTab]);
        ImGui::PopFont();
        notPorted(icons[eduTab], names[eduTab]);
    }
    ImGui::EndChild();
    ImGui::End();
}

// ================================================================== Accueil (carrousel de la 1.6)
void App::homeScreen() {
    beginRoot("##home");
    ImGuiViewport* vp = ImGui::GetMainViewport();
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float W = vp->WorkSize.x, H = vp->WorkSize.y;
    ImVec2 o = vp->WorkPos;

    // logo + titre
    ImFont* hf = theme().f.hero;
    const char* t1 = "Solfège ";
    const char* t2 = "Quest";
    ImVec2 s1 = hf->CalcTextSizeA(hf->FontSize, FLT_MAX, 0, t1), s2 = hf->CalcTextSizeA(hf->FontSize, FLT_MAX, 0, t2);
    float logo = 54 * s, tw = logo + 16 * s + s1.x + s2.x;
    float tx = std::round(o.x + (W - tw) / 2), ty = std::round(o.y + std::max(28.f * s, H * 0.12f));
    dl->AddRectFilled(ImVec2(tx, ty), ImVec2(tx + logo, ty + logo), col::blue, 12 * s);
    svg::drawCentered(dl, ICON_MUSIC, ImVec2(tx + logo / 2, ty + logo / 2), logo * 0.5f, IM_COL32_WHITE);
    float tyText = std::round(ty + (logo - s1.y) / 2);
    dl->AddText(hf, hf->FontSize, ImVec2(tx + logo + 16 * s, tyText), IM_COL32_WHITE, t1);
    dl->AddText(hf, hf->FontSize, ImVec2(tx + logo + 16 * s + s1.x, tyText), col::blue, t2);

    // cartes
    struct Card { Mode m; const char* sub; const char* title; const char* desc; const char* icon; const char* sc[5]; const char* scIc[5]; int n; };
    static const Card cards[] = {
        {Mode::Edu, "APPRENDRE LE SOLFÈGE", "ÉDUCATION MUSICALE",
         "Un cours progressif : notes, rythmes, gammes, intervalles, accords, lecture de partitions, exercices et dictées.", ICON_GRAD,
         {"Cours", "Exercices", "Outils", "Partitions", "Glossaire"}, {ICON_BOOK, ICON_TARGET, ICON_SLIDERS, ICON_SCORE, ICON_LIST}, 5},
        {Mode::Studio, "ENREGISTRER & FAÇONNER LE SON", "STUDIO",
         "Console de mixage, pédales d'effet et amplis, instruments, boîte à rythmes, micro et accordeur.", ICON_MIXER,
         {"Instruments", "Pédalier & amplis", "Enregistreur", "Boîte à rythmes", "Console"}, {ICON_PIANO, ICON_SPEAKER, ICON_MIC, ICON_DRUM, ICON_SLIDERS}, 5},
        {Mode::Comp, "COMPOSER COMME DANS UNE STATION AUDIO", "COMPOSITION",
         "Pistes et régions, piano roll, partition, mixeur, bibliothèque de sons et grilles d'accords.", ICON_KEYBOARD,
         {"Pistes", "Piano roll", "Partition", "Mixeur", "Accords"}, {ICON_PLAYLIST, ICON_GRID, ICON_SCORE, ICON_MIXER, ICON_CHORDS}, 5},
    };
    const int N = 3;
    float cardW = std::min(1140 * s, W * 0.8f), gap = 44 * s;
    float cy = ty + logo + 26 * s;
    float cardH = std::min(498 * s, H - (cy - o.y) - 130 * s);
    if (homeScroll < 0) homeScroll = float(homeCard);
    homeScroll += (float(homeCard) - homeScroll) * std::min(1.f, ImGui::GetIO().DeltaTime * 12);
    if (ImGui::IsWindowHovered() && !ImGui::IsAnyItemActive()) {
        if (ImGui::IsKeyPressed(ImGuiKey_RightArrow)) homeCard = std::min(N - 1, homeCard + 1);
        if (ImGui::IsKeyPressed(ImGuiKey_LeftArrow)) homeCard = std::max(0, homeCard - 1);
        if (ImGui::IsKeyPressed(ImGuiKey_Enter)) go(cards[homeCard].m);
    }
    for (int i = 0; i < N; ++i) {
        const Card& c = cards[i];
        float cx = std::round(o.x + W / 2 - cardW / 2 + (float(i) - homeScroll) * (cardW + gap));
        ImVec2 a(cx, cy), b(cx + cardW, cy + cardH);
        if (b.x < o.x || a.x > o.x + W) continue;
        bool cur = i == homeCard;
        dl->AddRectFilled(a, b, col::rgb(36, 36, 38), 28 * s);
        // tuile + texte, alignés sur le même axe
        float tile = std::min(cardH * 0.48f, 232 * s);
        float midY = a.y + cardH * 0.38f;
        ImVec2 ta(std::round(a.x + cardW * 0.235f - tile / 2), std::round(midY - tile / 2));
        dl->AddRectFilled(ta, ImVec2(ta.x + tile, ta.y + tile), col::rgb(58, 58, 60), tile * 0.22f);
        svg::drawCentered(dl, c.icon, ImVec2(ta.x + tile / 2, ta.y + tile / 2), tile * 0.5f, IM_COL32_WHITE);
        float tx0 = a.x + cardW * 0.44f, tw0 = cardW * 0.5f;
        ImFont* uf = theme().f.ui;
        float dfs = uf->FontSize * 1.2f;
        ImVec2 hs = hf->CalcTextSizeA(hf->FontSize, FLT_MAX, 0, c.title);
        float tk = std::min(1.f, tw0 / hs.x);
        float dh = uf->CalcTextSizeA(dfs, FLT_MAX, tw0 * 0.84f, c.desc).y;
        float blockH = 20 * s + hs.y * tk + 12 * s + dh + 14 * s + ImGui::GetFrameHeight();
        float yy = std::round(midY - blockH / 2);
        ImFont* tf = theme().f.tiny;
        float sfs = tf->FontSize * 1.15f;
        ImVec2 ss = tf->CalcTextSizeA(sfs, FLT_MAX, 0, c.sub);
        dl->AddText(tf, sfs, ImVec2(std::round(tx0 + (tw0 - ss.x) / 2), yy), col::ink3, c.sub);
        dl->AddText(hf, hf->FontSize * tk, ImVec2(std::round(tx0 + (tw0 - hs.x * tk) / 2), yy + 20 * s), IM_COL32_WHITE, c.title);
        float descH = centeredText(dl, uf, dfs, tx0 + tw0 / 2, yy + 20 * s + hs.y * tk + 12 * s, tw0 * 0.84f, col::ink2, c.desc);
        ImGui::SetCursorScreenPos(ImVec2(std::round(tx0 + tw0 / 2 - 50 * s), std::round(yy + 20 * s + hs.y * tk + 22 * s + descH)));
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("enter", ImVec2(100 * s, ImGui::GetFrameHeight()))) cur ? go(c.m) : (void)(homeCard = i);
        {
            ImVec2 ea = ImGui::GetItemRectMin(), eb = ImGui::GetItemRectMax();
            ImGui::PushFont(theme().f.bold);
            const char* el = "Entrer " ICON_CHEVRON_RIGHT;
            ImVec2 es = ImGui::CalcTextSize(el);
            dl->AddText(ImVec2(std::round((ea.x + eb.x - es.x) / 2), std::round((ea.y + eb.y - es.y) / 2)), ImGui::IsItemHovered() ? col::accentHi : col::link, el);
            ImGui::PopFont();
        }
        // séparateur + raccourcis
        float sy = std::round(a.y + cardH * 0.73f) + 0.5f;
        dl->AddLine(ImVec2(a.x + 44 * s, sy), ImVec2(b.x - 44 * s, sy), col::rgb(255, 255, 255, 22));
        float cellW = (cardW - 88 * s) / c.n;
        for (int k = 0; k < c.n; ++k) {
            ImVec2 ca(a.x + 44 * s + k * cellW, sy + 14 * s);
            ImGui::SetCursorScreenPos(ca);
            ImGui::PushID(k);
            bool clicked = ImGui::InvisibleButton("sc", ImVec2(cellW, cardH * 0.22f));
            bool hov = ImGui::IsItemHovered();
            ImGui::PopID();
            float isz = std::round(38 * s);
            ImVec2 ic(std::round(ca.x + cellW / 2), std::round(ca.y + 14 * s + isz / 2));
            svg::drawCentered(dl, c.scIc[k], ic, isz, hov ? col::link : IM_COL32_WHITE);
            ImVec2 ls = uf->CalcTextSizeA(uf->FontSize, FLT_MAX, 0, c.sc[k]);
            dl->AddText(uf, uf->FontSize, ImVec2(std::round(ca.x + (cellW - ls.x) / 2), std::round(ca.y + 24 * s + isz)), col::ink2, c.sc[k]);
            if (clicked) {
                if (!cur) homeCard = i;
                else {
                    go(c.m);
                    if (c.m == Mode::Edu) { eduTab = k; eduChapter = -1; }
                    if (c.m == Mode::Studio) { static const int pg[] = {0, 1, 2, 3, 4}; studioPage = pg[k]; }
                    if (c.m == Mode::Comp) { static const PanelId ids[] = {P_Playlist, P_PianoRoll, P_Score, P_Mixer, P_Chords}; panels.show(ids[k]); }
                }
            }
        }
        ImGui::PopID();
        if (!cur) {
            dl->AddRectFilled(a, b, IM_COL32(20, 20, 22, 150), 28 * s);
            ImGui::SetCursorScreenPos(a);
            ImGui::PushID(100 + i);
            if (ImGui::InvisibleButton("nb", ImVec2(cardW, cardH))) homeCard = i;
            ImGui::PopID();
        }
    }
    // pagination
    float dy = cy + cardH + 30 * s;
    for (int i = 0; i < N; ++i) {
        ImVec2 c(o.x + W / 2 + (i - 1) * 22 * s, dy);
        dl->AddCircleFilled(c, 4.5f * s, i == homeCard ? IM_COL32_WHITE : col::rgb(255, 255, 255, 80));
        ImGui::SetCursorScreenPos(ImVec2(c.x - 9 * s, c.y - 9 * s));
        ImGui::PushID(200 + i);
        if (ImGui::InvisibleButton("dot", ImVec2(18 * s, 18 * s))) homeCard = i;
        ImGui::PopID();
    }
    // pied : reprendre le projet, clavier numérique
    std::string resume = std::string(ICON_CIRCLE_PLAY "  Reprendre le projet « ") + doc.P.name + " »";
    const char* kb = ICON_PIANO "  Clavier numérique";
    float bh = 30 * s, sp = 10 * s;
    ImGui::PushFont(theme().f.bold);
    float wRes = std::round(labelSize(resume.c_str()).x + 28 * s), wKb = std::round(labelSize(kb).x + 28 * s);
    float rowY = dy + 28 * s;
    ImGui::SetCursorScreenPos(ImVec2(std::round(o.x + (W - wRes - sp - wKb) / 2), rowY));
    if (skeuo::glossButton("resume", resume.c_str(), false, ImVec2(wRes, bh))) go(Mode::Comp);
    ImGui::SameLine(0, sp);
    if (skeuo::glossButton("homepiano", kb, piano.open, ImVec2(wKb, bh), false, "Clavier numérique (Ctrl+K)")) piano.open = !piano.open;
    ImGui::PopFont();
    // échelle (en bas à droite) et version
    ImGui::SetCursorScreenPos(ImVec2(o.x + W - 18 * s - scaleBoxWidth(), o.y + H - 16 * s - ImGui::GetFrameHeight()));
    scaleBox(Mode::Home);
    ImFont* sf = theme().f.small;
    dl->AddText(sf, sf->FontSize, ImVec2(o.x + 18 * s, o.y + H - 16 * s - sf->FontSize - 4 * s), col::ink3, "v" SQ_VERSION_STR " · C++ natif");
    ImGui::End();
}

}  // namespace sq
