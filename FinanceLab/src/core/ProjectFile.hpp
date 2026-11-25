#pragma once
// Conteneur de projet .financelab = fichier SQLite3 unique (application_id 'STDY').
#include "Database.hpp"
#include "Model.hpp"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <filesystem>
#include <string>
#include <vector>

namespace cl {

struct IoResult { bool ok = false; std::string message; };

class ProjectFile {
public:
    static constexpr int kAppId = 0x53544459;
    static constexpr int kVersion = 4;

    // Écriture atomique : fichier temporaire puis renommage (l'ancien fichier reste intact en cas d'échec).
    static IoResult Save(const std::filesystem::path& path, const ProjectState& s) {
        namespace fs = std::filesystem;
        std::error_code ec;
        fs::path tmp = path; tmp += ".tmp";
        fs::remove(tmp, ec);
        IoResult r = WriteDb(tmp, s);
        if (!r.ok) { fs::remove(tmp, ec); return r; }
        fs::rename(tmp, path, ec);
        if (ec) {                                   // Windows : rename sur fichier existant
            fs::remove(path, ec);
            fs::rename(tmp, path, ec);
            if (ec) return {false, "Impossible de remplacer " + path.string() + " : " + ec.message()};
        }
        return {true, "Projet enregistré : " + path.filename().string() + " (" + std::to_string(s.strokes.size()) + " tracés, " +
                      std::to_string(s.cells.size()) + " cellules)"};
    }

