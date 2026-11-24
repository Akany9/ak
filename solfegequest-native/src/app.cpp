#include "app.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>

#include "../third_party/imgui/imgui_internal.h"
#include "audio.hpp"
#include "catalog.hpp"
#include "icons.hpp"
#include "resource_ids.h"
#include "theme.hpp"
#include "util.hpp"

namespace sq {

App& app() {
    static App a;
    return a;
}

static float gScale[4] = {1.f, 1.f, 1.f, 0.85f};  // échelle par écran (Composition : 85 %)

static Project demoProject() {
    Project p = fromJson(catalog().demo);
    if (p.tracks.empty()) {
        p.name = "Nouveau projet";
        Track t;
        t.id = newId('t');
        t.name = "Piano";
        p.tracks.push_back(t);
    }
    return p;
}

void App::notify(const std::string& msg) {
    toast = msg;
    toastUntil = ImGui::GetTime() + 2.6;
}

void App::init() {
    catalog().load();
    audio().init();
    std::string ws;
    if (readFile(joinPath(dataDir(), "workspace.json"), ws)) {
        try {
            json j = json::parse(ws);
            panels.load(j);
            if (j.contains("scale") && j["scale"].is_array())
                for (size_t i = 0; i < 4 && i < j["scale"].size(); ++i) gScale[i] = std::clamp(j["scale"][i].get<float>(), 0.7f, 1.4f);
            if (j.contains("mode")) mode = Mode(std::clamp(j["mode"].get<int>(), 0, 3));
        } catch (...) {
        }
    }
    if (!doc.loadAutosave(joinPath(dataDir(), "autosave.json"))) doc.setProject(demoProject());
    if (!doc.P.ui.empty() && doc.P.ui.contains("ini")) panels.load(doc.P.ui);
    theme().setUserScale(gScale[int(mode)]);
}

void App::shutdown() {
    doc.autosave(joinPath(dataDir(), "autosave.json"));
    audio().shutdown();
}

void App::go(Mode m) {
    if (m == mode) return;
    mode = m;
    if (std::fabs(theme().scale - gScale[int(m)] * theme().dpi) > 1e-3) theme().setUserScale(gScale[int(m)]);
    if (m == Mode::Home) homeScroll = -1;
}

// ------------------------------------------------------------------ fichiers

void App::newProject() {
    Project p;
    p.name = "Nouveau projet";
    Track t;
    t.id = newId('t');
    t.name = "Piano";
    t.inst = "grand";
    p.tracks.push_back(t);
    doc.setProject(p);
    doc.path.clear();
    audio().stop();
    audio().seek(0);
    notify("Nouveau projet");
}

void App::openProject() {
    std::string f = openFileDialog("Ouvrir un projet Solfège Quest");
    if (f.empty()) return;
    std::string err;
    if (!doc.loadFile(f, &err)) {
        messageBox("Impossible d'ouvrir ce projet : " + err, true);
        return;
    }
    if (doc.P.ui.contains("ini")) panels.load(doc.P.ui);  // retrouve les fenêtres de ce projet
    audio().stop();
    audio().seek(0);
    notify("Projet ouvert : " + doc.P.name);
}

void App::saveProject(bool as) {
    std::string f = doc.path;
    if (as || f.empty()) f = saveFileDialog("Enregistrer le projet", doc.P.name + ".sqproj");
    if (f.empty()) return;
    doc.P.ui = panels.save();  // la disposition des panneaux voyage avec le projet
    std::string err;
    if (!doc.saveFile(f, &err)) messageBox("Enregistrement impossible : " + err, true);
    else notify("Projet enregistré");
}

void App::addTrack(const std::string& inst, const std::string& name) {
    const Instrument* in = catalog().inst(inst);
    std::string id = newId('t');
    doc.edit("Nouvelle piste", [&](Project& P) {
        Track t;
        t.id = id;
        t.inst = inst;
        t.kind = in && in->drum ? "drum" : "inst";
        t.name = !name.empty() ? name : in ? in->name : "Piste";
        P.tracks.push_back(t);
    });
    doc.selTrack = id;
    doc.selRegion.clear();
}

// ------------------------------------------------------------------ cadre

void App::syncAudio() {
    if (doc.version != audioVersion_) {
        audio().update(doc.P);
        audioVersion_ = doc.version;
    }
}

void App::shortcuts() {
    ImGuiIO& io = ImGui::GetIO();
    if (io.WantTextInput) return;
    bool ctrl = io.KeyCtrl, shift = io.KeyShift;
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_Z, false)) shift ? doc.redo() : doc.undo();
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_Y, false)) doc.redo();
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_S, false)) saveProject(shift);
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_O, false)) openProject();
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_N, false)) newProject();
    if (ctrl && io.KeyAlt) {
        float& s = gScale[int(mode)];
        float old = s;
        if (ImGui::IsKeyPressed(ImGuiKey_Equal, false) || ImGui::IsKeyPressed(ImGuiKey_KeypadAdd, false)) s = std::min(1.4f, s + 0.05f);
        if (ImGui::IsKeyPressed(ImGuiKey_Minus, false) || ImGui::IsKeyPressed(ImGuiKey_KeypadSubtract, false)) s = std::max(0.7f, s - 0.05f);
        if (ImGui::IsKeyPressed(ImGuiKey_0, false)) s = 1;
        if (s != old) { theme().setUserScale(s); }
    }
    if (mode == Mode::Comp || mode == Mode::Studio) {
        if (ImGui::IsKeyPressed(ImGuiKey_Space, false) && !ctrl) audio().toggle();
        if (ImGui::IsKeyPressed(ImGuiKey_Enter, false) && !ctrl) audio().seek(0);
    }
    if (mode == Mode::Comp) panels.shortcuts();
}

