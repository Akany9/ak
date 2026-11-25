#pragma once
// Tableau blanc infini à calques (stylo, surligneur, gomme, schémas) opérant sur cl::ProjectState.
#include "../core/Model.hpp"
#include "MathRender.hpp"
#include "PdfView.hpp"
#include "Theme.hpp"
#include "imgui_stdlib.h"
#include <algorithm>
#include <cmath>
#include <string>

namespace cl::ui {

enum class Tool { Pen = 0, Highlighter, Eraser, Block, Link, Equation };

struct WbOutcome { bool changed = false; std::string label; };

class Whiteboard {
public:
    Tool tool = Tool::Pen;
    float color[3] = {0.04f, 0.52f, 1.0f};
    float brush = 3.5f, opacity = 1.0f;
    int activeLayer = 0;
    PdfDocument pdf;                       // support de cours en arrière-plan
    bool pdfVisible = true;
    float pdfOpacity = 1.0f;

    bool LoadPdf(const std::string& path) {
        bool ok = pdf.Load(path);
        if (ok) { pan_ = {40.0f, 24.0f}; zoom_ = 1.0f; }   // page à gauche : la marge de droite sert aux annotations
        return ok;
    }
    void ClosePdf() { pdf.Close(); }
    int CurrentPdfPage() const { return pdf.Loaded() ? pdf.PageAtY(-pan_.y / zoom_ + 40.0f) : 0; }
    void JumpToPdfPage(int i) { if (pdf.Loaded()) { i = std::clamp(i, 0, pdf.PageCount() - 1); pan_.y = 24 - pdf.PageOrigin(i).y * zoom_; } }
    ImVec2 ViewCenterWorld() const { return {(canvasW_ / 2 - pan_.x) / zoom_ - 60, (canvasH_ / 2 - pan_.y) / zoom_ - 20}; }
    int AddEquation(ProjectState& doc, const std::string& latex, ImVec2 at, bool dark) {
        int id = 1; for (auto& q : doc.equations) id = std::max(id, q.id + 1);
        Equation q; q.id = id; q.x = at.x; q.y = at.y; q.latex = latex; q.r = color[0]; q.g = color[1]; q.b = color[2];
        (void)dark; doc.equations.push_back(q); selectedEq_ = id; return id;
    }

