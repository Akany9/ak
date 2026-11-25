#pragma once
// Importeur CSV / TSV financier -> tableur et SQLite3.
#include "Database.hpp"
#include "Spreadsheet.hpp"
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <fstream>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <vector>

namespace cl {

enum class ColType { Integer, Real, Text };

struct CsvTable {
    char delimiter = ',';
    bool hasHeader = true;
    std::vector<std::string> header;                 // toujours rempli (col1, col2… si absent)
    std::vector<std::vector<std::string>> rows;      // texte brut, sans la ligne d'en-tête
    std::vector<ColType> types;
    bool decimalComma = false;
    std::string error;
    bool ok() const { return error.empty(); }
};

class CsvImporter {
public:
    static std::optional<std::string> ReadFile(const std::string& path) {
        std::ifstream f(path, std::ios::binary);
        if (!f) return std::nullopt;
        std::ostringstream ss; ss << f.rdbuf();
        return ss.str();
    }

    static char SniffDelimiter(const std::string& text) {
        const char cands[] = {',', ';', '\t', '|'};
        int best = -1; long bestScore = -1;
        for (size_t i = 0; i < 4; ++i) {
            // nombre de séparateurs hors guillemets sur les 10 premières lignes, avec régularité
            std::vector<int> counts; int cnt = 0; bool q = false; int lines = 0;
            for (char ch : text) {
                if (ch == '"') q = !q;
                else if (!q && ch == cands[i]) ++cnt;
                else if (!q && ch == '\n') { counts.push_back(cnt); cnt = 0; if (++lines >= 10) break; }
            }
            if (lines < 10 && cnt) counts.push_back(cnt);
            if (counts.empty() || counts[0] == 0) continue;
            long consistent = 0;
            for (int v : counts) if (v == counts[0]) ++consistent;
            long score = consistent * 1000 + counts[0];
            if (score > bestScore) { bestScore = score; best = (int)i; }
        }
        return best < 0 ? ',' : cands[best];
    }

    static CsvTable Parse(std::string text, std::optional<char> forced = std::nullopt) {
        CsvTable t;
        if (text.size() >= 3 && (unsigned char)text[0] == 0xEF && (unsigned char)text[1] == 0xBB && (unsigned char)text[2] == 0xBF)
            text.erase(0, 3);
        if (text.find_first_not_of(" \r\n\t") == std::string::npos) { t.error = "Fichier vide."; return t; }
        t.delimiter = forced ? *forced : SniffDelimiter(text);

        std::vector<std::vector<std::string>> all;
        std::vector<std::string> row; std::string f; bool q = false, wasQuoted = false;
        auto endField = [&]() { row.push_back(f); f.clear(); wasQuoted = false; };
        auto endRow = [&]() {
            endField();
            if (!(row.size() == 1 && row[0].empty())) all.push_back(row);   // ignore lignes vides
            row.clear();
        };
        for (size_t i = 0; i < text.size(); ++i) {
            char ch = text[i];
            if (q) {
                if (ch == '"') { if (i + 1 < text.size() && text[i + 1] == '"') { f += '"'; ++i; } else q = false; }
                else f += ch;
            } else if (ch == '"' && f.empty() && !wasQuoted) { q = true; wasQuoted = true; }
            else if (ch == t.delimiter) endField();
            else if (ch == '\r') { if (i + 1 < text.size() && text[i + 1] == '\n') ++i; endRow(); }
            else if (ch == '\n') endRow();
            else f += ch;
        }
        if (q) { t.error = "Guillemet non refermé : fichier CSV malformé."; return t; }
        if (!f.empty() || !row.empty()) endRow();
        if (all.empty()) { t.error = "Aucune ligne exploitable."; return t; }

        size_t ncols = 0; for (auto& r : all) ncols = std::max(ncols, r.size());
        for (auto& r : all) r.resize(ncols);
        for (auto& r : all) for (auto& c : r) c = Trim(c);

        t.hasHeader = DetectHeader(all);
        size_t start = 0;
        if (t.hasHeader) { t.header = all[0]; start = 1; }
        else for (size_t c = 0; c < ncols; ++c) t.header.push_back("col" + std::to_string(c + 1));
        t.rows.assign(all.begin() + start, all.end());

        // décimale : virgule si au moins une cellule "1234,56" et délimiteur différent
        int commaNums = 0, dotNums = 0;
        for (auto& r : t.rows) for (auto& c : r) {
            if (LooksLikeCommaNumber(c)) ++commaNums;
            else if (LooksLikeDotNumber(c)) ++dotNums;
        }
        t.decimalComma = commaNums > 0 && t.delimiter != ',' && commaNums >= dotNums;

        t.types.assign(ncols, ColType::Integer);
        for (size_t c = 0; c < ncols; ++c) {
            bool any = false;
            for (auto& r : t.rows) {
                if (r[c].empty()) continue;
                any = true;
                std::string n = Normalize(r[c], t.decimalComma);
                if (!IsNumber(n)) { t.types[c] = ColType::Text; break; }
                if (!IsInteger(n)) t.types[c] = ColType::Real;
            }
            if (!any) t.types[c] = ColType::Text;
        }
        return t;
    }

