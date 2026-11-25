#pragma once
// Export de fiche de révision : Markdown + HTML A4 autonome (whiteboard en SVG vectoriel, imprimable en PDF).
#include "Math.hpp"
#include "Model.hpp"
#include "Spreadsheet.hpp"
#include <algorithm>
#include <cstdio>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>

namespace cl {

class Report {
public:
    static std::string Esc(const std::string& s) {
        std::string o; for (char c : s) switch (c) { case '&': o += "&amp;"; break; case '<': o += "&lt;"; break; case '>': o += "&gt;"; break; case '"': o += "&quot;"; break; default: o += c; } return o;
    }

    static bool ExportMarkdown(const std::filesystem::path& p, const ProjectState& s, std::string& err) {
        std::ofstream o(p, std::ios::binary);
        if (!o) { err = "Impossible d'écrire " + p.string(); return false; }
        Spreadsheet sh; sh.Restore(s.cells);
        o << "# Fiche de révision - " << s.title << "\n\n_Généré le " << Now() << "_\n\n## 1. Notes de cours\n\n"
          << (s.notes.empty() ? "_Aucune note._" : s.notes) << "\n\n## 2. Feuille de calcul\n\n";
        int mr, mc; Bounds(s, mr, mc);
        if (mr < 0) o << "_Tableur vide._\n";
        else {
            o << "| # |"; for (int c = 0; c <= mc; ++c) o << " " << Spreadsheet::ColName(c) << " |";
            o << "\n|---|"; for (int c = 0; c <= mc; ++c) o << "---|"; o << "\n";
            for (int r = 0; r <= mr; ++r) { o << "| " << r + 1 << " |"; for (int c = 0; c <= mc; ++c) o << " " << MdCell(sh.Get(r, c).display) << " |"; o << "\n"; }
        }
        if (!s.nodes.empty()) {
            o << "\n## 3. Schéma conceptuel\n\n";
            for (auto& n : s.nodes) o << "- **[" << n.id << "] " << n.title << "** : " << n.subtitle << "\n";
            for (auto& e : s.edges) o << "- Bloc " << e.from << " -(" << e.label << ")-> Bloc " << e.to << "\n";
        }
        if (!s.sql.empty()) o << "\n## 4. SQL\n\n```sql\n" << s.sql << "\n```\n";
        if (!s.python.empty()) o << "\n## 5. Python\n\n```python\n" << s.python << "\n```\n";
        return true;
    }

    static bool ExportHtml(const std::filesystem::path& p, const ProjectState& s, std::string& err) {
        std::ofstream o(p, std::ios::binary);
        if (!o) { err = "Impossible d'écrire " + p.string(); return false; }
        Spreadsheet sh; sh.Restore(s.cells);
        o << "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><title>" << Esc(s.title) << "</title><style>"
             "@page{size:A4;margin:15mm}body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1d1d1f;line-height:1.55;max-width:210mm;margin:0 auto;padding:16mm}"
             "h1{font-size:20pt;margin:0}h2{font-size:13pt;border-left:4px solid #007aff;padding-left:10px;margin:22px 0 10px}"
             "pre{background:#f5f5f7;border:1px solid #d2d2d7;border-radius:8px;padding:10px;white-space:pre-wrap;font-size:9pt}"
             "table{border-collapse:collapse;width:100%;font-size:9pt}th,td{border:1px solid #d2d2d7;padding:5px 8px;text-align:left}th{background:#f5f5f7}"
             "svg{max-width:100%;height:auto}svg.wb{width:100%;border:1px solid #d2d2d7;border-radius:10px;background:#fafafc}.eq{text-align:center;margin:8px 0;background:#f5f5f7;border:1px solid #e5e5ea;border-radius:8px;padding:6px;overflow-x:auto}blockquote{margin:8px 0;padding:6px 12px;background:#f0f7ff;border-left:3px solid #007aff;border-radius:0 6px 6px 0}"
             "@media print{.np{display:none}h2,table,pre,svg{break-inside:avoid}}</style></head><body>"
             "<p class=\"np\"><button onclick=\"window.print()\">Imprimer / Enregistrer en PDF</button></p>"
             "<h1>" << Esc(s.title) << "</h1><p style=\"color:#6e6e73\">" << Esc(s.courseCode) << " - " << Now() << "</p>"
             "<h2>1. Notes de cours</h2>" << NotesHtml(s.notes);
        std::string svg = Svg(s);
        if (!svg.empty()) o << "<h2>2. Whiteboard et schémas</h2>" << svg;
        int mr, mc; Bounds(s, mr, mc);
        if (mr >= 0) {
            o << "<h2>3. Feuille de calcul</h2><table><tr><th>#</th>";
            for (int c = 0; c <= mc; ++c) o << "<th>" << Spreadsheet::ColName(c) << "</th>";
            o << "</tr>";
            for (int r = 0; r <= mr; ++r) { o << "<tr><th>" << r + 1 << "</th>"; for (int c = 0; c <= mc; ++c) o << "<td>" << Esc(sh.Get(r, c).display) << "</td>"; o << "</tr>"; }
            o << "</table>";
        }
        if (!s.sql.empty()) o << "<h2>4. SQL</h2><pre>" << Esc(s.sql) << "</pre>";
        if (!s.python.empty()) o << "<h2>5. Python</h2><pre>" << Esc(s.python) << "</pre>";
        o << "</body></html>\n";
        return true;
    }

