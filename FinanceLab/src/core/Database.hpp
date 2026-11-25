#pragma once
#include <sqlite3.h>
#include <chrono>
#include <cstdlib>
#include <string>
#include <vector>

namespace cl {

struct SqlResult {
    bool success = false;
    std::string error;
    std::vector<std::string> columns;
    std::vector<std::vector<std::string>> rows;
    int rowsAffected = 0;
    double elapsedMs = 0.0;
};

class Database {
public:
    Database() {
        if (sqlite3_open(":memory:", &db_) != SQLITE_OK) { sqlite3_close(db_); db_ = nullptr; }
        else SeedPedagogical();
    }
    ~Database() { if (db_) sqlite3_close(db_); }
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    sqlite3* Handle() { return db_; }

    SqlResult Execute(const std::string& sql) {
        using clk = std::chrono::steady_clock;
        auto t0 = clk::now();
        SqlResult res;
        if (!db_) { res.error = "Base non initialisée."; return res; }
        const char* cur = sql.c_str();
        while (cur && *cur) {
            sqlite3_stmt* st = nullptr;
            const char* tail = nullptr;
            if (sqlite3_prepare_v2(db_, cur, -1, &st, &tail) != SQLITE_OK) {
                res.error = sqlite3_errmsg(db_);
                return res;
            }
            if (!st) { cur = tail; continue; }  // espaces / commentaires seuls
            int nc = sqlite3_column_count(st);
            if (nc > 0) {
                res.columns.clear(); res.rows.clear();
                for (int i = 0; i < nc; ++i) {
                    const char* n = sqlite3_column_name(st, i);
                    res.columns.push_back(n ? n : "col");
                }
            }
            int rc;
            while ((rc = sqlite3_step(st)) == SQLITE_ROW) {
                std::vector<std::string> row;
                row.reserve(nc);
                for (int i = 0; i < nc; ++i) {
                    const unsigned char* v = sqlite3_column_text(st, i);
                    row.emplace_back(v ? reinterpret_cast<const char*>(v) : "NULL");
                }
                res.rows.push_back(std::move(row));
            }
            if (rc != SQLITE_DONE) {
                res.error = sqlite3_errmsg(db_);
                sqlite3_finalize(st);
                return res;
            }
            res.rowsAffected += sqlite3_changes(db_);
            sqlite3_finalize(st);
            cur = tail;
        }
        res.success = true;
        res.elapsedMs = std::chrono::duration<double, std::milli>(clk::now() - t0).count();
        return res;
    }

    std::vector<std::string> ListTables() {
        std::vector<std::string> out;
        auto r = Execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
        if (r.success) for (auto& row : r.rows) out.push_back(row[0]);
        return out;
    }