    // Valeur normalisée (point décimal, sans séparateur de milliers) si numérique.
    static std::string Normalize(std::string s, bool decimalComma) {
        std::string o;
        for (char ch : s) {
            if (ch == ' ' || ch == '\xC2' || ch == '\xA0') continue;     // espaces (y c. insécables UTF-8)
            if (decimalComma) { if (ch == ',') o += '.'; else if (ch != '.') o += ch; }
            else if (ch != ',') o += ch;
        }
        if (!o.empty() && o.back() == '%') o.pop_back();
        return o;
    }

    // ---- vers le tableur ----
    struct SheetImportInfo { int rows = 0, cols = 0; bool truncated = false; };
    static SheetImportInfo ToSpreadsheet(const CsvTable& t, Spreadsheet& sh) {
        sh.Clear();
        SheetImportInfo info;
        int nc = std::min<int>(Spreadsheet::kCols, (int)t.header.size());
        int nr = std::min<int>(Spreadsheet::kRows - 1, (int)t.rows.size());
        info.truncated = nc < (int)t.header.size() || nr < (int)t.rows.size();
        for (int c = 0; c < nc; ++c) sh.SetRaw(0, c, t.header[c]);
        for (int r = 0; r < nr; ++r)
            for (int c = 0; c < nc; ++c) {
                const std::string& v = t.rows[r][c];
                if (t.types[c] != ColType::Text && !v.empty()) sh.SetRaw(r + 1, c, Normalize(v, t.decimalComma));
                else sh.SetRaw(r + 1, c, (!v.empty() && v[0] == '=') ? "'" + v : v);  // pas d'injection de formule
            }
        sh.Recalculate();
        info.rows = nr; info.cols = nc;
        return info;
    }

    // ---- vers SQLite3 ----
    struct SqlImportInfo { std::string table; int rows = 0; std::string error; bool ok() const { return error.empty(); } };
    static SqlImportInfo ToSqlite(const CsvTable& t, Database& db, std::string tableName, bool replace = true) {
        SqlImportInfo info;
        info.table = SanitizeIdent(tableName.empty() ? "import_csv" : tableName);
        sqlite3* h = db.Handle();
        if (!h) { info.error = "Base non initialisée."; return info; }

        std::vector<std::string> cols; std::set<std::string> used;
        for (size_t c = 0; c < t.header.size(); ++c) {
            std::string n = SanitizeIdent(t.header[c].empty() ? "col" + std::to_string(c + 1) : t.header[c]);
            std::string base = n; int k = 2;
            while (used.count(Lower(n))) n = base + "_" + std::to_string(k++);
            used.insert(Lower(n)); cols.push_back(n);
        }
        std::string ddl = "CREATE TABLE " + Database::QuoteIdent(info.table) + " (";
        for (size_t c = 0; c < cols.size(); ++c) {
            if (c) ddl += ", ";
            ddl += Database::QuoteIdent(cols[c]) + (t.types[c] == ColType::Integer ? " INTEGER" : t.types[c] == ColType::Real ? " REAL" : " TEXT");
        }
        ddl += ");";

        auto exec = [&](const std::string& sql) { char* e = nullptr; int rc = sqlite3_exec(h, sql.c_str(), nullptr, nullptr, &e); if (e) { info.error = e; sqlite3_free(e); } return rc == SQLITE_OK; };
        if (!exec("BEGIN;")) return info;
        if (replace && !exec("DROP TABLE IF EXISTS " + Database::QuoteIdent(info.table) + ";")) { exec("ROLLBACK;"); return info; }
        if (!exec(ddl)) { exec("ROLLBACK;"); return info; }

        std::string ins = "INSERT INTO " + Database::QuoteIdent(info.table) + " VALUES (";
        for (size_t c = 0; c < cols.size(); ++c) ins += c ? ",?" : "?";
        ins += ");";
        sqlite3_stmt* st = nullptr;
        if (sqlite3_prepare_v2(h, ins.c_str(), -1, &st, nullptr) != SQLITE_OK) { info.error = sqlite3_errmsg(h); exec("ROLLBACK;"); return info; }
        for (auto& r : t.rows) {
            sqlite3_reset(st); sqlite3_clear_bindings(st);
            for (size_t c = 0; c < cols.size(); ++c) {
                const std::string& v = r[c];
                int idx = (int)c + 1;
                if (v.empty()) sqlite3_bind_null(st, idx);
                else if (t.types[c] == ColType::Integer) sqlite3_bind_int64(st, idx, std::strtoll(Normalize(v, t.decimalComma).c_str(), nullptr, 10));
                else if (t.types[c] == ColType::Real) sqlite3_bind_double(st, idx, std::strtod(Normalize(v, t.decimalComma).c_str(), nullptr));
                else sqlite3_bind_text(st, idx, v.c_str(), -1, SQLITE_TRANSIENT);
            }
            if (sqlite3_step(st) != SQLITE_DONE) { info.error = sqlite3_errmsg(h); sqlite3_finalize(st); exec("ROLLBACK;"); return info; }
            ++info.rows;
        }
        sqlite3_finalize(st);
        if (!exec("COMMIT;")) { exec("ROLLBACK;"); return info; }
        return info;
    }

