// Panneaux de la Composition : Pistes, Piano roll, Partition, Mixeur, Bibliothèque, Accords,
// et choix de la couleur (facultative) d'une piste.
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

struct Dur { double beats; const char* name; const char* rest; };
const Dur kDurs[] = {{4, "Ronde", "Pause"}, {2, "Blanche", "Demi-pause"}, {1, "Noire", "Soupir"},
                     {0.5, "Croche", "Demi-soupir"}, {0.25, "Double croche", "Quart de soupir"}, {0.125, "Triple croche", "Huitième de soupir"}};

std::string rhythmLabel(double d) {
    for (auto& k : kDurs) {
        if (std::fabs(d - k.beats) < 1e-6) return k.name;
        if (std::fabs(d - k.beats * 1.5) < 1e-6) return std::string(k.name) + " pointée";
    }
    char b[32];
    std::snprintf(b, sizeof b, "%.3g temps", d);
    return b;
}

std::string posLabel(const Project& P, double beat) {
    double bb = P.barBeats();
    int bar = int(std::floor(beat / bb + 1e-9));
    double in = beat - bar * bb;
    double beatLen = 4.0 / P.tsDen;
    double b = in / beatLen + 1;
    char buf[48];
    if (std::fabs(b - std::round(b)) < 1e-3) std::snprintf(buf, sizeof buf, "mesure %d, temps %d", bar + 1, int(std::lround(b)));
    else std::snprintf(buf, sizeof buf, "mesure %d, temps %.2g", bar + 1, b);
    std::string r = buf;
    for (auto& c : r) if (c == '.') c = ',';   // virgule décimale
    return r;
}

ImU32 trackColor(const Track& t) { return t.colorSet ? hexColor(t.color) : col::neutral; }

ImU32 regionFill(const Track& t, bool sel) {
    if (!t.colorSet) return sel ? col::regionSel : col::region;
    return mixColor(sel ? col::regionSel : col::region, hexColor(t.color), sel ? 0.5f : 0.38f);
}

bool isBlack(int m) {
    int pc = ((m % 12) + 12) % 12;
    return pc == 1 || pc == 3 || pc == 6 || pc == 8 || pc == 10;
}

double snapDown(double b, double g) { return std::floor(b / g + 1e-6) * g; }

struct SnapOpt { double v; const char* n; };
const SnapOpt kSnaps[] = {{1.0 / 8, "1/32"}, {0.25, "1/16"}, {0.5, "1/8"}, {1, "1/4 (temps)"}, {2, "1/2"}, {4, "Mesure"}};

void smallText(ImDrawList* dl, ImVec2 p, ImU32 c, const char* t, float wrap = 0) {
    ImFont* f = theme().f.small;
    dl->AddText(f, f->FontSize, p, c, t, nullptr, wrap);
}

}  // namespace

// ======================================================================== couleur de piste
void App::trackColorPopup() {
    if (openColorPopup_) {
        ImGui::OpenPopup("##trackcolor");
        openColorPopup_ = false;
    }
    if (!ImGui::BeginPopup("##trackcolor")) return;
    Track* t = doc.P.track(colorTrack_);
    if (!t) {
        ImGui::CloseCurrentPopup();
        ImGui::EndPopup();
        return;
    }
    float s = theme().scale;
    ImGui::PushFont(theme().f.bold);
    ImGui::Text("Couleur de la piste");
    ImGui::PopFont();
    ImGui::TextDisabled("%s", t->name.c_str());
    static const char* pal[][2] = {{"#7a1f33", "Bordeaux"}, {"#b3263c", "Carmin"}, {"#c98a1b", "Ambre"}, {"#7f9a6e", "Sauge"},
                                   {"#2f9c9a", "Turquoise"}, {"#4f6d8f", "Ardoise"}, {"#7b4a8c", "Prune"}, {"#e8e4dc", "Blanc cassé"}};
    std::string id = t->id;
    auto apply = [&](const std::string& c) {
        doc.edit(c.empty() ? "Retirer la couleur" : "Couleur de la piste", [&](Project& P) {
            Track* tr = P.track(id);
            if (!tr) return;
            if (c.empty()) { tr->colorSet = false; tr->color = kNeutralTrack; }
            else { tr->colorSet = true; tr->color = c; }
        });
    };
    for (int i = 0; i < 8; ++i) {
        float rgb[3];
        hexToFloat(pal[i][0], rgb);
        ImGui::PushID(i);
        bool cur = t->colorSet && t->color == pal[i][0];
        if (cur) ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, 2.f);
        if (ImGui::ColorButton(pal[i][1], ImVec4(rgb[0], rgb[1], rgb[2], 1), ImGuiColorEditFlags_NoTooltip, ImVec2(26 * s, 26 * s))) {
            apply(pal[i][0]);
            ImGui::CloseCurrentPopup();
        }
        if (cur) ImGui::PopStyleVar();
        tooltip(pal[i][1]);
        ImGui::PopID();
        if (i % 4 != 3) ImGui::SameLine();
    }
    ImGui::Separator();
    if (ImGui::Button(ICON_BAN "  Aucune couleur (défaut)", ImVec2(-1, 0))) {
        apply("");
        ImGui::CloseCurrentPopup();
    }
    static float custom[3] = {0.48f, 0.12f, 0.2f};
    if (ImGui::IsWindowAppearing()) hexToFloat(t->colorSet ? t->color : "#7a1f33", custom);
    ImGui::TextDisabled("Couleur personnalisée");
    ImGui::SetNextItemWidth(180 * s);
    ImGui::ColorPicker3("##custom", custom, ImGuiColorEditFlags_NoSidePreview | ImGuiColorEditFlags_NoInputs | ImGuiColorEditFlags_PickerHueBar);
    if (ImGui::Button(ICON_CHECK "  Appliquer", ImVec2(-1, 0))) {
        apply(colorToHex(custom));
        ImGui::CloseCurrentPopup();
    }
    ImGui::EndPopup();
}