    bool TableExists(const std::string& name) {
        sqlite3_stmt* st = nullptr;
        bool ok = false;
        if (sqlite3_prepare_v2(db_, "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1;", -1, &st, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(st, 1, name.c_str(), -1, SQLITE_TRANSIENT);
            ok = sqlite3_step(st) == SQLITE_ROW;
        }
        sqlite3_finalize(st);
        return ok;
    }

    // Compteur de modifications (schéma + lignes) : permet de savoir quand re-sérialiser la base.
    long long Version() {
        long long v = db_ ? sqlite3_total_changes64(db_) : 0;
        auto r = Execute("PRAGMA schema_version;");
        if (r.success && !r.rows.empty()) v = v * 1000003LL + std::atoll(r.rows[0][0].c_str());
        return v;
    }

    // Script SQL reconstruisant toutes les tables (+ index et vues).
    std::string Dump() {
        std::string out;
        auto tables = Execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid;");
        if (!tables.success) return out;
        for (auto& t : tables.rows) {
            out += t[1] + ";\n";
            auto cols = Execute("PRAGMA table_info(" + QuoteIdent(t[0]) + ");");
            if (!cols.success || cols.rows.empty()) continue;
            std::string expr = "SELECT 'INSERT INTO " + QuoteIdentEsc(t[0]) + " VALUES(' || ";
            for (size_t i = 0; i < cols.rows.size(); ++i) { if (i) expr += " || ',' || "; expr += "quote(" + QuoteIdent(cols.rows[i][1]) + ")"; }
            expr += " || ');' FROM " + QuoteIdent(t[0]) + ";";
            auto rows = Execute(expr);
            if (rows.success) for (auto& r : rows.rows) out += r[0] + "\n";
        }
        auto extra = Execute("SELECT sql FROM sqlite_master WHERE type IN ('index','view','trigger') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%';");
        if (extra.success) for (auto& r : extra.rows) out += r[0] + ";\n";
        return out;
    }

    // Remplace entièrement le contenu de la base par le script donné.
    bool Restore(const std::string& script, std::string* err = nullptr) {
        if (!db_) return false;
        auto old = Execute("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'trigger' THEN 0 WHEN 'view' THEN 1 WHEN 'index' THEN 2 ELSE 3 END;");
        Execute("PRAGMA foreign_keys=OFF;");
        if (old.success) for (auto& r : old.rows) Execute("DROP " + std::string(r[0] == "table" ? "TABLE" : r[0] == "view" ? "VIEW" : r[0] == "index" ? "INDEX" : "TRIGGER") + " IF EXISTS " + QuoteIdent(r[1]) + ";");
        if (script.empty()) { Execute("PRAGMA foreign_keys=ON;"); return true; }
        Execute("BEGIN;");
        auto r = Execute(script);
        if (!r.success) { Execute("ROLLBACK;"); if (err) *err = r.error; Execute("PRAGMA foreign_keys=ON;"); return false; }
        Execute("COMMIT;");
        Execute("PRAGMA foreign_keys=ON;");
        return true;
    }

    void Reseed() { Restore(""); SeedPedagogical(); }

    static std::string QuoteIdentEsc(const std::string& s) {   // identifiant entre guillemets, échappé pour un littéral SQL
        std::string q = QuoteIdent(s), o; for (char c : q) { if (c == '\'') o += '\''; o += c; } return o;
    }

    static std::string QuoteIdent(const std::string& s) {
        std::string o = "\"";
        for (char c : s) { if (c == '"') o += '"'; o += c; }
        return o + "\"";
    }

private:
    sqlite3* db_ = nullptr;

    void SeedPedagogical() {
        Execute(R"SQL(
CREATE TABLE entreprises (id INTEGER PRIMARY KEY, nom TEXT NOT NULL, secteur TEXT NOT NULL, referentiel TEXT NOT NULL);
CREATE TABLE bilans_annuels (
  id INTEGER PRIMARY KEY, entreprise_id INTEGER NOT NULL, exercice INTEGER NOT NULL,
  chiffre_affaires REAL, ebe REAL, stocks REAL, creances_clients REAL, dettes_fournisseurs REAL,
  capitaux_propres REAL, dettes_financieres REAL, tresorerie_active REAL, tresorerie_passive REAL,
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id));
CREATE TABLE rendements_marche (date_obs TEXT PRIMARY KEY, indice TEXT, cours_cloture REAL, rendement_log REAL, volatilite_30j REAL);
INSERT INTO entreprises VALUES (1,'Sahel Agro-Industrie','Agroalimentaire','SYSCOHADA'),(2,'Nordic ElectroTech','Industrie','IFRS'),(3,'Atlas Logistique','Transport','SYSCOHADA');
INSERT INTO bilans_annuels VALUES
 (1,1,2024,4200000,610000,890000,740000,410000,1450000,920000,180000,310000),
 (2,1,2025,4650000,680000,1150000,960000,430000,1520000,1100000,95000,520000),
 (3,2,2025,12800000,2150000,1400000,1850000,1620000,5400000,2100000,1340000,0),
 (4,3,2025,3100000,290000,120000,880000,390000,410000,1650000,45000,490000);
INSERT INTO rendements_marche VALUES
 ('2026-01-02','MSCI_WORLD_EUR',100.00,0.0,0.142),('2026-01-03','MSCI_WORLD_EUR',101.25,0.0124,0.145),
 ('2026-01-04','MSCI_WORLD_EUR',99.80,-0.0144,0.158),('2026-01-05','MSCI_WORLD_EUR',96.40,-0.0347,0.215),
 ('2026-01-06','MSCI_WORLD_EUR',98.10,0.0175,0.208);
)SQL");
    }
};

} // namespace cl