    // Markdown léger -> HTML, formules $…$ et $$…$$ rendues en SVG vectoriel.
    static std::string NotesHtml(const std::string& md) {
        std::ostringstream o; std::istringstream in(md); std::string line; bool list = false, disp = false; std::string eq;
        auto inl = [&](const std::string& t) {
            std::string out; size_t i = 0;
            while (i < t.size()) {
                if (t[i] == '$') { size_t e = t.find('$', i + 1); if (e != std::string::npos && e > i + 1) { out += "<span style=\"display:inline-block;vertical-align:middle\">" + math::ToSvg(t.substr(i + 1, e - i - 1), 15) + "</span>"; i = e + 1; continue; } }
                if (t.compare(i, 2, "**") == 0) { size_t e = t.find("**", i + 2); if (e != std::string::npos) { out += "<strong>" + Esc(t.substr(i + 2, e - i - 2)) + "</strong>"; i = e + 2; continue; } }
                out += Esc(std::string(1, t[i])); ++i;
            }
            return out;
        };
        auto closeList = [&] { if (list) { o << "</ul>"; list = false; } };
        while (std::getline(in, line)) {
            while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) line.pop_back();
            if (disp) { size_t c = line.find("$$"); if (c != std::string::npos) { eq += " " + line.substr(0, c); disp = false; o << "<div class=\"eq\">" << math::ToSvg(eq, 19) << "</div>"; } else eq += " " + line; continue; }
            if (line.rfind("$$", 0) == 0) { closeList(); size_t c = line.find("$$", 2); if (c != std::string::npos) o << "<div class=\"eq\">" << math::ToSvg(line.substr(2, c - 2), 19) << "</div>"; else { disp = true; eq = line.substr(2); } continue; }
            if (line.rfind("- ", 0) == 0) { if (!list) { o << "<ul>"; list = true; } o << "<li>" << inl(line.substr(2)) << "</li>"; continue; }
            closeList();
            if (line.empty()) continue;
            if (line.rfind("### ", 0) == 0) o << "<h4>" << inl(line.substr(4)) << "</h4>";
            else if (line.rfind("## ", 0) == 0) o << "<h3>" << inl(line.substr(3)) << "</h3>";
            else if (line.rfind("# ", 0) == 0) o << "<h3>" << inl(line.substr(2)) << "</h3>";
            else if (line.rfind("> ", 0) == 0) o << "<blockquote>" << inl(line.substr(2)) << "</blockquote>";
            else o << "<p>" << inl(line) << "</p>";
        }
        closeList();
        return o.str();
    }

private:
    static std::string Now() { char b[32]; std::time_t t = std::time(nullptr); std::tm tm{};
#if defined(_WIN32)
        localtime_s(&tm, &t);
#else
        localtime_r(&t, &tm);
#endif
        std::strftime(b, sizeof b, "%d/%m/%Y %H:%M", &tm); return b; }
    static std::string MdCell(std::string v) { for (auto& c : v) if (c == '|') c = '/'; return v; }
    static void Bounds(const ProjectState& s, int& mr, int& mc) { mr = mc = -1; for (auto& c : s.cells) { mr = std::max(mr, c.row); mc = std::max(mc, c.col); } }
    static std::string Hex(float r, float g, float b) { char buf[8]; std::snprintf(buf, sizeof buf, "#%02x%02x%02x", std::clamp(int(r * 255 + .5f), 0, 255), std::clamp(int(g * 255 + .5f), 0, 255), std::clamp(int(b * 255 + .5f), 0, 255)); return buf; }

