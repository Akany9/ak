#pragma once
#include "Database.hpp"
#include "Model.hpp"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

namespace cl {

// Tableur A1:Z200 : évaluateur récursif + détection de cycles (DFS tricolore).
class Spreadsheet {
public:
    static constexpr int kRows = 200;
    static constexpr int kCols = 26;

    struct Cell {
        std::string raw;
        std::string display;
        double value = 0.0;
        bool isNumber = false;
        bool isError = false;
        unsigned char state = 0;   // 0 = à calculer, 1 = en cours, 2 = fait
    };

    Spreadsheet() : grid_(kRows, std::vector<Cell>(kCols)) {}

    static std::string ColName(int c) { return std::string(1, char('A' + c)); }
    static std::string RefName(int r, int c) { return ColName(c) + std::to_string(r + 1); }

    void SetCell(int r, int c, const std::string& raw) { SetRaw(r, c, raw); Recalculate(); }
    void SetRaw(int r, int c, const std::string& raw) { if (In(r, c)) grid_[r][c].raw = raw; }
    const Cell& Get(int r, int c) const { return grid_[r][c]; }

    void Clear() { for (auto& row : grid_) for (auto& c : row) c = Cell{}; }

    void Recalculate() {
        for (auto& row : grid_) for (auto& c : row) { c.state = 0; c.isError = false; }
        for (int r = 0; r < kRows; ++r) for (int c = 0; c < kCols; ++c) EvalSafe(r, c);
    }

    std::vector<SparseCell> Export() const {
        std::vector<SparseCell> out;
        for (int r = 0; r < kRows; ++r)
            for (int c = 0; c < kCols; ++c)
                if (!grid_[r][c].raw.empty()) out.push_back({r, c, grid_[r][c].raw});
        return out;
    }

    void Restore(const std::vector<SparseCell>& cells) {
        Clear();
        for (auto& s : cells) SetRaw(s.row, s.col, s.raw);
        Recalculate();
    }

    void ImportSql(const SqlResult& res) {
        if (!res.success || res.columns.empty()) return;
        Clear();
        int nc = std::min<int>(kCols, (int)res.columns.size());
        for (int c = 0; c < nc; ++c) SetRaw(0, c, res.columns[c]);
        int nr = std::min<int>(kRows - 1, (int)res.rows.size());
        for (int r = 0; r < nr; ++r)
            for (int c = 0; c < nc; ++c) SetRaw(r + 1, c, res.rows[r][c]);
        Recalculate();
    }

    // Colonne numérique (valeurs calculées) pour les graphiques.
    std::vector<double> NumericColumn(int col, int r0 = 1, int r1 = kRows - 1) const {
        std::vector<double> v;
        if (col < 0 || col >= kCols) return v;
        for (int r = std::max(0, r0); r <= std::min(kRows - 1, r1); ++r)
            if (grid_[r][col].isNumber && !grid_[r][col].isError) v.push_back(grid_[r][col].value);
        return v;
    }

    // Jeu de démonstration (BFR, Black-Scholes).
    void SeedDemo() {
        Clear();
        auto s = [&](int r, int c, const char* v) { SetRaw(r, c, v); };
        s(0,0,"Poste Bilan"); s(0,1,"2024 (EUR)"); s(0,2,"2025 (EUR)"); s(0,3,"Variation");
        s(1,0,"Stocks");           s(1,1,"890000"); s(1,2,"1150000"); s(1,3,"=C2-B2");
        s(2,0,"Creances Clients"); s(2,1,"740000"); s(2,2,"960000");  s(2,3,"=C3-B3");
        s(3,0,"Dettes Fourn.");    s(3,1,"410000"); s(3,2,"430000");  s(3,3,"=C4-B4");
        s(4,0,"BFR Exploitation"); s(4,1,"=B2+B3-B4"); s(4,2,"=C2+C3-C4"); s(4,3,"=C5-B5");
        s(6,0,"Call BS (S=K=100)"); s(6,1,"=BSCALL(100,100,1,0.05,0.2)");
        s(7,0,"Moyenne stocks");    s(7,1,"=AVERAGE(B2:C2)");
        Recalculate();
    }

private:
    std::vector<std::vector<Cell>> grid_;
    static bool In(int r, int c) { return r >= 0 && r < kRows && c >= 0 && c < kCols; }

    struct EvalError { const char* code; };