void App::drawToast() {
    if (toast.empty() || ImGui::GetTime() > toastUntil) return;
    ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(ImVec2(vp->WorkPos.x + vp->WorkSize.x / 2, vp->WorkPos.y + vp->WorkSize.y - 30 * theme().scale), ImGuiCond_Always, ImVec2(0.5f, 1));
    ImGui::SetNextWindowBgAlpha(0.96f);
    ImGui::Begin("##toast", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoSavedSettings |
                                         ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoFocusOnAppearing | ImGuiWindowFlags_NoNav | ImGuiWindowFlags_NoInputs);
    ImGui::TextUnformatted(toast.c_str());
    ImGui::End();
}

void App::frame() {
    shortcuts();
    syncAudio();

    switch (mode) {
        case Mode::Home: homeScreen(); break;
        case Mode::Edu: eduScreen(); break;
        case Mode::Studio: studioScreen(); break;
        case Mode::Comp: compScreen(); break;
    }
    trackColorPopup();
    drawToast();

    // sauvegardes automatiques (projet + espace de travail)
    double now = ImGui::GetTime();
    if (doc.dirty && now - lastAutosave_ > 3) {
        lastAutosave_ = now;
        doc.autosave(joinPath(dataDir(), "autosave.json"));
    }
    {
        static std::string last;
        json j = json::object();
        j["scale"] = {gScale[0], gScale[1], gScale[2], gScale[3]};
        j["mode"] = int(mode);
        std::string s = j.dump();
        if (s != last) {
            last = s;
            ImGui::GetIO().WantSaveIniSettings = true;
        }
    }
    {
        // workspace.json = disposition des panneaux + échelles + écran courant
        ImGuiIO& io = ImGui::GetIO();
        static double lastWs = 0;
        static std::string lastWsText;
        if (io.WantSaveIniSettings || now - lastWs > 5) {
            lastWs = now;
            io.WantSaveIniSettings = false;
            json j = panels.save();
            j["scale"] = {gScale[0], gScale[1], gScale[2], gScale[3]};
            j["mode"] = int(mode);
            std::string s = j.dump();
            if (s != lastWsText) {
                lastWsText = s;
                writeFile(joinPath(dataDir(), "workspace.json"), s);
            }
        }
    }
    if (setTitle) {
        static std::string lastTitle;
        std::string t = doc.P.name + (doc.dirty ? " •" : "") + " — Solfège Quest";
        if (t != lastTitle) {
            lastTitle = t;
            setTitle(t.c_str());
        }
    }
}

// ------------------------------------------------------------------ barre du haut

static void beginRoot(const char* name) {
    ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(vp->WorkPos);
    ImGui::SetNextWindowSize(vp->WorkSize);
    ImGui::SetNextWindowViewport(vp->ID);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, ImGui::ColorConvertU32ToFloat4(col::bg0));
    ImGui::Begin(name, nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                    ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoSavedSettings);
    ImGui::PopStyleColor();
    ImGui::PopStyleVar(3);
    // fond : léger halo bleuté en haut, dégradé vers le noir
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 a = vp->WorkPos, b(vp->WorkPos.x + vp->WorkSize.x, vp->WorkPos.y + vp->WorkSize.y);
    dl->AddRectFilledMultiColor(a, b, col::rgb(30, 31, 36), col::rgb(30, 31, 36), col::rgb(16, 16, 18), col::rgb(16, 16, 18));
}

