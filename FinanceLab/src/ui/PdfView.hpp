#pragma once
// Lecteur PDF en arrière-plan du tableau blanc : PDFium + cache LRU de textures OpenGL.
// Sans PDFium (FINANCELAB_HAS_PDFIUM non défini), Load() échoue proprement avec un message.
#include <SDL3/SDL_opengl.h>
#include <imgui.h>
#include <algorithm>
#include <cmath>
#include <filesystem>
#include <list>
#include <string>
#include <unordered_map>
#include <vector>
#ifdef FINANCELAB_HAS_PDFIUM
#include <fpdfview.h>
#endif

#ifndef GL_BGRA
#define GL_BGRA 0x80E1
#endif
#ifndef GL_CLAMP_TO_EDGE
#define GL_CLAMP_TO_EDGE 0x812F
#endif
#ifndef GL_TEXTURE_SWIZZLE_A
#define GL_TEXTURE_SWIZZLE_A 0x8E45
#endif

namespace cl::ui {

struct PdfPage { ImVec2 pos, size; };

class PdfDocument {
public:
    static constexpr float kPageW = 794.0f, kGap = 28.0f, kSuper = 1.6f;
    static constexpr size_t kMaxTextures = 10;
    static constexpr bool kAvailable =
#ifdef FINANCELAB_HAS_PDFIUM
        true;
#else
        false;
#endif

    PdfDocument() {
#ifdef FINANCELAB_HAS_PDFIUM
        if (refs_()++ == 0) FPDF_InitLibrary();
#endif
    }
    ~PdfDocument() {
        Close();
#ifdef FINANCELAB_HAS_PDFIUM
        if (--refs_() == 0) FPDF_DestroyLibrary();
#endif
    }
    PdfDocument(const PdfDocument&) = delete;
    PdfDocument& operator=(const PdfDocument&) = delete;

    bool Load(const std::filesystem::path& path) {
        Close();
#ifdef FINANCELAB_HAS_PDFIUM
        if (!std::filesystem::exists(path)) { err_ = "PDF introuvable : " + path.string(); return false; }
        doc_ = FPDF_LoadDocument(path.string().c_str(), nullptr);
        if (!doc_) { err_ = "PDF illisible ou protégé par mot de passe (code " + std::to_string(FPDF_GetLastError()) + ")."; return false; }
        int n = FPDF_GetPageCount(doc_);
        float y = 0;
        for (int i = 0; i < n; ++i) {
            double w = 595, h = 842;
            FPDF_GetPageSizeByIndex(doc_, i, &w, &h);
            if (w < 1) w = 595; if (h < 1) h = 842;
            float hh = kPageW * (float)(h / w);
            pages_.push_back({{0, y}, {kPageW, hh}});
            y += hh + kGap;
        }
        path_ = path; err_.clear();
        return !pages_.empty();
#else
        (void)path; err_ = "Lecteur PDF non compilé (CMake : -DFINANCELAB_WITH_PDFIUM=ON)."; return false;
#endif
    }
    void Close() {
        ClearCache(); pages_.clear(); path_.clear();
#ifdef FINANCELAB_HAS_PDFIUM
        if (doc_) { FPDF_CloseDocument(doc_); doc_ = nullptr; }
#endif
    }
    bool Loaded() const { return !pages_.empty(); }
    int PageCount() const { return (int)pages_.size(); }
    const std::filesystem::path& Path() const { return path_; }
    const std::string& Error() const { return err_; }
    ImVec2 PageOrigin(int i) const { return i >= 0 && i < (int)pages_.size() ? pages_[i].pos : ImVec2(0, 0); }
    // Index de la page occupant le haut de la zone visible.
    int PageAtY(float worldY) const {
        for (int i = 0; i < (int)pages_.size(); ++i) if (worldY < pages_[i].pos.y + pages_[i].size.y + kGap / 2) return i;
        return std::max(0, (int)pages_.size() - 1);
    }

