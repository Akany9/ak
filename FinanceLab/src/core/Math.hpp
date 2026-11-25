#pragma once
// Typographie mathématique LaTeX (sous-ensemble) : analyse -> mise en page en boîtes -> primitives
// dessinables (ImGui ou SVG). Aucune dépendance graphique : les métriques de texte sont injectées.
#include <algorithm>
#include <cmath>
#include <functional>
#include <map>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

namespace cl::math {

// ------------------------------------------------------------------ arbre syntaxique
struct Node;
using NodeP = std::shared_ptr<Node>;
enum class K { Row, Sym, Func, Frac, Binom, Sqrt, Script, BigOp, Accent, Delim, Text, Space };
struct Node {
    K k = K::Row;
    std::string s, s2;                 // symbole / nom ; délimiteur droit
    bool italic = false;               // lettre-variable (italique)
    bool op = false;                   // opérateur binaire / relation (espacé)
    double space = 0;                  // K::Space (en em)
    std::vector<NodeP> c;              // enfants (selon K)
};

class Parser {
public:
    static NodeP Parse(const std::string& src) { Parser p(src); NodeP r = p.Row(false); return r; }
private:
    std::string t; size_t i = 0;
    explicit Parser(const std::string& s) : t(s) {}
    bool End() const { return i >= t.size(); }

    static NodeP Make(K k, std::string s = "") { auto n = std::make_shared<Node>(); n->k = k; n->s = std::move(s); return n; }
    static std::string Utf8(unsigned cp) {
        std::string o;
        if (cp < 0x80) o += (char)cp;
        else if (cp < 0x800) { o += (char)(0xC0 | (cp >> 6)); o += (char)(0x80 | (cp & 0x3F)); }
        else { o += (char)(0xE0 | (cp >> 12)); o += (char)(0x80 | ((cp >> 6) & 0x3F)); o += (char)(0x80 | (cp & 0x3F)); }
        return o;
    }
    static const std::map<std::string, unsigned>& Greek() {
        static const std::map<std::string, unsigned> m = {
            {"alpha",0x3B1},{"beta",0x3B2},{"gamma",0x3B3},{"delta",0x3B4},{"epsilon",0x3B5},{"varepsilon",0x3B5},{"zeta",0x3B6},{"eta",0x3B7},{"theta",0x3B8},
            {"iota",0x3B9},{"kappa",0x3BA},{"lambda",0x3BB},{"mu",0x3BC},{"nu",0x3BD},{"xi",0x3BE},{"pi",0x3C0},{"rho",0x3C1},{"sigma",0x3C3},{"tau",0x3C4},
            {"upsilon",0x3C5},{"phi",0x3C6},{"varphi",0x3D5},{"chi",0x3C7},{"psi",0x3C8},{"omega",0x3C9},
            {"Gamma",0x393},{"Delta",0x394},{"Theta",0x398},{"Lambda",0x39B},{"Xi",0x39E},{"Pi",0x3A0},{"Sigma",0x3A3},{"Phi",0x3A6},{"Psi",0x3A8},{"Omega",0x3A9}};
        return m;
    }
    static const std::map<std::string, unsigned>& Symbols() {      // symboles non italiques
        static const std::map<std::string, unsigned> m = {
            {"partial",0x2202},{"infty",0x221E},{"nabla",0x2207},{"forall",0x2200},{"exists",0x2203},{"cdots",0x22EF},{"ldots",0x2026},{"dots",0x2026},
            {"cdot",0xB7},{"prime",0x2032},{"degree",0xB0},{"top",0x22A4},{"emptyset",0x2205},{"ell",0x2113},{"hbar",0x210F},{"Re",0x211C},{"Im",0x2111}};
        return m;
    }
    static const std::map<std::string, unsigned>& Ops() {          // binaires / relations
        static const std::map<std::string, unsigned> m = {
            {"times",0xD7},{"div",0xF7},{"pm",0xB1},{"mp",0x2213},{"leq",0x2264},{"le",0x2264},{"geq",0x2265},{"ge",0x2265},{"neq",0x2260},{"ne",0x2260},
            {"approx",0x2248},{"sim",0x223C},{"propto",0x221D},{"equiv",0x2261},{"to",0x2192},{"rightarrow",0x2192},{"Rightarrow",0x21D2},{"leftarrow",0x2190},
            {"Leftrightarrow",0x21D4},{"in",0x2208},{"notin",0x2209},{"subset",0x2282},{"cap",0x2229},{"cup",0x222A},{"land",0x2227},{"lor",0x2228},{"ll",0x226A},{"gg",0x226B},{"mid",0x2223},{"oplus",0x2295},{"otimes",0x2297}};
        return m;
    }
    static std::string Blackboard(char c) {
        switch (c) { case 'R': return Utf8(0x211D); case 'N': return Utf8(0x2115); case 'Z': return Utf8(0x2124); case 'Q': return Utf8(0x211A);
                     case 'C': return Utf8(0x2102); case 'P': return Utf8(0x2119); default: return std::string(1, c); }
    }

