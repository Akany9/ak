#include "app.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>

#include "../third_party/imgui/imgui_internal.h"
#include "audio.hpp"
#include "catalog.hpp"
#include "icons.hpp"
#include "resource_ids.h"
#include "skeuo.hpp"
#include "svgicons.hpp"
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
    // couleurs du projet de démonstration de la 1.6
    static const char* demo16[] = {"#a8223d", "#6d6d78", "#4e4e58", "#8e2740", "#7a1530"};
    for (size_t i = 0; i < p.tracks.size() && i < 5; ++i) p.tracks[i].color = demo16[i];
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
    // espace de travail de la 1.6 ; à défaut, on reprend seulement l'échelle réglée dans la 2.0
    std::string ws;
    bool own = readFile(joinPath(dataDir(), "workspace-1.6.json"), ws);
    if (own || readFile(joinPath(dataDir(), "workspace.json"), ws)) {
        try {
            json j = json::parse(ws);
            if (j.contains("scale") && j["scale"].is_array())
                for (size_t i = 0; i < 4 && i < j["scale"].size(); ++i) gScale[i] = std::clamp(j["scale"][i].get<float>(), 0.7f, 1.4f);
            if (own) {
                panels.load(j);
                if (j.contains("mode")) mode = Mode(std::clamp(j["mode"].get<int>(), 0, 3));
            }
        } catch (...) {
        }
    }
    if (!doc.loadAutosave(joinPath(dataDir(), "autosave.json"))) doc.setProject(demoProject());
    if (!doc.P.ui.empty() && doc.P.ui.contains("ini")) panels.load(doc.P.ui);
    theme().setUserScale(gScale[int(mode)]);
    applyModeAccent();
}

void App::applyModeAccent() {
    theme().setAccent(mode == Mode::Comp ? col::pink : mode == Mode::Edu ? col::green : col::blue);
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
    applyModeAccent();
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
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_K, false)) piano.open = !piano.open;
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
    pianoWindow();
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
                writeFile(joinPath(dataDir(), "workspace-1.6.json"), s);
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

float& screenScale(int m) { return gScale[std::clamp(m, 0, 3)]; }

}  // namespace sq