    void Render(ImDrawList* dl, ImVec2 origin, ImVec2 avail, ImVec2 pan, float zoom, float opacity) {
        if (!Loaded() || opacity <= 0.01f) return;
        float y0 = -pan.y / zoom, y1 = (avail.y - pan.y) / zoom;
        int al = (int)(std::clamp(opacity, 0.0f, 1.0f) * 255);
        ImU32 tint = IM_COL32(255, 255, 255, al), shadow = IM_COL32(15, 20, 30, (int)(40 * opacity)), border = IM_COL32(195, 200, 212, (int)(220 * opacity));
        for (int i = 0; i < (int)pages_.size(); ++i) {
            const auto& p = pages_[i];
            if (p.pos.y + p.size.y < y0 - 100 || p.pos.y > y1 + 100) continue;
            ImVec2 tl(origin.x + pan.x + p.pos.x * zoom, origin.y + pan.y + p.pos.y * zoom), br(tl.x + p.size.x * zoom, tl.y + p.size.y * zoom);
            dl->AddRectFilled({tl.x + 4, tl.y + 6}, {br.x + 4, br.y + 6}, shadow, 4);
            dl->AddRectFilled(tl, br, tint);
            if (unsigned tex = Texture(i)) dl->AddImage((ImTextureID)(uintptr_t)tex, tl, br, {0, 0}, {1, 1}, tint);
            dl->AddRect(tl, br, border);
            if (zoom >= 0.4f) {
                std::string b = "Page " + std::to_string(i + 1) + " / " + std::to_string(pages_.size());
                ImVec2 ts = ImGui::CalcTextSize(b.c_str());
                dl->AddRectFilled({br.x - ts.x - 18, tl.y + 8}, {br.x - 8, tl.y + ts.y + 14}, IM_COL32(30, 32, 38, 175), 6);
                dl->AddText({br.x - ts.x - 13, tl.y + 11}, IM_COL32(255, 255, 255, 240), b.c_str());
            }
        }
    }

private:
    std::filesystem::path path_; std::string err_;
    std::vector<PdfPage> pages_;
    std::list<int> lru_;
    struct Tex { unsigned id = 0; std::list<int>::iterator it; };
    std::unordered_map<int, Tex> cache_;
#ifdef FINANCELAB_HAS_PDFIUM
    FPDF_DOCUMENT doc_ = nullptr;
    static int& refs_() { static int r = 0; return r; }
#endif
    void ClearCache() { for (auto& [i, t] : cache_) glDeleteTextures(1, &t.id); cache_.clear(); lru_.clear(); }

    unsigned Texture(int idx) {
        auto it = cache_.find(idx);
        if (it != cache_.end()) { lru_.erase(it->second.it); lru_.push_front(idx); it->second.it = lru_.begin(); return it->second.id; }
#ifdef FINANCELAB_HAS_PDFIUM
        while (cache_.size() >= kMaxTextures && !lru_.empty()) {
            int ev = lru_.back(); lru_.pop_back();
            auto e = cache_.find(ev); if (e != cache_.end()) { glDeleteTextures(1, &e->second.id); cache_.erase(e); }
        }
        FPDF_PAGE page = FPDF_LoadPage(doc_, idx);
        if (!page) return 0;
        int w = (int)std::lround(pages_[idx].size.x * kSuper), h = (int)std::lround(pages_[idx].size.y * kSuper);
        FPDF_BITMAP bmp = FPDFBitmap_Create(w, h, 0);
        if (!bmp) { FPDF_ClosePage(page); return 0; }
        FPDFBitmap_FillRect(bmp, 0, 0, w, h, 0xFFFFFFFF);
        FPDF_RenderPageBitmap(bmp, page, 0, 0, w, h, 0, FPDF_ANNOT | FPDF_LCD_TEXT);
        unsigned id = 0; glGenTextures(1, &id); glBindTexture(GL_TEXTURE_2D, id);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_SWIZZLE_A, GL_ONE);
        glPixelStorei(GL_UNPACK_ALIGNMENT, 4);
        glPixelStorei(GL_UNPACK_ROW_LENGTH, FPDFBitmap_GetStride(bmp) / 4);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, w, h, 0, GL_BGRA, GL_UNSIGNED_BYTE, FPDFBitmap_GetBuffer(bmp));
        glPixelStorei(GL_UNPACK_ROW_LENGTH, 0);
        glBindTexture(GL_TEXTURE_2D, 0);
        FPDFBitmap_Destroy(bmp); FPDF_ClosePage(page);
        lru_.push_front(idx); cache_[idx] = {id, lru_.begin()};
        return id;
#else
        return 0;
#endif
    }
};

} // namespace cl::ui