    // ---- affichage ----
    static std::string Fmt(double v) {
        char b[64];
        if (std::fabs(v - std::round(v)) < 1e-9 && std::fabs(v) < 1e15) std::snprintf(b, sizeof b, "%.0f", v);
        else if (std::fabs(v) >= 1e10 || (std::fabs(v) < 1e-4 && v != 0)) std::snprintf(b, sizeof b, "%.4g", v);
        else {
            std::snprintf(b, sizeof b, "%.4f", v);
            std::string s = b;
            while (!s.empty() && s.back() == '0') s.pop_back();
            if (!s.empty() && s.back() == '.') s.pop_back();
            return s;
        }
        return b;
    }

    static bool ParseNumber(const std::string& s, double& out) {
        if (s.empty()) return false;
        char* e = nullptr;
        out = std::strtod(s.c_str(), &e);
        while (*e == ' ') ++e;
        return e != s.c_str() && *e == '\0' && std::isfinite(out);
    }

    // ---- évaluation d'une cellule ----
    double Eval(int r, int c) {
        Cell& cell = grid_[r][c];
        if (cell.state == 2) { if (cell.isError) throw EvalError{"#ERR!"}; return cell.value; }
        if (cell.state == 1) { cell.isError = true; cell.display = "#CYCLE!"; throw EvalError{"#CYCLE!"}; }
        cell.state = 1;
        try {
            if (cell.raw.empty()) { cell.value = 0; cell.display.clear(); cell.isNumber = false; }
            else if (cell.raw[0] != '=') {
                double v;
                if (ParseNumber(cell.raw, v)) { cell.value = v; cell.isNumber = true; cell.display = Fmt(v); }
                else { cell.value = 0; cell.isNumber = false; cell.display = cell.raw; }
            } else {
                Parser p{*this, cell.raw.substr(1)};
                double v = p.Run();
                cell.value = v; cell.isNumber = true; cell.display = Fmt(v);
            }
            cell.isError = false;
        } catch (const EvalError& e) {
            cell.isError = true; cell.isNumber = false; cell.value = 0; cell.display = e.code;
            cell.state = 2;
            throw;
        }
        cell.state = 2;
        return cell.value;
    }

    // Variante sûre pour la boucle globale.
    void EvalSafe(int r, int c) { try { Eval(r, c); } catch (const EvalError&) {} }