void App::topBar(const char* title, const char* icon) {
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 p0 = ImGui::GetCursorScreenPos();
    float h = 50 * s;
    ImVec2 p1(p0.x + ImGui::GetContentRegionAvail().x, p0.y + h);
    dl->AddRectFilledMultiColor(p0, p1, col::rgb(33, 33, 37), col::rgb(33, 33, 37), col::rgb(24, 24, 27), col::rgb(24, 24, 27));
    dl->AddLine(ImVec2(p0.x, p1.y - 1), ImVec2(p1.x, p1.y - 1), col::sep);
    ImGui::SetCursorScreenPos(ImVec2(p0.x + 12 * s, p0.y + (h - ImGui::GetFrameHeight()) / 2));
    // « ‹ Accueil »
    ImGui::PushStyleColor(ImGuiCol_Button, IM_COL32(0, 0, 0, 0));
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, IM_COL32(255, 255, 255, 18));
    ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::link));
    if (ImGui::Button(ICON_CHEVRON_LEFT " Accueil")) go(Mode::Home);
    ImGui::PopStyleColor(3);
    ImGui::SameLine(0, 14 * s);
    ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::accentHi));
    ImGui::TextUnformatted(icon);
    ImGui::PopStyleColor();
    ImGui::SameLine();
    {
        // titre (Fraunces) centré verticalement dans la barre
        ImFont* tf = theme().f.title;
        ImVec2 tp = ImGui::GetCursorScreenPos();
        ImVec2 tsz = tf->CalcTextSizeA(tf->FontSize, FLT_MAX, 0, title);
        dl->AddText(tf, tf->FontSize, ImVec2(tp.x, p0.y + (h - tsz.y) / 2 - 1 * s), col::ink, title);
        ImGui::Dummy(ImVec2(tsz.x + 6 * s, ImGui::GetFrameHeight()));
        ImGui::SameLine();
    }

    if (mode == Mode::Comp || mode == Mode::Studio) {
        // nom du projet (cliquer pour renommer)
        static char buf[96];
        static bool editing = false;
        ImGui::SetNextItemWidth(190 * s);
        if (!editing) {
            std::string label = std::string(ICON_MUSIC2 "  ") + doc.P.name + (doc.dirty ? "  •" : "") + "##proj";
            if (ImGui::Button(label.c_str())) {
                editing = true;
                std::snprintf(buf, sizeof buf, "%s", doc.P.name.c_str());
                ImGui::SetKeyboardFocusHere(1);
            }
            tooltip("Nom du projet (cliquer pour renommer)");
        } else {
            ImGui::SetKeyboardFocusHere();
            if (ImGui::InputText("##pname", buf, sizeof buf, ImGuiInputTextFlags_EnterReturnsTrue | ImGuiInputTextFlags_AutoSelectAll) ||
                ImGui::IsItemDeactivated()) {
                if (*buf && doc.P.name != buf) doc.edit("Renommer le projet", [&](Project& P) { P.name = buf; });
                editing = false;
            }
        }
        ImGui::SameLine();
    }

    // à droite : sélecteur d'écran, échelle, aide
    float wMode = 0;
    const char* names[] = {"ÉDUCATION", "STUDIO", "COMPOSITION"};
    const char* icons[] = {ICON_GRAD, ICON_MIXER, ICON_KEYBOARD};
    ImGui::PushFont(theme().f.small);
    for (int i = 0; i < 3; ++i) wMode += ImGui::CalcTextSize(names[i]).x + ImGui::CalcTextSize(icons[i]).x + 34 * s;
    ImGui::PopFont();
    float wScale = 120 * s;
    float right = p1.x - 12 * s - wMode - wScale - 12 * s;
    ImGui::SameLine(std::max(ImGui::GetCursorPosX(), right - ImGui::GetWindowPos().x));
    // échelle
    {
        float& sc = gScale[int(mode)];
        ImGui::PushStyleColor(ImGuiCol_Button, ImGui::ColorConvertU32ToFloat4(col::seg));
        if (ImGui::Button(ICON_MINUS "##scm")) { sc = std::max(0.7f, sc - 0.05f); theme().setUserScale(sc); }
        tooltip("Réduire l'échelle (Ctrl+Alt+−)");
        ImGui::SameLine(0, 2);
        char pct[16];
        std::snprintf(pct, sizeof pct, "%d %%##sc0", int(std::lround(sc * 100)));
        if (ImGui::Button(pct, ImVec2(52 * s, 0))) { sc = 1; theme().setUserScale(1); }
        tooltip("Échelle de l'interface (cliquer : 100 %)");
        ImGui::SameLine(0, 2);
        if (ImGui::Button(ICON_PLUS "##scp")) { sc = std::min(1.4f, sc + 0.05f); theme().setUserScale(sc); }
        tooltip("Agrandir l'échelle (Ctrl+Alt+=)");
        ImGui::PopStyleColor();
    }
    ImGui::SameLine(0, 12 * s);
    // sélecteur d'écran (contrôle segmenté)
    ImGui::PushFont(theme().f.small);
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(2, 0));
    Mode modes[] = {Mode::Edu, Mode::Studio, Mode::Comp};
    for (int i = 0; i < 3; ++i) {
        std::string l = std::string(icons[i]) + " " + names[i];
        if (pillButton(l.c_str(), mode == modes[i])) go(modes[i]);
        ImGui::SameLine();
    }
    ImGui::PopStyleVar();
    ImGui::PopFont();
    ImGui::SetCursorScreenPos(ImVec2(p0.x, p1.y));
    ImGui::Dummy(ImVec2(1, 0));
}

static std::string fmtTime(double sec) {
    char b[32];
    int m = int(sec / 60);
    std::snprintf(b, sizeof b, "%02d:%04.1f", m, sec - m * 60);
    return b;
}

