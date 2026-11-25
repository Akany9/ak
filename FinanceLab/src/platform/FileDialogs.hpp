#pragma once
// Boîtes de dialogue natives (macOS / Windows / Linux) via nativefiledialog-extended.
// Sans NFD (FINANCELAB_HAS_NFD non défini), les fonctions retournent std::nullopt
// et l'interface se rabat sur la saisie manuelle du chemin.
#include <optional>
#include <string>
#include <vector>

#ifdef FINANCELAB_HAS_NFD
#include <nfd.h>
#endif

namespace cl {

struct FileFilter { std::string name, spec; };   // ex. {"Projet FinanceLab", "financelab"}

class FileDialogs {
public:
    FileDialogs() {
#ifdef FINANCELAB_HAS_NFD
        ready_ = NFD_Init() == NFD_OKAY;
#endif
    }
    ~FileDialogs() {
#ifdef FINANCELAB_HAS_NFD
        if (ready_) NFD_Quit();
#endif
    }
    bool Available() const { return ready_; }

    std::optional<std::string> Open(const std::vector<FileFilter>& filters, const std::string& startDir = "") {
#ifdef FINANCELAB_HAS_NFD
        if (!ready_) return std::nullopt;
        auto items = ToItems(filters);
        nfdu8char_t* out = nullptr;
        nfdresult_t r = NFD_OpenDialogU8(&out, items.data(), (nfdfiltersize_t)items.size(), startDir.empty() ? nullptr : startDir.c_str());
        return Finish(r, out);
#else
        (void)filters; (void)startDir; return std::nullopt;
#endif
    }

    std::optional<std::string> Save(const std::vector<FileFilter>& filters, const std::string& defaultName, const std::string& startDir = "") {
#ifdef FINANCELAB_HAS_NFD
        if (!ready_) return std::nullopt;
        auto items = ToItems(filters);
        nfdu8char_t* out = nullptr;
        nfdresult_t r = NFD_SaveDialogU8(&out, items.data(), (nfdfiltersize_t)items.size(), startDir.empty() ? nullptr : startDir.c_str(), defaultName.c_str());
        auto p = Finish(r, out);
        if (p && !filters.empty()) {                       // garantit l'extension
            std::string ext = "." + filters[0].spec.substr(0, filters[0].spec.find(','));
            if (p->size() < ext.size() || p->compare(p->size() - ext.size(), ext.size(), ext) != 0) *p += ext;
        }
        return p;
#else
        (void)filters; (void)defaultName; (void)startDir; return std::nullopt;
#endif
    }

    const std::string& LastError() const { return err_; }

private:
    bool ready_ = false;
    std::string err_;
#ifdef FINANCELAB_HAS_NFD
    std::vector<nfdu8filteritem_t> ToItems(const std::vector<FileFilter>& f) {
        std::vector<nfdu8filteritem_t> v;
        for (auto& x : f) v.push_back({x.name.c_str(), x.spec.c_str()});
        return v;
    }
    std::optional<std::string> Finish(nfdresult_t r, nfdu8char_t* out) {
        if (r == NFD_OKAY) { std::string s = out; NFD_FreePathU8(out); return s; }
        if (r == NFD_ERROR) { const char* e = NFD_GetError(); err_ = e ? e : "erreur NFD"; }
        return std::nullopt;                               // annulé ou erreur
    }
#endif
};

} // namespace cl