// ======================================================================== Pistes (playlist)
void App::playlistPanel() {
    float s = theme().scale;
    Project& P = doc.P;
    Audio& au = audio();

    // barre du panneau
    if (ImGui::Button(ICON_PLUS "  Piste")) addTrack("grand", "Piano");
    tooltip("Nouvelle piste (instrument : piano)");
    ImGui::SameLine();
    if (iconButton("zo", ICON_ZOOM_OUT, "Dézoomer")) ed.zoom = std::max(6.f, ed.zoom / 1.25f);
    ImGui::SameLine();
    if (iconButton("zi", ICON_ZOOM_IN, "Zoomer")) ed.zoom = std::min(160.f, ed.zoom * 1.25f);
    ImGui::SameLine();
    if (iconButton("follow", ICON_TARGET, "Suivre la tête de lecture", ed.follow)) ed.follow = !ed.follow;
    panels.headerButtons(P_Playlist);

    const float headW = 196 * s, rowH = 54 * s, rulerH = 24 * s;
    const float ppb = ed.zoom * s;
    const double bb = P.barBeats();
    const double totalBeats = std::max(P.endBeat() + bb * 16, bb * 32);
    ImVec2 avail = ImGui::GetContentRegionAvail();
    static float scrollY = 0;
    ImDrawList* dl;

    // ---- en-têtes de piste (colonne de gauche, défilement vertical synchronisé)
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0, 0));
    ImGui::BeginChild("##heads", ImVec2(headW, avail.y), ImGuiChildFlags_None, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
    ImGui::PopStyleVar();
    ImGui::SetScrollY(scrollY);
    dl = ImGui::GetWindowDrawList();
    {
        ImVec2 o = ImGui::GetCursorScreenPos();
        std::string toDelete, toDup;
        for (size_t i = 0; i < P.tracks.size(); ++i) {
            Track& t = P.tracks[i];
            ImGui::PushID(t.id.c_str());
            ImVec2 a(o.x, o.y + rulerH + i * rowH), b(o.x + headW, a.y + rowH);
            bool sel = doc.selTrack == t.id;
            dl->AddRectFilled(a, b, sel ? col::rgb(44, 44, 48) : col::rgb(28, 28, 30));
            dl->AddLine(ImVec2(a.x, b.y - 1), ImVec2(b.x, b.y - 1), col::sep);
            if (t.colorSet) dl->AddRectFilled(a, ImVec2(a.x + 3 * s, b.y), hexColor(t.color));
            // zone cliquable (sélection, menu contextuel)
            ImGui::SetCursorScreenPos(a);
            ImGui::InvisibleButton("hd", ImVec2(headW, rowH));
            if (ImGui::IsItemClicked(ImGuiMouseButton_Left)) doc.selTrack = t.id;
            if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left)) {
                ed.renameTrack = t.id;
                std::snprintf(ed.renameBuf, sizeof ed.renameBuf, "%s", t.name.c_str());
            }
            if (ImGui::BeginPopupContextItem("tmenu")) {
                doc.selTrack = t.id;
                if (ImGui::MenuItem(ICON_PALETTE "  Couleur de la piste…")) openTrackColor(t.id);
                if (ImGui::MenuItem(ICON_PENCIL "  Renommer")) {
                    ed.renameTrack = t.id;
                    std::snprintf(ed.renameBuf, sizeof ed.renameBuf, "%s", t.name.c_str());
                }
                if (ImGui::MenuItem(ICON_COPY "  Dupliquer la piste")) toDup = t.id;
                ImGui::Separator();
                if (ImGui::MenuItem(ICON_TRASH "  Supprimer la piste")) toDelete = t.id;
                ImGui::EndPopup();
            }
            // icône + nom
            float x = a.x + 10 * s, y = a.y + 7 * s;
            ImGui::PushFont(theme().f.small);
            dl->AddRectFilled(ImVec2(x, y), ImVec2(x + 18 * s, y + 18 * s), col::ctl, 5 * s);
            dl->AddText(ImVec2(x + 3 * s, y + 1 * s), col::ink2, catalog().icon(t.inst));
            ImGui::PopFont();
            if (ed.renameTrack == t.id) {
                ImGui::SetCursorScreenPos(ImVec2(x + 24 * s, y - 2 * s));
                ImGui::SetNextItemWidth(headW - 40 * s);
                ImGui::SetKeyboardFocusHere();
                if (ImGui::InputText("##rn", ed.renameBuf, sizeof ed.renameBuf, ImGuiInputTextFlags_EnterReturnsTrue | ImGuiInputTextFlags_AutoSelectAll) ||
                    ImGui::IsItemDeactivated()) {
                    std::string nn = ed.renameBuf, tid = t.id;
                    if (!nn.empty() && nn != t.name) doc.edit("Renommer la piste", [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->name = nn; });
                    ed.renameTrack.clear();
                }
            } else {
                ImGui::PushFont(theme().f.small);
                ImGui::PushClipRect(ImVec2(x + 24 * s, a.y), ImVec2(b.x - 8 * s, b.y), true);
                dl->AddText(ImVec2(x + 25 * s, y + 1 * s), sel ? col::ink : col::ink2, t.name.c_str());
                ImGui::PopClipRect();
                ImGui::PopFont();
            }
            // boutons M S ● + pastille de couleur
            ImGui::PushFont(theme().f.small);
            ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, ImVec2(4 * s, 1 * s));
            ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 4 * s);
            ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(3 * s, 0));
            ImGui::SetCursorScreenPos(ImVec2(x, y + 22 * s));
            auto tbtn = [&](const char* label, bool on, const char* tip, ImU32 onCol) {
                ImGui::PushStyleColor(ImGuiCol_Button, ImGui::ColorConvertU32ToFloat4(on ? onCol : IM_COL32(0, 0, 0, 0)));
                ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(on ? (onCol == col::rec ? IM_COL32_WHITE : col::rgb(28, 28, 30)) : col::ink3));
                bool r = ImGui::Button(label, ImVec2(18 * s, 15 * s));
                ImGui::PopStyleColor(2);
                ImGui::GetWindowDrawList()->AddRect(ImGui::GetItemRectMin(), ImGui::GetItemRectMax(), col::rgb(255, 255, 255, 36), 4 * s);
                tooltip(tip);
                ImGui::SameLine();
                return r;
            };
            std::string tid = t.id;
            if (tbtn("M", t.mute, "Muet", col::rgb(229, 229, 234))) doc.edit("Muet", [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->mute = !tr->mute; });
            if (tbtn("S", t.solo, "Solo", col::rgb(229, 229, 234))) doc.edit("Solo", [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->solo = !tr->solo; });
            if (tbtn("R", t.arm, "Armer pour l'enregistrement", col::rec)) doc.edit("Armer", [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->arm = !tr->arm; });
            // pastille couleur
            {
                ImVec2 c0 = ImGui::GetCursorScreenPos();
                if (ImGui::InvisibleButton("sw", ImVec2(15 * s, 15 * s))) openTrackColor(t.id);
                ImVec2 cc(c0.x + 7.5f * s, c0.y + 7.5f * s);
                if (t.colorSet) dl->AddCircleFilled(cc, 5.5f * s, hexColor(t.color));
                else dl->AddCircle(cc, 5.5f * s, col::ink3, 0, 1.2f);
                tooltip(t.colorSet ? "Couleur de la piste (cliquer pour changer)" : "Aucune couleur — cliquer pour en choisir une");
            }
            ImGui::PopStyleVar(3);
            ImGui::PopFont();
            // volume (curseur fin)
            {
                float vx = x, vy = y + 41 * s, vw = headW - 28 * s;
                ImGui::SetCursorScreenPos(ImVec2(vx, vy - 5 * s));
                ImGui::InvisibleButton("vol", ImVec2(vw, 11 * s));
                if (ImGui::IsItemActive()) {
                    float v = std::clamp((ImGui::GetIO().MousePos.x - vx) / vw, 0.f, 1.f);
                    doc.editCoalesced("vol" + t.id, [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->vol = v; });
                }
                if (ImGui::IsItemDeactivated()) doc.endCoalesce();
                if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left))
                    doc.edit("Volume", [&](Project& Q) { if (Track* tr = Q.track(tid)) tr->vol = 0.78f; });
                tooltip("Volume (double-clic : valeur par défaut)");
                float vv = P.track(tid) ? P.track(tid)->vol : t.vol;
                dl->AddRectFilled(ImVec2(vx, vy - 1.5f * s), ImVec2(vx + vw, vy + 1.5f * s), col::rgb(255, 255, 255, 30), 2);
                dl->AddRectFilled(ImVec2(vx, vy - 1.5f * s), ImVec2(vx + vw * vv, vy + 1.5f * s), col::rgb(235, 235, 245, 140), 2);
                dl->AddCircleFilled(ImVec2(vx + vw * vv, vy), 5 * s, col::rgb(229, 229, 234));
            }
            ImGui::PopID();
        }
        ImGui::SetCursorScreenPos(ImVec2(o.x, o.y + rulerH + P.tracks.size() * rowH));
        ImGui::Dummy(ImVec2(headW, rowH * 3));
        if (!toDup.empty()) {
            std::string nid = newId('t');
            doc.edit("Dupliquer la piste", [&](Project& Q) {
                for (size_t k = 0; k < Q.tracks.size(); ++k)
                    if (Q.tracks[k].id == toDup) {
                        Track c = Q.tracks[k];
                        c.id = nid;
                        c.name += " copie";
                        for (auto& r : c.regions) r.id = newId('r');
                        Q.tracks.insert(Q.tracks.begin() + long(k) + 1, c);
                        break;
                    }
            });
            doc.selTrack = nid;
        }
        if (!toDelete.empty()) {
            doc.edit("Supprimer la piste", [&](Project& Q) {
                Q.tracks.erase(std::remove_if(Q.tracks.begin(), Q.tracks.end(), [&](auto& x) { return x.id == toDelete; }), Q.tracks.end());
            });
            if (doc.selTrack == toDelete) doc.selTrack = P.tracks.empty() ? "" : P.tracks.front().id;
        }
    }
    ImGui::EndChild();
    ImGui::SameLine(0, 0);

    // ---- pistes (régions)
    ImGui::SetNextWindowContentSize(ImVec2(float(totalBeats) * ppb, rulerH + P.tracks.size() * rowH + rowH * 3));
    ImGui::BeginChild("##lanes", ImVec2(0, avail.y), ImGuiChildFlags_None, ImGuiWindowFlags_HorizontalScrollbar);
    scrollY = ImGui::GetScrollY();
    dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    ImVec2 o(wp.x - ImGui::GetScrollX(), wp.y - ImGui::GetScrollY());   // origine du contenu
    float viewX0 = ImGui::GetScrollX(), viewX1 = viewX0 + ws.x;
    // fond des pistes + grille
    for (size_t i = 0; i < P.tracks.size(); ++i) {
        float y0 = o.y + rulerH + i * rowH;
        dl->AddRectFilled(ImVec2(wp.x, y0), ImVec2(wp.x + ws.x, y0 + rowH), doc.selTrack == P.tracks[i].id ? col::rgb(32, 32, 35) : col::rgb(25, 25, 27));
        dl->AddLine(ImVec2(wp.x, y0 + rowH - 1), ImVec2(wp.x + ws.x, y0 + rowH - 1), col::sep);
    }
    for (double b = snapDown(viewX0 / ppb, 1); b * ppb < viewX1; b += 1) {
        bool barLine = std::fmod(b, bb) < 1e-6;
        if (!barLine && ppb < 10 * s) continue;
        float x = o.x + float(b) * ppb;
        dl->AddLine(ImVec2(x, wp.y + rulerH), ImVec2(x, wp.y + ws.y), barLine ? col::rgb(255, 255, 255, 26) : col::rgb(255, 255, 255, 9));
    }
    // régions
    struct Hit { int track = -1; std::string rid; bool edge = false; };
    ImVec2 mp = ImGui::GetIO().MousePos;
    Hit hit;
    for (size_t i = 0; i < P.tracks.size(); ++i) {
        Track& t = P.tracks[i];
        float y0 = o.y + rulerH + i * rowH + 4 * s, y1 = y0 + rowH - 8 * s;
        for (auto& r : t.regions) {
            float x0 = o.x + float(r.s) * ppb, x1 = o.x + float(r.s + r.len) * ppb;
            if (x1 < wp.x || x0 > wp.x + ws.x) continue;
            bool sel = doc.selRegion == r.id;
            dl->AddRectFilled(ImVec2(x0 + 1, y0), ImVec2(x1 - 1, y1), regionFill(t, sel), 4 * s);
            dl->AddRect(ImVec2(x0 + 1, y0), ImVec2(x1 - 1, y1), sel ? col::rgb(255, 255, 255, 180) : col::rgb(255, 255, 255, 26), 4 * s, 0, sel ? 1.5f : 1.f);
            // contenu miniature
            if (!r.notes.empty()) {
                int lo = 127, hi = 0;
                for (auto& n : r.notes) { lo = std::min(lo, n.m); hi = std::max(hi, n.m); }
                float range = float(std::max(hi - lo, 6));
                double inner = r.loop && r.ll > 0.01 ? r.ll : r.len;
                ImGui::PushClipRect(ImVec2(x0 + 2, y0 + 14 * s), ImVec2(x1 - 2, y1 - 2), true);
                for (double off = 0; off < r.len - 1e-9; off += inner) {
                    for (auto& n : r.notes) {
                        if (n.t >= inner || off + n.t >= r.len) continue;
                        float nx0 = o.x + float(r.s + off + n.t) * ppb, nx1 = std::max(nx0 + 2, o.x + float(r.s + off + n.t + n.d) * ppb - 1);
                        float ny = y1 - 4 * s - (float(n.m - lo) / range) * (y1 - y0 - 20 * s);
                        dl->AddRectFilled(ImVec2(nx0, ny - 1), ImVec2(nx1, ny + 1), col::rgb(235, 235, 245, 200));
                    }
                    if (!r.loop) break;
                    if (off > 0) dl->AddLine(ImVec2(o.x + float(r.s + off) * ppb, y0 + 14 * s), ImVec2(o.x + float(r.s + off) * ppb, y1), col::rgb(255, 255, 255, 50));
                }
                ImGui::PopClipRect();
            }
            ImGui::PushClipRect(ImVec2(x0, y0), ImVec2(x1 - 4, y1), true);
            smallText(dl, ImVec2(x0 + 6 * s, y0 + 1 * s), col::rgb(235, 235, 245, 210), (r.name.empty() ? t.name : r.name).c_str());
            ImGui::PopClipRect();
            if (mp.x >= x0 && mp.x <= x1 && mp.y >= y0 && mp.y <= y1) {
                hit.track = int(i);
                hit.rid = r.id;
                hit.edge = mp.x > x1 - 7 * s;
            }
        }
    }
    // zone d'interaction
    ImGui::SetCursorScreenPos(ImVec2(o.x, o.y));
    ImGui::InvisibleButton("##lanesbtn", ImVec2(std::max(1.f, float(totalBeats) * ppb), std::max(1.f, rulerH + P.tracks.size() * rowH + rowH * 3)),
                           ImGuiButtonFlags_MouseButtonLeft | ImGuiButtonFlags_MouseButtonRight);
    bool hovered = ImGui::IsItemHovered();
    double mBeat = (mp.x - o.x) / ppb;
    int mTrack = int(std::floor((mp.y - o.y - rulerH) / rowH));
    bool inRuler = mp.y < wp.y + rulerH;
    static struct { int type = 0; std::string rid; double grab = 0, s0 = 0, len0 = 0; int t0 = 0; } drag;
    if (ImGui::IsItemActivated() && ImGui::IsMouseClicked(ImGuiMouseButton_Left)) {
        drag.type = 0;
        if (inRuler) {
            drag.type = 4;
        } else if (!hit.rid.empty()) {
            Track* owner;
            Region* r = P.region(hit.rid, &owner);
            doc.selRegion = hit.rid;
            doc.selTrack = owner->id;
            ed.prSel.clear();
            drag = {hit.edge ? 2 : 1, hit.rid, mBeat, r->s, r->len, hit.track};
        } else {
            doc.selRegion.clear();
            if (mTrack >= 0 && mTrack < int(P.tracks.size())) doc.selTrack = P.tracks[size_t(mTrack)].id;
        }
    }
    if (ImGui::IsItemActive() && ImGui::IsMouseDown(ImGuiMouseButton_Left)) {
        if (drag.type == 4) au.seek(std::max(0.0, snapDown(mBeat, 0.25)));
        else if (drag.type == 1 || drag.type == 2) {
            double g = ImGui::GetIO().KeyAlt ? 0.25 : 1.0;  // Alt : placement fin
            std::string rid = drag.rid;
            if (drag.type == 1) {
                double ns = std::max(0.0, std::round((drag.s0 + mBeat - drag.grab) / g) * g);
                int nt = std::clamp(mTrack, 0, int(P.tracks.size()) - 1);
                Track* own;
                Region* r = P.region(rid, &own);
                int curT = int(own - P.tracks.data());
                if (r && (std::fabs(r->s - ns) > 1e-9 || nt != curT))
                    doc.editCoalesced("move" + rid, [&](Project& Q) {
                        Track* ow;
                        Region* rr = Q.region(rid, &ow);
                        if (!rr) return;
                        rr->s = ns;
                        int ct = int(ow - Q.tracks.data());
                        if (nt != ct) {
                            Region copy = *rr;
                            ow->regions.erase(std::remove_if(ow->regions.begin(), ow->regions.end(), [&](auto& x) { return x.id == rid; }), ow->regions.end());
                            Q.tracks[size_t(nt)].regions.push_back(copy);
                        }
                    });
                doc.selTrack = P.tracks[size_t(nt)].id;
            } else {
                double nl = std::max(g, std::round((drag.len0 + mBeat - drag.grab) / g) * g);
                Region* r = P.region(rid);
                if (r && std::fabs(r->len - nl) > 1e-9)
                    doc.editCoalesced("len" + rid, [&](Project& Q) {
                        if (Region* rr = Q.region(rid)) {
                            if (!rr->loop && nl > rr->len && rr->ll < nl) rr->ll = nl;
                            rr->len = nl;
                        }
                    });
            }
        }
    }
    if (ImGui::IsItemDeactivated()) {
        drag.type = 0;
        doc.endCoalesce();
    }
    if (hovered && hit.edge) ImGui::SetMouseCursor(ImGuiMouseCursor_ResizeEW);
    // double-clic sur une piste vide : nouvelle région de 4 mesures
    if (hovered && !inRuler && hit.rid.empty() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left) && mTrack >= 0 && mTrack < int(P.tracks.size())) {
        std::string tid = P.tracks[size_t(mTrack)].id, rid = newId('r');
        double st = snapDown(mBeat, bb);
        doc.edit("Nouvelle région", [&](Project& Q) {
            Region r;
            r.id = rid;
            r.s = st;
            r.len = r.ll = bb * 4;
            Q.tracks[size_t(mTrack)].regions.push_back(r);
        });
        doc.selRegion = rid;
        doc.selTrack = tid;
        panels.show(P_PianoRoll);
    }
    // menu contextuel d'une région
    static std::string menuRid;
    if (hovered && ImGui::IsMouseClicked(ImGuiMouseButton_Right) && !hit.rid.empty()) {
        menuRid = hit.rid;
        doc.selRegion = hit.rid;
        ImGui::OpenPopup("##rgmenu");
    }
    if (ImGui::BeginPopup("##rgmenu")) {
        Region* r = P.region(menuRid);
        if (!r) ImGui::CloseCurrentPopup();
        else {
            std::string rid = menuRid;
            if (ImGui::MenuItem(ICON_GRID "  Ouvrir dans le piano roll")) panels.show(P_PianoRoll);
            if (ImGui::MenuItem(ICON_SCORE "  Ouvrir en partition")) panels.show(P_Score);
            if (ImGui::MenuItem(ICON_LOOP "  Boucler la région", nullptr, r->loop))
                doc.edit("Boucle de région", [&](Project& Q) { if (Region* x = Q.region(rid)) { x->loop = !x->loop; if (x->loop && x->ll <= 0) x->ll = x->len; } });
            if (ImGui::MenuItem(ICON_COPY "  Dupliquer (Ctrl+D)")) {
                std::string nid = newId('r');
                doc.edit("Dupliquer la région", [&](Project& Q) {
                    Track* ow;
                    if (Region* x = Q.region(rid, &ow)) { Region c = *x; c.id = nid; c.s = x->s + x->len; ow->regions.push_back(c); }
                });
                doc.selRegion = nid;
            }
            ImGui::Separator();
            if (ImGui::MenuItem(ICON_TRASH "  Supprimer (Suppr)")) {
                doc.edit("Supprimer la région", [&](Project& Q) {
                    for (auto& t : Q.tracks) t.regions.erase(std::remove_if(t.regions.begin(), t.regions.end(), [&](auto& x) { return x.id == rid; }), t.regions.end());
                });
                doc.selRegion.clear();
            }
        }
        ImGui::EndPopup();
    }
    // touches (quand le panneau a le focus)
    if (ImGui::IsWindowFocused(ImGuiFocusedFlags_RootAndChildWindows) && !ImGui::GetIO().WantTextInput && !doc.selRegion.empty()) {
        std::string rid = doc.selRegion;
        if (ImGui::IsKeyPressed(ImGuiKey_Delete) || ImGui::IsKeyPressed(ImGuiKey_Backspace)) {
            doc.edit("Supprimer la région", [&](Project& Q) {
                for (auto& t : Q.tracks) t.regions.erase(std::remove_if(t.regions.begin(), t.regions.end(), [&](auto& x) { return x.id == rid; }), t.regions.end());
            });
            doc.selRegion.clear();
        }
        if (ImGui::GetIO().KeyCtrl && ImGui::IsKeyPressed(ImGuiKey_D, false)) {
            std::string nid = newId('r');
            doc.edit("Dupliquer la région", [&](Project& Q) {
                Track* ow;
                if (Region* x = Q.region(rid, &ow)) { Region c = *x; c.id = nid; c.s = x->s + x->len; ow->regions.push_back(c); }
            });
            doc.selRegion = nid;
        }
    }
    // règle (collée en haut) + boucle + tête de lecture
    dl->AddRectFilled(wp, ImVec2(wp.x + ws.x, wp.y + rulerH), col::rgb(30, 30, 33));
    dl->AddLine(ImVec2(wp.x, wp.y + rulerH - 1), ImVec2(wp.x + ws.x, wp.y + rulerH - 1), col::sep);
    if (P.loopOn) dl->AddRectFilled(ImVec2(o.x + float(P.loopS) * ppb, wp.y + 3 * s), ImVec2(o.x + float(P.loopE) * ppb, wp.y + 9 * s), col::rgb(10, 132, 255, 160), 3 * s);
    for (double b = snapDown(viewX0 / ppb, bb); b * ppb < viewX1; b += bb) {
        float x = o.x + float(b) * ppb;
        dl->AddLine(ImVec2(x, wp.y + rulerH * 0.55f), ImVec2(x, wp.y + rulerH), col::ink3);
        char lab[16];
        std::snprintf(lab, sizeof lab, "%d", int(std::lround(b / bb)) + 1);
        smallText(dl, ImVec2(x + 4 * s, wp.y + 5 * s), col::ink2, lab);
    }
    float ph = o.x + float(au.position()) * ppb;
    dl->AddLine(ImVec2(ph, wp.y), ImVec2(ph, wp.y + ws.y), IM_COL32_WHITE, 1.5f * s);
    dl->AddTriangleFilled(ImVec2(ph - 5 * s, wp.y), ImVec2(ph + 5 * s, wp.y), ImVec2(ph, wp.y + 7 * s), IM_COL32_WHITE);
    if (ed.follow && au.playing() && (ph > wp.x + ws.x - 40 * s || ph < wp.x)) ImGui::SetScrollX(std::max(0.f, float(au.position()) * ppb - ws.x * 0.2f));
    if (hovered && inRuler) tooltip("Cliquer ou glisser pour déplacer la tête de lecture");
    ImGui::EndChild();
}