    struct Parser {
        Spreadsheet& sh;
        std::string s;
        size_t p = 0;
        Parser(Spreadsheet& sh_, std::string expr) : sh(sh_) {
            for (char ch : expr) if (!std::isspace((unsigned char)ch)) s += (char)std::toupper((unsigned char)ch);
        }
        double Run() {
            double v = Expr();
            if (p != s.size()) throw EvalError{"#ERR!"};
            if (!std::isfinite(v)) throw EvalError{"#NUM!"};
            return v;
        }
        bool Peek(char c) const { return p < s.size() && s[p] == c; }
        double Expr() {
            double v = Term();
            while (Peek('+') || Peek('-')) { char o = s[p++]; double r = Term(); v = o == '+' ? v + r : v - r; }
            return v;
        }
        double Term() {
            double v = Unary();
            while (Peek('*') || Peek('/')) {
                char o = s[p++]; double r = Unary();
                if (o == '*') v *= r; else { if (std::fabs(r) < 1e-300) throw EvalError{"#DIV/0!"}; v /= r; }
            }
            return v;
        }
        double Unary() {
            if (Peek('-')) { ++p; return -Unary(); }
            if (Peek('+')) { ++p; return Unary(); }
            double b = Primary();
            if (Peek('^')) { ++p; return std::pow(b, Unary()); }
            return b;
        }
        bool TryCellRef(size_t& q, int& r, int& c) const {
            size_t i = q;
            if (i >= s.size() || !std::isalpha((unsigned char)s[i])) return false;
            int col = s[i] - 'A'; ++i;
            size_t d = i;
            while (i < s.size() && std::isdigit((unsigned char)s[i])) ++i;
            if (i == d) return false;
            if (i < s.size() && std::isalpha((unsigned char)s[i])) return false;
            r = std::atoi(s.substr(d, i - d).c_str()) - 1; c = col; q = i;
            return true;
        }
        double Primary() {
            if (p >= s.size()) throw EvalError{"#ERR!"};
            if (s[p] == '(') { ++p; double v = Expr(); if (!Peek(')')) throw EvalError{"#ERR!"}; ++p; return v; }
            if (std::isdigit((unsigned char)s[p]) || s[p] == '.') {
                size_t st = p; while (p < s.size() && (std::isdigit((unsigned char)s[p]) || s[p] == '.')) ++p;
                if (p < s.size() && s[p] == 'E' && p + 1 < s.size() && (std::isdigit((unsigned char)s[p+1]) || s[p+1]=='-' || s[p+1]=='+')) {
                    p += 2; while (p < s.size() && std::isdigit((unsigned char)s[p])) ++p;
                }
                double v; if (!ParseNumber(s.substr(st, p - st), v)) throw EvalError{"#ERR!"};
                return v;
            }
            if (std::isalpha((unsigned char)s[p])) {
                size_t q = p; while (q < s.size() && std::isalpha((unsigned char)s[q])) ++q;
                if (q < s.size() && s[q] == '(') {            // fonction
                    std::string fn = s.substr(p, q - p); p = q + 1;
                    return Call(fn);
                }
                int r, c; size_t q2 = p;
                if (TryCellRef(q2, r, c)) {
                    if (!In(r, c)) throw EvalError{"#REF!"};
                    p = q2; return sh.Eval(r, c);
                }
            }
            throw EvalError{"#ERR!"};
        }
        void Args(std::vector<double>& out) {
            if (Peek(')')) { ++p; return; }
            for (;;) {
                size_t q = p; int r1, c1, r2, c2;
                if (TryCellRef(q, r1, c1) && q < s.size() && s[q] == ':') {
                    size_t q2 = q + 1;
                    if (!TryCellRef(q2, r2, c2)) throw EvalError{"#ERR!"};
                    p = q2;
                    if (!In(r1, c1) || !In(r2, c2)) throw EvalError{"#REF!"};
                    for (int r = std::min(r1, r2); r <= std::max(r1, r2); ++r)
                        for (int c = std::min(c1, c2); c <= std::max(c1, c2); ++c) {
                            const Cell& cc = sh.grid_[r][c];
                            if (cc.raw.empty()) continue;
                            double v = sh.Eval(r, c);
                            if (sh.grid_[r][c].isNumber) out.push_back(v);   // texte ignoré
                        }
                } else out.push_back(Expr());
                if (Peek(',') || Peek(';')) { ++p; continue; }
                if (Peek(')')) { ++p; return; }
                throw EvalError{"#ERR!"};
            }
        }
        static double NormCdf(double x) { return 0.5 * (1.0 + std::erf(x / std::sqrt(2.0))); }
        double Call(const std::string& fn) {
            std::vector<double> a; Args(a);
            auto need = [&](size_t n) { if (a.size() != n) throw EvalError{"#ERR!"}; };
            auto some = [&]() { if (a.empty()) throw EvalError{"#DIV/0!"}; };
            if (fn == "SUM") { double t = 0; for (double v : a) t += v; return t; }
            if (fn == "AVERAGE" || fn == "AVG") { some(); double t = 0; for (double v : a) t += v; return t / a.size(); }
            if (fn == "MIN") { some(); return *std::min_element(a.begin(), a.end()); }
            if (fn == "MAX") { some(); return *std::max_element(a.begin(), a.end()); }
            if (fn == "COUNT") return (double)a.size();
            if (fn == "STDEV") {
                if (a.size() < 2) throw EvalError{"#DIV/0!"};
                double m = 0; for (double v : a) m += v; m /= a.size();
                double q = 0; for (double v : a) q += (v - m) * (v - m);
                return std::sqrt(q / (a.size() - 1));
            }
            if (fn == "ABS")  { need(1); return std::fabs(a[0]); }
            if (fn == "SQRT") { need(1); if (a[0] < 0) throw EvalError{"#NUM!"}; return std::sqrt(a[0]); }
            if (fn == "LN")   { need(1); if (a[0] <= 0) throw EvalError{"#NUM!"}; return std::log(a[0]); }
            if (fn == "EXP")  { need(1); return std::exp(a[0]); }
            if (fn == "NPV") {                       // NPV(taux; flux1; flux2; ...)
                if (a.size() < 2) throw EvalError{"#ERR!"};
                double t = 0;
                for (size_t i = 1; i < a.size(); ++i) t += a[i] / std::pow(1.0 + a[0], (double)i);
                return t;
            }
            if (fn == "BSCALL") {                    // BSCALL(S;K;T;r;sigma)
                need(5);
                double S = a[0], K = a[1], T = a[2], r = a[3], sg = a[4];
                if (S <= 0 || K <= 0 || T <= 0 || sg <= 0) throw EvalError{"#NUM!"};
                double d1 = (std::log(S / K) + (r + 0.5 * sg * sg) * T) / (sg * std::sqrt(T));
                double d2 = d1 - sg * std::sqrt(T);
                return S * NormCdf(d1) - K * std::exp(-r * T) * NormCdf(d2);
            }
            throw EvalError{"#NAME?"};
        }
    };
};

// Boucle globale tolérante aux erreurs (définie hors-classe pour accéder à EvalSafe).
} // namespace cl