    // Catmull-Rom -> Bézier cubique : C1 = P1 + (P2-P0)/6, C2 = P2 - (P3-P1)/6
    static std::string Svg(const ProjectState& s) {
        double x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; bool any = false;
        auto grow = [&](double a, double b, double c, double d) { x0 = std::min(x0, a); y0 = std::min(y0, b); x1 = std::max(x1, c); y1 = std::max(y1, d); any = true; };
        auto vis = [&](int l) { return l < 0 || l >= (int)s.layers.size() || s.layers[l].visible; };
        for (auto& k : s.strokes) if (vis(k.layer)) for (auto& pt : k.pts) grow(pt.x - k.width, pt.y - k.width, pt.x + k.width, pt.y + k.width);
        for (auto& n : s.nodes) grow(n.x, n.y, n.x + n.w, n.y + n.h);
        auto eqBox = [&](const Equation& q) { math::Layout L; return L.Make(math::Parser::Parse(q.latex), 20); };
        for (auto& q : s.equations) { auto b = eqBox(q); grow(q.x, q.y, q.x + b.w + 16, q.y + b.H() + 12); }
        if (!any) return "";
        x0 -= 30; y0 -= 30; x1 += 30; y1 += 30;
        std::ostringstream o; o.precision(2); o << std::fixed;
        o << "<svg class=\"wb\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"" << x0 << " " << y0 << " " << std::max(200.0, x1 - x0) << " " << std::max(140.0, y1 - y0) << "\">"
          << "<defs><marker id=\"ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"8.5\" refY=\"4\" orient=\"auto\"><path d=\"M0 .8L8.5 4 0 7.2z\" fill=\"#636878\"/></marker></defs>";
        for (auto& k : s.strokes) {
            if (!vis(k.layer) || k.pts.empty()) continue;
            float lo = k.layer >= 0 && k.layer < (int)s.layers.size() ? s.layers[k.layer].opacity : 1.0f;
            if (k.pts.size() == 1) { o << "<circle cx=\"" << k.pts[0].x << "\" cy=\"" << k.pts[0].y << "\" r=\"" << std::max(1.2f, k.width / 2) << "\" fill=\"" << Hex(k.r, k.g, k.b) << "\"/>"; continue; }
            o << "<path fill=\"none\" stroke=\"" << Hex(k.r, k.g, k.b) << "\" stroke-opacity=\"" << std::clamp(k.a * lo, 0.05f, 1.0f) << "\" stroke-width=\"" << k.width
              << "\" stroke-linecap=\"" << (k.highlighter ? "butt" : "round") << "\" stroke-linejoin=\"round\"" << (k.highlighter ? " style=\"mix-blend-mode:multiply\"" : "") << " d=\"M " << k.pts[0].x << " " << k.pts[0].y;
            for (size_t i = 0; i + 1 < k.pts.size(); ++i) {
                auto& p0 = k.pts[i ? i - 1 : 0]; auto& p1 = k.pts[i]; auto& p2 = k.pts[i + 1]; auto& p3 = k.pts[i + 2 < k.pts.size() ? i + 2 : i + 1];
                o << " C " << p1.x + (p2.x - p0.x) / 6 << " " << p1.y + (p2.y - p0.y) / 6 << ", " << p2.x - (p3.x - p1.x) / 6 << " " << p2.y - (p3.y - p1.y) / 6 << ", " << p2.x << " " << p2.y;
            }
            o << "\"/>";
        }
        auto find = [&](int id) -> const Node* { for (auto& n : s.nodes) if (n.id == id) return &n; return nullptr; };
        for (auto& e : s.edges) {
            auto *a = find(e.from), *b = find(e.to); if (!a || !b) continue;
            double ax = a->x + a->w, ay = a->y + a->h / 2, bx = b->x, by = b->y + b->h / 2;
            o << "<path d=\"M " << ax << " " << ay << " C " << ax + 50 << " " << ay << ", " << bx - 50 << " " << by << ", " << bx << " " << by << "\" fill=\"none\" stroke=\"#636878\" stroke-width=\"1.8\" marker-end=\"url(#ah)\"/>";
            if (!e.label.empty()) o << "<text x=\"" << (ax + bx) / 2 << "\" y=\"" << (ay + by) / 2 - 6 << "\" font-size=\"10\" text-anchor=\"middle\" fill=\"#3a3d46\">" << Esc(e.label) << "</text>";
        }
        for (auto& n : s.nodes) {
            std::string c = Hex(n.r, n.g, n.b);
            o << "<rect x=\"" << n.x << "\" y=\"" << n.y << "\" width=\"" << n.w << "\" height=\"" << n.h << "\" rx=\"8\" fill=\"#fff\" stroke=\"" << c << "\" stroke-width=\"1.6\"/>"
              << "<text x=\"" << n.x + 10 << "\" y=\"" << n.y + 24 << "\" font-size=\"12\" font-weight=\"700\" fill=\"#1d1d1f\">" << Esc(n.title) << "</text>"
              << "<text x=\"" << n.x + 10 << "\" y=\"" << n.y + 46 << "\" font-size=\"10.5\" fill=\"#6e6e73\">" << Esc(n.subtitle) << "</text>";
        }
        for (auto& q : s.equations) {
            auto b = eqBox(q); std::string c = Hex(q.r, q.g, q.b);
            if (q.card) o << "<rect x=\"" << q.x << "\" y=\"" << q.y << "\" width=\"" << b.w + 16 << "\" height=\"" << b.H() + 12 << "\" rx=\"7\" fill=\"#fff\" fill-opacity=\"0.94\" stroke=\"" << c << "\" stroke-width=\"1.3\"/>";
            o << "<g transform=\"translate(" << q.x + 2 << "," << q.y + 2 << ")\">" << math::ToSvg(q.latex, 20, "#181a20", true) << "</g>";
        }
        o << "</svg>";
        return o.str();
    }
};

} // namespace cl
