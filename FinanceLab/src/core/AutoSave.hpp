#pragma once
// Auto-sauvegarde périodique avec rotation de N copies et récupération après plantage.
#include "ProjectFile.hpp"
#include <filesystem>
#include <functional>
#include <optional>
#include <string>

namespace cl {

class AutoSave {
public:
    bool enabled = true;
    double intervalSec = 60.0;
    int keep = 3;

    void MarkDirty(double nowSec) { if (!dirty_) firstDirty_ = nowSec; dirty_ = true; }
    void MarkClean() { dirty_ = false; }
    bool Dirty() const { return dirty_; }
    const std::string& LastMessage() const { return lastMsg_; }
    double LastSaveTime() const { return lastSave_; }

    // Chemin de la copie n pour un projet donné : <dossier>/.<nom>.auto<n>.financelab
    static std::filesystem::path SlotPath(const std::filesystem::path& project, int n) {
        auto dir = project.has_parent_path() ? project.parent_path() : std::filesystem::path(".");
        return dir / ("." + project.stem().string() + ".auto" + std::to_string(n) + ".financelab");
    }

    // À appeler à chaque image : sauvegarde si modifié et intervalle écoulé.
    // `capture` fournit l'état courant uniquement quand c'est nécessaire.
    bool Tick(double nowSec, const std::filesystem::path& project, const std::function<ProjectState()>& capture) {
        if (!enabled || !dirty_ || project.empty()) return false;
        if (nowSec - std::max(lastSave_, firstDirty_) < intervalSec) return false;
        return SaveNow(nowSec, project, capture());
    }

    bool SaveNow(double nowSec, const std::filesystem::path& project, const ProjectState& s) {
        namespace fs = std::filesystem;
        std::error_code ec;
        // rotation : auto(n-1) -> auto(n) ... auto1 -> auto2, puis écriture dans auto1
        for (int i = keep; i >= 2; --i) {
            fs::path from = SlotPath(project, i - 1), to = SlotPath(project, i);
            if (fs::exists(from, ec)) { fs::remove(to, ec); fs::rename(from, to, ec); }
        }
        IoResult r = ProjectFile::Save(SlotPath(project, 1), s);
        lastMsg_ = r.ok ? "Auto-sauvegarde effectuée" : "Échec auto-sauvegarde : " + r.message;
        if (r.ok) { dirty_ = false; lastSave_ = nowSec; }
        return r.ok;
    }

    // Copie d'auto-sauvegarde plus récente que le projet (ou existante si le projet n'a jamais été enregistré).
    static std::optional<std::filesystem::path> FindRecovery(const std::filesystem::path& project) {
        namespace fs = std::filesystem;
        std::error_code ec;
        fs::path slot = SlotPath(project, 1);
        if (!fs::exists(slot, ec)) return std::nullopt;
        if (!fs::exists(project, ec)) return slot;
        auto tp = fs::last_write_time(project, ec), ts = fs::last_write_time(slot, ec);
        return ts > tp ? std::optional<fs::path>(slot) : std::nullopt;
    }

    static void DiscardAll(const std::filesystem::path& project, int keepSlots = 9) {
        std::error_code ec;
        for (int i = 1; i <= keepSlots; ++i) std::filesystem::remove(SlotPath(project, i), ec);
    }

private:
    bool dirty_ = false;
    double firstDirty_ = 0, lastSave_ = 0;
    std::string lastMsg_;
};

} // namespace cl