    WbOutcome Render(ProjectState& doc, ImVec2 size, bool dark) {
        WbOutcome out;
        if (doc.layers.empty()) doc.layers.push_back({"Calque 1", true, 1.0f});
        activeLayer = std::clamp(activeLayer, 0, (int)doc.layers.size() - 1);

        ImGui::BeginChild("wb", size, true, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoMove);
        ImDrawList* dl = ImGui::GetWindowDrawList();
        origin_ = ImGui::GetCursorScreenPos();
        ImVec2 avail = ImGui::GetContentRegionAvail();
        ImVec2 maxp(origin_.x + avail.x, origin_.y + avail.y - 34);   // 34 px réservés à la barre d'état
        ImVec2 canvas(avail.x, std::max(40.0f, avail.y - 34));

        canvasW_ = canvas.x; canvasH_ = canvas.y;
        bool havePdf = pdf.Loaded() && pdfVisible;
        dl->AddRectFilled(origin_, maxp, havePdf ? (dark ? IM_COL32(60, 63, 72, 255) : IM_COL32(232, 234, 240, 255)) : (dark ? IM_COL32(36, 38, 44, 255) : IM_COL32(250, 250, 252, 255)));
        if (!havePdf) DrawGrid(dl, origin_, maxp, dark);

        ImGui::InvisibleButton("##wbhit", canvas, ImGuiButtonFlags_MouseButtonLeft | ImGuiButtonFlags_MouseButtonMiddle | ImGuiButtonFlags_MouseButtonRight);
        bool hovered = ImGui::IsItemHovered();
        ImGuiIO& io = ImGui::GetIO();

        if (hovered && io.MouseWheel != 0 && havePdf && !io.KeyCtrl) pan_.y += io.MouseWheel * 60.0f;
        else if (hovered && io.MouseWheel != 0) {
            ImVec2 before = ToWorld(io.MousePos);
            zoom_ = std::clamp(zoom_ * (io.MouseWheel > 0 ? 1.1f : 0.9f), 0.2f, 5.0f);
            ImVec2 after = ToScreen(before);
            pan_.x += io.MousePos.x - after.x; pan_.y += io.MousePos.y - after.y;
        }
        bool panning = (ImGui::IsMouseDragging(ImGuiMouseButton_Middle, 0) && hovered) ||
                       (ImGui::IsKeyDown(ImGuiKey_Space) && ImGui::IsMouseDragging(ImGuiMouseButton_Left, 0) && ImGui::IsItemActive());
        if (panning) { pan_.x += io.MouseDelta.x; pan_.y += io.MouseDelta.y; }
        else Interact(doc, hovered, io, out);

        dl->PushClipRect(origin_, maxp, true);
        if (havePdf) pdf.Render(dl, origin_, canvas, pan_, zoom_, pdfOpacity);
        for (auto& k : doc.strokes) DrawStroke(dl, doc, k);
        if (drawing_) DrawStroke(dl, doc, cur_);
        DrawDiagram(dl, doc, dark);
        DrawEquations(dl, doc, dark);
        dl->PopClipRect();

        // HUD Procreate : taille et opacité
        ImGui::SetCursorScreenPos({origin_.x + 12, origin_.y + 40});
        VerticalPill("##size", &brush, 1.0f, 30.0f, {24, 120});
        ImGui::SetCursorScreenPos({origin_.x + 12, origin_.y + 172});
        VerticalPill("##opac", &opacity, 0.1f, 1.0f, {24, 120});

        // Barre d'état + édition du bloc sélectionné
        ImGui::SetCursorScreenPos({origin_.x + 4, maxp.y + 4});
        ImGui::TextDisabled("Zoom %.0f %%  |  molette : zoom  |  clic milieu ou Espace+glisser : déplacer", zoom_ * 100.0f);
        if (selectedEq_ > 0) {
            Equation* q = FindEq(doc, selectedEq_);
            if (q) {
                ImGui::SameLine(); ImGui::SetNextItemWidth(360); ImGui::InputText("##eq", &q->latex);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Modifier une équation"; }
                ImGui::SameLine();
                if (ImGui::SmallButton("Supprimer##eq")) { doc.equations.erase(std::remove_if(doc.equations.begin(), doc.equations.end(), [&](const Equation& e) { return e.id == selectedEq_; }), doc.equations.end()); selectedEq_ = -1; out.changed = true; out.label = "Supprimer une équation"; }
            } else selectedEq_ = -1;
        }
        if (selected_ > 0) {
            Node* n = FindNode(doc, selected_);
            if (n) {
                ImGui::SameLine(); ImGui::SetNextItemWidth(150); ImGui::InputText("##nt", &n->title);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Renommer un bloc"; }
                ImGui::SameLine(); ImGui::SetNextItemWidth(180); ImGui::InputText("##ns", &n->subtitle);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Modifier un bloc"; }
                ImGui::SameLine();
                if (ImGui::SmallButton("Supprimer")) { DeleteNode(doc, selected_); selected_ = -1; out.changed = true; out.label = "Supprimer un bloc"; }
            } else selected_ = -1;
        }
        ImGui::EndChild();
        return out;
    }

    void ResetView() { pan_ = {40, 40}; zoom_ = 1.0f; selected_ = selectedEq_ = -1; drawing_ = false; }

private:
    ImVec2 origin_{0, 0}, pan_{40, 40};
    float zoom_ = 1.0f;
    Stroke cur_; bool drawing_ = false;
    bool erased_ = false, nodeMoved_ = false, nodeCreated_ = false;
    int dragNode_ = -1, selected_ = -1, linkFrom_ = -1, selectedEq_ = -1, dragEq_ = -1;
    bool eqMoved_ = false, eqCreated_ = false;
    float canvasW_ = 0, canvasH_ = 0;

    ImVec2 ToScreen(ImVec2 w) const { return {origin_.x + pan_.x + w.x * zoom_, origin_.y + pan_.y + w.y * zoom_}; }
    ImVec2 ToWorld(ImVec2 s) const { return {(s.x - origin_.x - pan_.x) / zoom_, (s.y - origin_.y - pan_.y) / zoom_}; }

