// Piano flottant : fenêtre clavier (souris ou clavier d'ordinateur), notes tenues, octave, vélocité,
// et saisie pas à pas des notes jouées dans la région sélectionnée.
#include <algorithm>
#include <cmath>
#include <cstdio>

#include "../third_party/imgui/imgui_internal.h"
#include "app.hpp"
#include "audio.hpp"
#include "catalog.hpp"
#include "icons.hpp"
#include "skeuo.hpp"
#include "theme.hpp"
#include "util.hpp"

namespace sq {

namespace {

struct KeyMap { ImGuiKey key; int semi; const char* label; };
// rangée médiane = touches blanches, rangée du haut = touches noires (comme la version d'origine)
const KeyMap kQwerty[] = {{ImGuiKey_A, 0, "A"}, {ImGuiKey_W, 1, "W"}, {ImGuiKey_S, 2, "S"}, {ImGuiKey_E, 3, "E"}, {ImGuiKey_D, 4, "D"},
                          {ImGuiKey_F, 5, "F"}, {ImGuiKey_T, 6, "T"}, {ImGuiKey_G, 7, "G"}, {ImGuiKey_Y, 8, "Y"}, {ImGuiKey_H, 9, "H"},
                          {ImGuiKey_U, 10, "U"}, {ImGuiKey_J, 11, "J"}, {ImGuiKey_K, 12, "K"}, {ImGuiKey_O, 13, "O"}, {ImGuiKey_L, 14, "L"},
                          {ImGuiKey_P, 15, "P"}, {ImGuiKey_Semicolon, 16, ";"}};
const KeyMap kAzerty[] = {{ImGuiKey_Q, 0, "Q"}, {ImGuiKey_Z, 1, "Z"}, {ImGuiKey_S, 2, "S"}, {ImGuiKey_E, 3, "E"}, {ImGuiKey_D, 4, "D"},
                          {ImGuiKey_F, 5, "F"}, {ImGuiKey_T, 6, "T"}, {ImGuiKey_G, 7, "G"}, {ImGuiKey_Y, 8, "Y"}, {ImGuiKey_H, 9, "H"},
                          {ImGuiKey_U, 10, "U"}, {ImGuiKey_J, 11, "J"}, {ImGuiKey_K, 12, "K"}, {ImGuiKey_O, 13, "O"}, {ImGuiKey_L, 14, "L"},
                          {ImGuiKey_P, 15, "P"}, {ImGuiKey_M, 16, "M"}};

bool black(int m) {
    int pc = ((m % 12) + 12) % 12;
    return pc == 1 || pc == 3 || pc == 6 || pc == 8 || pc == 10;
}

}  // namespace

void App::pianoPress(int midi, bool on) {
    auto it = std::find(piano.held.begin(), piano.held.end(), midi);
    Track* t = doc.P.track(doc.selTrack);
    std::string inst = t ? t->inst : "grand";
    int ti = -1;
    for (size_t i = 0; i < doc.P.tracks.size(); ++i)
        if (doc.P.tracks[i].id == doc.selTrack) ti = int(i);
    if (on) {
        if (it != piano.held.end()) return;
        piano.held.push_back(midi);
        audio().liveOn(inst, midi, piano.vel, ti);
        // saisie pas à pas : la note est écrite à la position courante (les notes simultanées forment un accord)
        if (piano.step && !doc.selRegion.empty()) {
            Region* r = doc.P.region(doc.selRegion);
            if (r) {
                if (piano.stepRegion != r->id) { piano.stepRegion = r->id; piano.stepPos = 0; }
                if (piano.stepPos < r->len - 1e-9) {
                    std::string rid = r->id;
                    double st = piano.stepPos, d = std::min(ed.noteLen, r->len - st);
                    int vel = piano.vel;
                    doc.edit("Saisie au clavier", [&](Project& P) { if (Region* x = P.region(rid)) x->notes.push_back({st, d, midi, vel}); });
                    piano.chordAdded = true;
                }
            }
        }
    } else {
        if (it == piano.held.end()) return;
        piano.held.erase(it);
        audio().liveOff(midi);
        if (piano.held.empty() && piano.chordAdded) {  // accord terminé : on avance d'une durée
            piano.chordAdded = false;
            piano.stepPos += ed.noteLen;
        }
    }
}

void App::pianoWindow() {
    if (!piano.open) {
        for (int m : std::vector<int>(piano.held)) pianoPress(m, false);
        return;
    }
    float s = theme().scale;
    ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::SetNextWindowSize(ImVec2(std::min(980 * s, vp->WorkSize.x * 0.9f), 236 * s), ImGuiCond_FirstUseEver);
    ImGui::SetNextWindowPos(ImVec2(vp->WorkPos.x + vp->WorkSize.x / 2, vp->WorkPos.y + vp->WorkSize.y - 24 * s), ImGuiCond_FirstUseEver, ImVec2(0.5f, 1));
    ImGui::SetNextWindowSizeConstraints(ImVec2(420 * s, 170 * s), ImVec2(FLT_MAX, 420 * s));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(0, 0, 0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0);
    bool open = true;
    bool vis = ImGui::Begin("Piano###piano", &open, ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoScrollbar |
                                                       ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoSavedSettings);
    ImGui::PopStyleVar(2);
    ImGui::PopStyleColor();
    if (!vis) {
        ImGui::End();
        return;
    }
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    ImVec2 a(wp.x + 6 * s, wp.y + 4 * s), b(wp.x + ws.x - 6 * s, wp.y + ws.y - 8 * s);
    // boîtier : aluminium anodisé
    skeuo::surface(dl, a, b, 14 * s, IM_COL32(64, 64, 70, 255), IM_COL32(36, 36, 40, 255), 2.f);
    skeuo::material(dl, skeuo::Mat::Brushed, a, b, IM_COL32(255, 255, 255, 22), 14 * s, s);

    // ---- barre de commandes (poignée de déplacement à gauche)
    float hh = ImGui::GetFrameHeight();
    float ry = a.y + 9 * s;
    ImGui::SetCursorScreenPos(ImVec2(a.x + 10 * s, ry));
    {
        // poignée : glisser pour déplacer la fenêtre
        ImVec2 g0 = ImGui::GetCursorScreenPos();
        ImGui::InvisibleButton("##grip", ImVec2(18 * s, hh));
        if (ImGui::IsItemActive()) ImGui::SetWindowPos(ImVec2(wp.x + ImGui::GetIO().MouseDelta.x, wp.y + ImGui::GetIO().MouseDelta.y));
        if (ImGui::IsItemHovered()) ImGui::SetMouseCursor(ImGuiMouseCursor_ResizeAll);
        for (int r = 0; r < 3; ++r)
            for (int c = 0; c < 2; ++c) dl->AddCircleFilled(ImVec2(g0.x + 5 * s + c * 7 * s, g0.y + hh / 2 - 6 * s + r * 6 * s), 1.4f * s, IM_COL32(220, 220, 230, 120));
        tooltip("Déplacer le piano");
    }
    ImGui::SameLine(0, 8 * s);
    Track* t = doc.P.track(doc.selTrack);
    std::string inst = t ? t->inst : "grand";
    const Instrument* in = catalog().inst(inst);
    {
        ImGui::PushFont(theme().f.bold);
        std::string title = std::string(ICON_PIANO "  ") + (in ? in->name : "Piano") + (t ? "  ·  " + t->name : "");
        ImGui::AlignTextToFramePadding();
        ImGui::TextUnformatted(title.c_str());
        ImGui::PopFont();
        tooltip("Le piano joue le son de la piste sélectionnée");
    }
    // commandes à droite
    float bw = hh + 4 * s;
    float right = b.x - 10 * s;
    float wCtl = bw * 2 + 60 * s + 150 * s + 90 * s + bw * 2 + 40 * s;
    ImGui::SameLine(std::max(ImGui::GetCursorPosX() + 12 * s, right - wCtl - wp.x));
    if (skeuo::glossButton("octm", ICON_CHEVRON_LEFT, false, ImVec2(bw, hh), false, azerty ? "Octave − (W)" : "Octave − (Z)")) piano.octave = std::max(0, piano.octave - 1);
    ImGui::SameLine(0, 4 * s);
    {
        char o[24];
        std::snprintf(o, sizeof o, "Do%d", piano.octave);
        ImVec2 p = ImGui::GetCursorScreenPos();
        skeuo::lcd(dl, p, ImVec2(p.x + 56 * s, p.y + hh), 6 * s);
        ImFont* bf = theme().f.bold;
        ImVec2 ts = bf->CalcTextSizeA(bf->FontSize, FLT_MAX, 0, o);
        skeuo::glowText(dl, bf, bf->FontSize, ImVec2(p.x + (56 * s - ts.x) / 2, p.y + (hh - ts.y) / 2), IM_COL32(150, 210, 255, 255), o);
        ImGui::Dummy(ImVec2(56 * s, hh));
        tooltip("Octave du jeu au clavier");
    }
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("octp", ICON_CHEVRON_RIGHT, false, ImVec2(bw, hh), false, "Octave + (X)")) piano.octave = std::min(7, piano.octave + 1);
    ImGui::SameLine(0, 14 * s);
    ImGui::AlignTextToFramePadding();
    ImGui::TextDisabled("Vélocité");
    ImGui::SameLine(0, 6 * s);
    {
        float v = float(piano.vel);
        ImGui::SetNextItemWidth(90 * s);
        if (ImGui::SliderFloat("##vel", &v, 20, 127, "%.0f")) piano.vel = int(v);
        tooltip("Vélocité (C / V)");
    }
    ImGui::SameLine(0, 14 * s);
    if (skeuo::glossButton("hints", ICON_KEYS, piano.hints, ImVec2(bw, hh), false, "Afficher les lettres du clavier d'ordinateur")) piano.hints = !piano.hints;
    ImGui::SameLine(0, 4 * s);
    bool canStep = !doc.selRegion.empty();
    if (skeuo::glossButton("step", ICON_STEP "  Saisie", piano.step, ImVec2(ImGui::CalcTextSize(ICON_STEP "  Saisie").x + 22 * s, hh), false,
                           canStep ? "Saisie pas à pas : chaque note jouée est écrite dans la région sélectionnée (durée = durée du piano roll)"
                                   : "Saisie pas à pas : sélectionnez d'abord une région")) {
        piano.step = !piano.step;
        piano.stepRegion.clear();
    }
    ImGui::SameLine(0, 4 * s);
    if (skeuo::glossButton("close", ICON_X, false, ImVec2(bw, hh), false, "Fermer le piano (Ctrl+K)")) open = false;

