#pragma once
// Tableau blanc infini à calques (stylo, surligneur, gomme, schémas) opérant sur cl::ProjectState.
#include "../core/Model.hpp"
#include "Effects.hpp"
#include "MathRender.hpp"
#include "PdfView.hpp"
#include "Theme.hpp"
#include "imgui_stdlib.h"
#include <algorithm>
#include <cmath>
#include <string>

namespace cl::ui {

enum class Tool { Pen = 0, Highlighter, Eraser, Block, Link, Equation, Element };

inline const char* const* ShapeNames() { static const char* n[] = {"Rectangle", "Ellipse", "Flèche", "Post-it", "Titre", "Bandeau", "Bulle"}; return n; }

struct WbOutcome { bool changed = false; std::string label; };

class Whiteboard {
public:
    Tool tool = Tool::Pen;
    float color[3] = {0.04f, 0.52f, 1.0f};
    float brush = 3.5f, opacity = 1.0f;
    int activeLayer = 0;
    int shapeKind = (int)ShapeKind::Note;  // élément posé par l'outil « Élément »
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
        float statusH = S(34);                                          // réservé à la barre d'état
        ImVec2 maxp(origin_.x + avail.x, origin_.y + avail.y - statusH);
        ImVec2 canvas(avail.x, std::max(40.0f, avail.y - statusH));

        canvasW_ = canvas.x; canvasH_ = canvas.y;
        bool havePdf = pdf.Loaded() && pdfVisible;
        const Look& lk = doc.look;
        bool shaderBg = !havePdf && lk.backdrop > 0 && fx::Available();
        boardDark_ = shaderBg ? fx::BackdropIsDark(lk.backdrop, dark) : dark;
        dl->AddRectFilled(origin_, maxp, havePdf ? (dark ? IM_COL32(60, 63, 72, 255) : IM_COL32(232, 234, 240, 255)) : (dark ? IM_COL32(36, 38, 44, 255) : IM_COL32(250, 250, 252, 255)), 0);
        if (shaderBg) fx::Backdrop(dl, {{origin_.x, origin_.y, maxp.x, maxp.y}, lk.backdrop, dark ? 1 : 0, pan_.x, pan_.y, zoom_});
        else if (!havePdf) DrawGrid(dl, origin_, maxp, dark);

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
        for (auto& h : doc.shapes) DrawShape(dl, h, h.id == selectedShape_);
        if (creating_) DrawShape(dl, newShape_, true);
        for (auto& k : doc.strokes) DrawStroke(dl, doc, k);
        if (drawing_) DrawStroke(dl, doc, cur_);
        DrawDiagram(dl, doc, boardDark_);
        DrawEquations(dl, doc, boardDark_);
        if (lk.grade && fx::Available())
            fx::Grade(dl, {{origin_.x, origin_.y, maxp.x, maxp.y}, lk.preset, lk.mix, lk.exposure, lk.contrast, lk.saturation, lk.temperature, lk.tint,
                           lk.fade, lk.sharpen, lk.vignette, lk.grain, lk.aberration, lk.letterbox ? 1 : 0});
        dl->PopClipRect();

        // HUD Procreate : taille et opacité, sur une palette en verre dépoli
        ImVec2 ga(origin_.x + S(10), origin_.y + S(12)), gb(ga.x + S(36), ga.y + S(268));
        if (fx::Available()) fx::Glass(dl, {{ga.x, ga.y, gb.x, gb.y}, S(14), S(2.2f), {dark ? 0.12f : 0.97f, dark ? 0.12f : 0.97f, dark ? 0.14f : 0.98f, 0.42f}});
        else dl->AddRectFilled(ga, gb, dark ? IM_COL32(40, 40, 44, 220) : IM_COL32(250, 250, 252, 225), S(14));
        dl->AddRect(ga, gb, dark ? IM_COL32(255, 255, 255, 38) : IM_COL32(0, 0, 0, 30), S(14));
        dl->AddLine({ga.x + S(10), ga.y + S(1)}, {gb.x - S(10), ga.y + S(1)}, IM_COL32(255, 255, 255, dark ? 40 : 200), S(1));
        ImGui::SetCursorScreenPos({ga.x + S(7), ga.y + S(10)});
        VerticalPill("##size", &brush, 1.0f, 30.0f, S(ImVec2(22, 116)));
        if (ImGui::IsItemHovered() || ImGui::IsItemActive()) ImGui::SetTooltip("Épaisseur : %.1f", brush);
        ImGui::SetCursorScreenPos({ga.x + S(7), ga.y + S(140)});
        VerticalPill("##opac", &opacity, 0.1f, 1.0f, S(ImVec2(22, 116)));
        if (ImGui::IsItemHovered() || ImGui::IsItemActive()) ImGui::SetTooltip("Opacité : %.0f %%", opacity * 100);