// ======================================================================== Piano roll
void App::pianoRollPanel() {
    float s = theme().scale;
    Project& P = doc.P;
    Track* t = nullptr;
    Region* r = doc.selRegion.empty() ? nullptr : P.region(doc.selRegion, &t);

    const char* tools[] = {ICON_PENCIL, ICON_POINTER, ICON_ERASER};
    const char* toolTips[] = {"Crayon : cliquer pour poser une note", "Sélection : déplacer, redimensionner", "Gomme : cliquer pour effacer"};
    for (int i = 0; i < 3; ++i) {
        ImGui::PushID(i);
        if (iconButton("tool", tools[i], toolTips[i], ed.prTool == i)) ed.prTool = i;
        ImGui::PopID();
        ImGui::SameLine();
    }
    ImGui::SetNextItemWidth(110 * s);
    const char* cur = "1/16";
    for (auto& o : kSnaps) if (std::fabs(o.v - ed.snap) < 1e-9) cur = o.n;
    if (ImGui::BeginCombo("##snap", (std::string(ICON_MAGNET " ") + cur).c_str())) {
        for (auto& o : kSnaps) if (ImGui::Selectable(o.n, std::fabs(o.v - ed.snap) < 1e-9)) ed.snap = o.v;
        ImGui::EndCombo();
    }
    tooltip("Grille (magnétisme)");
    ImGui::SameLine();
    ImGui::SetNextItemWidth(150 * s);
    if (ImGui::BeginCombo("##len", rhythmLabel(ed.noteLen).c_str())) {
        for (auto& d : kDurs) {
            if (ImGui::Selectable(d.name, std::fabs(d.beats - ed.noteLen) < 1e-9)) ed.noteLen = d.beats;
            std::string dl2 = std::string(d.name) + " pointée";
            if (d.beats < 4 && ImGui::Selectable(dl2.c_str(), std::fabs(d.beats * 1.5 - ed.noteLen) < 1e-9)) ed.noteLen = d.beats * 1.5;
        }
        ImGui::EndCombo();
    }
    tooltip("Durée des notes posées");
    ImGui::SameLine();
    if (iconButton("pzo", ICON_ZOOM_OUT, "Dézoomer")) ed.prZoom = std::max(16.f, ed.prZoom / 1.25f);
    ImGui::SameLine();
    if (iconButton("pzi", ICON_ZOOM_IN, "Zoomer")) ed.prZoom = std::min(320.f, ed.prZoom * 1.25f);
    if (t && r) {
        ImGui::SameLine();
        if (t->colorSet) {
            ImVec2 c = ImGui::GetCursorScreenPos();
            ImGui::GetWindowDrawList()->AddCircleFilled(ImVec2(c.x + 5 * s, c.y + ImGui::GetFrameHeight() / 2), 4 * s, hexColor(t->color));
            ImGui::Dummy(ImVec2(12 * s, 1));
            ImGui::SameLine();
        }
        ImGui::AlignTextToFramePadding();
        ImGui::TextDisabled("%s · %s", t->name.c_str(), r->name.empty() ? "Région" : r->name.c_str());
    }
    panels.headerButtons(P_PianoRoll);

    if (!r) {
        ImGui::Dummy(ImVec2(1, 30 * s));
        ImGui::TextDisabled("Sélectionnez une région dans « Pistes » (double-clic sur une piste vide pour en créer une).");
        Track* st = P.track(doc.selTrack);
        if (st && ImGui::Button(ICON_PLUS "  Créer une région de 4 mesures")) {
            std::string tid = st->id, rid = newId('r');
            double bb = P.barBeats(), at = snapDown(audio().position(), bb);
            doc.edit("Nouvelle région", [&](Project& Q) {
                Region nr;
                nr.id = rid;
                nr.s = at;
                nr.len = nr.ll = bb * 4;
                if (Track* tt = Q.track(tid)) tt->regions.push_back(nr);
            });
            doc.selRegion = rid;
        }
        return;
    }

    const int lo = 21, hi = 108;
    const float rowH = 13 * s, keyW = 52 * s;
    const float ppb = ed.prZoom * s;
    const double inner = r->loop && r->ll > 0.01 ? r->ll : r->len;
    ImVec2 avail = ImGui::GetContentRegionAvail();
    static float scrollY = -1;
    static std::string lastRegion;
    if (lastRegion != r->id) {
        lastRegion = r->id;
        int sum = 0;
        for (auto& n : r->notes) sum += n.m;
        int center = r->notes.empty() ? 64 : sum / int(r->notes.size());
        scrollY = std::max(0.f, (hi - center) * rowH - avail.y / 2);
        ed.prSel.clear();
    }

    // clavier
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0, 0));
    ImGui::BeginChild("##keys", ImVec2(keyW, avail.y), ImGuiChildFlags_None, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
    ImGui::PopStyleVar();
    ImGui::SetScrollY(scrollY);
    {
        ImDrawList* dl = ImGui::GetWindowDrawList();
        ImVec2 o = ImGui::GetCursorScreenPos();
        // touches blanches (ivoire) sur toute la largeur, puis touches noires (ébène brillante) par-dessus
        dl->AddRectFilled(o, ImVec2(o.x + keyW, o.y + (hi - lo + 1) * rowH), col::rgb(250, 248, 240));
        static const int wSteps[] = {0, 2, 4, 5, 7, 9, 11};
        float octH = 12 * rowH, wkH = octH / 7;
        for (int oct = lo / 12; oct <= hi / 12; ++oct) {
            float yC = o.y + (hi - oct * 12) * rowH + rowH;   // bas de la touche Do
            for (int k = 0; k < 7; ++k) {
                float y1 = yC - k * wkH, y0 = y1 - wkH;
                if (y1 < o.y || y0 > o.y + (hi - lo + 1) * rowH) continue;
                int v0 = dl->VtxBuffer.Size;
                dl->AddRectFilled(ImVec2(o.x, y0 + 0.5f), ImVec2(o.x + keyW - 1, y1 - 0.5f), col::rgb(250, 248, 240), 2 * s, ImDrawFlags_RoundCornersRight);
                ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, ImVec2(o.x, 0), ImVec2(o.x + keyW, 0), col::rgb(214, 210, 200), col::rgb(252, 250, 244));
                dl->AddLine(ImVec2(o.x, y1), ImVec2(o.x + keyW, y1), col::rgb(120, 116, 108), 1);
                if (wSteps[k] == 0) smallText(dl, ImVec2(o.x + keyW - 28 * s, y1 - rowH - 1 * s), col::rgb(90, 86, 80), pitchName(oct * 12).c_str());
            }
        }
        for (int m = hi; m >= lo; --m) {
            if (!isBlack(m)) continue;
            float y = o.y + (hi - m) * rowH;
            ImVec2 b0(o.x, y + 0.5f), b1(o.x + keyW * 0.6f, y + rowH - 0.5f);
            dl->AddRectFilled(ImVec2(b0.x, b0.y + 1.5f * s), ImVec2(b1.x + 2 * s, b1.y + 1.5f * s), col::rgb(0, 0, 0, 90), 2 * s);  // ombre
            gradientRect(dl, b0, b1, col::rgb(70, 70, 74), col::rgb(12, 12, 14), 2 * s);
            dl->AddLine(ImVec2(b0.x + 2, b0.y + 1.5f), ImVec2(b1.x - 4 * s, b0.y + 1.5f), col::rgb(255, 255, 255, 70));  // reflet
        }
        dl->AddRectFilledMultiColor(o, ImVec2(o.x + 4 * s, o.y + (hi - lo + 1) * rowH), col::rgb(0, 0, 0, 90), col::rgb(0, 0, 0, 0), col::rgb(0, 0, 0, 0), col::rgb(0, 0, 0, 90));
        ImGui::SetCursorScreenPos(o);
        ImGui::InvisibleButton("##kb", ImVec2(keyW, (hi - lo + 1) * rowH));
        if (ImGui::IsItemActivated()) {
            int m = hi - int((ImGui::GetIO().MousePos.y - o.y) / rowH);
            audio().audition(t->inst, m, 96, 0.5, -1);
        }
    }
    ImGui::EndChild();
    ImGui::SameLine(0, 0);

    ImGui::SetNextWindowContentSize(ImVec2(float(r->len) * ppb + 120 * s, (hi - lo + 1) * rowH));
    ImGui::BeginChild("##prgrid", ImVec2(0, avail.y), ImGuiChildFlags_None, ImGuiWindowFlags_HorizontalScrollbar);
    if (scrollY >= 0 && ImGui::IsWindowAppearing()) ImGui::SetScrollY(scrollY);
    scrollY = ImGui::GetScrollY();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    ImVec2 o(wp.x - ImGui::GetScrollX(), wp.y - ImGui::GetScrollY());
    // fond
    for (int m = hi; m >= lo; --m) {
        float y = o.y + (hi - m) * rowH;
        if (y + rowH < wp.y || y > wp.y + ws.y) continue;
        dl->AddRectFilled(ImVec2(wp.x, y), ImVec2(wp.x + ws.x, y + rowH), isBlack(m) ? col::rgb(24, 24, 26) : col::rgb(30, 30, 33));
        if (m % 12 == 0) dl->AddLine(ImVec2(wp.x, y + rowH), ImVec2(wp.x + ws.x, y + rowH), col::rgb(255, 255, 255, 22));
    }
    const double bb = P.barBeats();
    for (double b = 0; b <= r->len + 1e-9; b += ed.snap) {
        float x = o.x + float(b) * ppb;
        if (x < wp.x || x > wp.x + ws.x) continue;
        bool bar = std::fmod(b, bb) < 1e-6, beat = std::fmod(b, 1.0) < 1e-6;
        dl->AddLine(ImVec2(x, wp.y), ImVec2(x, wp.y + ws.y), bar ? col::rgb(255, 255, 255, 40) : beat ? col::rgb(255, 255, 255, 18) : col::rgb(255, 255, 255, 7));
    }
    float endX = o.x + float(r->len) * ppb;
    dl->AddRectFilled(ImVec2(endX, wp.y), ImVec2(wp.x + ws.x, wp.y + ws.y), col::rgb(0, 0, 0, 90));
    if (r->loop) dl->AddLine(ImVec2(o.x + float(inner) * ppb, wp.y), ImVec2(o.x + float(inner) * ppb, wp.y + ws.y), col::rgb(10, 132, 255, 160), 1.5f);

    ImU32 noteCol = t->colorSet ? mixColor(hexColor(t->color), IM_COL32_WHITE, 0.25f) : col::rgb(210, 210, 216);
    ImVec2 mp = ImGui::GetIO().MousePos;
    int hitNote = -1;
    bool hitEdge = false;
    for (size_t i = 0; i < r->notes.size(); ++i) {
        const Note& n = r->notes[i];
        float x0 = o.x + float(n.t) * ppb, x1 = std::max(x0 + 3, o.x + float(n.t + n.d) * ppb - 1);
        float y = o.y + (hi - n.m) * rowH;
        bool sel = std::find(ed.prSel.begin(), ed.prSel.end(), int(i)) != ed.prSel.end();
        dl->AddRectFilled(ImVec2(x0, y + 1), ImVec2(x1, y + rowH - 1), sel ? col::accentHi : noteCol, 3 * s);
        dl->AddRect(ImVec2(x0, y + 1), ImVec2(x1, y + rowH - 1), col::rgb(0, 0, 0, 90), 3 * s);
        if (mp.x >= x0 && mp.x <= x1 && mp.y >= y && mp.y < y + rowH) {
            hitNote = int(i);
            hitEdge = mp.x > x1 - 6 * s;
        }
    }
    ImGui::SetCursorScreenPos(o);
    ImGui::InvisibleButton("##prbtn", ImVec2(std::max(1.f, float(r->len) * ppb + 120 * s), (hi - lo + 1) * rowH),
                           ImGuiButtonFlags_MouseButtonLeft | ImGuiButtonFlags_MouseButtonRight);
    bool hov = ImGui::IsItemHovered();
    double mBeat = (mp.x - o.x) / ppb;
    int mPitch = hi - int(std::floor((mp.y - o.y) / rowH));
    std::string rid = r->id, inst = t->inst;
    static struct { int type = 0; int note = -1; double grab = 0, t0 = 0, d0 = 0; int m0 = 0; } drag;
    auto delNote = [&](int idx) {
        doc.edit("Effacer la note", [&](Project& Q) { if (Region* x = Q.region(rid)) if (idx >= 0 && idx < int(x->notes.size())) x->notes.erase(x->notes.begin() + idx); });
        ed.prSel.clear();
    };
    if (ImGui::IsItemActivated() && ImGui::IsMouseClicked(ImGuiMouseButton_Left)) {
        drag.type = 0;
        if (hitNote >= 0) {
            if (ed.prTool == 2) delNote(hitNote);
            else {
                if (!ImGui::GetIO().KeyShift) ed.prSel.clear();
                ed.prSel.push_back(hitNote);
                const Note& n = r->notes[size_t(hitNote)];
                drag = {hitEdge ? 2 : 1, hitNote, mBeat, n.t, n.d, n.m};
                audio().audition(inst, n.m, n.v, 0.35, -1);
            }
        } else if (ed.prTool == 0 && mBeat < r->len && mPitch >= lo && mPitch <= hi) {
            double st = snapDown(mBeat, ed.snap);
            double d = std::min(ed.noteLen, r->len - st);
            int m = mPitch;
            doc.edit("Ajouter une note", [&](Project& Q) { if (Region* x = Q.region(rid)) x->notes.push_back({st, d, m, 92}); });
            ed.prSel = {int(P.region(rid)->notes.size()) - 1};
            drag = {2, ed.prSel[0], mBeat, st, d, m};  // glisser juste après = allonger
            audio().audition(inst, m, 92, std::min(1.0, d * 60 / P.bpm), -1);
        } else {
            ed.prSel.clear();
        }
    }
    if (ImGui::IsItemActive() && ImGui::IsMouseDown(ImGuiMouseButton_Left) && drag.note >= 0 && (drag.type == 1 || drag.type == 2)) {
        Region* rr = P.region(rid);
        if (rr && drag.note < int(rr->notes.size())) {
            int idx = drag.note;
            if (drag.type == 1) {
                double nt = std::clamp(std::round((drag.t0 + mBeat - drag.grab) / ed.snap) * ed.snap, 0.0, std::max(0.0, rr->len - ed.snap));
                int nm = std::clamp(mPitch, lo, hi);
                const Note& n = rr->notes[size_t(idx)];
                if (std::fabs(n.t - nt) > 1e-9 || n.m != nm) {
                    if (n.m != nm) audio().audition(inst, nm, n.v, 0.25, -1);
                    doc.editCoalesced("pr-move", [&](Project& Q) { if (Region* x = Q.region(rid)) { x->notes[size_t(idx)].t = nt; x->notes[size_t(idx)].m = nm; } });
                }
            } else {
                double nd = std::max(ed.snap, std::round((drag.d0 + mBeat - drag.grab) / ed.snap) * ed.snap);
                nd = std::min(nd, rr->len - rr->notes[size_t(idx)].t);
                if (std::fabs(rr->notes[size_t(idx)].d - nd) > 1e-9)
                    doc.editCoalesced("pr-len", [&](Project& Q) { if (Region* x = Q.region(rid)) x->notes[size_t(idx)].d = nd; });
            }
        }
    }
    if (ImGui::IsItemDeactivated()) {
        drag = {};
        doc.endCoalesce();
    }
    if (hov && ImGui::IsMouseClicked(ImGuiMouseButton_Right) && hitNote >= 0) delNote(hitNote);
    if (hov && hitEdge && ed.prTool != 2) ImGui::SetMouseCursor(ImGuiMouseCursor_ResizeEW);

    // aperçu de la note à poser (crayon)
    if (hov && hitNote < 0 && ed.prTool == 0 && drag.type == 0 && mPitch >= lo && mPitch <= hi && mBeat >= 0) {
        double st = snapDown(mBeat, ed.snap);
        bool ok = st < r->len - 1e-9;
        double d = std::min(ed.noteLen, std::max(ed.snap, r->len - st));
        float x0 = o.x + float(st) * ppb, x1 = o.x + float(st + d) * ppb - 1;
        float y = o.y + (hi - mPitch) * rowH;
        ImU32 gc = ok ? col::rgb(10, 132, 255, 110) : col::rgb(255, 159, 10, 110);
        dl->AddRectFilled(ImVec2(x0, y + 1), ImVec2(x1, y + rowH - 1), gc, 3 * s);
        dl->AddRect(ImVec2(x0, y + 1), ImVec2(x1, y + rowH - 1), ok ? col::accentHi : col::orange, 3 * s, 0, 1.5f);
        std::string tip = pitchName(mPitch) + " · " + rhythmLabel(ed.noteLen) + "\n" + (ok ? posLabel(P, st) : "Hors de la région : allongez-la");
        ImGui::SetTooltip("%s", tip.c_str());
    }
    // suppression au clavier
    if (ImGui::IsWindowFocused(ImGuiFocusedFlags_RootAndChildWindows) && !ed.prSel.empty() &&
        (ImGui::IsKeyPressed(ImGuiKey_Delete) || ImGui::IsKeyPressed(ImGuiKey_Backspace))) {
        std::vector<int> selc = ed.prSel;
        std::sort(selc.rbegin(), selc.rend());
        doc.edit("Effacer les notes", [&](Project& Q) {
            if (Region* x = Q.region(rid))
                for (int k : selc) if (k < int(x->notes.size())) x->notes.erase(x->notes.begin() + k);
        });
        ed.prSel.clear();
    }
    // tête de lecture
    double pos = audio().position() - r->s;
    if (pos >= 0 && pos <= r->len) {
        float x = o.x + float(pos) * ppb;
        dl->AddLine(ImVec2(x, wp.y), ImVec2(x, wp.y + ws.y), IM_COL32_WHITE, 1.5f * s);
    }
    ImGui::EndChild();
}