    static IoResult Load(const std::filesystem::path& path, ProjectState& out) {
        if (!std::filesystem::exists(path)) return {false, "Fichier introuvable : " + path.string()};
        sqlite3* db = nullptr;
        if (sqlite3_open_v2(path.string().c_str(), &db, SQLITE_OPEN_READONLY, nullptr) != SQLITE_OK) {
            std::string e = db ? sqlite3_errmsg(db) : "ouverture impossible"; sqlite3_close(db);
            return {false, "Impossible d'ouvrir le projet : " + e};
        }
        struct Closer { sqlite3* d; ~Closer() { sqlite3_close(d); } } closer{db};

        int appId = 0;
        { Stmt st(db, "PRAGMA application_id;"); if (st.s && sqlite3_step(st.s) == SQLITE_ROW) appId = sqlite3_column_int(st.s, 0); }
        if (appId != kAppId) return {false, "Ce fichier n'est pas un projet FinanceLab (.financelab)."};

        ProjectState p;
        { Stmt st(db, "SELECT key,value FROM project_meta;");
          if (!st.s) return {false, "Schéma .financelab invalide."};
          while (sqlite3_step(st.s) == SQLITE_ROW) {
              std::string k = Txt(st.s, 0), v = Txt(st.s, 1);
              if (k == "title") p.title = v; else if (k == "course_code") p.courseCode = v;
              else if (k == "active_exercise") p.activeExercise = std::atoi(v.c_str());
              else if (k == "look") p.look = LookFromString(v);
              else if (k == "pdf_path") p.pdfPath = v; else if (k == "pdf_page") p.pdfPage = std::atoi(v.c_str()); else if (k == "pdf_opacity") p.pdfOpacity = (float)std::atof(v.c_str());
          } }
        { Stmt st(db, "SELECT content,python_code,sql_code FROM documents WHERE doc_id='main';");
          if (st.s && sqlite3_step(st.s) == SQLITE_ROW) { p.notes = Txt(st.s, 0); p.python = Txt(st.s, 1); p.sql = Txt(st.s, 2); } }
        { Stmt st(db, "SELECT name,visible,opacity FROM wb_layers ORDER BY layer_index;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) p.layers.push_back({Txt(st.s, 0), sqlite3_column_int(st.s, 1) != 0, (float)sqlite3_column_double(st.s, 2)}); }
        { Stmt st(db, "SELECT layer_index,r,g,b,a,width,highlighter,points FROM wb_strokes ORDER BY stroke_id;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) {
              Stroke k; k.layer = sqlite3_column_int(st.s, 0);
              k.r = (float)sqlite3_column_double(st.s, 1); k.g = (float)sqlite3_column_double(st.s, 2);
              k.b = (float)sqlite3_column_double(st.s, 3); k.a = (float)sqlite3_column_double(st.s, 4);
              k.width = (float)sqlite3_column_double(st.s, 5); k.highlighter = sqlite3_column_int(st.s, 6) != 0;
              const void* blob = sqlite3_column_blob(st.s, 7); size_t n = (size_t)sqlite3_column_bytes(st.s, 7) / sizeof(StrokePoint);
              if (blob && n) { k.pts.resize(n); std::memcpy(k.pts.data(), blob, n * sizeof(StrokePoint)); }
              p.strokes.push_back(std::move(k));
          } }
        { Stmt st(db, "SELECT id,x,y,w,h,title,subtitle,r,g,b,a FROM wb_nodes ORDER BY id;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) {
              Node n; n.id = sqlite3_column_int(st.s, 0);
              n.x = (float)sqlite3_column_double(st.s, 1); n.y = (float)sqlite3_column_double(st.s, 2);
              n.w = (float)sqlite3_column_double(st.s, 3); n.h = (float)sqlite3_column_double(st.s, 4);
              n.title = Txt(st.s, 5); n.subtitle = Txt(st.s, 6);
              n.r = (float)sqlite3_column_double(st.s, 7); n.g = (float)sqlite3_column_double(st.s, 8);
              n.b = (float)sqlite3_column_double(st.s, 9); n.a = (float)sqlite3_column_double(st.s, 10);
              p.nodes.push_back(std::move(n));
          } }
        { Stmt st(db, "SELECT from_id,to_id,label FROM wb_edges ORDER BY edge_id;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) p.edges.push_back({sqlite3_column_int(st.s, 0), sqlite3_column_int(st.s, 1), Txt(st.s, 2)}); }
        { Stmt st(db, "SELECT id,x,y,latex,r,g,b,a,card FROM wb_equations ORDER BY id;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) {
              Equation q; q.id = sqlite3_column_int(st.s, 0); q.x = (float)sqlite3_column_double(st.s, 1); q.y = (float)sqlite3_column_double(st.s, 2);
              q.latex = Txt(st.s, 3); q.r = (float)sqlite3_column_double(st.s, 4); q.g = (float)sqlite3_column_double(st.s, 5); q.b = (float)sqlite3_column_double(st.s, 6); q.a = (float)sqlite3_column_double(st.s, 7);
              q.card = sqlite3_column_int(st.s, 8) != 0; p.equations.push_back(std::move(q));
          } }
        { Stmt st(db, "SELECT script FROM db_dump WHERE id=1;");
          if (st.s && sqlite3_step(st.s) == SQLITE_ROW) p.dbDump = Txt(st.s, 0); }
        { Stmt st(db, "SELECT id,kind,x,y,w,h,text,sub,r,g,b,a,filled,stroke FROM wb_shapes ORDER BY id;");   // absent avant la v4
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) {
              Shape h; h.id = sqlite3_column_int(st.s, 0); h.kind = sqlite3_column_int(st.s, 1);
              h.x = (float)sqlite3_column_double(st.s, 2); h.y = (float)sqlite3_column_double(st.s, 3); h.w = (float)sqlite3_column_double(st.s, 4); h.h = (float)sqlite3_column_double(st.s, 5);
              h.text = Txt(st.s, 6); h.sub = Txt(st.s, 7);
              h.r = (float)sqlite3_column_double(st.s, 8); h.g = (float)sqlite3_column_double(st.s, 9); h.b = (float)sqlite3_column_double(st.s, 10); h.a = (float)sqlite3_column_double(st.s, 11);
              h.filled = sqlite3_column_int(st.s, 12) != 0; h.stroke = (float)sqlite3_column_double(st.s, 13);
              if (h.kind < 0 || h.kind >= (int)ShapeKind::Count) h.kind = 0;
              p.shapes.push_back(std::move(h)); } }
        { Stmt st(db, "SELECT row_idx,col_idx,raw FROM sheet_cells;");
          while (st.s && sqlite3_step(st.s) == SQLITE_ROW) p.cells.push_back({sqlite3_column_int(st.s, 0), sqlite3_column_int(st.s, 1), Txt(st.s, 2)}); }

        out = std::move(p);
        return {true, "Projet « " + out.title + " » chargé."};
    }

    // Réglages d'effets sérialisés en une ligne « clé=valeur » (lisible, tolérante aux ajouts).
    static std::string LookToString(const Look& l) {
        char b[512];
        std::snprintf(b, sizeof b, "backdrop=%d grade=%d preset=%d mix=%g exposure=%g contrast=%g saturation=%g temperature=%g tint=%g fade=%g sharpen=%g vignette=%g grain=%g aberration=%g letterbox=%d",
                      l.backdrop, (int)l.grade, l.preset, l.mix, l.exposure, l.contrast, l.saturation, l.temperature, l.tint, l.fade, l.sharpen, l.vignette, l.grain, l.aberration, (int)l.letterbox);
        return b;
    }
    static Look LookFromString(const std::string& s) {
        Look l; size_t i = 0;
        while (i < s.size()) {
            size_t e = s.find(' ', i); if (e == std::string::npos) e = s.size();
            std::string kv = s.substr(i, e - i); i = e + 1;
            size_t q = kv.find('='); if (q == std::string::npos) continue;
            std::string k = kv.substr(0, q); double v = std::atof(kv.c_str() + q + 1);
            if (k == "backdrop") l.backdrop = (int)v; else if (k == "grade") l.grade = v != 0; else if (k == "preset") l.preset = (int)v;
            else if (k == "mix") l.mix = (float)v; else if (k == "exposure") l.exposure = (float)v; else if (k == "contrast") l.contrast = (float)v;
            else if (k == "saturation") l.saturation = (float)v; else if (k == "temperature") l.temperature = (float)v; else if (k == "tint") l.tint = (float)v;
            else if (k == "fade") l.fade = (float)v; else if (k == "sharpen") l.sharpen = (float)v; else if (k == "vignette") l.vignette = (float)v;
            else if (k == "grain") l.grain = (float)v; else if (k == "aberration") l.aberration = (float)v; else if (k == "letterbox") l.letterbox = v != 0;
        }
        return l;
    }

private:
    struct Stmt {
        sqlite3_stmt* s = nullptr;
        Stmt(sqlite3* db, const char* sql) { if (sqlite3_prepare_v2(db, sql, -1, &s, nullptr) != SQLITE_OK) s = nullptr; }
        ~Stmt() { if (s) sqlite3_finalize(s); }
    };
    static std::string Txt(sqlite3_stmt* s, int c) { const unsigned char* t = sqlite3_column_text(s, c); return t ? (const char*)t : ""; }
    static bool Exec(sqlite3* db, const char* sql) { char* e = nullptr; int rc = sqlite3_exec(db, sql, nullptr, nullptr, &e); if (e) sqlite3_free(e); return rc == SQLITE_OK; }

    static IoResult WriteDb(const std::filesystem::path& path, const ProjectState& s) {
        sqlite3* db = nullptr;
        if (sqlite3_open(path.string().c_str(), &db) != SQLITE_OK) {
            std::string e = db ? sqlite3_errmsg(db) : "ouverture impossible"; sqlite3_close(db);
            return {false, "Écriture impossible : " + e};
        }
        struct Closer { sqlite3* d; ~Closer() { sqlite3_close(d); } } closer{db};
        auto fail = [&](const char* ctx) { std::string m = std::string(ctx) + " : " + sqlite3_errmsg(db); Exec(db, "ROLLBACK;"); return IoResult{false, m}; };

        if (!Exec(db, "PRAGMA journal_mode=DELETE;") || !Exec(db, "PRAGMA application_id=1398031449;") || !Exec(db, "PRAGMA user_version=4;"))
            return fail("PRAGMA");
        if (!Exec(db, R"SQL(
CREATE TABLE project_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE documents (doc_id TEXT PRIMARY KEY, content TEXT NOT NULL, python_code TEXT NOT NULL, sql_code TEXT NOT NULL);
CREATE TABLE wb_layers (layer_index INTEGER PRIMARY KEY, name TEXT NOT NULL, visible INTEGER NOT NULL, opacity REAL NOT NULL);
CREATE TABLE wb_strokes (stroke_id INTEGER PRIMARY KEY AUTOINCREMENT, layer_index INTEGER NOT NULL, r REAL, g REAL, b REAL, a REAL, width REAL, highlighter INTEGER, points BLOB NOT NULL);
CREATE TABLE wb_nodes (id INTEGER PRIMARY KEY, x REAL, y REAL, w REAL, h REAL, title TEXT, subtitle TEXT, r REAL, g REAL, b REAL, a REAL);
CREATE TABLE wb_edges (edge_id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER, to_id INTEGER, label TEXT);
CREATE TABLE wb_equations (id INTEGER PRIMARY KEY, x REAL, y REAL, latex TEXT, r REAL, g REAL, b REAL, a REAL, card INTEGER);
CREATE TABLE wb_shapes (id INTEGER PRIMARY KEY, kind INTEGER, x REAL, y REAL, w REAL, h REAL, text TEXT, sub TEXT, r REAL, g REAL, b REAL, a REAL, filled INTEGER, stroke REAL);
CREATE TABLE db_dump (id INTEGER PRIMARY KEY, script TEXT NOT NULL);
CREATE TABLE sheet_cells (row_idx INTEGER, col_idx INTEGER, raw TEXT NOT NULL, PRIMARY KEY (row_idx, col_idx));
)SQL")) return fail("Schéma");
        if (!Exec(db, "BEGIN IMMEDIATE;")) return fail("Transaction");

        auto prep = [&](const char* sql) { Stmt* st = new Stmt(db, sql); return st; };
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO project_meta VALUES(?1,?2);"));
            if (!st->s) return fail("meta");
            auto put = [&](const char* k, const std::string& v) { sqlite3_reset(st->s); sqlite3_bind_text(st->s, 1, k, -1, SQLITE_STATIC); sqlite3_bind_text(st->s, 2, v.c_str(), -1, SQLITE_TRANSIENT); return sqlite3_step(st->s) == SQLITE_DONE; };
            if (!put("look", LookToString(s.look)) || !put("pdf_path", s.pdfPath) || !put("pdf_page", std::to_string(s.pdfPage)) || !put("pdf_opacity", std::to_string(s.pdfOpacity)) || !put("title", s.title) || !put("course_code", s.courseCode) || !put("active_exercise", std::to_string(s.activeExercise)) ||
                !put("format_version", std::to_string(kVersion)) || !put("saved_at", std::to_string(std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count())))
                return fail("meta"); }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO documents VALUES('main',?1,?2,?3);"));
            if (!st->s) return fail("documents");
            sqlite3_bind_text(st->s, 1, s.notes.c_str(), -1, SQLITE_TRANSIENT); sqlite3_bind_text(st->s, 2, s.python.c_str(), -1, SQLITE_TRANSIENT); sqlite3_bind_text(st->s, 3, s.sql.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(st->s) != SQLITE_DONE) return fail("documents"); }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_layers VALUES(?1,?2,?3,?4);"));
            for (size_t i = 0; i < s.layers.size(); ++i) { sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, (int)i); sqlite3_bind_text(st->s, 2, s.layers[i].name.c_str(), -1, SQLITE_TRANSIENT); sqlite3_bind_int(st->s, 3, s.layers[i].visible); sqlite3_bind_double(st->s, 4, s.layers[i].opacity); if (sqlite3_step(st->s) != SQLITE_DONE) return fail("calques"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_strokes(layer_index,r,g,b,a,width,highlighter,points) VALUES(?1,?2,?3,?4,?5,?6,?7,?8);"));
            for (auto& k : s.strokes) {
                if (k.pts.empty()) continue;
                sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, k.layer); sqlite3_bind_double(st->s, 2, k.r); sqlite3_bind_double(st->s, 3, k.g); sqlite3_bind_double(st->s, 4, k.b); sqlite3_bind_double(st->s, 5, k.a);
                sqlite3_bind_double(st->s, 6, k.width); sqlite3_bind_int(st->s, 7, k.highlighter);
                sqlite3_bind_blob(st->s, 8, k.pts.data(), (int)(k.pts.size() * sizeof(StrokePoint)), SQLITE_TRANSIENT);
                if (sqlite3_step(st->s) != SQLITE_DONE) return fail("tracés"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_nodes VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11);"));
            for (auto& n : s.nodes) {
                sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, n.id); sqlite3_bind_double(st->s, 2, n.x); sqlite3_bind_double(st->s, 3, n.y); sqlite3_bind_double(st->s, 4, n.w); sqlite3_bind_double(st->s, 5, n.h);
                sqlite3_bind_text(st->s, 6, n.title.c_str(), -1, SQLITE_TRANSIENT); sqlite3_bind_text(st->s, 7, n.subtitle.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(st->s, 8, n.r); sqlite3_bind_double(st->s, 9, n.g); sqlite3_bind_double(st->s, 10, n.b); sqlite3_bind_double(st->s, 11, n.a);
                if (sqlite3_step(st->s) != SQLITE_DONE) return fail("nœuds"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_edges(from_id,to_id,label) VALUES(?1,?2,?3);"));
            for (auto& e : s.edges) { sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, e.from); sqlite3_bind_int(st->s, 2, e.to); sqlite3_bind_text(st->s, 3, e.label.c_str(), -1, SQLITE_TRANSIENT); if (sqlite3_step(st->s) != SQLITE_DONE) return fail("arêtes"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_equations VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9);"));
            for (auto& q : s.equations) {
                sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, q.id); sqlite3_bind_double(st->s, 2, q.x); sqlite3_bind_double(st->s, 3, q.y); sqlite3_bind_text(st->s, 4, q.latex.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(st->s, 5, q.r); sqlite3_bind_double(st->s, 6, q.g); sqlite3_bind_double(st->s, 7, q.b); sqlite3_bind_double(st->s, 8, q.a); sqlite3_bind_int(st->s, 9, q.card);
                if (sqlite3_step(st->s) != SQLITE_DONE) return fail("équations"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO wb_shapes VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14);"));
            for (auto& h : s.shapes) {
                sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, h.id); sqlite3_bind_int(st->s, 2, h.kind);
                sqlite3_bind_double(st->s, 3, h.x); sqlite3_bind_double(st->s, 4, h.y); sqlite3_bind_double(st->s, 5, h.w); sqlite3_bind_double(st->s, 6, h.h);
                sqlite3_bind_text(st->s, 7, h.text.c_str(), -1, SQLITE_TRANSIENT); sqlite3_bind_text(st->s, 8, h.sub.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(st->s, 9, h.r); sqlite3_bind_double(st->s, 10, h.g); sqlite3_bind_double(st->s, 11, h.b); sqlite3_bind_double(st->s, 12, h.a);
                sqlite3_bind_int(st->s, 13, h.filled); sqlite3_bind_double(st->s, 14, h.stroke);
                if (sqlite3_step(st->s) != SQLITE_DONE) return fail("éléments"); } }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO db_dump VALUES(1,?1);"));
            sqlite3_bind_text(st->s, 1, s.dbDump.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(st->s) != SQLITE_DONE) return fail("tables SQL"); }
        {   std::unique_ptr<Stmt> st(prep("INSERT INTO sheet_cells VALUES(?1,?2,?3);"));
            for (auto& c : s.cells) { sqlite3_reset(st->s); sqlite3_bind_int(st->s, 1, c.row); sqlite3_bind_int(st->s, 2, c.col); sqlite3_bind_text(st->s, 3, c.raw.c_str(), -1, SQLITE_TRANSIENT); if (sqlite3_step(st->s) != SQLITE_DONE) return fail("cellules"); } }
        if (!Exec(db, "COMMIT;")) return fail("Validation");
        return {true, ""};
    }
};

} // namespace cl
