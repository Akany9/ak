#include "panels.hpp"

#include <algorithm>

#include "../third_party/imgui/imgui_internal.h"
#include "icons.hpp"
#include "skeuo.hpp"
#include "theme.hpp"
#include "util.hpp"

namespace sq {

Panels::Panels() {
    //            clé          fenêtre                                  titre            icône           touche    F       maj    visible déf
    p[P_Playlist] = {"playlist", ICON_PLAYLIST "  Pistes###playlist", "Pistes", ICON_PLAYLIST, "F5", ImGuiKey_F5, false, true, true};
    p[P_PianoRoll] = {"pianoRoll", ICON_GRID "  Piano roll###pianoRoll", "Piano roll", ICON_GRID, "F7", ImGuiKey_F7, false, true, true};
    p[P_Score] = {"score", ICON_SCORE "  Partition###score", "Partition", ICON_SCORE, "Maj+F7", ImGuiKey_F7, true, true, true};
    p[P_Mixer] = {"mixer", ICON_MIXER "  Mixeur###mixer", "Mixeur", ICON_MIXER, "F9", ImGuiKey_F9, false, true, true};
    p[P_Browser] = {"browser", ICON_BROWSER "  Bibliothèque###browser", "Bibliothèque", ICON_BROWSER, "F8", ImGuiKey_F8, false, true, true};
    p[P_Chords] = {"chords", ICON_CHORDS "  Accords###chords", "Accords", ICON_CHORDS, "F6", ImGuiKey_F6, false, true, true};
}

bool Panels::anyVisible() const {
    for (auto& s : p)
        if (s.visible) return true;
    return false;
}

void Panels::toggle(PanelId id) {
    PanelState& s = p[id];
    if (!s.visible) {
        s.visible = true;
        s.wantFocus = true;
        return;
    }
    // ouvert mais caché derrière une autre fenêtre ou un autre onglet : le ramener au premier plan
    ImGuiWindow* w = ImGui::FindWindowByName(s.window);
    bool hiddenTab = w && w->DockIsActive && w->DockNode && w->DockNode->TabBar && w->DockNode->TabBar->VisibleTabId != w->TabId;
    if (hiddenTab || (s.floating && !s.focused)) {
        s.wantFocus = true;
        return;
    }
    s.visible = false;
}

void Panels::show(PanelId id) {
    p[id].visible = true;
    p[id].wantFocus = true;
}

void Panels::resetLayout() {
    for (auto& s : p) {
        s.visible = s.defVisible;
        s.wantDock = s.wantFloat = false;
    }
    needBuild_ = true;
}

void Panels::dockAll() {
    for (auto& s : p)
        if (s.visible && s.floating) s.wantDock = true;
}

void Panels::floatAll() {
    for (auto& s : p)
        if (s.visible && !s.floating) s.wantFloat = true;
}

void Panels::buildDefault(unsigned id) {
    ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::DockBuilderRemoveNode(id);
    ImGui::DockBuilderAddNode(id, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(id, vp->WorkSize);
    ImGuiID left, rest, bottom, center, bottomR;
    // disposition de la 1.6 : bibliothèque à gauche, pistes en haut, éditeurs en onglets en bas
    ImGui::DockBuilderSplitNode(id, ImGuiDir_Left, 0.17f, &left, &rest);
    ImGui::DockBuilderSplitNode(rest, ImGuiDir_Down, 0.46f, &bottom, &center);
    bottomR = bottom;
    ImGui::DockBuilderDockWindow(p[P_Browser].window, left);
    ImGui::DockBuilderDockWindow(p[P_Playlist].window, center);
    ImGui::DockBuilderDockWindow(p[P_PianoRoll].window, bottom);
    ImGui::DockBuilderDockWindow(p[P_Score].window, bottom);
    ImGui::DockBuilderDockWindow(p[P_Mixer].window, bottomR);
    ImGui::DockBuilderDockWindow(p[P_Chords].window, bottomR);
    ImGui::DockBuilderFinish(id);
    nodeLeft_ = left;
    nodeCenter_ = center;
    nodeBottom_ = bottom;
    nodeBottomR_ = bottomR;
    needBuild_ = false;
    focusPianoRoll_ = 10;   // onglet affiché par défaut en bas : le piano roll (1.6), après l'ancrage des autres onglets
}

void Panels::dockspace() {
    ImGuiID id = ImGui::GetID("SQCompDock");
    dockId_ = id;
    if (needBuild_ || !ImGui::DockBuilderGetNode(id)) buildDefault(id);
    ImGui::DockSpace(id, ImVec2(0, 0), ImGuiDockNodeFlags_None);

    if (!anyVisible()) {
        // tout est masqué : bandeau compact pour revenir à la vue par défaut
        ImVec2 c = ImGui::GetItemRectMin(), d = ImGui::GetItemRectMax();
        ImVec2 mid((c.x + d.x) / 2, (c.y + d.y) / 2);
        ImGui::SetNextWindowPos(mid, ImGuiCond_Always, ImVec2(0.5f, 0.5f));
        ImGui::SetNextWindowBgAlpha(1);
        ImGui::Begin("##sqrestore", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoSavedSettings |
                                                ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoMove);
        ImGui::PushFont(theme().f.bold);
        ImGui::TextUnformatted("Tous les panneaux sont masqués");
        ImGui::PopFont();
        ImGui::TextDisabled("Rouvrez-les avec la barre d'affichage (F5 à F9) ou :");
        if (ImGui::Button(ICON_RESET "  Restaurer la vue par défaut")) resetLayout();
        ImGui::End();
    }
}

static ImGuiID targetNode(const Panels& ps, PanelId id, unsigned left, unsigned center, unsigned bottom, unsigned bottomR, unsigned root) {
    (void)ps;
    unsigned t = id == P_Browser ? left : id == P_Playlist ? center : (id == P_Mixer || id == P_Chords) ? bottomR : bottom;
    if (t && ImGui::DockBuilderGetNode(t)) return t;
    ImGuiDockNode* central = ImGui::DockBuilderGetCentralNode(root);
    return central ? central->ID : root;
}

static int beganDepth = 0;
static bool beganStack[16];

bool Panels::begin(PanelId id, ImGuiWindowFlags extra) {
    PanelState& s = p[id];
    if (!s.visible) {
        beganStack[beganDepth++] = false;
        return false;
    }
    if (s.wantDock) {
        ImGui::DockBuilderDockWindow(s.window, targetNode(*this, id, nodeLeft_, nodeCenter_, nodeBottom_, nodeBottomR_, dockId_));
        s.wantDock = false;
        s.wantFocus = true;
    }
    if (s.wantFloat) {
        ImGuiViewport* vp = ImGui::GetMainViewport();
        float k = float(int(id)) * 34.f * theme().scale;
        ImGui::SetNextWindowDockID(0, ImGuiCond_Always);
        ImGui::SetNextWindowPos(ImVec2(vp->WorkPos.x + vp->WorkSize.x * 0.16f + k, vp->WorkPos.y + vp->WorkSize.y * 0.16f + k), ImGuiCond_Always);
        ImVec2 sz = s.size.x > 50 ? s.size : ImVec2(vp->WorkSize.x * 0.5f, vp->WorkSize.y * 0.45f);
        ImGui::SetNextWindowSize(sz, ImGuiCond_Always);
        s.wantFloat = false;
        s.wantFocus = true;
    }
    if (id == P_PianoRoll && focusPianoRoll_ > 0) {
        --focusPianoRoll_;
        s.wantFocus = true;
    }
    if (s.wantFocus) ImGui::SetNextWindowFocus();
    s.wantFocus = false;
    bool draw = ImGui::Begin(s.window, &s.visible, ImGuiWindowFlags_NoCollapse | extra);
    s.floating = !ImGui::IsWindowDocked();
    s.focused = ImGui::IsWindowFocused(ImGuiFocusedFlags_RootAndChildWindows);
    s.pos = ImGui::GetWindowPos();
    s.size = ImGui::GetWindowSize();
    beganStack[beganDepth++] = true;
    return draw;
}

void Panels::end() {
    if (beganDepth > 0 && beganStack[--beganDepth]) ImGui::End();
}

void Panels::headerButtons(PanelId id) {
    PanelState& s = p[id];
    float h = ImGui::GetFrameHeight();
    float w = h;
    // à droite, sans jamais recouvrir le dernier élément de l'en-tête
    float after = ImGui::GetItemRectMax().x - ImGui::GetWindowPos().x + ImGui::GetScrollX() + ImGui::GetStyle().ItemSpacing.x;
    ImGui::SameLine(std::max(after, ImGui::GetWindowContentRegionMax().x - w));
    ImGui::PushStyleColor(ImGuiCol_Button, IM_COL32(0, 0, 0, 0));
    if (s.floating) {
        if (iconButton("dock", ICON_DOCK, "Ancrer dans la grille")) s.wantDock = true;
    } else {
        if (iconButton("float", ICON_DETACH, "Détacher en fenêtre flottante")) s.wantFloat = true;
    }
    ImGui::PopStyleColor();
}

void Panels::toggleBar() {
    ImGuiStyle& st = ImGui::GetStyle();
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(4 * theme().scale, st.ItemSpacing.y));
    for (int i = 0; i < P_Count; ++i) {
        PanelState& s = p[i];
        ImGui::PushID(i);
        // 1.6 : boutons en icônes seules ; actif = couleur d'accent
        std::string tip = std::string(s.visible ? "Masquer" : "Afficher") + " : " + s.title + " (" + s.shortcut + ")";
        float bh = 30 * theme().scale;
        if (skeuo::glossButton(s.key, s.icon, s.visible, ImVec2(bh, bh), false, tip.c_str())) toggle(PanelId(i));
        ImGui::PopID();
        ImGui::SameLine();
    }
    if (skeuo::glossButton("reset", ICON_RESET, false, ImVec2(30 * theme().scale, 30 * theme().scale), false, "Disposition de la 1.6 (réinitialiser)")) resetLayout();
    ImGui::PopStyleVar();
}

void Panels::shortcuts() {
    ImGuiIO& io = ImGui::GetIO();
    if (io.WantTextInput) return;
    for (int i = 0; i < P_Count; ++i)
        if (ImGui::IsKeyPressed(p[i].fkey, false) && io.KeyShift == p[i].shift && !io.KeyCtrl && !io.KeyAlt) toggle(PanelId(i));
}

json Panels::save() const {
    json j;
    size_t n = 0;
    const char* ini = ImGui::SaveIniSettingsToMemory(&n);
    j["ini"] = std::string(ini, n);
    for (auto& s : p) j["panels"][s.key] = {{"visible", s.visible}};
    j["nodes"] = {nodeLeft_, nodeCenter_, nodeBottom_, nodeBottomR_};
    j["layout"] = "1.6";
    return j;
}

void Panels::load(const json& j) {
    if (!j.is_object() || j.value("layout", "") != "1.6") return;  // disposition d'une autre version : on garde celle de la 1.6
    if (j.contains("panels"))
        for (auto& s : p)
            if (j["panels"].contains(s.key)) s.visible = j["panels"][s.key].value("visible", s.visible);
    if (j.contains("nodes") && j["nodes"].is_array() && j["nodes"].size() == 4) {
        nodeLeft_ = j["nodes"][0];
        nodeCenter_ = j["nodes"][1];
        nodeBottom_ = j["nodes"][2];
        nodeBottomR_ = j["nodes"][3];
    }
    if (j.contains("ini") && j["ini"].is_string() && !j["ini"].get<std::string>().empty()) {
        pendingIni_ = j["ini"];
        hasPending_ = true;
        needBuild_ = false;
    }
}

void Panels::applyPending() {
    if (!hasPending_) return;
    ImGui::LoadIniSettingsFromMemory(pendingIni_.c_str(), pendingIni_.size());
    hasPending_ = false;
}

void Panels::persistIfNeeded() {
    ImGuiIO& io = ImGui::GetIO();
    double now = ImGui::GetTime();
    if (!io.WantSaveIniSettings && now - lastSave_ < 3) return;
    lastSave_ = now;
    io.WantSaveIniSettings = false;
    std::string s = save().dump();
    if (s == lastSaved_) return;
    lastSaved_ = s;
    writeFile(joinPath(dataDir(), "workspace-1.6.json"), s);
}

}  // namespace sq