    // ligne d'état de la saisie
    if (piano.step) {
        Region* r = doc.selRegion.empty() ? nullptr : doc.P.region(doc.selRegion);
        char st[160];
        if (r) {
            if (piano.stepRegion != r->id) { piano.stepRegion = r->id; piano.stepPos = 0; }
            double bb = doc.P.barBeats();
            int bar = int(piano.stepPos / bb) + 1;
            double beat = std::fmod(piano.stepPos, bb) * doc.P.tsDen / 4.0 + 1;
            std::snprintf(st, sizeof st, "Saisie dans « %s » : mesure %d, temps %.3g — durée : réglage du piano roll", r->name.empty() ? "région" : r->name.c_str(),
                          bar, beat);
        } else {
            std::snprintf(st, sizeof st, "Saisie : sélectionnez une région dans « Pistes »");
        }
        ImFont* sf = theme().f.small;
        dl->AddText(sf, sf->FontSize, ImVec2(a.x + 14 * s, ry + hh + 4 * s), IM_COL32(150, 210, 255, 220), st);
    }

    // ---- touches
    float kx0 = a.x + 12 * s, kx1 = b.x - 12 * s, ky0 = ry + hh + (piano.step ? 22 : 10) * s, ky1 = b.y - 12 * s;
    float wkW = std::clamp((kx1 - kx0) / 21.f, 22 * s, 40 * s);
    int nWhite = std::max(7, int((kx1 - kx0) / wkW));
    wkW = (kx1 - kx0) / nWhite;
    int startOct = std::clamp(piano.octave - (nWhite > 14 ? 1 : 0), 0, 7);
    int firstMidi = 12 * (startOct + 1);
    static const int wSemi[] = {0, 2, 4, 5, 7, 9, 11};
    // positions
    struct K { int midi; ImVec2 a, b; };
    std::vector<K> whites, blacks;
    for (int i = 0; i < nWhite; ++i) {
        int m = firstMidi + 12 * (i / 7) + wSemi[i % 7];
        whites.push_back({m, ImVec2(std::round(kx0 + i * wkW), ky0), ImVec2(std::round(kx0 + (i + 1) * wkW) - 1, ky1)});
        int pc = wSemi[i % 7];
        if (pc != 4 && pc != 11 && i + 1 < nWhite) {
            float bx = kx0 + (i + 1) * wkW, bwid = wkW * 0.58f;
            blacks.push_back({m + 1, ImVec2(std::round(bx - bwid / 2), ky0), ImVec2(std::round(bx + bwid / 2), std::round(ky0 + (ky1 - ky0) * 0.62f))});
        }
    }
    skeuo::well(dl, ImVec2(kx0 - 3 * s, ky0 - 3 * s), ImVec2(kx1 + 3 * s, ky1 + 3 * s), 6 * s);
    const KeyMap* map = azerty ? kAzerty : kQwerty;
    int mapN = 17;
    auto labelFor = [&](int midi) -> const char* {
        for (int i = 0; i < mapN; ++i)
            if (12 * (piano.octave + 1) + map[i].semi == midi) return map[i].label;
        return nullptr;
    };
    auto isHeld = [&](int m) { return std::find(piano.held.begin(), piano.held.end(), m) != piano.held.end(); };
    ImFont* sf = theme().f.small;
    for (auto& k : whites) {
        bool h = isHeld(k.midi);
        gradientRect(dl, k.a, k.b, h ? IM_COL32(200, 222, 255, 255) : IM_COL32(252, 252, 250, 255), h ? IM_COL32(150, 190, 250, 255) : IM_COL32(224, 224, 220, 255), 5 * s);
        dl->AddRectFilledMultiColor(ImVec2(k.a.x, k.b.y - 10 * s), k.b, IM_COL32(0, 0, 0, 0), IM_COL32(0, 0, 0, 0), IM_COL32(0, 0, 0, 30), IM_COL32(0, 0, 0, 30));
        dl->AddRect(ImVec2(k.a.x - 0.5f, k.a.y - 0.5f), ImVec2(k.b.x + 0.5f, k.b.y + 0.5f), IM_COL32(0, 0, 0, 120), 5 * s);
        float cx = (k.a.x + k.b.x) / 2;
        if (k.midi % 12 == 0) {
            std::string n = pitchName(k.midi);
            ImVec2 ts = sf->CalcTextSizeA(sf->FontSize, FLT_MAX, 0, n.c_str());
            dl->AddText(sf, sf->FontSize, ImVec2(std::round(cx - ts.x / 2), std::round(k.b.y - ts.y - 6 * s)), IM_COL32(90, 90, 98, 255), n.c_str());
        }
        const char* l = piano.hints ? labelFor(k.midi) : nullptr;
        if (l) {
            ImVec2 ts = sf->CalcTextSizeA(sf->FontSize, FLT_MAX, 0, l);
            float ly = k.midi % 12 == 0 ? k.b.y - ts.y * 2 - 10 * s : k.b.y - ts.y - 6 * s;
            dl->AddRectFilled(ImVec2(std::round(cx - ts.x / 2 - 4 * s), std::round(ly - 1 * s)), ImVec2(std::round(cx + ts.x / 2 + 4 * s), std::round(ly + ts.y + 1 * s)),
                              IM_COL32(10, 132, 255, 40), 4 * s);
            dl->AddText(sf, sf->FontSize, ImVec2(std::round(cx - ts.x / 2), std::round(ly)), IM_COL32(20, 96, 200, 255), l);
        }
    }
    for (auto& k : blacks) {
        bool h = isHeld(k.midi);
        dl->AddRectFilled(ImVec2(k.a.x + 1 * s, k.a.y), ImVec2(k.b.x + 2 * s, k.b.y + 3 * s), IM_COL32(0, 0, 0, 90), 4 * s);  // ombre
        gradientRect(dl, k.a, k.b, h ? IM_COL32(64, 120, 210, 255) : IM_COL32(64, 64, 70, 255), h ? IM_COL32(24, 70, 150, 255) : IM_COL32(14, 14, 16, 255), 4 * s);
        dl->AddRectFilled(ImVec2(k.a.x + 2 * s, k.a.y + 2 * s), ImVec2(k.b.x - 2 * s, k.a.y + (k.b.y - k.a.y) * 0.4f), IM_COL32(255, 255, 255, 14), 3 * s);
        dl->AddLine(ImVec2(k.a.x + 3 * s, k.b.y - 3 * s), ImVec2(k.b.x - 3 * s, k.b.y - 3 * s), IM_COL32(255, 255, 255, 40));
        const char* l = piano.hints ? labelFor(k.midi) : nullptr;
        if (l) {
            ImVec2 ts = sf->CalcTextSizeA(sf->FontSize, FLT_MAX, 0, l);
            dl->AddText(sf, sf->FontSize, ImVec2(std::round((k.a.x + k.b.x - ts.x) / 2), std::round(k.b.y - ts.y - 6 * s)), IM_COL32(170, 200, 255, 255), l);
        }
    }