// ======================================================================== Partition
namespace {
// glyphes SMuFL (police Bravura)
constexpr ImWchar G_GCLEF = 0xE050, G_FCLEF = 0xE062, G_WHOLE = 0xE0A2, G_HALF = 0xE0A3, G_BLACK = 0xE0A4;
constexpr ImWchar G_FLAG8U = 0xE240, G_FLAG8D = 0xE241, G_FLAG16U = 0xE242, G_FLAG16D = 0xE243;
constexpr ImWchar G_FLAT = 0xE260, G_SHARP = 0xE262, G_DOT = 0xE1E7, G_TS0 = 0xE080;

std::string utf8(ImWchar c) {
    std::string s;
    if (c < 0x80) s += char(c);
    else if (c < 0x800) { s += char(0xC0 | (c >> 6)); s += char(0x80 | (c & 0x3F)); }
    else { s += char(0xE0 | (c >> 12)); s += char(0x80 | ((c >> 6) & 0x3F)); s += char(0x80 | (c & 0x3F)); }
    return s;
}

// dessine un glyphe Bravura dont l'origine (ligne de base) est en (x, y)
void glyph(ImDrawList* dl, ImWchar c, float x, float y, float sp, ImU32 colr) {
    // Bravura : cadratin = 4 interlignes ; hauteur de ligne ImGui = 4,024 cadratins ; ligne de base au milieu
    ImFont* f = theme().f.music;
    float size = sp * 4 * 4.024f;
    std::string u = utf8(c);
    dl->AddText(f, size, ImVec2(x, y - size * 0.5f), colr, u.c_str());
}

int diatonic(int midi, bool flats, int* acc) {
    int pc = ((midi % 12) + 12) % 12;
    static const int sh[] = {0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6}, shA[] = {0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0};
    static const int fl[] = {0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6}, flA[] = {0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0};
    *acc = flats ? flA[pc] : shA[pc];
    return 7 * (midi / 12 - 1) + (flats ? fl[pc] : sh[pc]);
}

int midiFromDiatonic(int d, int acc) {
    static const int pcs[] = {0, 2, 4, 5, 7, 9, 11};
    int oct = int(std::floor(d / 7.0));
    int st = d - oct * 7;
    return 12 * (oct + 1) + pcs[st] + acc;
}
}  // namespace