    static Equation* FindEq(ProjectState& d, int id) { for (auto& q : d.equations) if (q.id == id) return &q; return nullptr; }
    static Node* FindNode(ProjectState& d, int id) { for (auto& n : d.nodes) if (n.id == id) return &n; return nullptr; }
    static Node* HitNode(ProjectState& d, ImVec2 w) {
        for (auto it = d.nodes.rbegin(); it != d.nodes.rend(); ++it)
            if (w.x >= it->x && w.x <= it->x + it->w && w.y >= it->y && w.y <= it->y + it->h) return &*it;
        return nullptr;
    }
    static void DeleteNode(ProjectState& d, int id) {
        d.nodes.erase(std::remove_if(d.nodes.begin(), d.nodes.end(), [&](const Node& n) { return n.id == id; }), d.nodes.end());
        d.edges.erase(std::remove_if(d.edges.begin(), d.edges.end(), [&](const Edge& e) { return e.from == id || e.to == id; }), d.edges.end());
    }

    void DrawGrid(ImDrawList* dl, ImVec2 a, ImVec2 b, bool dark) const {
        float step = 32 * zoom_; if (step < 8) return;
        ImU32 col = dark ? IM_COL32(52, 55, 64, 255) : IM_COL32(226, 229, 236, 255);
        for (float x = a.x + std::fmod(pan_.x, step); x < b.x; x += step) dl->AddLine({x, a.y}, {x, b.y}, col);
        for (float y = a.y + std::fmod(pan_.y, step); y < b.y; y += step) dl->AddLine({a.x, y}, {b.x, y}, col);
    }