        // Barre d'état + édition de l'objet sélectionné
        ImGui::SetCursorScreenPos({origin_.x + S(6), maxp.y + S(6)});
        ImGui::TextDisabled("Zoom %.0f %%  ·  molette : zoom  ·  clic milieu ou Espace+glisser : déplacer", zoom_ * 100.0f);
        if (selectedShape_ > 0) {
            Shape* h = FindShape(doc, selectedShape_);
            if (h) {
                ImGui::SameLine(); ImGui::SetNextItemWidth(S(220)); ImGui::InputTextWithHint("##st", "Texte", &h->text);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Texte d'un élément"; }
                if (h->kind == (int)ShapeKind::LowerThird) {
                    ImGui::SameLine(); ImGui::SetNextItemWidth(S(180)); ImGui::InputTextWithHint("##ss", "Sous-titre", &h->sub);
                    if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Sous-titre d'un élément"; }
                }
                ImGui::SameLine(); if (Switch("Plein", &h->filled)) { out.changed = true; out.label = "Remplissage d'un élément"; }
                ImGui::SameLine(); if (ImGui::SmallButton("Couleur de l'encre")) { h->r = color[0]; h->g = color[1]; h->b = color[2]; out.changed = true; out.label = "Couleur d'un élément"; }
                ImGui::SameLine(); if (ImGui::SmallButton("Supprimer##sh")) { DeleteShape(doc, selectedShape_); selectedShape_ = -1; out.changed = true; out.label = "Supprimer un élément"; }
            } else selectedShape_ = -1;
        }
        if (selectedEq_ > 0) {
            Equation* q = FindEq(doc, selectedEq_);
            if (q) {
                ImGui::SameLine(); ImGui::SetNextItemWidth(S(360)); ImGui::InputText("##eq", &q->latex);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Modifier une équation"; }
                ImGui::SameLine();
                if (ImGui::SmallButton("Supprimer##eq")) { doc.equations.erase(std::remove_if(doc.equations.begin(), doc.equations.end(), [&](const Equation& e) { return e.id == selectedEq_; }), doc.equations.end()); selectedEq_ = -1; out.changed = true; out.label = "Supprimer une équation"; }
            } else selectedEq_ = -1;
        }
        if (selected_ > 0) {
            Node* n = FindNode(doc, selected_);
            if (n) {
                ImGui::SameLine(); ImGui::SetNextItemWidth(S(150)); ImGui::InputText("##nt", &n->title);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Renommer un bloc"; }
                ImGui::SameLine(); ImGui::SetNextItemWidth(S(180)); ImGui::InputText("##ns", &n->subtitle);
                if (ImGui::IsItemDeactivatedAfterEdit()) { out.changed = true; out.label = "Modifier un bloc"; }
                ImGui::SameLine();
                if (ImGui::SmallButton("Supprimer")) { DeleteNode(doc, selected_); selected_ = -1; out.changed = true; out.label = "Supprimer un bloc"; }
            } else selected_ = -1;
        }
        ImGui::EndChild();
        return out;
    }

    void ResetView() { pan_ = {40, 40}; zoom_ = 1.0f; selected_ = selectedEq_ = selectedShape_ = -1; drawing_ = creating_ = false; }
    void Deselect() { selected_ = selectedEq_ = selectedShape_ = -1; }

private:
    ImVec2 origin_{0, 0}, pan_{40, 40};
    float zoom_ = 1.0f;
    Stroke cur_; bool drawing_ = false;
    bool erased_ = false, nodeMoved_ = false, nodeCreated_ = false;
    int dragNode_ = -1, selected_ = -1, linkFrom_ = -1, selectedEq_ = -1, dragEq_ = -1;
    bool eqMoved_ = false, eqCreated_ = false;
    float canvasW_ = 0, canvasH_ = 0;
    bool boardDark_ = false;
    // éléments
    int selectedShape_ = -1, dragShape_ = -1; bool resizing_ = false, creating_ = false, shapeMoved_ = false;
    Shape newShape_; ImVec2 anchor_{0, 0};