    std::string Cmd() {                       // lit \nom (lettres) ou \caractère
        ++i; size_t s = i;
        if (i < t.size() && std::isalpha((unsigned char)t[i])) { while (i < t.size() && std::isalpha((unsigned char)t[i])) ++i; return t.substr(s, i - s); }
        if (i < t.size()) { ++i; return t.substr(s, 1); }
        return "";
    }
    NodeP Group() {                           // {…} ou un seul atome
        while (i < t.size() && t[i] == ' ') ++i;
        if (i < t.size() && t[i] == '{') { ++i; auto r = Row(true); return r; }
        auto a = Atom(); auto r = Make(K::Row); if (a) r->c.push_back(a); return r;
    }
    std::string RawGroup() {                  // texte brut d'un groupe {…}
        while (i < t.size() && t[i] == ' ') ++i;
        std::string o;
        if (i < t.size() && t[i] == '{') { int d = 0; ++i; while (i < t.size()) { if (t[i] == '{') ++d; if (t[i] == '}') { if (!d) { ++i; break; } --d; } o += t[i++]; } }
        else if (i < t.size()) o += t[i++];
        return o;
    }

    NodeP Row(bool brace, bool stopRight = false) {
        auto row = Make(K::Row);
        while (!End()) {
            char ch = t[i];
            if (ch == '}') { if (brace) { ++i; } return row; }
            if (stopRight && ch == '\\' && t.compare(i, 6, "\\right") == 0) return row;
            auto a = Atom();
            if (!a) continue;
            a = Scripts(a);
            row->c.push_back(a);
        }
        return row;
    }
    NodeP Scripts(NodeP base) {
        NodeP sup, sub;
        for (;;) {
            while (i < t.size() && t[i] == ' ') ++i;
            if (i < t.size() && t[i] == '^' && !sup) { ++i; sup = Group(); }
            else if (i < t.size() && t[i] == '_' && !sub) { ++i; sub = Group(); }
            else if (i < t.size() && t[i] == '\'' ) { ++i; auto p = Make(K::Sym, Utf8(0x2032)); sup = p; }
            else break;
        }
        if (!sup && !sub) return base;
        if (base->k == K::BigOp) { base->c = {sub, sup}; return base; }
        auto n = Make(K::Script); n->c = {base, sup, sub}; return n;
    }

    NodeP Atom() {
        if (End()) return nullptr;
        char ch = t[i];
        if (ch == ' ' || ch == '\t' || ch == '\n' || ch == '&') { ++i; return nullptr; }
        if (ch == '{') { ++i; return Row(true); }
        if (ch == '\\') return Command();
        ++i;
        auto n = Make(K::Sym, std::string(1, ch));
        if (std::isalpha((unsigned char)ch)) n->italic = true;
        else if (ch == '-') { n->s = Utf8(0x2212); n->op = true; }
        else if (ch == '+' || ch == '=' || ch == '<' || ch == '>') n->op = true;
        else if (ch == '*') { n->s = Utf8(0x2217); n->op = true; }
        else if ((unsigned char)ch >= 0x80) {        // UTF-8 saisi directement
            size_t len = ((unsigned char)ch >= 0xF0) ? 4 : ((unsigned char)ch >= 0xE0) ? 3 : 2;
            n->s = t.substr(i - 1, len); i += len - 1;
        }
        return n;
    }