    void Interact(ProjectState& doc, bool hovered, const ImGuiIO& io, WbOutcome& out) {
        ImVec2 w = ToWorld(io.MousePos);
        bool clicked = hovered && ImGui::IsMouseClicked(ImGuiMouseButton_Left);
        bool down = ImGui::IsMouseDown(ImGuiMouseButton_Left);
        bool released = ImGui::IsMouseReleased(ImGuiMouseButton_Left);

        if (tool == Tool::Pen || tool == Tool::Highlighter) {
            if (clicked) {
                drawing_ = true; cur_ = Stroke{};
                bool hl = tool == Tool::Highlighter;
                cur_.highlighter = hl; cur_.layer = activeLayer;
                cur_.r = color[0]; cur_.g = color[1]; cur_.b = color[2]; cur_.a = hl ? 0.32f : opacity;
                cur_.width = hl ? brush * 3.2f : brush;
                cur_.pts.push_back({w.x, w.y, 1.0f});
            }
            if (drawing_ && down) {
                auto& l = cur_.pts.back();
                if (std::hypot(w.x - l.x, w.y - l.y) > 1.5f / zoom_) cur_.pts.push_back({w.x, w.y, 1.0f});
            }
            if (drawing_ && released) {
                drawing_ = false;
                if (!cur_.pts.empty()) {
                    if (cur_.pts.size() == 1) cur_.pts.push_back({cur_.pts[0].x + 0.1f, cur_.pts[0].y, 1.0f});
                    doc.strokes.push_back(std::move(cur_)); cur_ = Stroke{};
                    out.changed = true; out.label = tool == Tool::Pen ? "Tracé au stylo" : "Surlignage";
                }
            }
        } else if (tool == Tool::Eraser) {
            if (hovered && down) {
                float rad = brush * 2.5f / zoom_;
                size_t before = doc.strokes.size();
                doc.strokes.erase(std::remove_if(doc.strokes.begin(), doc.strokes.end(), [&](const Stroke& s) {
                    if (s.layer != activeLayer) return false;
                    for (auto& p : s.pts) if (std::hypot(p.x - w.x, p.y - w.y) < rad) return true;
                    return false; }), doc.strokes.end());
                if (doc.strokes.size() != before) erased_ = true;
            }
            if (released && erased_) { erased_ = false; out.changed = true; out.label = "Gomme"; }
        } else if (tool == Tool::Block) {
            if (clicked) {
                Node* hit = HitNode(doc, w);
                if (hit) { dragNode_ = selected_ = hit->id; }
                else {
                    int id = 1; for (auto& n : doc.nodes) id = std::max(id, n.id + 1);
                    Node n; n.id = id; n.x = w.x; n.y = w.y; n.title = "Bloc " + std::to_string(id); n.subtitle = "Variable / État";
                    n.r = color[0]; n.g = color[1]; n.b = color[2];
                    doc.nodes.push_back(n); selected_ = id; nodeCreated_ = true;
                }
            }
            if (dragNode_ > 0 && down) {
                if (Node* n = FindNode(doc, dragNode_)) {
                    if (io.MouseDelta.x != 0 || io.MouseDelta.y != 0) { n->x += io.MouseDelta.x / zoom_; n->y += io.MouseDelta.y / zoom_; nodeMoved_ = true; }
                }
            }
            if (released) {
                if (nodeCreated_) { out.changed = true; out.label = "Nouveau bloc"; }
                else if (nodeMoved_) { out.changed = true; out.label = "Déplacer un bloc"; }
                nodeCreated_ = nodeMoved_ = false; dragNode_ = -1;
            }
            if (selected_ > 0 && !io.WantTextInput && ImGui::IsKeyPressed(ImGuiKey_Delete)) { DeleteNode(doc, selected_); selected_ = -1; out.changed = true; out.label = "Supprimer un bloc"; }
        } else if (tool == Tool::Link) {
            if (clicked) {
                if (Node* n = HitNode(doc, w)) {
                    if (linkFrom_ < 0) linkFrom_ = n->id;
                    else if (linkFrom_ != n->id) { doc.edges.push_back({linkFrom_, n->id, "Flux"}); linkFrom_ = -1; out.changed = true; out.label = "Nouvelle liaison"; }
                } else linkFrom_ = -1;
            }
        }
        else if (tool == Tool::Equation) {
            if (clicked) {
                Equation* hit = nullptr;
                for (auto it = doc.equations.rbegin(); it != doc.equations.rend(); ++it) {
                    const auto& b = Typeset(it->latex, 20.0f);
                    if (w.x >= it->x && w.x <= it->x + b.w + 16 && w.y >= it->y && w.y <= it->y + b.H() + 12) { hit = &*it; break; }
                }
                if (hit) dragEq_ = selectedEq_ = hit->id;
                else { AddEquation(doc, "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", w, false); dragEq_ = selectedEq_; eqCreated_ = true; }
            }
            if (dragEq_ > 0 && down) if (Equation* q = FindEq(doc, dragEq_)) if (io.MouseDelta.x != 0 || io.MouseDelta.y != 0) { q->x += io.MouseDelta.x / zoom_; q->y += io.MouseDelta.y / zoom_; eqMoved_ = true; }
            if (released) {
                if (eqCreated_) { out.changed = true; out.label = "Nouvelle équation"; } else if (eqMoved_) { out.changed = true; out.label = "Déplacer une équation"; }
                eqCreated_ = eqMoved_ = false; dragEq_ = -1;
            }
        }
        if (tool != Tool::Link) linkFrom_ = -1;
    }

