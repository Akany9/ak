// Tests du noyau (sans interface) : cd build && ctest
#include "core/AutoSave.hpp"
#include "core/CsvImporter.hpp"
#include "core/Spreadsheet.hpp"
#include "core/ProjectFile.hpp"
#include "core/UndoJournal.hpp"
#include "core/Report.hpp"
#include "core/Math.hpp"
#include "core/Courses.hpp"
#include "core/Exercises.hpp"
#include "core/Stats.hpp"
#include <cmath>
#include <iostream>

static int fails = 0;
#define CHECK(c) do { if (!(c)) { std::cerr << "ECHEC ligne " << __LINE__ << " : " #c "\n"; ++fails; } } while (0)
using namespace cl;

int main() {
    // --- tableur
    { Spreadsheet s; s.SeedDemo();
      CHECK(s.Get(4, 1).display == "1220000");           // BFR 2024 = 890000+740000-410000
      CHECK(s.Get(4, 3).display == "460000");            // variation
      CHECK(std::fabs(s.Get(6, 1).value - 10.4506) < 1e-3);   // call BS
      s.SetCell(10, 0, "=A12"); s.SetCell(11, 0, "=A11");
      CHECK(s.Get(10, 0).display == "#CYCLE!");
      s.SetCell(12, 0, "=1/0"); CHECK(s.Get(12, 0).display == "#DIV/0!");
      s.SetCell(13, 0, "=2^3^2"); CHECK(s.Get(13, 0).display == "512");
      s.SetCell(14, 0, "=STDEV(1;2;3;4)"); CHECK(std::fabs(s.Get(14, 0).value - 1.29099) < 1e-4); }

    // --- CSV
    { std::string csv = "\xEF\xBB\xBF" "date;libell\xC3\xA9;montant;taux\n2026-01-02;\"Achat; fournisseur\";\"1 234,50\";3,5%\n2026-01-03;\"Vente \"\"A\"\"\";2000,00;4,0%\r\n";
      auto t = CsvImporter::Parse(csv);
      CHECK(t.ok()); CHECK(t.delimiter == ';'); CHECK(t.hasHeader); CHECK(t.decimalComma);
      CHECK(t.rows.size() == 2); CHECK(t.rows[0][1] == "Achat; fournisseur"); CHECK(t.rows[1][1] == "Vente \"A\"");
      CHECK(t.types[2] == ColType::Real); CHECK(t.types[0] == ColType::Text);
      Database db; auto info = CsvImporter::ToSqlite(t, db, "relev\xC3\xA9 2026");
      CHECK(info.ok()); CHECK(info.rows == 2);
      auto r = db.Execute("SELECT SUM(montant) FROM " + Database::QuoteIdent(info.table) + ";");
      CHECK(r.success && std::fabs(std::atof(r.rows[0][0].c_str()) - 3234.5) < 1e-6);
      Spreadsheet sh; CsvImporter::ToSpreadsheet(t, sh); sh.SetCell(5, 2, "=SUM(C2:C3)");
      CHECK(std::fabs(sh.Get(5, 2).value - 3234.5) < 1e-6);
      auto tsv = CsvImporter::Parse("a\tb\n1\t2\n3\t4\n"); CHECK(tsv.delimiter == '\t' && tsv.rows.size() == 2);
      auto bad = CsvImporter::Parse("a,b\n\"oops,1\n"); CHECK(!bad.ok());
      auto inj = CsvImporter::Parse("nom,val\n=cmd|' /C calc'!A0,1\n"); Spreadsheet s2; CsvImporter::ToSpreadsheet(inj, s2);
      CHECK(!s2.Get(1, 0).isNumber && s2.Get(1, 0).raw[0] == '\''); }

    // --- .financelab aller-retour
    { ProjectState p; p.title = "Test"; p.notes = "é\nnotes"; p.python = "print(1)"; p.sql = "SELECT 1;";
      p.layers = {{"L1", true, 1}, {"L2", false, 0.5f}};
      Stroke k; k.layer = 1; k.pts = {{1, 2, 0.5f}, {3, 4, 1}, {5, 6, 0.7f}}; p.strokes.push_back(k);
      p.nodes.push_back({1, 10, 20, 100, 50, "N", "sub", 1, 0, 0, 1}); p.edges.push_back({1, 1, "x"});
      p.cells = {{0, 0, "a"}, {1, 1, "=1+1"}};
      Shape sh; sh.id = 3; sh.kind = (int)ShapeKind::LowerThird; sh.text = "Titre é"; sh.sub = "Sous-titre"; sh.w = -40; sh.filled = false; p.shapes.push_back(sh);
      p.look.backdrop = 4; p.look.grade = true; p.look.preset = 2; p.look.vignette = 0.35f; p.look.exposure = -0.25f; p.look.letterbox = true;
      auto path = std::filesystem::temp_directory_path() / "cl_test.financelab";
      auto w = ProjectFile::Save(path, p); CHECK(w.ok);
      ProjectState q; auto l = ProjectFile::Load(path, q); CHECK(l.ok);
      CHECK(Fingerprint(p) == Fingerprint(q));
      CHECK(q.shapes.size() == 1 && q.shapes[0].kind == (int)ShapeKind::LowerThird && q.shapes[0].sub == "Sous-titre");
      CHECK(q.look.backdrop == 4 && q.look.grade && q.look.preset == 2 && q.look.letterbox && std::fabs(q.look.vignette - 0.35f) < 1e-6f);
      CHECK(!ProjectFile::Load("/etc/hostname", q).ok);
      std::filesystem::remove(path);

      // --- auto-sauvegarde
      AutoSave as; as.intervalSec = 10; as.keep = 2;
      auto proj = std::filesystem::temp_directory_path() / "cl_proj.financelab";
      AutoSave::DiscardAll(proj); std::filesystem::remove(proj);
      as.MarkDirty(0);
      CHECK(!as.Tick(5, proj, [&] { return p; }));
      CHECK(as.Tick(11, proj, [&] { return p; }));
      CHECK(!as.Dirty());
      as.MarkDirty(20); CHECK(as.Tick(31, proj, [&] { return p; }));
      CHECK(std::filesystem::exists(AutoSave::SlotPath(proj, 2)));
      CHECK(AutoSave::FindRecovery(proj).has_value());
      AutoSave::DiscardAll(proj); }

    // --- journal annuler / rétablir
    { ProjectState s; UndoJournal j; j.Reset(s);
      s.notes = "a"; CHECK(j.Commit("Notes", s)); CHECK(!j.Commit("Notes", s));
      s.sql = "x"; CHECK(j.Commit("SQL", s));
      CHECK(j.CanUndo() && !j.CanRedo());
      auto u = j.Undo(); CHECK(u && u->sql.empty() && u->notes == "a");
      CHECK(j.CanRedo()); auto r = j.Redo(); CHECK(r && r->sql == "x");
      j.Undo(); s.notes = "b"; j.Commit("Notes", s); CHECK(!j.CanRedo());       // purge de la pile rétablir
      s.notes = "bc"; j.Commit("Frappe", s, "k"); s.notes = "bcd"; j.Commit("Frappe", s, "k");
      size_t n = j.Entries().size(); s.notes = "bcde"; j.Commit("Frappe", s, "k"); CHECK(j.Entries().size() == n);  // coalescence
      UndoJournal small(3); small.Reset(s); for (int i = 0; i < 6; ++i) { s.notes += "x"; small.Commit("e", s); }
      CHECK(small.Entries().size() == 3); }

    // --- stats + rapport
    { std::vector<double> x, y; for (int i = 0; i < 100; ++i) { x.push_back(i * 0.01); y.push_back(0.5 + 1.25 * i * 0.01); }
      auto o = ComputeOls(x, y); CHECK(o.valid && std::fabs(o.beta - 1.25) < 1e-9 && std::fabs(o.alpha - 0.5) < 1e-9 && o.r2 > 0.999999);
      std::vector<double> r; for (int i = 1; i <= 100; ++i) r.push_back(-i / 100.0);   // -1.00 .. -0.01
      auto k = ComputeRisk(r, 0.95); CHECK(k.valid && k.var >= 0.95 && k.cvar >= k.var);
      ProjectState p; p.title = "R"; p.notes = "<b>"; p.cells = {{0, 0, "1"}, {0, 1, "=A1*2"}};
      Stroke st; st.pts = {{0, 0, 1}, {10, 5, 1}, {20, 0, 1}}; p.strokes.push_back(st); p.nodes.push_back({1, 5, 5, 100, 50, "T", "S", 0, 0, 1, 1});
      std::string err; auto d = std::filesystem::temp_directory_path();
      CHECK(Report::ExportMarkdown(d / "cl.md", p, err)); CHECK(Report::ExportHtml(d / "cl.html", p, err));
      std::ifstream f(d / "cl.html"); std::stringstream ss; ss << f.rdbuf();
      CHECK(ss.str().find("&lt;b&gt;") != std::string::npos && ss.str().find("<svg") != std::string::npos && ss.str().find("<td>2</td>") != std::string::npos); }

    // --- tables SQL enregistrées dans le projet
    { Database db; db.Execute("CREATE TABLE perso (id INTEGER PRIMARY KEY, nom TEXT, v REAL); INSERT INTO perso VALUES (1,'l''apostrophe',3.5),(2,NULL,-1e3);");
      std::string dump = db.Dump(); CHECK(dump.find("perso") != std::string::npos);
      ProjectState p; p.dbDump = dump; p.equations.push_back({1, 10, 20, "\\frac{a}{b}", 1, 0, 0, 1, true}); p.pdfPath = "/tmp/x.pdf"; p.pdfPage = 4; p.pdfOpacity = 0.5f;
      auto path = std::filesystem::temp_directory_path() / "cl_db.financelab"; CHECK(ProjectFile::Save(path, p).ok);
      ProjectState q; CHECK(ProjectFile::Load(path, q).ok); CHECK(Fingerprint(p) == Fingerprint(q) && q.pdfPage == 4 && q.equations.size() == 1);
      Database db2; CHECK(db2.Restore(q.dbDump));
      auto r = db2.Execute("SELECT nom, v FROM perso ORDER BY id;"); CHECK(r.success && r.rows.size() == 2 && r.rows[0][0] == "l'apostrophe" && r.rows[1][0] == "NULL" && std::fabs(std::atof(r.rows[1][1].c_str()) + 1000) < 1e-9);
      CHECK(db2.TableExists("entreprises") && db2.TableExists("perso"));   // le dump contient toute la base
      long long v0 = db2.Version(); db2.Execute("INSERT INTO perso VALUES (3,'z',0);"); CHECK(db2.Version() != v0);
      db2.Reseed(); CHECK(db2.TableExists("entreprises") && !db2.TableExists("perso"));
      std::filesystem::remove(path); }

    // --- LaTeX : analyse, mise en page, SVG
    { using namespace math;
      const char* f[] = {"FV = PV \\times (1+r)^n", "\\frac{\\partial f}{\\partial S}", "\\sum_{i=1}^{n} w_i R_i", "\\int_0^\\infty e^{-rt}\\,dt", "\\sqrt{\\frac{a+b}{2}}",
                         "\\left( \\frac{1}{2} \\right)", "\\hat{\\beta} = \\frac{\\mathrm{Cov}(R_i,R_m)}{\\mathrm{Var}(R_m)}", "\\binom{n}{k}", "P(L > \\text{VaR}) = \\alpha", "\\inconnu{x}"};
      for (auto s : f) { std::string svg = ToSvg(s); CHECK(svg.find("<svg") == 0 && svg.size() > 120 && svg.find("</svg>") != std::string::npos); }
      Layout L; auto b = L.Make(Parser::Parse("x^2"), 20); CHECK(b.asc > 17 && b.w > 10);          // l'exposant relève la boîte
      auto frac = L.Make(Parser::Parse("\\frac{1}{2}"), 20); CHECK(frac.H() > 30);                 // fraction plus haute qu'une ligne
      auto sp = ToSvg("a<b & c"); CHECK(sp.find("&lt;") != std::string::npos && sp.find("&amp;") != std::string::npos); }

    // --- cours et exercices
    { auto mods = BuiltinModules(); CHECK(mods.size() >= 6);
      for (auto& m : mods) for (auto& s : m.sections) { CHECK(!s.body.empty()); for (auto& sn : s.snippets) CHECK(!sn.code.empty()); }
      auto sup = BuiltinSupports(); CHECK(sup.size() >= 40 && !sup[0].driveId.empty());
      auto ex = BuiltinExercises(); CHECK(ex.size() == 6);
      Database db; PythonSandbox py; SqlResult none;
      CHECK(ex[2].validate(db, py, none).first == false);   // sans exécution du script : refusé (ou Python non compilé)
      Spreadsheet sh; sh.SetCell(0, 0, "=1000*(1+0.05)^3"); CHECK(std::fabs(sh.Get(0, 0).value - 1157.625) < 1e-9);
      sh.SetCell(1, 0, "=0.6^2*0.2^2+0.4^2*0.3^2+2*0.6*0.4*0.5*0.2*0.3"); CHECK(std::fabs(sh.Get(1, 0).value - 0.0432) < 1e-12); }

    std::cout << (fails ? "TESTS EN ECHEC\n" : "Tous les tests passent\n");
    return fails ? 1 : 0;
}
