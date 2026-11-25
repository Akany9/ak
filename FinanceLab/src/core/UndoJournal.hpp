#pragma once
// Journal d'historique Annuler / Rétablir à base de photographies de ProjectState.
#include "Model.hpp"
#include <chrono>
#include <cstdint>
#include <ctime>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

namespace cl {

inline uint64_t Fingerprint(const ProjectState& s) {
    uint64_t h = 1469598103934665603ull;
    auto mix = [&](const void* p, size_t n) {
        const unsigned char* b = static_cast<const unsigned char*>(p);
        for (size_t i = 0; i < n; ++i) { h ^= b[i]; h *= 1099511628211ull; }
    };
    auto str = [&](const std::string& x) { uint64_t n = x.size(); mix(&n, sizeof n); mix(x.data(), x.size()); };
    str(s.title); str(s.notes); str(s.python); str(s.sql);
    mix(&s.activeExercise, sizeof s.activeExercise);
    for (auto& c : s.cells) { mix(&c.row, sizeof c.row); mix(&c.col, sizeof c.col); str(c.raw); }
    for (auto& l : s.layers) { str(l.name); mix(&l.visible, sizeof l.visible); mix(&l.opacity, sizeof l.opacity); }
    for (auto& k : s.strokes) {
        mix(&k.layer, sizeof k.layer); mix(&k.highlighter, sizeof k.highlighter);
        mix(&k.r, 4 * sizeof(float)); mix(&k.width, sizeof k.width);
        uint64_t n = k.pts.size(); mix(&n, sizeof n);
        if (n) mix(k.pts.data(), n * sizeof(StrokePoint));
    }
    for (auto& n : s.nodes) { mix(&n.id, sizeof n.id); mix(&n.x, 4 * sizeof(float)); str(n.title); str(n.subtitle); mix(&n.r, 4 * sizeof(float)); }
    for (auto& q : s.equations) { mix(&q.id, sizeof q.id); mix(&q.x, 2 * sizeof(float)); str(q.latex); mix(&q.r, 4 * sizeof(float)); }
    for (auto& h : s.shapes) { mix(&h.id, sizeof h.id); mix(&h.kind, sizeof h.kind); mix(&h.x, 4 * sizeof(float)); str(h.text); str(h.sub);
                               mix(&h.r, 4 * sizeof(float)); mix(&h.filled, sizeof h.filled); mix(&h.stroke, sizeof h.stroke); str(ShapeStyleToString(h)); }
    { const Look& l = s.look; mix(&l.backdrop, sizeof l.backdrop); mix(&l.grade, sizeof l.grade); mix(&l.preset, sizeof l.preset);
      mix(&l.mix, 11 * sizeof(float)); mix(&l.letterbox, sizeof l.letterbox); }
    str(s.dbDump); str(s.pdfPath); mix(&s.pdfOpacity, sizeof s.pdfOpacity);
    for (auto& e : s.edges) { mix(&e.from, sizeof e.from); mix(&e.to, sizeof e.to); str(e.label); }
    return h;
}

class UndoJournal {
public:
    struct Entry {
        std::string label;
        std::time_t when = 0;
        uint64_t fp = 0;
        std::shared_ptr<const ProjectState> state;
    };

    explicit UndoJournal(size_t maxEntries = 200) : max_(maxEntries) {}

    void Reset(const ProjectState& initial, const std::string& label = "Ouverture") {
        entries_.clear();
        Push(label, initial);
        cur_ = 0;
    }

    // Enregistre un nouvel état. Retourne false si rien n'a changé.
    // Avec coalesceKey identique et < 1 s d'écart, l'entrée courante est remplacée (curseurs, frappe).
    bool Commit(const std::string& label, const ProjectState& s, const std::string& coalesceKey = "") {
        uint64_t fp = Fingerprint(s);
        if (!entries_.empty() && entries_[cur_].fp == fp) return false;
        auto now = std::chrono::steady_clock::now();
        bool merge = !coalesceKey.empty() && coalesceKey == lastKey_ && cur_ > 0 && cur_ + 1 == entries_.size() &&
                     now - lastCommit_ < std::chrono::milliseconds(1000);
        if (merge) {
            entries_[cur_].state = std::make_shared<const ProjectState>(s);
            entries_[cur_].fp = fp; entries_[cur_].when = std::time(nullptr);
        } else {
            entries_.resize(cur_ + 1);           // purge de la pile « rétablir »
            Push(label, s);
            cur_ = entries_.size() - 1;
        }
        lastKey_ = coalesceKey; lastCommit_ = now;
        return true;
    }

    bool CanUndo() const { return cur_ > 0; }
    bool CanRedo() const { return !entries_.empty() && cur_ + 1 < entries_.size(); }

    // Retourne l'état à restaurer (ou nullptr).
    std::shared_ptr<const ProjectState> Undo() { if (!CanUndo()) return nullptr; lastKey_.clear(); return entries_[--cur_].state; }
    std::shared_ptr<const ProjectState> Redo() { if (!CanRedo()) return nullptr; lastKey_.clear(); return entries_[++cur_].state; }
    std::shared_ptr<const ProjectState> JumpTo(size_t i) { if (i >= entries_.size()) return nullptr; lastKey_.clear(); cur_ = i; return entries_[i].state; }

    const std::string& UndoLabel() const { static const std::string e; return CanUndo() ? entries_[cur_].label : e; }
    const std::string& RedoLabel() const { static const std::string e; return CanRedo() ? entries_[cur_ + 1].label : e; }
    const std::vector<Entry>& Entries() const { return entries_; }
    size_t Current() const { return cur_; }

    std::string ExportLog() const {
        std::ostringstream o;
        for (size_t i = 0; i < entries_.size(); ++i) {
            char b[32]; std::tm tm{};
#if defined(_WIN32)
            localtime_s(&tm, &entries_[i].when);
#else
            localtime_r(&entries_[i].when, &tm);
#endif
            std::strftime(b, sizeof b, "%H:%M:%S", &tm);
            o << (i == cur_ ? "> " : "  ") << b << "  " << entries_[i].label << "\n";
        }
        return o.str();
    }

private:
    std::vector<Entry> entries_;
    size_t cur_ = 0, max_;
    std::string lastKey_;
    std::chrono::steady_clock::time_point lastCommit_{};

    void Push(const std::string& label, const ProjectState& s) {
        entries_.push_back({label, std::time(nullptr), Fingerprint(s), std::make_shared<const ProjectState>(s)});
        if (entries_.size() > max_) { entries_.erase(entries_.begin()); }
    }
};

} // namespace cl