    ImVec2 ToScreen(ImVec2 w) const { return {origin_.x + pan_.x + w.x * zoom_, origin_.y + pan_.y + w.y * zoom_}; }
    ImVec2 ToWorld(ImVec2 s) const { return {(s.x - origin_.x - pan_.x) / zoom_, (s.y - origin_.y - pan_.y) / zoom_}; }

    static Equation* FindEq(ProjectState& d, int id) { for (auto& q : d.equations) if (q.id == id) return &q; return nullptr; }
    static Node* FindNode(ProjectState& d, int id) { for (auto& n : d.nodes) if (n.id == id) return &n; return nullptr; }
    static Node* HitNode(ProjectState& d, ImVec2 w) {
        for (auto it = d.nodes.rbegin(); it != d.nodes.rend(); ++it)
            if (w.x >= it->x && w.x <= it->x + it->w && w.y >= it->y && w.y <= it->y + it->h) return &*it;
        return nullptr;
    }
    static Shape* FindShape(ProjectState& d, int id) { for (auto& h : d.shapes) if (h.id == id) return &h; return nullptr; }
    static void DeleteShape(ProjectState& d, int id) { d.shapes.erase(std::remove_if(d.shapes.begin(), d.shapes.end(), [&](const Shape& h) { return h.id == id; }), d.shapes.end()); }
    // Boîte englobante (monde) ; le titre se mesure sur son texte.
    static ImVec4 Bounds(const Shape& h) {
        float x0 = std::min(h.x, h.x + h.w), y0 = std::min(h.y, h.y + h.h), x1 = std::max(h.x, h.x + h.w), y1 = std::max(h.y, h.y + h.h);
        if (h.kind == (int)ShapeKind::Title) {
            ImFont* f = Fonts().display ? Fonts().display : ImGui::GetFont();
            ImVec2 t = f->CalcTextSizeA(40.0f, 1e9f, 0, h.text.empty() ? " " : h.text.c_str());
            x0 = h.x; y0 = h.y; x1 = h.x + t.x + 8; y1 = h.y + t.y + 4;
        }
        return {x0, y0, x1, y1};
    }
    Shape* HitShape(ProjectState& d, ImVec2 w) const {
        for (auto it = d.shapes.rbegin(); it != d.shapes.rend(); ++it) {
            if (it->kind == (int)ShapeKind::Arrow) {
                ImVec2 a(it->x, it->y), b(it->x + it->w, it->y + it->h);
                float L2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
                float t = L2 > 0 ? std::clamp(((w.x - a.x) * (b.x - a.x) + (w.y - a.y) * (b.y - a.y)) / L2, 0.0f, 1.0f) : 0;
                if (std::hypot(w.x - (a.x + t * (b.x - a.x)), w.y - (a.y + t * (b.y - a.y))) < 8 / zoom_) return &*it;
                continue;
            }
            ImVec4 r = Bounds(*it);
            if (w.x >= r.x && w.x <= r.z && w.y >= r.y && w.y <= r.w) return &*it;
        }
        return nullptr;
    }
    ImVec2 HandlePos(const Shape& h) const {
        if (h.kind == (int)ShapeKind::Arrow) return ToScreen({h.x + h.w, h.y + h.h});
        ImVec4 r = Bounds(h); return ToScreen({r.z, r.w});
    }
    static Shape DefaultShape(int kind) {
        Shape h; h.kind = kind;
        switch ((ShapeKind)kind) {
            case ShapeKind::Rect: h.w = 180; h.h = 110; h.filled = true; break;
            case ShapeKind::Ellipse: h.w = 160; h.h = 110; h.filled = true; break;
            case ShapeKind::Arrow: h.w = 160; h.h = 0; h.stroke = 3; break;
            case ShapeKind::Note: h.w = 170; h.h = 150; h.text = "Idée à retenir"; h.filled = false; break;
            case ShapeKind::Title: h.text = "Titre de la séance"; break;
            case ShapeKind::LowerThird: h.w = 340; h.h = 66; h.text = "Valeur actuelle nette"; h.sub = "VAN = somme des flux actualisés - I0"; break;
            case ShapeKind::Bubble: h.w = 210; h.h = 84; h.text = "Attention au signe du BFR !"; break;
            default: break;
        }
        return h;
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
        else if (tool == Tool::Element) {
            if (clicked) {
                Shape* sel = selectedShape_ > 0 ? FindShape(doc, selectedShape_) : nullptr;
                ImVec2 hp = sel ? HandlePos(*sel) : ImVec2(-1e9f, -1e9f);
                if (sel && std::hypot(io.MousePos.x - hp.x, io.MousePos.y - hp.y) < S(9)) { resizing_ = true; dragShape_ = sel->id; }
                else if (Shape* hit = HitShape(doc, w)) { dragShape_ = selectedShape_ = hit->id; }
                else {
                    selectedShape_ = -1; creating_ = true; anchor_ = w;
                    newShape_ = DefaultShape(shapeKind); newShape_.x = w.x; newShape_.y = w.y;
                    newShape_.r = color[0]; newShape_.g = color[1]; newShape_.b = color[2];
                    if (shapeKind != (int)ShapeKind::Title && shapeKind != (int)ShapeKind::Arrow) { newShape_.w = 0; newShape_.h = 0; }
                    if (shapeKind == (int)ShapeKind::Arrow) { newShape_.w = 0; newShape_.h = 0; }
                }
            }
            if (down && (io.MouseDelta.x != 0 || io.MouseDelta.y != 0)) {
                if (creating_ && newShape_.kind != (int)ShapeKind::Title) { newShape_.w = w.x - anchor_.x; newShape_.h = w.y - anchor_.y; }
                else if (dragShape_ > 0) if (Shape* h = FindShape(doc, dragShape_)) {
                    if (resizing_ && h->kind != (int)ShapeKind::Title) {
                        if (h->kind == (int)ShapeKind::Arrow) { h->w = w.x - h->x; h->h = w.y - h->y; }
                        else { h->w = std::max(24.0f, w.x - h->x); h->h = std::max(18.0f, w.y - h->y); }
                    } else if (!resizing_) { h->x += io.MouseDelta.x / zoom_; h->y += io.MouseDelta.y / zoom_; }
                    shapeMoved_ = true;
                }
            }
            if (released) {
                if (creating_) {
                    creating_ = false;
                    Shape h = newShape_;
                    bool click = std::fabs(h.w) < 6 / zoom_ && std::fabs(h.h) < 6 / zoom_;
                    if (click) { Shape d = DefaultShape(h.kind); h.w = d.w; h.h = d.h; }
                    if (h.kind != (int)ShapeKind::Arrow) {
                        if (h.w < 0) { h.x += h.w; h.w = -h.w; }
                        if (h.h < 0) { h.y += h.h; h.h = -h.h; }
                        h.w = std::max(h.w, 24.0f); h.h = std::max(h.h, 18.0f);
                    }
                    int id = 1; for (auto& e : doc.shapes) id = std::max(id, e.id + 1);
                    h.id = id; doc.shapes.push_back(h); selectedShape_ = id;
                    out.changed = true; out.label = std::string("Nouvel élément : ") + ShapeNames()[h.kind];
                } else if (shapeMoved_) { out.changed = true; out.label = resizing_ ? "Redimensionner un élément" : "Déplacer un élément"; }
                shapeMoved_ = resizing_ = false; dragShape_ = -1;
            }
            if (selectedShape_ > 0 && !io.WantTextInput && (ImGui::IsKeyPressed(ImGuiKey_Delete) || ImGui::IsKeyPressed(ImGuiKey_Backspace))) {
                DeleteShape(doc, selectedShape_); selectedShape_ = -1; out.changed = true; out.label = "Supprimer un élément"; }
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
        if (tool != Tool::Element) { creating_ = false; selectedShape_ = -1; }
    }

    // ---------------------------------------------------------------- éléments (cartons de montage)
    void DrawShape(ImDrawList* dl, const Shape& h, bool selected) const {
        float z = zoom_;
        ImU32 col = ImGui::ColorConvertFloat4ToU32({h.r, h.g, h.b, h.a});
        ImU32 soft = ImGui::ColorConvertFloat4ToU32({h.r, h.g, h.b, h.a * 0.14f});
        ImVec4 bw = Bounds(h);
        ImVec2 tl = ToScreen({bw.x, bw.y}), br = ToScreen({bw.z, bw.w});
        ImFont* uf = Fonts().ui ? Fonts().ui : ImGui::GetFont();
        ImFont* df = Fonts().display ? Fonts().display : uf;
        ImFont* tf = Fonts().title ? Fonts().title : uf;
        auto shadow = [&](ImVec2 a, ImVec2 b, float r, float k) {
            for (int i = 4; i >= 1; --i) { float e = 1.8f * i * z; dl->AddRectFilled({a.x - e * 0.5f, a.y - e * 0.3f + 3 * z}, {b.x + e * 0.5f, b.y + e + 3 * z}, IM_COL32(0, 0, 0, (int)(k * 26 / i)), r + e); }
        };
        switch ((ShapeKind)h.kind) {
            case ShapeKind::Rect:
                if (h.filled) dl->AddRectFilled(tl, br, soft, 10 * z);
                dl->AddRect(tl, br, col, 10 * z, 0, std::max(1.0f, h.stroke * z));
                break;
            case ShapeKind::Ellipse: {
                ImVec2 c((tl.x + br.x) / 2, (tl.y + br.y) / 2), r((br.x - tl.x) / 2, (br.y - tl.y) / 2);
                if (h.filled) dl->AddEllipseFilled(c, r, soft);
                dl->AddEllipse(c, r, col, 0, 0, std::max(1.0f, h.stroke * z));
                break; }
            case ShapeKind::Arrow: {
                ImVec2 a = ToScreen({h.x, h.y}), b = ToScreen({h.x + h.w, h.y + h.h});
                float L = std::hypot(b.x - a.x, b.y - a.y); if (L < 1) break;
                ImVec2 d((b.x - a.x) / L, (b.y - a.y) / L), n(-d.y, d.x);
                float hs = std::max(10.0f, h.stroke * 4.5f) * z;
                ImVec2 base(b.x - d.x * hs, b.y - d.y * hs);
                dl->AddLine(a, base, col, std::max(1.0f, h.stroke * z));
                dl->AddTriangleFilled(b, {base.x + n.x * hs * 0.55f, base.y + n.y * hs * 0.55f}, {base.x - n.x * hs * 0.55f, base.y - n.y * hs * 0.55f}, col);
                break; }
            case ShapeKind::Note: {                       // post-it : papier teinté, ruban adhésif, coin corné
                // « Plein » : papier teinté de la couleur de l'élément ; sinon jaune classique.
                ImVec4 paper = h.filled ? ImVec4(1 - (1 - h.r) * 0.34f, 1 - (1 - h.g) * 0.34f, 1 - (1 - h.b) * 0.34f, 1) : ImVec4(1.0f, 0.92f, 0.52f, 1);
                ImVec4 paperDark(paper.x * 0.86f, paper.y * 0.86f, paper.z * 0.8f, 1);
                shadow(tl, br, 2 * z, 1.0f);
                float c = std::min(22 * z, (br.x - tl.x) * 0.3f);
                ImVec2 poly[5] = {tl, {br.x, tl.y}, {br.x, br.y - c}, {br.x - c, br.y}, {tl.x, br.y}};
                int v0 = dl->VtxBuffer.Size;
                dl->AddConvexPolyFilled(poly, 5, IM_COL32_WHITE);
                ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, tl, {tl.x, br.y}, ImGui::ColorConvertFloat4ToU32(paper), ImGui::ColorConvertFloat4ToU32(paperDark));
                dl->AddTriangleFilled({br.x, br.y - c}, {br.x - c, br.y}, {br.x - c * 0.92f, br.y - c * 0.92f}, ImGui::ColorConvertFloat4ToU32({paperDark.x * 0.85f, paperDark.y * 0.85f, paperDark.z * 0.85f, 1}));
                float cx = (tl.x + br.x) / 2;
                dl->AddRectFilled({cx - 26 * z, tl.y - 9 * z}, {cx + 26 * z, tl.y + 11 * z}, IM_COL32(255, 255, 255, 120), 2 * z);
                dl->AddRect({cx - 26 * z, tl.y - 9 * z}, {cx + 26 * z, tl.y + 11 * z}, IM_COL32(0, 0, 0, 18), 2 * z);
                dl->AddText(uf, 16 * z, {tl.x + 12 * z, tl.y + 18 * z}, IM_COL32(48, 42, 30, 255), h.text.c_str(), nullptr, std::max(10.0f, br.x - tl.x - 24 * z));
                break; }
            case ShapeKind::Title: {
                // un titre sombre posé sur un fond sombre (ardoise, nuit) passe en blanc cassé
                if (boardDark_ && 0.2126f * h.r + 0.7152f * h.g + 0.0722f * h.b < 0.35f) col = IM_COL32(240, 240, 235, 255);
                if (h.filled) dl->AddText(df, 40 * z, {tl.x + 4 * z + 2 * z, tl.y + 2 * z + 2 * z}, IM_COL32(0, 0, 0, boardDark_ ? 140 : 45), h.text.c_str());
                dl->AddText(df, 40 * z, {tl.x + 4 * z, tl.y + 2 * z}, col, h.text.c_str());
                break; }
            case ShapeKind::LowerThird: {                 // bandeau de télévision : liseré coloré + verre fumé
                float tw = tf->CalcTextSizeA(22, 1e9f, 0, h.text.c_str()).x, sw = uf->CalcTextSizeA(14, 1e9f, 0, h.sub.c_str()).x;
                float wpx = std::max(br.x - tl.x, (std::max(tw, sw) + 40) * z);
                ImVec2 b2(tl.x + wpx, br.y);
                shadow(tl, b2, 6 * z, 1.2f);
                int v0 = dl->VtxBuffer.Size;
                dl->AddRectFilled(tl, b2, IM_COL32(255, 255, 255, h.filled ? 235 : 200), 6 * z);
                ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, tl, {tl.x, b2.y}, IM_COL32(44, 46, 54, 255), IM_COL32(22, 23, 28, 255));
                dl->AddRectFilled(tl, {tl.x + 7 * z, b2.y}, col, 6 * z, ImDrawFlags_RoundCornersLeft);
                dl->AddLine({tl.x + 10 * z, tl.y + 1 * z}, {b2.x - 6 * z, tl.y + 1 * z}, IM_COL32(255, 255, 255, 40), 1);
                dl->AddText(tf, 22 * z, {tl.x + 20 * z, tl.y + 8 * z}, IM_COL32(255, 255, 255, 250), h.text.c_str());
                dl->AddText(uf, 14 * z, {tl.x + 20 * z, tl.y + 38 * z}, IM_COL32(255, 255, 255, 185), h.sub.c_str());
                br = b2;
                break; }
            case ShapeKind::Bubble: {
                ImU32 bg = boardDark_ ? IM_COL32(48, 50, 58, 245) : IM_COL32(255, 255, 255, 248);
                shadow(tl, br, 14 * z, 0.8f);
                float tx = tl.x + std::min(36 * z, (br.x - tl.x) * 0.3f);
                dl->AddTriangleFilled({tx, br.y - 2 * z}, {tx + 22 * z, br.y - 2 * z}, {tx - 6 * z, br.y + 18 * z}, bg);
                dl->AddRectFilled(tl, br, bg, 14 * z);
                dl->AddRect(tl, br, h.filled ? col : IM_COL32(0, 0, 0, 30), 14 * z, 0, std::max(1.0f, 1.6f * z));
                dl->AddText(uf, 15 * z, {tl.x + 14 * z, tl.y + 12 * z}, boardDark_ ? IM_COL32(235, 238, 245, 255) : IM_COL32(30, 32, 38, 255), h.text.c_str(), nullptr, std::max(10.0f, br.x - tl.x - 28 * z));
                break; }
            default: break;
        }
        if (selected) {
            ImU32 acc = IM_COL32(10, 132, 255, 230);
            if (h.kind == (int)ShapeKind::Arrow) { dl->AddCircle(ToScreen({h.x, h.y}), S(5), acc, 0, S(1.5f)); }
            else dl->AddRect({tl.x - S(4), tl.y - S(4)}, {br.x + S(4), br.y + S(4)}, acc, S(4), 0, S(1.2f));
            ImVec2 hp = HandlePos(h);
            dl->AddCircleFilled(hp, S(5.5f), IM_COL32(255, 255, 255, 255)); dl->AddCircle(hp, S(5.5f), acc, 0, S(1.5f));
        }
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