    void DrawStroke(ImDrawList* dl, const ProjectState& doc, const Stroke& s) const {
        if (s.pts.size() < 2) return;
        if (s.layer < 0 || s.layer >= (int)doc.layers.size() || !doc.layers[s.layer].visible) { if (&s != &cur_) return; }
        float lo = (s.layer >= 0 && s.layer < (int)doc.layers.size() && &s != &cur_) ? doc.layers[s.layer].opacity : 1.0f;
        ImU32 col = ImGui::ColorConvertFloat4ToU32({s.r, s.g, s.b, s.a * lo});
        std::vector<ImVec2> poly; poly.reserve(s.pts.size() * 4);
        auto P = [&](size_t i) { return ImVec2(s.pts[i].x, s.pts[i].y); };
        for (size_t i = 0; i + 1 < s.pts.size(); ++i) {
            ImVec2 p0 = P(i ? i - 1 : 0), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2 < s.pts.size() ? i + 2 : i + 1);
            for (int k = 0; k < 4; ++k) {                       // spline de Catmull-Rom
                float t = k / 4.0f, t2 = t * t, t3 = t2 * t;
                ImVec2 q(0.5f * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                         0.5f * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3));
                poly.push_back(ToScreen(q));
            }
        }
        poly.push_back(ToScreen(P(s.pts.size() - 1)));
        dl->AddPolyline(poly.data(), (int)poly.size(), col, ImDrawFlags_None, std::max(1.0f, s.width * zoom_));
    }

    void DrawEquations(ImDrawList* dl, const ProjectState& d, bool dark) const {
        for (auto& q : d.equations) {
            const auto& b = Typeset(q.latex, 20.0f * zoom_);
            ImVec2 tl = ToScreen({q.x, q.y});
            ImVec2 br(tl.x + (float)b.w + 16 * zoom_, tl.y + (float)b.H() + 12 * zoom_);
            if (q.card) {
                dl->AddRectFilled(tl, br, dark ? IM_COL32(44, 46, 54, 235) : IM_COL32(255, 255, 255, 238), 7 * zoom_);
                dl->AddRect(tl, br, ImGui::ColorConvertFloat4ToU32({q.r, q.g, q.b, 1}), 7 * zoom_, 0, q.id == selectedEq_ ? 3.0f : 1.5f);
            }
            DrawBox(dl, b, ImVec2(tl.x + 8 * zoom_, tl.y + 6 * zoom_), dark ? IM_COL32(235, 238, 245, 255) : IM_COL32(24, 26, 32, 255));
        }
    }

    void DrawDiagram(ImDrawList* dl, const ProjectState& d, bool dark) const {
        auto find = [&](int id) -> const Node* { for (auto& n : d.nodes) if (n.id == id) return &n; return nullptr; };
        for (auto& e : d.edges) {
            auto *a = find(e.from), *b = find(e.to); if (!a || !b) continue;
            ImVec2 p1 = ToScreen({a->x + a->w, a->y + a->h / 2}), p4 = ToScreen({b->x, b->y + b->h / 2});
            dl->AddBezierCubic(p1, {p1.x + 50 * zoom_, p1.y}, {p4.x - 50 * zoom_, p4.y}, p4, IM_COL32(90, 100, 120, 220), 2.2f * zoom_);
            dl->AddTriangleFilled(p4, {p4.x - 11 * zoom_, p4.y - 5.5f * zoom_}, {p4.x - 11 * zoom_, p4.y + 5.5f * zoom_}, IM_COL32(90, 100, 120, 235));
            if (!e.label.empty() && std::fabs(p4.x - p1.x) > ImGui::CalcTextSize(e.label.c_str()).x + 16) { ImVec2 ts = ImGui::CalcTextSize(e.label.c_str()); ImVec2 m((p1.x + p4.x) / 2 - ts.x / 2, (p1.y + p4.y) / 2 - ts.y - 4 * zoom_); dl->AddText(m, IM_COL32(110, 118, 135, 255), e.label.c_str()); }
        }
        for (auto& n : d.nodes) {
            ImVec2 tl = ToScreen({n.x, n.y}), br = ToScreen({n.x + n.w, n.y + n.h});
            dl->AddRectFilled(tl, br, dark ? IM_COL32(48, 50, 58, 245) : IM_COL32(255, 255, 255, 245), 8 * zoom_);
            bool sel = n.id == selected_ || n.id == linkFrom_;
            dl->AddRect(tl, br, ImGui::ColorConvertFloat4ToU32({n.r, n.g, n.b, 1}), 8 * zoom_, 0, sel ? 3.5f : 2.0f);
            ImU32 t1 = dark ? IM_COL32(235, 238, 245, 255) : IM_COL32(25, 28, 35, 255), t2 = IM_COL32(125, 133, 150, 255);
            dl->AddText({tl.x + 10 * zoom_, tl.y + 10 * zoom_}, t1, n.title.c_str());
            dl->AddText({tl.x + 10 * zoom_, tl.y + 34 * zoom_}, t2, n.subtitle.c_str());
        }
    }
};

} // namespace cl::ui