    static std::string TableNameFromPath(const std::string& path) {
        size_t s = path.find_last_of("/\\"); std::string n = path.substr(s == std::string::npos ? 0 : s + 1);
        size_t d = n.find_last_of('.'); if (d != std::string::npos) n.erase(d);
        return SanitizeIdent(n);
    }

private:
    static std::string Lower(std::string s) { for (auto& c : s) c = (char)std::tolower((unsigned char)c); return s; }
    static std::string Trim(const std::string& s) {
        size_t a = s.find_first_not_of(" \t"), b = s.find_last_not_of(" \t");
        return a == std::string::npos ? "" : s.substr(a, b - a + 1);
    }
    static std::string SanitizeIdent(const std::string& s) {
        std::string o;
        for (unsigned char ch : s) o += (std::isalnum(ch) || ch >= 0x80) ? (char)ch : '_';   // UTF-8 conservé
        while (!o.empty() && o.back() == '_') o.pop_back();
        size_t a = o.find_first_not_of('_'); o = a == std::string::npos ? "" : o.substr(a);
        if (o.empty()) o = "col";
        if (std::isdigit((unsigned char)o[0])) o = "t_" + o;
        return o;
    }
    static bool IsNumber(const std::string& n) {
        if (n.empty()) return false;
        char* e = nullptr; std::strtod(n.c_str(), &e);
        return e != n.c_str() && *e == '\0';
    }
    static bool IsInteger(const std::string& n) {
        size_t i = (n[0] == '-' || n[0] == '+') ? 1 : 0;
        if (i >= n.size()) return false;
        for (; i < n.size(); ++i) if (!std::isdigit((unsigned char)n[i])) return false;
        return n.size() < 18;
    }
    static bool LooksLikeCommaNumber(const std::string& s) {
        size_t c = s.find(','); if (c == std::string::npos || s.find(',', c + 1) != std::string::npos) return false;
        std::string n = Normalize(s, true);
        return IsNumber(n) && s.find('.') == std::string::npos;
    }
    static bool LooksLikeDotNumber(const std::string& s) {
        return s.find('.') != std::string::npos && IsNumber(Normalize(s, false));
    }
    static bool DetectHeader(const std::vector<std::vector<std::string>>& all) {
        if (all.size() < 2) return true;
        auto numeric = [](const std::string& v) {
            std::string a = Normalize(v, v.find(',') != std::string::npos && v.find('.') == std::string::npos);
            return IsNumber(a);
        };
        bool firstAllText = true;
        for (auto& c : all[0]) if (!c.empty() && numeric(c)) firstAllText = false;
        if (!firstAllText) return false;
        for (size_t c = 0; c < all[1].size(); ++c) if (!all[1][c].empty() && numeric(all[1][c])) return true;
        return true;   // première ligne textuelle : en-tête par défaut
    }
};

} // namespace cl