void App::scorePanel() {
    float s = theme().scale;
    Project& P = doc.P;
    Track* t = nullptr;
    Region* r = doc.selRegion.empty() ? nullptr : P.region(doc.selRegion, &t);

    // valeurs rythmiques
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(2 * s, ImGui::GetStyle().ItemSpacing.y));
    for (int i = 0; i < 6; ++i) {
        ImGui::PushID(i);
        if (pillButton(kDurs[i].name, ed.scoreDur == i)) ed.scoreDur = i;
        ImGui::PopID();
        ImGui::SameLine();
    }
    ImGui::PopStyleVar();
    ImGui::SameLine(0, 8 * s);
    if (pillButton("Pointée", ed.scoreDot, "Note pointée (× 1,5)")) ed.scoreDot = !ed.scoreDot;
    ImGui::SameLine(0, 8 * s);
    if (pillButton("♯", ed.scoreAcc == 1, "Dièse")) ed.scoreAcc = ed.scoreAcc == 1 ? 0 : 1;
    ImGui::SameLine(0, 2);
    if (pillButton("♭", ed.scoreAcc == -1, "Bémol")) ed.scoreAcc = ed.scoreAcc == -1 ? 0 : -1;
    panels.headerButtons(P_Score);

    if (!r) {
        ImGui::Dummy(ImVec2(1, 30 * s));
        ImGui::TextDisabled("Sélectionnez une région dans « Pistes » pour l'afficher en partition.");
        return;
    }
    const Instrument* in = catalog().inst(t->inst);
    bool drums = in && in->drum;
    if (drums) {
        ImGui::Dummy(ImVec2(1, 30 * s));
        ImGui::TextDisabled("Notation de batterie : éditez cette région dans le piano roll.");
        return;
    }
    double avgM = 0;
    for (auto& n : r->notes) avgM += n.m;
    avgM = r->notes.empty() ? 67 : avgM / double(r->notes.size());
    bool treble = avgM >= 57;
    const int bot = treble ? 30 : 18;   // degré diatonique de la ligne du bas (Mi4 / Sol2)
    bool flats = ed.scoreAcc == -1 || P.keyRoot == 5 || P.keyRoot == 10 || P.keyRoot == 3 || P.keyRoot == 8 || P.keyRoot == 1;

    ImGui::BeginChild("##score", ImVec2(0, 0), ImGuiChildFlags_None, ImGuiWindowFlags_None);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 wp = ImGui::GetWindowPos(), ws = ImGui::GetWindowSize();
    ImVec2 o = ImGui::GetCursorScreenPos();
    float sp = 9 * s;                  // interligne
    const double bb = P.barBeats();
    int nBars = std::max(1, int(std::ceil(r->len / bb - 1e-9)));
    float clefW = 5.5f * sp, marginL = 14 * s, marginR = 14 * s;
    float lineW = ws.x - marginL - marginR - ImGui::GetStyle().ScrollbarSize;
    int perLine = std::clamp(int((lineW - clefW) / (30 * sp)), 1, 6);
    float barW = (lineW - clefW) / perLine;
    float sysH = 15 * sp;
    int nLines = (nBars + perLine - 1) / perLine;
    // papier blanc
    float paperH = nLines * sysH + 4 * sp;
    {
        ImVec2 pa(o.x + 6 * s, o.y + 2 * s), pb(o.x + ws.x - 6 * s - ImGui::GetStyle().ScrollbarSize, o.y + paperH);
        skeuo::dropShadow(dl, pa, pb, 3 * s, 10 * s, 0.8f);
        skeuo::material(dl, skeuo::Mat::Paper, pa, pb, col::rgb(252, 248, 236), 3 * s, s);
        dl->AddRectFilledMultiColor(pa, ImVec2(pb.x, pa.y + 18 * s), IM_COL32(0, 0, 0, 14), IM_COL32(0, 0, 0, 14), IM_COL32(0, 0, 0, 0), IM_COL32(0, 0, 0, 0));
        dl->AddRect(pa, pb, IM_COL32(0, 0, 0, 60), 3 * s);
    }
    ImU32 ink = col::rgb(28, 28, 30);
    auto lineY = [&](int line) { return o.y + 2 * sp + line * sysH + 5 * sp; };            // ligne du haut
    auto posY = [&](int line, int pos) { return lineY(line) + 4 * sp - pos * sp / 2; };    // pos 0 = ligne du bas
    auto barX = [&](int bar) { return o.x + marginL + clefW + (bar % perLine) * barW; };
    for (int L = 0; L < nLines; ++L) {
        float y0 = lineY(L), x0 = o.x + marginL, x1 = barX(0) + perLine * barW;
        for (int k = 0; k < 5; ++k) dl->AddLine(ImVec2(x0, y0 + k * sp), ImVec2(x1, y0 + k * sp), ink, 1.f);
        glyph(dl, treble ? G_GCLEF : G_FCLEF, x0 + 0.6f * sp, y0 + (treble ? 3 : 1) * sp, sp, ink);
        if (L == 0) {
            glyph(dl, ImWchar(G_TS0 + P.tsNum % 10), x0 + 3.6f * sp, y0 + 1 * sp, sp, ink);
            glyph(dl, ImWchar(G_TS0 + P.tsDen % 10), x0 + 3.6f * sp, y0 + 3 * sp, sp, ink);
        }
        for (int b = 0; b <= perLine; ++b) {
            int bar = L * perLine + b;
            if (bar > nBars) break;
            float x = b == perLine ? x1 : barX(L * perLine + b);
            if (b == 0) continue;
            dl->AddLine(ImVec2(x, y0), ImVec2(x, y0 + 4 * sp), ink, bar == nBars ? 2.5f : 1.f);
        }
        char num[8];
        std::snprintf(num, sizeof num, "%d", L * perLine + 1);
        smallText(dl, ImVec2(x0, y0 - 2.4f * sp), col::rgb(120, 120, 128), num);
    }
    auto noteX = [&](double beat) {
        int bar = std::min(nBars - 1, int(std::floor(beat / bb + 1e-9)));
        double in = beat - bar * bb;
        return barX(bar) + 1.2f * sp + float(in / bb) * (barW - 2.4f * sp);
    };
    auto lineOf = [&](double beat) { return std::min(nBars - 1, int(std::floor(beat / bb + 1e-9))) / perLine; };
    auto drawNote = [&](double beat, double dur, int midi, ImU32 c, int accOverride, bool forceAcc) {
        int acc = 0;
        int d = diatonic(midi, flats, &acc);
        if (forceAcc) acc = accOverride;
        int pos = d - bot;
        int L = lineOf(beat);
        float x = noteX(beat), y = posY(L, pos);
        float headW = 1.18f * sp;
        // lignes supplémentaires
        for (int l = -2; l >= pos; l -= 2) dl->AddLine(ImVec2(x - 0.4f * sp, posY(L, l)), ImVec2(x + headW + 0.4f * sp, posY(L, l)), c, 1.2f);
        for (int l = 10; l <= pos; l += 2) dl->AddLine(ImVec2(x - 0.4f * sp, posY(L, l)), ImVec2(x + headW + 0.4f * sp, posY(L, l)), c, 1.2f);
        if (acc) glyph(dl, acc > 0 ? G_SHARP : G_FLAT, x - 1.3f * sp, y, sp, c);
        // valeur rythmique la plus proche (les notes jouées sont souvent un peu raccourcies)
        double base = 1;
        bool dot = false;
        double best = 1e9;
        for (auto& k : kDurs)
            for (int dd = 0; dd < 2; ++dd) {
                double v = k.beats * (dd ? 1.5 : 1);
                double e = std::fabs(std::log(std::max(dur, 1e-3) / v));
                if (e < best) { best = e; base = k.beats; dot = dd == 1; }
            }
        ImWchar head = base >= 3.9 ? G_WHOLE : base >= 1.9 ? G_HALF : G_BLACK;
        glyph(dl, head, x, y, sp, c);
        if (head != G_WHOLE) {
            bool up = pos < 4;
            float sx = up ? x + headW - 0.06f * sp : x + 0.06f * sp;
            float ey = up ? y - 3.5f * sp : y + 3.5f * sp;
            dl->AddLine(ImVec2(sx, y), ImVec2(sx, ey), c, 0.12f * sp);
            if (base < 0.9) {
                ImWchar f = base < 0.4 ? (up ? G_FLAG16U : G_FLAG16D) : (up ? G_FLAG8U : G_FLAG8D);
                glyph(dl, f, sx - 0.06f * sp, ey, sp, c);
            }
        }
        if (dot) dl->AddCircleFilled(ImVec2(x + headW + 0.55f * sp, y - (pos % 2 == 0 ? sp * 0.5f : 0)), 0.17f * sp, c);
    };
    for (auto& n : r->notes)
        if (n.t < r->len) drawNote(n.t, n.d, n.m, ink, 0, false);

    // interaction : aperçu + ajout / suppression
    ImGui::SetCursorScreenPos(o);
    ImGui::InvisibleButton("##scbtn", ImVec2(std::max(1.f, ws.x - ImGui::GetStyle().ScrollbarSize), paperH), ImGuiButtonFlags_MouseButtonLeft | ImGuiButtonFlags_MouseButtonRight);
    bool hov = ImGui::IsItemHovered();
    ImVec2 mp = ImGui::GetIO().MousePos;
    int L = std::clamp(int((mp.y - o.y - 2 * sp) / sysH), 0, nLines - 1);
    int pos = int(std::lround((posY(L, 0) - mp.y) / (sp / 2)));
    double durB = kDurs[ed.scoreDur].beats * (ed.scoreDot ? 1.5 : 1);
    double grid = std::min(kDurs[ed.scoreDur].beats, 1.0);
    int barIdx = -1;
    double beatIn = 0;
    for (int b = 0; b < perLine; ++b) {
        int bar = L * perLine + b;
        if (bar >= nBars) break;
        float x0 = barX(bar), x1 = x0 + barW;
        if (mp.x >= x0 && mp.x < x1) {
            barIdx = bar;
            beatIn = std::clamp(double((mp.x - x0 - 1.2f * sp) / (barW - 2.4f * sp)) * bb, 0.0, bb - grid);
        }
    }
    std::string rid = r->id, inst = t->inst;
    if (hov && barIdx >= 0 && pos >= -8 && pos <= 16) {
        double st = barIdx * bb + std::round(beatIn / grid) * grid;
        int d = pos + bot;
        int acc = ed.scoreAcc;
        int midi = midiFromDiatonic(d, acc);
        bool ok = st + 1e-9 < r->len;
        // note existante sous la souris ?
        int near = -1;
        for (size_t i = 0; i < r->notes.size(); ++i) {
            const Note& n = r->notes[i];
            int a2 = 0;
            if (std::fabs(n.t - st) < grid / 2 + 1e-6 && diatonic(n.m, flats, &a2) - bot == pos) near = int(i);
        }
        float gx = noteX(st);
        dl->AddRectFilled(ImVec2(gx - 0.9f * sp, lineY(L) - 1.5f * sp), ImVec2(gx + 2.1f * sp, lineY(L) + 5.5f * sp), ok ? col::rgb(10, 132, 255, 26) : col::rgb(255, 159, 10, 26), 0.6f * sp);
        drawNote(st, durB, midi, ok ? col::rgb(10, 132, 255, 210) : col::rgb(255, 159, 10, 210), acc, acc != 0);
        std::string tip = pitchName(midi, acc < 0) + " · " + rhythmLabel(durB) + "\n" + (ok ? posLabel(P, st) : "Hors de la région : allongez-la");
        if (near >= 0) tip += "\nClic droit : effacer la note";
        ImGui::SetTooltip("%s", tip.c_str());
        if (ImGui::IsItemClicked(ImGuiMouseButton_Left) && ok) {
            double dd = std::min(durB, r->len - st);
            doc.edit("Ajouter une note", [&](Project& Q) { if (Region* x = Q.region(rid)) x->notes.push_back({st, dd, midi, 92}); });
            audio().audition(inst, midi, 92, std::min(1.0, dd * 60 / P.bpm), -1);
        }
        if (ImGui::IsItemClicked(ImGuiMouseButton_Right) && near >= 0)
            doc.edit("Effacer la note", [&](Project& Q) { if (Region* x = Q.region(rid)) if (near < int(x->notes.size())) x->notes.erase(x->notes.begin() + near); });
        ImGui::SetMouseCursor(ImGuiMouseCursor_Hand);
    }
    // tête de lecture
    double pp = audio().position() - r->s;
    if (pp >= 0 && pp < r->len) {
        int Lp = lineOf(pp);
        float x = noteX(pp);
        dl->AddLine(ImVec2(x, lineY(Lp) - 1.2f * sp), ImVec2(x, lineY(Lp) + 5.2f * sp), col::accent, 2);
    }
    (void)wp;
    ImGui::EndChild();
}