void App::transportBar(bool full) {
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 p0 = ImGui::GetCursorScreenPos();
    float h = 52 * s;
    ImVec2 p1(p0.x + ImGui::GetContentRegionAvail().x, p0.y + h);
    dl->AddRectFilledMultiColor(p0, p1, col::rgb(30, 30, 33), col::rgb(30, 30, 33), col::rgb(24, 24, 27), col::rgb(24, 24, 27));
    dl->AddLine(ImVec2(p0.x, p1.y - 1), ImVec2(p1.x, p1.y - 1), col::sep);
    ImGui::SetCursorScreenPos(ImVec2(p0.x + 12 * s, p0.y + (h - ImGui::GetFrameHeight()) / 2));

    // fichier
    if (iconButton("new", ICON_NEW, "Nouveau projet (Ctrl+N)")) newProject();
    ImGui::SameLine();
    if (iconButton("open", ICON_OPEN, "Ouvrir un projet .sqproj (Ctrl+O)")) openProject();
    ImGui::SameLine();
    if (iconButton("save", ICON_SAVE, "Enregistrer (Ctrl+S) — Maj : enregistrer sous")) saveProject(ImGui::GetIO().KeyShift);
    ImGui::SameLine();
    ImGui::BeginDisabled(!doc.canUndo());
    if (iconButton("undo", ICON_UNDO, ("Annuler " + doc.undoLabel() + " (Ctrl+Z)").c_str())) doc.undo();
    ImGui::EndDisabled();
    ImGui::SameLine();
    ImGui::BeginDisabled(!doc.canRedo());
    if (iconButton("redo", ICON_REDO, "Rétablir (Ctrl+Maj+Z)")) doc.redo();
    ImGui::EndDisabled();
    ImGui::SameLine(0, 18 * s);

    // transport
    Audio& au = audio();
    if (iconButton("rew", ICON_SKIP_BACK, "Début (Entrée)")) au.seek(0);
    ImGui::SameLine();
    if (iconButton("play", au.playing() ? ICON_PAUSE : ICON_PLAY, "Lecture / pause (Espace)", au.playing(), ImVec2(ImGui::GetFrameHeight() * 1.4f, 0)))
        au.toggle();
    ImGui::SameLine();
    if (iconButton("loop", ICON_REPEAT, "Boucle (cycle) — sur la région sélectionnée ou les 4 premières mesures", doc.P.loopOn)) {
        doc.edit("Boucle", [&](Project& P) {
            P.loopOn = !P.loopOn;
            if (P.loopOn) {
                Region* r = doc.selRegion.empty() ? nullptr : P.region(doc.selRegion);
                if (r) { P.loopS = r->s; P.loopE = r->s + r->len; }
                else if (P.loopE <= P.loopS + 0.5) { P.loopS = 0; P.loopE = P.barBeats() * 4; }
            }
        });
    }
    ImGui::SameLine();
    bool met = au.metronome;
    if (iconButton("met", ICON_METRONOME, "Métronome", met)) au.metronome = !met;
    ImGui::SameLine(0, 14 * s);

    // écran LCD
    {
        double pos = au.position();
        double bb = doc.P.barBeats();
        int bar = int(pos / bb) + 1;
        double inBar = pos - (bar - 1) * bb;
        int beat = int(inBar * doc.P.tsDen / 4.0) + 1;
        int sub = int(std::fmod(inBar, 4.0 / doc.P.tsDen) / (1.0 / 4) ) + 1;
        char lcd[64];
        std::snprintf(lcd, sizeof lcd, "%03d.%d.%d", bar, beat, sub);
        ImVec2 c0 = ImGui::GetCursorScreenPos();
        float lw = 420 * s, lh = ImGui::GetFrameHeight() + 10 * s;
        c0.y -= 5 * s;
        dl->AddRectFilledMultiColor(c0, ImVec2(c0.x + lw, c0.y + lh), col::rgb(14, 14, 16), col::rgb(14, 14, 16), col::rgb(8, 8, 10), col::rgb(8, 8, 10));
        dl->AddRect(c0, ImVec2(c0.x + lw, c0.y + lh), col::sep, 8 * s);
        ImGui::BeginGroup();
        ImGui::SetCursorScreenPos(ImVec2(c0.x + 12 * s, c0.y + 5 * s));
        ImGui::PushFont(theme().f.bold);
        ImGui::TextUnformatted(lcd);
        ImGui::SameLine(0, 18 * s);
        ImGui::TextUnformatted(fmtTime(pos * 60 / doc.P.bpm).c_str());
        ImGui::PopFont();
        ImGui::SameLine(0, 18 * s);
        // tempo (glisser ou double-cliquer)
        float bpm = float(doc.P.bpm);
        ImGui::SetNextItemWidth(70 * s);
        ImGui::PushStyleColor(ImGuiCol_FrameBg, IM_COL32(0, 0, 0, 0));
        if (ImGui::DragFloat("##bpm", &bpm, 0.5f, 30, 260, "%.0f bpm")) {
            doc.editCoalesced("tempo", [&](Project& P) { P.bpm = std::round(bpm); });
        }
        if (ImGui::IsItemDeactivatedAfterEdit()) doc.endCoalesce();
        tooltip("Tempo (glisser, ou double-clic pour saisir)");
        ImGui::SameLine();
        static const char* keys[] = {"Do", "Do♯", "Ré", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"};
        std::string kl = std::string(keys[(doc.P.keyRoot % 12 + 12) % 12]) + (doc.P.keyMode == "min" ? " min" : " maj");
        ImGui::SetNextItemWidth(86 * s);
        if (ImGui::BeginCombo("##key", kl.c_str(), ImGuiComboFlags_NoArrowButton)) {
            for (int m = 0; m < 2; ++m)
                for (int k = 0; k < 12; ++k) {
                    std::string l = std::string(keys[k]) + (m ? " min" : " maj");
                    if (ImGui::Selectable(l.c_str(), doc.P.keyRoot == k && (doc.P.keyMode == "min") == bool(m)))
                        doc.edit("Tonalité", [&](Project& P) { P.keyRoot = k; P.keyMode = m ? "min" : "maj"; });
                }
            ImGui::EndCombo();
        }
        tooltip("Tonalité");
        ImGui::SameLine();
        char ts[16];
        std::snprintf(ts, sizeof ts, "%d/%d", doc.P.tsNum, doc.P.tsDen);
        ImGui::SetNextItemWidth(56 * s);
        if (ImGui::BeginCombo("##ts", ts, ImGuiComboFlags_NoArrowButton)) {
            int opts[][2] = {{4, 4}, {3, 4}, {2, 4}, {6, 8}, {5, 4}, {7, 8}, {12, 8}};
            for (auto& o : opts) {
                char l[16];
                std::snprintf(l, sizeof l, "%d/%d", o[0], o[1]);
                if (ImGui::Selectable(l, doc.P.tsNum == o[0] && doc.P.tsDen == o[1]))
                    doc.edit("Mesure", [&](Project& P) { P.tsNum = o[0]; P.tsDen = o[1]; });
            }
            ImGui::EndCombo();
        }
        tooltip("Chiffrage de la mesure");
        ImGui::PopStyleColor();
        ImGui::EndGroup();
        ImGui::SetCursorScreenPos(ImVec2(c0.x + lw + 14 * s, c0.y + 5 * s));
    }
    // vumètre général
    {
        ImVec2 m0 = ImGui::GetCursorScreenPos();
        float w = 60 * s, hh = 5 * s;
        for (int c = 0; c < 2; ++c) {
            float lv = std::min(1.f, au.masterLevel(c));
            ImVec2 a(m0.x, m0.y + 6 * s + c * (hh + 3 * s));
            dl->AddRectFilled(a, ImVec2(a.x + w, a.y + hh), col::rgb(255, 255, 255, 25), 2);
            dl->AddRectFilled(a, ImVec2(a.x + w * lv, a.y + hh), lv > 0.9f ? col::orange : col::rgb(220, 220, 228), 2);
        }
        ImGui::Dummy(ImVec2(w, 1));
        tooltip("Niveau de sortie");
        ImGui::SameLine(0, 16 * s);
    }
    if (full) panels.toggleBar();
    ImGui::SetCursorScreenPos(ImVec2(p0.x, p1.y));
    ImGui::Dummy(ImVec2(1, 0));
}

// ------------------------------------------------------------------ écrans

void App::compScreen() {
    beginRoot("##comp");
    topBar("Composition", ICON_KEYBOARD);
    transportBar(true);
    ImGui::SetCursorPos(ImVec2(6 * theme().scale, ImGui::GetCursorPosY() + 6 * theme().scale));
    ImGui::BeginChild("##dockhost", ImVec2(-6 * theme().scale, -6 * theme().scale), ImGuiChildFlags_None, ImGuiWindowFlags_NoBackground);
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

void App::studioScreen() {
    beginRoot("##studio");
    topBar("Studio", ICON_MIXER);
    transportBar(false);
    float s = theme().scale;
    ImGui::SetCursorPos(ImVec2(12 * s, ImGui::GetCursorPosY() + 10 * s));
    ImGui::BeginChild("##stbody", ImVec2(-12 * s, -12 * s));
    float w = ImGui::GetContentRegionAvail().x;
    ImGui::BeginChild("##stinst", ImVec2(w * 0.28f, 0), ImGuiChildFlags_Borders);
    ImGui::PushFont(theme().f.title);
    ImGui::TextUnformatted("Instruments");
    ImGui::PopFont();
    ImGui::TextDisabled("Choisir le son de la piste sélectionnée");
    ImGui::Separator();
    browserPanel();
    ImGui::EndChild();
    ImGui::SameLine();
    ImGui::BeginChild("##stcons", ImVec2(0, 0), ImGuiChildFlags_Borders);
    ImGui::PushFont(theme().f.title);
    ImGui::TextUnformatted("Console de mixage");
    ImGui::PopFont();
    ImGui::TextDisabled("Volume, panoramique, muet et solo de chaque piste. Les effets, le pédalier et l'enregistreur arrivent dans une prochaine étape du portage.");
    ImGui::Separator();
    mixerPanel(true);
    ImGui::EndChild();
    ImGui::EndChild();
    ImGui::End();
}

void App::eduScreen() {
    beginRoot("##edu");
    topBar("Éducation musicale", ICON_GRAD);
    float s = theme().scale;
    ImGui::SetCursorPos(ImVec2(24 * s, ImGui::GetCursorPosY() + 18 * s));
    ImGui::BeginChild("##edubody", ImVec2(-24 * s, -18 * s));
    ImGui::PushFont(theme().f.hero);
    ImGui::TextUnformatted("Cours de solfège");
    ImGui::PopFont();
    ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::ink2));
    ImGui::TextWrapped("De la première note jusqu'à la lecture de partitions complètes. La version C++ reprend le programme ci-dessous ; "
                       "les leçons interactives, exercices et dictées sont en cours de portage depuis l'ancienne version.");
    ImGui::PopStyleColor();
    ImGui::Dummy(ImVec2(1, 10 * s));
    auto& chs = catalog().chapters;
    float cw = 300 * s, ch = 132 * s, gap = 14 * s;
    int cols = std::max(1, int((ImGui::GetContentRegionAvail().x + gap) / (cw + gap)));
    cw = (ImGui::GetContentRegionAvail().x - gap * (cols - 1)) / cols;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    static const ImU32 tints[] = {col::rgb(47, 127, 216), col::rgb(201, 128, 58), col::rgb(122, 111, 181), col::rgb(155, 89, 208),
                                  col::rgb(88, 86, 214), col::rgb(61, 119, 176), col::rgb(138, 90, 181), col::rgb(232, 137, 26),
                                  col::rgb(79, 143, 184), col::rgb(168, 108, 193), col::rgb(168, 128, 58)};
    for (size_t i = 0; i < chs.size(); ++i) {
        if (i % size_t(cols)) ImGui::SameLine(0, gap);
        ImVec2 a = ImGui::GetCursorScreenPos(), b(a.x + cw, a.y + ch);
        gradientRect(dl, a, b, col::rgb(46, 46, 49), col::rgb(36, 36, 38), 12 * s);
        dl->AddRect(a, b, col::sep, 12 * s);
        ImU32 t = tints[i % 11];
        gradientRect(dl, ImVec2(a.x + 14 * s, a.y + 14 * s), ImVec2(a.x + 46 * s, a.y + 46 * s), mixColor(t, IM_COL32(255, 255, 255, 255), 0.3f), t, 8 * s);
        ImGui::PushFont(theme().f.bold);
        dl->AddText(ImVec2(a.x + 22 * s, a.y + 21 * s), IM_COL32_WHITE, std::to_string(i + 1).c_str());
        dl->AddText(ImVec2(a.x + 14 * s, a.y + 56 * s), col::ink, chs[i].name.c_str());
        ImGui::PopFont();
        ImGui::PushFont(theme().f.small);
        dl->AddText(nullptr, 0, ImVec2(a.x + 14 * s, a.y + 80 * s), col::ink2, chs[i].desc.c_str(), nullptr, cw - 28 * s);
        std::string l = std::to_string(chs[i].lessons) + " leçons";
        dl->AddText(ImVec2(a.x + cw - 14 * s - ImGui::CalcTextSize(l.c_str()).x, a.y + 22 * s), col::ink3, l.c_str());
        ImGui::PopFont();
        ImGui::Dummy(ImVec2(cw, ch));
        if (i % size_t(cols) == size_t(cols - 1)) ImGui::Dummy(ImVec2(1, gap - ImGui::GetStyle().ItemSpacing.y));
    }
    ImGui::EndChild();
    ImGui::End();
}