    NodeP Command() {
        std::string c = Cmd();
        if (c == "frac" || c == "dfrac" || c == "tfrac") { auto n = Make(K::Frac); auto a = Group(); auto b = Group(); n->c = {a, b}; return n; }
        if (c == "binom") { auto n = Make(K::Binom); auto a = Group(); auto b = Group(); n->c = {a, b}; return n; }
        if (c == "sqrt") {
            auto n = Make(K::Sqrt); NodeP idx;
            if (i < t.size() && t[i] == '[') { ++i; size_t e = t.find(']', i); if (e == std::string::npos) e = t.size(); idx = Parser::Parse(t.substr(i, e - i)); i = std::min(t.size(), e + 1); }
            n->c = {Group(), idx}; return n;
        }
        if (c == "sum" || c == "prod" || c == "int" || c == "oint" || c == "lim" || c == "max" || c == "min" || c == "sup" || c == "inf") {
            if (c == "lim" || c == "max" || c == "min" || c == "sup" || c == "inf") { auto n = Make(K::BigOp, c); n->s2 = "name"; n->c = {nullptr, nullptr}; return n; }
            auto n = Make(K::BigOp, c == "sum" ? Utf8(0x2211) : c == "prod" ? Utf8(0x220F) : c == "int" ? Utf8(0x222B) : Utf8(0x222E)); n->s2 = c; n->c = {nullptr, nullptr}; return n;
        }
        if (c == "hat" || c == "bar" || c == "overline" || c == "tilde" || c == "vec" || c == "dot" || c == "widehat") { auto n = Make(K::Accent, c); n->c = {Group()}; return n; }
        if (c == "text" || c == "mathrm" || c == "textbf" || c == "operatorname" || c == "mbox") { auto n = Make(K::Text, RawGroup()); return n; }
        if (c == "mathbb") { std::string r = RawGroup(); auto n = Make(K::Sym, r.size() == 1 ? Blackboard(r[0]) : r); return n; }
        if (c == "mathbf" || c == "boldsymbol" || c == "mathcal" || c == "mathit") return Group();
        if (c == "left") {
            auto n = Make(K::Delim); std::string l = Delim(); n->s = l;
            n->c = {Row(false, true)};
            if (t.compare(i, 6, "\\right") == 0) { i += 6; n->s2 = Delim(); }
            return n;
        }
        if (c == "right") { return nullptr; }
        if (c == "," ) { auto n = Make(K::Space); n->space = 0.17; return n; }
        if (c == ";" || c == " ") { auto n = Make(K::Space); n->space = 0.28; return n; }
        if (c == ":") { auto n = Make(K::Space); n->space = 0.22; return n; }
        if (c == "!") { auto n = Make(K::Space); n->space = -0.1; return n; }
        if (c == "quad") { auto n = Make(K::Space); n->space = 1.0; return n; }
        if (c == "qquad") { auto n = Make(K::Space); n->space = 2.0; return n; }
        if (c == "\\" || c == "limits" || c == "nolimits" || c == "displaystyle" || c == "textstyle") return nullptr;
        if (c == "{" || c == "}" || c == "%" || c == "$" || c == "#" || c == "_" || c == "&") return Make(K::Sym, c);
        static const char* funcs[] = {"ln","log","exp","sin","cos","tan","Pr","det","arg","cov","var","deg","gcd","sinh","cosh","tanh","arcsin","arccos","arctan","corr","VaR","ES","NPV","CVaR"};
        for (auto f : funcs) if (c == f) { auto n = Make(K::Func, c); return n; }
        if (Greek().count(c)) { auto n = Make(K::Sym, Utf8(Greek().at(c))); n->italic = c[0] >= 'a' && c[0] <= 'z'; return n; }
        if (Symbols().count(c)) return Make(K::Sym, Utf8(Symbols().at(c)));
        if (Ops().count(c)) { auto n = Make(K::Sym, Utf8(Ops().at(c))); n->op = true; return n; }
        return Make(K::Text, "\\" + c);          // commande inconnue : affichée telle quelle
    }
    std::string Delim() {
        if (End()) return "";
        if (t[i] == '\\') { std::string c = Cmd(); if (c == "{") return "{"; if (c == "}") return "}"; if (c == "|") return "‖"; if (c == "langle") return "⟨"; if (c == "rangle") return "⟩"; return ""; }
        char c = t[i++]; return c == '.' ? "" : std::string(1, c);
    }
};

// ------------------------------------------------------------------ primitives de dessin
struct Prim {
    enum Kind { Text, Line, Poly } kind = Text;
    double x = 0, y = 0, x2 = 0, y2 = 0;     // y = ligne de base (vers le bas = positif)
    double size = 16, thick = 1;
    int style = 0;                           // 0 romain, 1 italique
    std::string s;
    std::vector<std::pair<double, double>> pts;
};
struct Box {
    double w = 0, asc = 0, desc = 0;
    std::vector<Prim> prims;
    double H() const { return asc + desc; }
};
using Measure = std::function<double(const std::string&, double size, int style)>;

inline double EstimateWidth(const std::string& s, double size, int style) {
    size_t n = 0; for (unsigned char c : s) if ((c & 0xC0) != 0x80) ++n;
    return n * size * (style ? 0.54 : 0.58);
}

class Layout {
public:
    explicit Layout(Measure m = EstimateWidth) : meas_(std::move(m)) {}
    Box Make(const NodeP& n, double size) { return Lay(n, size); }
private:
    Measure meas_;
    static void Shift(Box& b, double dx, double dy) {
        for (auto& p : b.prims) { p.x += dx; p.y += dy; p.x2 += dx; p.y2 += dy; for (auto& q : p.pts) { q.first += dx; q.second += dy; } }
    }
    static void Append(Box& dst, Box src, double dx, double dy) { Shift(src, dx, dy); for (auto& p : src.prims) dst.prims.push_back(std::move(p)); }
    Box TextBox(const std::string& s, double size, int style) {
        Box b; b.w = meas_(s, size, style); b.asc = size * 0.76; b.desc = size * 0.2;
        Prim p; p.kind = Prim::Text; p.s = s; p.size = size; p.style = style; b.prims.push_back(p);
        return b;
    }
    Box Lay(const NodeP& n, double size) {
        if (!n) return Box{};
        switch (n->k) {
            case K::Sym: {
                Box b = TextBox(n->s, size, n->italic ? 1 : 0);
                if (std::isdigit((unsigned char)n->s[0])) b.asc = size * 0.72;
                return b;
            }
            case K::Text: { return TextBox(n->s, size, 0); }
            case K::Func: { Box b = TextBox(n->s, size, 0); b.w += size * 0.12; return b; }
            case K::Space: { Box b; b.w = n->space * size; return b; }
            case K::Row: return Row(n, size);
            case K::Frac: case K::Binom: return Frac(n, size);
            case K::Sqrt: return Sqrt(n, size);
            case K::Script: return Script(n, size);
            case K::BigOp: return BigOp(n, size);
            case K::Accent: return Accent(n, size);
            case K::Delim: return Delim(n, size);
        }
        return Box{};
    }
    Box Row(const NodeP& n, double size) {
        Box out; out.asc = size * 0.5; out.desc = size * 0.12;
        double x = 0; bool prevOp = true;                         // vrai en début de ligne : « - » unaire
        for (size_t k = 0; k < n->c.size(); ++k) {
            const NodeP& ch = n->c[k];
            if (!ch) continue;
            bool isOp = ch->k == K::Sym && ch->op;
            double pad = 0;
            if (isOp && !(prevOp && (ch->s == "\xE2\x88\x92" || ch->s == "+" || ch->s == "\xC2\xB1"))) pad = size * 0.22;
            else if (isOp) isOp = false;                           // unaire : pas d'espace
            Box b = Lay(ch, size);
            x += pad;
            Append(out, b, x, 0);
            x += b.w + pad;
            out.asc = std::max(out.asc, b.asc); out.desc = std::max(out.desc, b.desc);
            prevOp = isOp || (ch->k == K::Delim && false);
            if (ch->k == K::Sym && ch->s == "(") prevOp = true;
        }
        out.w = x;
        return out;
    }
    Box Frac(const NodeP& n, double size) {
        double s = size * 0.9;
        Box a = Lay(n->c[0], s), d = Lay(n->c[1], s);
        double pad = size * (n->k == K::Binom ? 0.45 : 0.15), gap = size * 0.14, axis = size * 0.27;
        double w = std::max(a.w, d.w) + 2 * pad;
        Box out; out.w = w;
        out.asc = axis + gap + a.H(); out.desc = std::max(size * 0.2, d.H() + gap - axis);
        Append(out, a, pad + (w - 2 * pad - a.w) / 2, -(axis + gap + a.desc));
        Append(out, d, pad + (w - 2 * pad - d.w) / 2, -axis + gap + d.asc);
        if (n->k == K::Frac) { Prim l; l.kind = Prim::Line; l.x = 1; l.x2 = w - 1; l.y = l.y2 = -axis; l.thick = std::max(1.0, size * 0.055); out.prims.push_back(l); }
        else { ParenPath(out, '(', 0, -out.asc, out.H(), size * 0.3, size); ParenPath(out, ')', w - size * 0.3, -out.asc, out.H(), size * 0.3, size); }
        return out;
    }
    void ParenPath(Box& out, char c, double x, double top, double h, double w, double size) {
        Prim p; p.kind = Prim::Poly; p.thick = std::max(1.0, size * 0.06);
        auto bez = [&](double x0, double y0, double x1, double y1, double x2, double y2, double x3, double y3) {
            for (int i = 0; i <= 14; ++i) { double t = i / 14.0, u = 1 - t;
                p.pts.push_back({u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3}); } };
        double b = top + h;
        if (c == '(') bez(x + w, top, x, top + h * 0.3, x, top + h * 0.7, x + w, b);
        else if (c == ')') bez(x, top, x + w, top + h * 0.3, x + w, top + h * 0.7, x, b);
        else if (c == '[') p.pts = {{x + w, top}, {x + 1, top}, {x + 1, b}, {x + w, b}};
        else if (c == ']') p.pts = {{x, top}, {x + w - 1, top}, {x + w - 1, b}, {x, b}};
        else { p.pts = {{x + w * 0.5, top}, {x + w * 0.5, b}}; }
        out.prims.push_back(p);
    }
    Box Delim(const NodeP& n, double size) {
        Box in = Lay(n->c[0], size);
        double h = std::max(in.H() + size * 0.1, size * 1.0), w = size * 0.32;
        Box out; double top = -(in.asc + size * 0.05);
        double lw = n->s.empty() ? size * 0.05 : w, rw = n->s2.empty() ? size * 0.05 : w;
        out.w = lw + in.w + rw; out.asc = in.asc + size * 0.05; out.desc = in.desc + size * 0.05;
        auto draw = [&](const std::string& d, double x) {
            if (d.empty()) return;
            if (d == "(" || d == ")" || d == "[" || d == "]" || d == "|") ParenPath(out, d[0], x, top, h, w * 0.85, size);
            else { Prim p; p.kind = Prim::Text; p.s = d == "‖" ? "‖" : d; p.size = size * std::max(1.0, h / size * 0.9); p.x = x; p.y = top + h * 0.5 + p.size * 0.3; out.prims.push_back(p); }
        };
        draw(n->s, 1); Append(out, in, lw, 0); draw(n->s2, lw + in.w + 1);
        return out;
    }
    Box Sqrt(const NodeP& n, double size) {
        Box in = Lay(n->c[0], size);
        double hook = size * 0.6, top = -(in.asc + size * 0.16), bot = in.desc + size * 0.04;
        Box out; out.asc = in.asc + size * 0.2; out.desc = in.desc + size * 0.06;
        double idxW = 0;
        if (n->c.size() > 1 && n->c[1]) { Box ix = Lay(n->c[1], size * 0.55); idxW = ix.w; Append(out, ix, 0, -(in.asc * 0.45) ); out.asc = std::max(out.asc, in.asc * 0.45 + ix.asc); }
        double x0 = idxW;
        Prim p; p.kind = Prim::Poly; p.thick = std::max(1.0, size * 0.06);
        p.pts = {{x0 + hook * 0.05, -size * 0.12}, {x0 + hook * 0.28, -size * 0.2}, {x0 + hook * 0.5, bot}, {x0 + hook * 0.95, top}, {x0 + hook + in.w + size * 0.12, top}};
        out.prims.push_back(p);
        Append(out, in, x0 + hook + size * 0.05, 0);
        out.w = x0 + hook + in.w + size * 0.14;
        return out;
    }
    Box Script(const NodeP& n, double size) {
        Box base = Lay(n->c[0], size);
        double ss = size * 0.7;
        Box out = base; double x = base.w + size * 0.03;
        double w = 0;
        if (n->c[1]) { Box s = Lay(n->c[1], ss); double sh = std::max(base.asc * 0.62, size * 0.36); Append(out, s, x, -sh); out.asc = std::max(out.asc, sh + s.asc); w = std::max(w, s.w); }
        if (n->c[2]) { Box s = Lay(n->c[2], ss); double dr = std::max(base.desc + size * 0.1, size * 0.22); Append(out, s, x, dr); out.desc = std::max(out.desc, dr + s.desc); w = std::max(w, s.w); }
        out.w = x + w + size * 0.04;
        return out;
    }
    Box BigOp(const NodeP& n, double size) {
        bool named = n->s2 == "name";
        Box sym; double ow;
        if (named) { sym = TextBox(n->s, size, 0); ow = sym.w; }
        else {
            double os = size * (n->s2 == "int" || n->s2 == "oint" ? 1.55 : 1.35);
            sym = TextBox(n->s, os, 0); ow = sym.w; sym.asc = size * (n->s2 == "int" ? 0.95 : 0.85); sym.desc = size * (n->s2 == "int" ? 0.5 : 0.35);
            for (auto& p : sym.prims) p.y += size * 0.27;      // centrer sur l'axe mathématique
        }
        bool limits = n->s2 != "int" && n->s2 != "oint";
        double ls = size * 0.68;
        Box out; Box sub = n->c.size() > 0 && n->c[0] ? Lay(n->c[0], ls) : Box{}, sup = n->c.size() > 1 && n->c[1] ? Lay(n->c[1], ls) : Box{};
        if (limits) {
            double w = std::max({ow, sub.w, sup.w}) + size * 0.1;
            out.w = w; out.asc = sym.asc; out.desc = sym.desc;
            Append(out, sym, (w - ow) / 2, 0);
            if (sup.w > 0 || sup.asc > 0) { Append(out, sup, (w - sup.w) / 2, -(sym.asc + size * 0.06 + sup.desc)); out.asc = sym.asc + size * 0.06 + sup.H(); }
            if (sub.w > 0 || sub.asc > 0) { Append(out, sub, (w - sub.w) / 2, sym.desc + size * 0.06 + sub.asc); out.desc = sym.desc + size * 0.06 + sub.H(); }
            out.w = w + (named ? size * 0.1 : size * 0.08);
        } else {
            out = sym; out.w = ow + size * 0.05;
            double x = out.w;
            if (sup.w > 0) { Append(out, sup, x + size * 0.28, -sym.asc * 0.78); out.asc = std::max(out.asc, sym.asc * 0.78 + sup.asc); }
            if (sub.w > 0) { Append(out, sub, x - size * 0.05, sym.desc * 0.85 + sub.asc * 0.4); out.desc = std::max(out.desc, sym.desc * 0.85 + sub.H()); }
            out.w = x + std::max(sub.w, sup.w) + size * 0.2;
        }
        return out;
    }
    Box Accent(const NodeP& n, double size) {
        Box in = Lay(n->c[0], size);
        Box out = in; double top = -(in.asc + size * 0.1); double x0 = size * 0.03, x1 = in.w - size * 0.03, xm = (x0 + x1) / 2;
        Prim p; p.kind = Prim::Poly; p.thick = std::max(1.0, size * 0.055);
        if (n->s == "hat" || n->s == "widehat") p.pts = {{xm - size * 0.16, top + size * 0.1}, {xm, top - size * 0.05}, {xm + size * 0.16, top + size * 0.1}};
        else if (n->s == "bar" || n->s == "overline") p.pts = {{x0, top}, {x1, top}};
        else if (n->s == "vec") p.pts = {{x0, top}, {x1, top}, {x1 - size * 0.1, top - size * 0.07}, {x1, top}, {x1 - size * 0.1, top + size * 0.07}};
        else if (n->s == "dot") p.pts = {{xm - 0.5, top}, {xm + 0.5, top}};
        else { p.pts = {{xm - size * 0.16, top + size * 0.03}, {xm - size * 0.06, top - size * 0.05}, {xm + size * 0.06, top + size * 0.03}, {xm + size * 0.16, top - size * 0.05}}; }
        if (n->s == "dot") p.thick = size * 0.1;
        out.prims.push_back(p); out.asc = in.asc + size * 0.2;
        return out;
    }
};

// ------------------------------------------------------------------ sortie SVG
inline std::string XmlEsc(const std::string& s) {
    std::string o; for (char c : s) switch (c) { case '&': o += "&amp;"; break; case '<': o += "&lt;"; break; case '>': o += "&gt;"; break; case '"': o += "&quot;"; break; default: o += c; } return o;
}
inline std::string ToSvg(const std::string& latex, double size = 18, const std::string& color = "#1d1d1f", bool bare = false, double* wOut = nullptr, double* hOut = nullptr) {
    Layout L; Box b = L.Make(Parser::Parse(latex), size);
    double padX = 6, padY = 4, W = std::max(10.0, b.w + 2 * padX), H = std::max(10.0, b.H() + 2 * padY);
    if (wOut) *wOut = W;
    if (hOut) *hOut = H;
    std::ostringstream o; o.precision(2); o << std::fixed;
    if (!bare) o << "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" << W << "\" height=\"" << H << "\" viewBox=\"0 0 " << W << " " << H << "\" role=\"img\" aria-label=\"" << XmlEsc(latex) << "\">";
    o << "<g transform=\"translate(" << padX << "," << padY + b.asc << ")\" fill=\"" << color << "\" stroke=\"none\">";
    for (auto& p : b.prims) {
        if (p.kind == Prim::Text)
            o << "<text x=\"" << p.x << "\" y=\"" << p.y << "\" font-size=\"" << p.size << "\" font-family=\"'DejaVu Serif','STIX Two Math','Cambria Math','Times New Roman',serif\""
              << (p.style ? " font-style=\"italic\"" : "") << ">" << XmlEsc(p.s) << "</text>";
        else if (p.kind == Prim::Line)
            o << "<line x1=\"" << p.x << "\" y1=\"" << p.y << "\" x2=\"" << p.x2 << "\" y2=\"" << p.y2 << "\" stroke=\"" << color << "\" stroke-width=\"" << p.thick << "\"/>";
        else { o << "<polyline fill=\"none\" stroke=\"" << color << "\" stroke-width=\"" << p.thick << "\" stroke-linejoin=\"round\" stroke-linecap=\"round\" points=\""; for (auto& q : p.pts) o << q.first << "," << q.second << " "; o << "\"/>"; }
    }
    o << "</g>";
    if (!bare) o << "</svg>";
    return o.str();
}

} // namespace cl::math