// ======================================================================== Mixeur
void App::mixerPanel(bool large) {
    float s = theme().scale;
    Project& P = doc.P;
    if (!large) panels.headerButtons(P_Mixer);
    // console « en dur » : tranches en aluminium brossé, étiquettes papier, potentiomètres, faders à capuchon,
    // vumètres à LED, joues en bois aux extrémités
    float stripW = 92 * s, gap = 4 * s, cheek = 16 * s, h = ImGui::GetContentRegionAvail().y;
    int n = int(P.tracks.size()) + 1;
    float totalW = cheek * 2 + n * (stripW + gap) + 14 * s;
    ImGui::SetNextWindowContentSize(ImVec2(totalW, 0));
    ImGui::BeginChild("##strips", ImVec2(0, h), ImGuiChildFlags_None, ImGuiWindowFlags_HorizontalScrollbar);
    float sh = std::max(260 * s, ImGui::GetContentRegionAvail().y - 4 * s);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 origin = ImGui::GetCursorScreenPos();
    // joues en bois
    ImVec2 w0 = origin, w1(origin.x + cheek, origin.y + sh);
    ImVec2 w2(origin.x + totalW - cheek, origin.y), w3(origin.x + totalW, origin.y + sh);
    for (auto [a, b] : {std::pair{w0, w1}, std::pair{w2, w3}}) {
        skeuo::material(dl, skeuo::Mat::Wood, a, b, col::rgb(120, 92, 70), 4 * s, s);
        dl->AddRectFilledMultiColor(a, b, IM_COL32(255, 255, 255, 30), IM_COL32(0, 0, 0, 60), IM_COL32(0, 0, 0, 60), IM_COL32(255, 255, 255, 30));
        dl->AddRect(a, b, IM_COL32(0, 0, 0, 160), 4 * s);
    }

    auto strip = [&](int idx, float x, const char* name, const char* icon, bool colored, ImU32 color, float* vol, float* pan, bool* mute, bool* solo,
                     float level, bool sel) {
        ImGui::PushID(idx);
        ImVec2 a(x, origin.y), b(x + stripW, origin.y + sh);
        // plaque
        skeuo::material(dl, skeuo::Mat::Brushed, a, b, sel ? col::rgb(118, 118, 126) : col::rgb(96, 96, 102), 3 * s, s);
        dl->AddRectFilledMultiColor(a, b, IM_COL32(255, 255, 255, 26), IM_COL32(255, 255, 255, 26), IM_COL32(0, 0, 0, 70), IM_COL32(0, 0, 0, 70));
        dl->AddRect(a, b, IM_COL32(0, 0, 0, 190), 3 * s);
        dl->AddLine(ImVec2(a.x + 1, a.y + 1), ImVec2(a.x + 1, b.y - 1), IM_COL32(255, 255, 255, 40));
        skeuo::screw(dl, ImVec2(a.x + 7 * s, a.y + 7 * s), 2.4f * s);
        skeuo::screw(dl, ImVec2(b.x - 7 * s, a.y + 7 * s), 2.4f * s);
        skeuo::screw(dl, ImVec2(a.x + 7 * s, b.y - 7 * s), 2.4f * s);
        skeuo::screw(dl, ImVec2(b.x - 7 * s, b.y - 7 * s), 2.4f * s);
        // étiquette papier (« scribble strip »), avec la couleur facultative de la piste en liseré
        ImVec2 l0(a.x + 8 * s, a.y + 15 * s), l1(b.x - 8 * s, a.y + 34 * s);
        skeuo::material(dl, skeuo::Mat::Paper, l0, l1, col::rgb(242, 236, 220), 2 * s, 0.5f);
        dl->AddRect(l0, l1, IM_COL32(0, 0, 0, 120), 2 * s);
        if (colored) dl->AddRectFilled(ImVec2(l0.x, l1.y - 3 * s), ImVec2(l1.x, l1.y), color, 0);
        ImGui::PushFont(theme().f.small);
        ImGui::PushClipRect(l0, l1, true);
        dl->AddText(ImVec2(l0.x + 4 * s, l0.y + 2 * s), col::rgb(40, 38, 34), icon);
        dl->AddText(ImVec2(l0.x + 20 * s, l0.y + 2 * s), col::rgb(40, 38, 34), name);
        ImGui::PopClipRect();
        ImGui::PopFont();
        bool changed = false;
        // panoramique
        float kr = 19 * s;
        if (pan) {
            ImGui::SetCursorScreenPos(ImVec2(a.x + stripW / 2 - kr, a.y + 42 * s));
            changed |= skeuo::knob("pan", pan, -1, 1, kr, "Panoramique (glisser ; double-clic : centre)", 0);
            ImGui::PushFont(theme().f.small);
            const char* pl = *pan < -0.02f ? "G" : *pan > 0.02f ? "D" : "C";
            dl->AddText(ImVec2(a.x + stripW / 2 - 3 * s, a.y + 42 * s + kr * 2), col::rgb(230, 230, 236, 200), pl);
            ImGui::PopFont();
        }
        // fader + vumètre
        float fy = a.y + 100 * s, fh = sh - (fy - a.y) - 50 * s;
        skeuo::ledMeter(dl, ImVec2(a.x + 10 * s, fy + 6 * s), ImVec2(a.x + 16 * s, fy + fh - 6 * s), std::min(1.f, level));
        ImGui::SetCursorScreenPos(ImVec2(a.x + 22 * s, fy));
        changed |= skeuo::fader("vol", vol, ImVec2(stripW - 30 * s, fh));
        if (ImGui::IsItemActive() || ImGui::IsItemHovered())
            ImGui::SetTooltip("%.1f dB (double-clic : défaut)", 20 * std::log10(std::max(1e-4f, *vol * *vol * 1.6f)));
        // muet / solo
        if (mute) {
            float bw = (stripW - 22 * s) / 2;
            ImGui::SetCursorScreenPos(ImVec2(a.x + 8 * s, b.y - 38 * s));
            if (skeuo::glossButton("m", "M", *mute, ImVec2(bw, 22 * s), false, "Muet")) { *mute = !*mute; changed = true; }
            ImGui::SameLine(0, 6 * s);
            if (skeuo::glossButton("s", "S", *solo, ImVec2(bw, 22 * s), false, "Solo")) { *solo = !*solo; changed = true; }
        }
        ImGui::PopID();
        return changed;
    };
    float x = origin.x + cheek + gap;
    for (size_t i = 0; i < P.tracks.size(); ++i) {
        Track t = P.tracks[i];
        std::string tid = t.id;
        bool ch = strip(int(i), x, t.name.c_str(), catalog().icon(t.inst), t.colorSet, trackColor(t), &t.vol, &t.pan, &t.mute, &t.solo,
                        audio().trackLevel(int(i)), doc.selTrack == t.id);
        if (ch) doc.editCoalesced("mix" + tid + std::to_string(int(ImGui::GetActiveID())), [&](Project& Q) {
            if (Track* tr = Q.track(tid)) { tr->vol = t.vol; tr->pan = t.pan; tr->mute = t.mute; tr->solo = t.solo; }
        });
        x += stripW + gap;
    }
    x += 10 * s;
    float mv = P.masterVol;
    if (strip(999, x, "Général", ICON_SPEAKER, false, 0, &mv, nullptr, nullptr, nullptr, std::max(audio().masterLevel(0), audio().masterLevel(1)), false))
        doc.editCoalesced("master", [&](Project& Q) { Q.masterVol = mv; });
    if (!ImGui::IsAnyItemActive()) doc.endCoalesce();
    ImGui::SetCursorScreenPos(ImVec2(origin.x, origin.y + sh));
    ImGui::Dummy(ImVec2(totalW, 1));
    ImGui::EndChild();
}