void App::homeScreen() {
    beginRoot("##home");
    ImGuiViewport* vp = ImGui::GetMainViewport();
    float s = theme().scale;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float W = vp->WorkSize.x, H = vp->WorkSize.y;
    ImVec2 o = vp->WorkPos;
    // halo
    dl->AddRectFilledMultiColor(o, ImVec2(o.x + W, o.y + H * 0.5f), col::rgb(30, 38, 52), col::rgb(30, 38, 52), col::rgb(18, 18, 20, 0), col::rgb(18, 18, 20, 0));

    // logo + titre
    ImGui::PushFont(theme().f.hero);
    const char* t1 = "Solfège ";
    const char* t2 = "Quest";
    ImVec2 s1 = ImGui::CalcTextSize(t1), s2 = ImGui::CalcTextSize(t2);
    float logo = 56 * s, tw = logo + 16 * s + s1.x + s2.x;
    float tx = o.x + (W - tw) / 2, ty = o.y + std::max(24.f * s, H * 0.07f);
    gradientRect(dl, ImVec2(tx, ty), ImVec2(tx + logo, ty + logo), col::rgb(94, 176, 255), col::rgb(10, 111, 214), 14 * s);
    ImGui::PopFont();
    ImGui::PushFont(theme().f.icons);
    {
        ImVec2 isz = ImGui::CalcTextSize(ICON_MUSIC);
        float k = 0.62f;
        dl->AddText(theme().f.icons, theme().f.icons->FontSize * k, ImVec2(tx + (logo - isz.x * k) / 2, ty + (logo - isz.y * k) / 2), IM_COL32_WHITE, ICON_MUSIC);
    }
    ImGui::PopFont();
    ImGui::PushFont(theme().f.hero);
    float tyText = ty + (logo - s1.y) / 2;
    dl->AddText(ImVec2(tx + logo + 16 * s, tyText), IM_COL32_WHITE, t1);
    dl->AddText(ImVec2(tx + logo + 16 * s + s1.x, tyText), col::accentHi, t2);
    ImGui::PopFont();

    // carrousel
    struct Card { Mode m; const char* sub; const char* title; const char* desc; const char* icon; ImU32 c0, c1, tint;
                  const char* sc[5]; const char* scIc[5]; int n; };
    static const Card cards[] = {
        {Mode::Edu, "APPRENDRE LE SOLFÈGE", "ÉDUCATION MUSICALE", "Un cours progressif : notes, rythmes, gammes, intervalles, accords, lecture de partitions, exercices et dictées.",
         ICON_GRAD, col::rgb(255, 193, 77), col::rgb(232, 121, 10), col::rgb(255, 159, 10), {"Cours", "Exercices", "Outils", "Partitions"}, {ICON_BOOK, ICON_TARGET, ICON_METRONOME, ICON_SCORE}, 4},
        {Mode::Studio, "ENREGISTRER & FAÇONNER LE SON", "STUDIO", "Console de mixage, instruments, effets, micro et accordeur. Exportez vos morceaux.",
         ICON_MIXER, col::rgb(110, 110, 115), col::rgb(44, 44, 46), col::rgb(10, 132, 255), {"Instruments", "Console", "Enregistreur", "Accordeur"}, {ICON_PIANO, ICON_MIXER, ICON_MIC, ICON_TUNER}, 4},
        {Mode::Comp, "COMPOSER COMME DANS UNE STATION AUDIO", "COMPOSITION", "Pistes et régions, piano roll, partition, mixeur, bibliothèque et accords, dans des panneaux ancrables ou flottants.",
         ICON_KEYBOARD, col::rgb(133, 131, 255), col::rgb(54, 52, 163), col::rgb(94, 92, 230), {"Pistes", "Piano roll", "Partition", "Mixeur"}, {ICON_PLAYLIST, ICON_GRID, ICON_SCORE, ICON_MIXER}, 4},
    };
    const int N = 3;
    float cardW = std::min(1140 * s, W * 0.8f), gap = 40 * s;
    float cardH = std::min(470 * s, H - (ty - o.y) - logo - 150 * s);
    float cy = ty + logo + 34 * s;
    if (homeScroll < 0) homeScroll = float(homeCard);
    homeScroll += (float(homeCard) - homeScroll) * std::min(1.f, ImGui::GetIO().DeltaTime * 12);
    if (ImGui::IsWindowHovered() && !ImGui::IsAnyItemActive()) {
        if (ImGui::IsKeyPressed(ImGuiKey_RightArrow)) homeCard = std::min(N - 1, homeCard + 1);
        if (ImGui::IsKeyPressed(ImGuiKey_LeftArrow)) homeCard = std::max(0, homeCard - 1);
        if (ImGui::IsKeyPressed(ImGuiKey_Enter)) go(cards[homeCard].m);
    }
    for (int i = 0; i < N; ++i) {
        const Card& c = cards[i];
        float cx = o.x + W / 2 - cardW / 2 + (float(i) - homeScroll) * (cardW + gap);
        ImVec2 a(cx, cy), b(cx + cardW, cy + cardH);
        if (b.x < o.x || a.x > o.x + W) continue;
        bool cur = i == homeCard;
        float alpha = cur ? 1.f : 0.5f;
        ImU32 top = mixColor(col::rgb(46, 46, 50), c.tint, 0.14f), bot = col::rgb(32, 32, 35);
        gradientRect(dl, a, b, top, bot, 26 * s);
        // illustration : tuile d'icône en dégradé
        float tile = std::min(cardH * 0.48f, 220 * s);
        ImVec2 ta(a.x + cardW * 0.2f - tile / 2, a.y + cardH * 0.36f - tile / 2);
        gradientRect(dl, ta, ImVec2(ta.x + tile, ta.y + tile), c.c0, c.c1, tile * 0.24f);
        ImGui::PushFont(theme().f.icons);
        float k = tile / theme().f.icons->FontSize * 0.5f;
        ImVec2 isz = ImGui::CalcTextSize(c.icon);
        dl->AddText(theme().f.icons, theme().f.icons->FontSize * k, ImVec2(ta.x + (tile - isz.x * k) / 2, ta.y + (tile - isz.y * k) / 2), IM_COL32_WHITE, c.icon);
        ImGui::PopFont();
        // texte
        float tx0 = a.x + cardW * 0.42f, tw0 = cardW * 0.52f, yy = a.y + cardH * 0.14f;
        ImGui::PushFont(theme().f.small);
        ImVec2 ss = ImGui::CalcTextSize(c.sub);
        dl->AddText(ImVec2(tx0 + (tw0 - ss.x) / 2, yy), col::ink3, c.sub);
        ImGui::PopFont();
        ImGui::PushFont(theme().f.hero);
        ImVec2 ts = ImGui::CalcTextSize(c.title);
        float tk = std::min(1.f, tw0 / ts.x);
        dl->AddText(theme().f.hero, theme().f.hero->FontSize * tk, ImVec2(tx0 + (tw0 - ts.x * tk) / 2, yy + 22 * s), IM_COL32_WHITE, c.title);
        ImGui::PopFont();
        ImGui::PushFont(theme().f.ui);
        float wrap = tw0 * 0.86f;
        ImVec2 ds = ImGui::CalcTextSize(c.desc, nullptr, false, wrap);
        dl->AddText(theme().f.ui, theme().f.ui->FontSize * 1.1f, ImVec2(tx0 + (tw0 - wrap) / 2, yy + 22 * s + ts.y * tk + 14 * s), col::ink2, c.desc, nullptr, wrap);
        (void)ds;
        ImGui::PopFont();
        // « Entrer › »
        ImGui::SetCursorScreenPos(ImVec2(tx0 + tw0 / 2 - 50 * s, a.y + cardH * 0.62f - 6 * s));
        ImGui::PushID(i);
        ImGui::PushStyleColor(ImGuiCol_Button, IM_COL32(0, 0, 0, 0));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, IM_COL32(255, 255, 255, 14));
        ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::link));
        if (ImGui::Button("Entrer " ICON_CHEVRON_RIGHT, ImVec2(100 * s, 0))) cur ? go(c.m) : (void)(homeCard = i);
        ImGui::PopStyleColor(3);
        // séparateur + raccourcis
        float sy = a.y + cardH * 0.74f;
        dl->AddLine(ImVec2(a.x + 40 * s, sy), ImVec2(b.x - 40 * s, sy), col::rgb(255, 255, 255, 22));
        float cellW = (cardW - 80 * s) / c.n;
        for (int k2 = 0; k2 < c.n; ++k2) {
            ImVec2 ca(a.x + 40 * s + k2 * cellW, sy + 10 * s);
            ImGui::SetCursorScreenPos(ca);
            ImGui::PushID(k2);
            bool clicked = ImGui::InvisibleButton("sc", ImVec2(cellW, cardH * 0.24f));
            bool hov = ImGui::IsItemHovered();
            ImGui::PopID();
            if (hov) dl->AddRectFilled(ImVec2(ca.x + cellW * 0.2f, ca.y), ImVec2(ca.x + cellW * 0.8f, ca.y + cardH * 0.22f), col::rgb(255, 255, 255, 14), 12 * s);
            float ik = 0.85f * s * 40 / theme().f.icons->FontSize;
            ImVec2 is = ImGui::CalcTextSize(c.scIc[k2]);
            (void)is;
            float isz2 = theme().f.icons->FontSize * ik;
            dl->AddText(theme().f.icons, isz2, ImVec2(ca.x + cellW / 2 - isz2 / 2, ca.y + 10 * s), IM_COL32_WHITE, c.scIc[k2]);
            ImGui::PushFont(theme().f.ui);
            ImVec2 ls = ImGui::CalcTextSize(c.sc[k2]);
            dl->AddText(ImVec2(ca.x + (cellW - ls.x) / 2, ca.y + 18 * s + isz2), col::ink2, c.sc[k2]);
            ImGui::PopFont();
            if (clicked) {
                if (!cur) homeCard = i;
                else {
                    go(c.m);
                    if (c.m == Mode::Comp) {
                        PanelId ids[] = {P_Playlist, P_PianoRoll, P_Score, P_Mixer};
                        panels.show(ids[k2]);
                    }
                }
            }
        }
        ImGui::PopID();
        if (!cur) dl->AddRectFilled(a, b, IM_COL32(18, 18, 20, int(255 * (1 - alpha) * 0.9f)), 26 * s);
        // clic sur une carte voisine : la ramener au centre
        if (!cur) {
            ImGui::SetCursorScreenPos(a);
            ImGui::PushID(100 + i);
            if (ImGui::InvisibleButton("nb", ImVec2(cardW, cardH))) homeCard = i;
            ImGui::PopID();
        }
    }
    // points de pagination
    float dy = cy + cardH + 22 * s;
    for (int i = 0; i < N; ++i) {
        ImVec2 c(o.x + W / 2 + (i - 1) * 22 * s, dy);
        dl->AddCircleFilled(c, 5 * s, i == homeCard ? IM_COL32_WHITE : col::rgb(255, 255, 255, 80));
        ImGui::SetCursorScreenPos(ImVec2(c.x - 9 * s, c.y - 9 * s));
        ImGui::PushID(200 + i);
        if (ImGui::InvisibleButton("dot", ImVec2(18 * s, 18 * s))) homeCard = i;
        ImGui::PopID();
    }
    // pied : reprendre le projet, version
    ImGui::SetCursorScreenPos(ImVec2(o.x + W / 2 - 170 * s, dy + 24 * s));
    std::string resume = std::string(ICON_PLAY "  Reprendre « ") + doc.P.name + " »";
    if (ImGui::Button(resume.c_str())) go(Mode::Comp);
    ImGui::SameLine();
    float& sc = gScale[0];
    if (ImGui::Button(ICON_MINUS "##hs")) { sc = std::max(0.7f, sc - 0.05f); theme().setUserScale(sc); }
    ImGui::SameLine(0, 2);
    if (ImGui::Button(ICON_PLUS "##hp")) { sc = std::min(1.4f, sc + 0.05f); theme().setUserScale(sc); }
    tooltip("Échelle de l'accueil");
    ImGui::SameLine();
    ImGui::TextDisabled("v" SQ_VERSION_STR " · C++20 / Dear ImGui");
    ImGui::End();
}

}  // namespace sq