    // ---- souris (glissando possible)
    ImGui::SetCursorScreenPos(ImVec2(kx0, ky0));
    ImGui::InvisibleButton("##keys", ImVec2(kx1 - kx0, ky1 - ky0));
    int hit = -1;
    ImVec2 mp = ImGui::GetIO().MousePos;
    for (auto& k : blacks)
        if (mp.x >= k.a.x && mp.x < k.b.x && mp.y >= k.a.y && mp.y < k.b.y) hit = k.midi;
    if (hit < 0)
        for (auto& k : whites)
            if (mp.x >= k.a.x && mp.x <= k.b.x && mp.y >= k.a.y && mp.y < k.b.y) hit = k.midi;
    if (ImGui::IsItemActive() && hit >= 0 && hit != piano.mouseNote) {
        if (piano.mouseNote >= 0) pianoPress(piano.mouseNote, false);
        piano.mouseNote = hit;
        pianoPress(hit, true);
    }
    if (!ImGui::IsItemActive() && piano.mouseNote >= 0) {
        pianoPress(piano.mouseNote, false);
        piano.mouseNote = -1;
    }

    // ---- clavier d'ordinateur
    ImGuiIO& io = ImGui::GetIO();
    if (!io.WantTextInput && !io.KeyCtrl && !io.KeyAlt) {
        for (int i = 0; i < mapN; ++i) {
            int m = 12 * (piano.octave + 1) + map[i].semi;
            if (ImGui::IsKeyPressed(map[i].key, false)) pianoPress(m, true);
            if (ImGui::IsKeyReleased(map[i].key)) pianoPress(m, false);
        }
        if (ImGui::IsKeyPressed(azerty ? ImGuiKey_W : ImGuiKey_Z, false)) piano.octave = std::max(0, piano.octave - 1);
        if (ImGui::IsKeyPressed(ImGuiKey_X, false)) piano.octave = std::min(7, piano.octave + 1);
        if (ImGui::IsKeyPressed(ImGuiKey_C, false)) piano.vel = std::max(20, piano.vel - 12);
        if (ImGui::IsKeyPressed(ImGuiKey_V, false)) piano.vel = std::min(127, piano.vel + 12);
    }
    // poignée de redimensionnement (coin)
    dl->AddTriangleFilled(ImVec2(b.x - 4 * s, b.y - 14 * s), ImVec2(b.x - 4 * s, b.y - 4 * s), ImVec2(b.x - 14 * s, b.y - 4 * s), IM_COL32(255, 255, 255, 30));
    ImGui::End();
    if (!open) piano.open = false;
}

}  // namespace sq