// ======================================================================== Bibliothèque
void App::browserPanel() {
    float s = theme().scale;
    Project& P = doc.P;
    Catalog& cat = catalog();
    static char q[64] = "";
    static int tab = 0;
    if (pillButton(ICON_PIANO "  Instruments", tab == 0)) tab = 0;
    ImGui::SameLine(0, 2);
    if (pillButton(ICON_LOOP "  Boucles", tab == 1)) tab = 1;
    if (mode == Mode::Comp) panels.headerButtons(P_Browser);
    ImGui::SetNextItemWidth(-1);
    ImGui::InputTextWithHint("##q", "Rechercher un son…", q, sizeof q);
    std::string ql = q;
    for (auto& c : ql) c = char(tolower(c));
    auto match = [&](const std::string& n) {
        if (ql.empty()) return true;
        std::string l = n;
        for (auto& c : l) c = char(tolower(c));
        return l.find(ql) != std::string::npos;
    };
    Track* st = P.track(doc.selTrack);
    ImGui::BeginChild("##blist");
    if (tab == 0) {
        for (auto& c : cat.categories) {
            bool any = false;
            for (auto& i : cat.instruments) any = any || (i.cat == c && match(i.name));
            if (!any) continue;
            if (!ql.empty()) ImGui::SetNextItemOpen(true, ImGuiCond_Always);
            else ImGui::SetNextItemOpen(c == "Clavier", ImGuiCond_FirstUseEver);
            if (!ImGui::CollapsingHeader(c.c_str())) continue;
            for (auto& i : cat.instruments) {
                if (i.cat != c || !match(i.name)) continue;
                ImGui::PushID(i.id.c_str());
                bool cur = st && st->inst == i.id;
                std::string lab = std::string(cat.icon(i.id)) + "  " + i.name;
                if (ImGui::Selectable(lab.c_str(), cur, ImGuiSelectableFlags_AllowOverlap, ImVec2(ImGui::GetContentRegionAvail().x - 30 * s, 0))) {
                    if (st) {
                        std::string tid = st->id, iid = i.id;
                        bool drum = i.drum;
                        doc.edit("Changer d'instrument", [&](Project& Q) { if (Track* tr = Q.track(tid)) { tr->inst = iid; tr->kind = drum ? "drum" : "inst"; } });
                    }
                    audio().audition(i.id, i.drum ? 38 : 60, 96, 0.6, -1);
                }
                tooltip(st ? ("Utiliser pour la piste « " + st->name + " »").c_str() : "Écouter");
                ImGui::SameLine(ImGui::GetContentRegionAvail().x - 22 * s + ImGui::GetCursorPosX() - ImGui::GetCursorPosX());
                ImGui::SetCursorPosX(ImGui::GetWindowContentRegionMax().x - 26 * s);
                if (ImGui::SmallButton(ICON_PLUS)) addTrack(i.id);
                tooltip("Nouvelle piste avec ce son");
                ImGui::PopID();
            }
        }
    } else {
        static int lc = 0;
        static const char* cats[] = {"Tout", "Batterie", "Basse", "Clavier", "Guitare", "Synthé", "Cordes", "Monde"};
        ImGui::SetNextItemWidth(-1);
        ImGui::Combo("##lc", &lc, cats, 8);
        for (auto& l : cat.loops) {
            if (lc && l.cat != cats[lc]) continue;
            if (!match(l.name)) continue;
            ImGui::PushID(l.id.c_str());
            char lab[160];
            std::snprintf(lab, sizeof lab, "%s  %s  · %d mes.", cat.icon(l.inst), l.name.c_str(), l.bars);
            if (ImGui::Selectable(lab, false, ImGuiSelectableFlags_AllowOverlap, ImVec2(ImGui::GetContentRegionAvail().x - 30 * s, 0))) {
                // écoute : les premières notes de la boucle
                for (auto& n : l.notes)
                    if (n.t < 0.01) audio().audition(l.inst, n.m, n.v, 0.6, -1);
            }
            tooltip("Écouter le début — « + » pour l'ajouter au projet");
            ImGui::SameLine();
            ImGui::SetCursorPosX(ImGui::GetWindowContentRegionMax().x - 26 * s);
            if (ImGui::SmallButton(ICON_PLUS)) {
                double bb = P.barBeats(), at = snapDown(audio().position(), bb);
                std::string tid = newId('t'), rid = newId('r');
                const Instrument* in = cat.inst(l.inst);
                Loop lp = l;
                doc.edit("Ajouter une boucle", [&](Project& Q) {
                    Track t;
                    t.id = tid;
                    t.inst = lp.inst;
                    t.kind = in && in->drum ? "drum" : "inst";
                    t.name = lp.name.substr(0, 28);
                    Region r;
                    r.id = rid;
                    r.name = lp.name;
                    r.s = at;
                    r.len = r.ll = lp.bars * bb;
                    r.notes = lp.notes;
                    t.regions.push_back(r);
                    Q.tracks.push_back(t);
                });
                doc.selTrack = tid;
                doc.selRegion = rid;
                notify("Boucle ajoutée : " + l.name);
            }
            ImGui::PopID();
        }
    }
    ImGui::EndChild();
}

// ======================================================================== Accords
void App::chordsPanel() {
    float s = theme().scale;
    Project& P = doc.P;
    static int style = 0, barsPer = 1, octave = 4, sel = 0;
    static bool withBass = true;
    panels.headerButtons(P_Chords);
    auto& progs = catalog().progs;
    if (progs.empty()) return;
    sel = std::clamp(sel, 0, int(progs.size()) - 1);
    static const int MAJ[] = {0, 2, 4, 5, 7, 9, 11}, MIN[] = {0, 2, 3, 5, 7, 8, 10};
    const int* scale = P.keyMode == "min" ? MIN : MAJ;
    static const char* roman[] = {"I", "II", "III", "IV", "V", "VI", "VII"};
    auto chordOf = [&](int deg, int oct) {
        std::vector<int> v;
        for (int k = 0; k < 3; ++k) {
            int dd = deg + 2 * k;
            v.push_back(12 * (oct + 1) + P.keyRoot + scale[dd % 7] + 12 * (dd / 7));
        }
        return v;
    };
    ImGui::TextDisabled("Tonalité du projet : %s %s", pitchName(60 + P.keyRoot).substr(0, pitchName(60 + P.keyRoot).size() - 1).c_str(), P.keyMode == "min" ? "mineur" : "majeur");
    ImGui::BeginChild("##progs", ImVec2(ImGui::GetContentRegionAvail().x * 0.5f, 0), ImGuiChildFlags_Borders);
    for (int i = 0; i < int(progs.size()); ++i) {
        std::string lab = progs[size_t(i)].name + "  ·  " + progs[size_t(i)].sub;
        if (ImGui::Selectable(lab.c_str(), sel == i)) {
            sel = i;
            for (int m : chordOf(progs[size_t(i)].degrees[0], octave)) audio().audition("grand", m, 80, 0.8, -1);
        }
    }
    ImGui::EndChild();
    ImGui::SameLine();
    ImGui::BeginGroup();
    const Progression& pr = progs[size_t(sel)];
    ImGui::PushFont(theme().f.bold);
    ImGui::TextUnformatted(pr.name.c_str());
    ImGui::PopFont();
    for (size_t k = 0; k < pr.degrees.size(); ++k) {
        ImGui::PushID(int(k));
        int dg = pr.degrees[k];
        std::string l = std::string(roman[dg % 7]) + "\n" + pitchName(chordOf(dg, octave)[0]).substr(0, pitchName(chordOf(dg, octave)[0]).size() - 1);
        if (skeuo::glossButton(("ch" + std::to_string(k)).c_str(), l.c_str(), false, ImVec2(52 * s, 44 * s)))
            for (int m : chordOf(dg, octave)) audio().audition("grand", m, 80, 0.8, -1);
        tooltip("Écouter l'accord");
        ImGui::PopID();
        ImGui::SameLine();
    }
    ImGui::NewLine();
    const char* styles[] = {"Plaqués", "Arpèges", "Pop (rythmé)"};
    ImGui::SetNextItemWidth(150 * s);
    ImGui::Combo("##jeu", &style, styles, 3);
    tooltip("Façon de jouer les accords");
    ImGui::AlignTextToFramePadding();
    ImGui::TextDisabled("Durée");
    ImGui::SameLine();
    if (pillButton("1 mesure", barsPer == 1)) barsPer = 1;
    ImGui::SameLine(0, 2);
    if (pillButton("2 mesures", barsPer == 2)) barsPer = 2;
    ImGui::AlignTextToFramePadding();
    ImGui::TextDisabled("Octave");
    ImGui::SameLine();
    for (int o2 = 3; o2 <= 5; ++o2) {
        ImGui::PushID(o2);
        if (pillButton(std::to_string(o2).c_str(), octave == o2)) octave = o2;
        ImGui::PopID();
        ImGui::SameLine(0, 2);
    }
    ImGui::NewLine();
    ImGui::Checkbox("Ajouter une basse", &withBass);
    if (skeuo::glossButton("create", ICON_ZAP "  Créer l'accompagnement", true, ImVec2(250 * s, ImGui::GetFrameHeight() + 6 * s), false,
                           "Crée une piste d'accords (et une basse) à la tête de lecture")) {
        double bb = P.barBeats(), at = snapDown(audio().position(), bb);
        std::vector<Note> notes, bass;
        double t0 = 0;
        for (int dg : pr.degrees) {
            auto ch = chordOf(dg, octave);
            double len = bb * barsPer;
            if (style == 0) for (int m : ch) notes.push_back({t0, len, m, 78});
            else if (style == 1) {
                for (double x = 0; x < len - 1e-9; x += 0.5) notes.push_back({t0 + x, 0.5, ch[size_t(int(x * 2) % 3)] + (int(x * 2) % 6 >= 3 ? 12 : 0), 74});
            } else {
                for (double x = 0; x < len - 1e-9; x += 1) for (int m : ch) notes.push_back({t0 + x + (int(x) % 2 ? 0.5 : 0), 0.5, m, int(x) % 2 ? 70 : 82});
            }
            bass.push_back({t0, len, ch[0] - 24, 88});
            t0 += len;
        }
        std::string tid = newId('t'), rid = newId('r'), tb = newId('t'), rb = newId('r');
        doc.edit("Créer l'accompagnement", [&](Project& Q) {
            Track t;
            t.id = tid;
            t.name = "Accords · " + pr.name;
            t.inst = style == 1 ? "harp" : "grand";
            Region r;
            r.id = rid;
            r.name = pr.name;
            r.s = at;
            r.len = r.ll = t0;
            r.notes = notes;
            t.regions.push_back(r);
            Q.tracks.push_back(t);
            if (withBass) {
                Track b;
                b.id = tb;
                b.name = "Basse · " + pr.name;
                b.inst = "ebass";
                Region rb2;
                rb2.id = rb;
                rb2.name = "Basse";
                rb2.s = at;
                rb2.len = rb2.ll = t0;
                rb2.notes = bass;
                b.regions.push_back(rb2);
                Q.tracks.push_back(b);
            }
        });
        doc.selTrack = tid;
        doc.selRegion = rid;
        notify("Accompagnement créé : " + pr.name);
    }
    ImGui::EndGroup();
}

}  // namespace sq
