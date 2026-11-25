// Finance Lab - environnement d'étude C++20 : whiteboard, tableur, SQLite3, Python, graphiques, exercices.
#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>
#include <SDL3/SDL_opengl.h>
#include <imgui.h>
#include <imgui_impl_opengl3.h>
#include <imgui_impl_sdl3.h>
#include <imgui_stdlib.h>

#include "core/AutoSave.hpp"
#include "core/CsvImporter.hpp"
#include "core/Courses.hpp"
#include "core/Database.hpp"
#include "core/Exercises.hpp"
#include "core/PythonSandbox.hpp"
#include "core/Report.hpp"
#include "core/Spreadsheet.hpp"
#include "core/ProjectFile.hpp"
#include "core/UndoJournal.hpp"
#include "platform/FileDialogs.hpp"
#include "ui/MathRender.hpp"
#include "ui/Plot.hpp"
#include "ui/Theme.hpp"
#include "ui/Whiteboard.hpp"

#include <cstdio>
#include <cstring>
#include <filesystem>
#include <functional>
#include <sstream>

namespace fs = std::filesystem;
using namespace cl;

namespace {
const std::vector<FileFilter> kProjectFilter = {{"Projet Finance Lab", "financelab,studybox"}};
const std::vector<FileFilter> kCsvFilter = {{"Données CSV / TSV", "csv,tsv,txt"}, {"Tous les fichiers", "*"}};
const std::vector<FileFilter> kHtmlFilter = {{"Fiche de révision HTML", "html"}};
const std::vector<FileFilter> kPdfFilter = {{"Support de cours PDF", "pdf"}};

enum class Purpose { OpenProject, SaveProject, ImportCsv, ExportReport, OpenPdf };
enum class Pending { None, New, Open, Quit };

class App {
public:
    // ---- état métier
    ProjectState doc;
    Database db;
    PythonSandbox py;
    Spreadsheet sheet;
    std::vector<Exercise> exercises = BuiltinExercises();
    ui::Whiteboard wb;
    ui::PlotPanel plot;
    UndoJournal journal;
    AutoSave autosave;
    FileDialogs dialogs;

    fs::path projectPath, sessionPath;
    bool modified = false, dark = false, running = true, showHistory = false;
    enum Tab { kStudy = 0, kCourses, kBoard, kSheet, kPlots };
    int tab = 0, exIdx = 0, hintsShown = 0, sel_r = 0, sel_c = 0, studyTab = 1;
    bool notesPreview = false;
    std::vector<CourseModule> modules = BuiltinModules();
    std::vector<SupportDoc> supports = BuiltinSupports();
    int modIdx = 0, supIdx = -1;
    fs::path coursesDir, coursesDir2;
    long long dbSeen = -1;
    bool demoMargin = false;
    std::string status = "Prêt", exMsg;
    bool exOk = false;
    SqlResult sqlRes;
    PyResult pyRes;
    std::string formula;
    bool focusFormula = false;
    double now = 0;

    // modales
    Pending pending = Pending::None;
    bool openUnsaved = false, openRecovery = false, openCsv = false, openPath = false;
    fs::path recoveryFile, recoveryTarget;
    Purpose pathPurpose = Purpose::OpenProject;
    std::string pathBuf;
    // import CSV
    std::string csvPath, csvTable, csvRaw;
    CsvTable csv;
    int csvDelim = 0, csvDest = 0;

    App() {
        char* pref = SDL_GetPrefPath("FinanceLab", "Studio");
        sessionPath = fs::path(pref ? pref : ".") / "session.financelab";
        coursesDir = fs::path(pref ? pref : ".") / "courses";
        if (const char* base = SDL_GetBasePath()) coursesDir2 = fs::path(base) / "courses";
        if (pref) SDL_free(pref);
        std::error_code ec; fs::create_directories(coursesDir, ec);
        NewProject(false);
        if (auto r = AutoSave::FindRecovery(sessionPath)) { recoveryFile = *r; recoveryTarget.clear(); openRecovery = true; }
    }

    // ------------------------------------------------------------------ état <-> modèle
    // Re-sérialise la base SQLite uniquement si elle a changé depuis la dernière photographie.
    void SyncDb() { long long v = db.Version(); if (v != dbSeen) { doc.dbDump = db.Dump(); dbSeen = db.Version(); } }
    ProjectState Capture() {
        SyncDb(); doc.pdfPage = wb.CurrentPdfPage(); doc.pdfOpacity = wb.pdfOpacity;
        ProjectState s = doc; s.cells = sheet.Export(); s.activeExercise = exIdx; return s;
    }
    void AfterSql(const std::string& label) { long long v = db.Version(); if (v != dbSeen) Commit(label); }

    void Apply(const ProjectState& s) {
        std::string curDump = doc.dbDump;
        doc = s; sheet.Restore(s.cells); exIdx = std::clamp(s.activeExercise, 0, (int)exercises.size() - 1);
        if (s.dbDump.empty()) { db.Reseed(); dbSeen = -1; }
        else if (s.dbDump != curDump || dbSeen < 0) { std::string e; if (!db.Restore(s.dbDump, &e)) status = "Tables SQL non restaurées : " + e; dbSeen = -1; }
        SyncDb();
        wb.pdfOpacity = s.pdfOpacity > 0 ? s.pdfOpacity : 1.0f;
        if (s.pdfPath.empty()) wb.ClosePdf();
        else if (wb.pdf.Path() != fs::path(s.pdfPath)) {
            if (!wb.LoadPdf(s.pdfPath)) status = "Support PDF non rechargé : " + wb.pdf.Error();
        }
        if (wb.pdf.Loaded()) wb.JumpToPdfPage(s.pdfPage);
        if (doc.layers.empty()) doc.layers.push_back({"Calque 1", true, 1.0f});
        hintsShown = 0; exMsg.clear(); sqlRes = {}; pyRes = {};
    }

    void NewProject(bool fromUser) {
        ProjectState s;
        s.title = "Sans titre"; s.layers = {{"Calque 1 - Surlignage", true, 0.9f}, {"Calque 2 - Notes", true, 1.0f}};
        s.sql = exercises[0].starter; s.python = exercises[1].starter;
        s.notes = "# Notes de cours\n\n## Équilibre fonctionnel\nBFR = Stocks + Créances clients - Dettes fournisseurs.\n\n## Dynamique stochastique\ndS = r S dt + sigma S dW.\n";
        dbSeen = -1; db.Reseed(); doc.dbDump.clear(); Apply(s); sheet.SeedDemo(); s.cells = sheet.Export();
        doc.cells = s.cells;
        wb.ResetView(); projectPath.clear();
        journal.Reset(Capture(), "Nouveau projet");
        modified = false; autosave.MarkClean();
        if (fromUser) status = "Nouveau projet";
    }

    void Touch() { modified = true; autosave.MarkDirty(now); }
    void Commit(const std::string& label, const std::string& key = "") {
        if (journal.Commit(label, Capture(), key)) Touch();
    }

    fs::path AutoPath() const { return projectPath.empty() ? sessionPath : projectPath; }
    std::string DisplayName() const { return projectPath.empty() ? doc.title : projectPath.filename().string(); }

    // ------------------------------------------------------------------ fichiers
    bool Save(const fs::path& p) {
        ProjectState s = Capture();
        if (projectPath.empty() || p != projectPath) s.title = p.stem().string();
        auto r = ProjectFile::Save(p, s);
        status = r.message;
        if (!r.ok) return false;
        if (projectPath.empty()) AutoSave::DiscardAll(sessionPath);
        projectPath = p; doc.title = s.title;
        AutoSave::DiscardAll(p);
        modified = false; autosave.MarkClean();
        return true;
    }
    void SaveAs() {
        if (dialogs.Available()) { if (auto p = dialogs.Save(kProjectFilter, DisplayName() + ".financelab")) Save(*p); }
        else AskPath(Purpose::SaveProject, projectPath.empty() ? "cours.financelab" : projectPath.string());
    }
    void SaveCmd() { if (projectPath.empty()) SaveAs(); else Save(projectPath); }

    void OpenFile(const fs::path& p) {
        if (auto rec = AutoSave::FindRecovery(p)) { recoveryFile = *rec; recoveryTarget = p; openRecovery = true; return; }
        LoadInto(p, p);
    }
    void LoadInto(const fs::path& file, const fs::path& asProject) {
        ProjectState s; auto r = ProjectFile::Load(file, s);
        status = r.message;
        if (!r.ok) return;
        Apply(s); wb.ResetView();
        projectPath = asProject; journal.Reset(Capture(), "Ouverture");
        modified = file != asProject; autosave.MarkClean();
        if (modified) autosave.MarkDirty(now);
        if (modified) status = "Version auto-sauvegardée restaurée (non enregistrée)";
    }

    void AskPath(Purpose p, const std::string& initial) { pathPurpose = p; pathBuf = initial; openPath = true; }
    void Handle(Purpose p, const std::string& path) {
        if (path.empty()) return;
        switch (p) {
            case Purpose::OpenProject: OpenFile(path); break;
            case Purpose::SaveProject: Save(path); break;
            case Purpose::ImportCsv: BeginCsv(path); break;
            case Purpose::ExportReport: ExportReport(path); break;
            case Purpose::OpenPdf: OpenPdf(path); break;
        }
    }
    void PickOpen() {
        if (dialogs.Available()) { if (auto p = dialogs.Open(kProjectFilter)) Handle(Purpose::OpenProject, *p); }
        else AskPath(Purpose::OpenProject, "");
    }
    void PickCsv() {
        if (dialogs.Available()) { if (auto p = dialogs.Open(kCsvFilter)) Handle(Purpose::ImportCsv, *p); }
        else AskPath(Purpose::ImportCsv, "");
    }
    void PickPdf() {
        if (dialogs.Available()) { if (auto p = dialogs.Open(kPdfFilter)) Handle(Purpose::OpenPdf, *p); }
        else AskPath(Purpose::OpenPdf, "");
    }
    void OpenPdf(const std::string& path) {
        if (wb.LoadPdf(path)) {
            doc.pdfPath = path; tab = kBoard; wb.tool = ui::Tool::Highlighter; wb.color[0] = 1.0f; wb.color[1] = 0.84f; wb.color[2] = 0.04f;
            status = "Support PDF chargé : " + fs::path(path).filename().string() + " (" + std::to_string(wb.pdf.PageCount()) + " pages)";
            Commit("Support PDF"); Touch();
        } else status = wb.pdf.Error();
    }
    void PickExport() {
        if (dialogs.Available()) { if (auto p = dialogs.Save(kHtmlFilter, DisplayName() + ".html")) Handle(Purpose::ExportReport, *p); }
        else AskPath(Purpose::ExportReport, DisplayName() + ".html");
    }
    void ExportReport(fs::path html) {
        if (html.extension() != ".html") html += ".html";
        fs::path md = html; md.replace_extension(".md");
        std::string e1, e2; ProjectState s = Capture();
        bool a = Report::ExportHtml(html, s, e1), b = Report::ExportMarkdown(md, s, e2);
        status = (a && b) ? "Fiche exportée : " + html.filename().string() + " + " + md.filename().string() : "Échec export : " + e1 + e2;
    }

    // ------------------------------------------------------------------ import CSV
    void BeginCsv(const std::string& path) {
        auto raw = CsvImporter::ReadFile(path);
        if (!raw) { status = "Lecture impossible : " + path; return; }
        csvPath = path; csvRaw = std::move(*raw); csvDelim = 0; csvDest = 0;
        csvTable = CsvImporter::TableNameFromPath(path);
        ReparseCsv(); openCsv = true;
    }
    void ReparseCsv() {
        static const char delims[] = {0, ',', ';', '\t', '|'};
        csv = CsvImporter::Parse(csvRaw, csvDelim == 0 ? std::nullopt : std::optional<char>(delims[csvDelim]));
    }
    void DoCsvImport() {
        std::string msg;
        if (csvDest == 0 || csvDest == 2) {
            auto i = CsvImporter::ToSpreadsheet(csv, sheet);
            msg += "Tableur : " + std::to_string(i.rows) + " lignes" + (i.truncated ? " (tronqué à A1:Z200)" : "");
        }
        if (csvDest == 1 || csvDest == 2) {
            auto i = CsvImporter::ToSqlite(csv, db, csvTable);
            if (!i.ok()) { status = "Import SQLite échoué : " + i.error; return; }
            if (!msg.empty()) msg += " | ";
            msg += "SQLite : table « " + i.table + " » (" + std::to_string(i.rows) + " lignes)";
            doc.sql = "SELECT * FROM " + Database::QuoteIdent(i.table) + " LIMIT 100;";
            sqlRes = db.Execute(doc.sql); SyncDb();
        }
        status = msg; tab = csvDest == 1 ? (int)kStudy : (int)kSheet;
        Commit("Import " + fs::path(csvPath).filename().string());
        Touch();
    }

    // ------------------------------------------------------------------ annuler / rétablir
    void Undo() { if (auto s = journal.Undo()) { Apply(*s); status = "Annulé"; Touch(); } }
    void Redo() { if (auto s = journal.Redo()) { Apply(*s); status = "Rétabli"; Touch(); } }

    // ------------------------------------------------------------------ garde « modifications non enregistrées »
    void Guard(Pending p) {
        if (!modified) { Run(p); return; }
        pending = p; openUnsaved = true;
    }
    void Run(Pending p) {
        pending = Pending::None;
        if (p == Pending::New) NewProject(true);
        else if (p == Pending::Open) PickOpen();
        else if (p == Pending::Quit) running = false;
    }

    // ------------------------------------------------------------------ interface
    void Frame(SDL_Window* win) {
        ImGuiIO& io = ImGui::GetIO();
        now = SDL_GetTicks() / 1000.0;
        autosave.Tick(now, AutoPath(), [&] { return Capture(); });

        // raccourcis (désactivés pendant la saisie de texte : ImGui gère son propre annuler)
        if (!io.WantTextInput && io.KeyCtrl) {
            if (ImGui::IsKeyPressed(ImGuiKey_Z)) { if (io.KeyShift) Redo(); else Undo(); }
            if (ImGui::IsKeyPressed(ImGuiKey_Y)) Redo();
        }
        if (io.KeyCtrl && ImGui::IsKeyPressed(ImGuiKey_S)) { if (io.KeyShift) SaveAs(); else SaveCmd(); }
        if (io.KeyCtrl && ImGui::IsKeyPressed(ImGuiKey_O)) Guard(Pending::Open);
        if (io.KeyCtrl && ImGui::IsKeyPressed(ImGuiKey_N)) Guard(Pending::New);

        std::string title = "FinanceLab - " + DisplayName() + (modified ? " *" : "");
        static std::string lastTitle; if (title != lastTitle) { SDL_SetWindowTitle(win, title.c_str()); lastTitle = title; }

        const ImGuiViewport* vp = ImGui::GetMainViewport();
        ImGui::SetNextWindowPos(vp->WorkPos); ImGui::SetNextWindowSize(vp->WorkSize);
        ImGui::Begin("##shell", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoSavedSettings);
        Toolbar();
        float histW = showHistory ? 250.0f : 0.0f;
        ImGui::BeginChild("main", ImVec2(-histW - (showHistory ? 8 : 0), -26), false);
        if (tab == kStudy) StudyTab(); else if (tab == kCourses) CoursesTab();
        else if (tab == kBoard) { WbToolbar(); auto o = wb.Render(doc, ImVec2(0, 0), dark); if (o.changed) Commit(o.label); }
        else if (tab == kSheet) SheetTab(); else plot.Render(py, sheet, ImVec2(0, 0), dark);
        ImGui::EndChild();
        if (showHistory) { ImGui::SameLine(); HistoryPanel(); }
        StatusBar();
        ImGui::End();
        Modals();
    }

    void Toolbar() {
        ImGui::BeginChild("tb", ImVec2(0, 48), true, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_HorizontalScrollbar);
        if (ImGui::Button("Nouveau")) Guard(Pending::New);
        ImGui::SameLine(); if (ImGui::Button("Ouvrir...")) Guard(Pending::Open);
        ImGui::SameLine(); if (ImGui::Button("Enregistrer")) SaveCmd();
        ImGui::SameLine(); if (ImGui::Button("Enregistrer sous...")) SaveAs();
        ImGui::SameLine(0, 16);
        ImGui::BeginDisabled(!journal.CanUndo()); if (ImGui::Button("Annuler")) Undo(); ImGui::EndDisabled();
        if (ImGui::IsItemHovered(ImGuiHoveredFlags_AllowWhenDisabled) && journal.CanUndo()) ImGui::SetTooltip("Annuler : %s", journal.UndoLabel().c_str());
        ImGui::SameLine(); ImGui::BeginDisabled(!journal.CanRedo()); if (ImGui::Button("Rétablir")) Redo(); ImGui::EndDisabled();
        if (ImGui::IsItemHovered(ImGuiHoveredFlags_AllowWhenDisabled) && journal.CanRedo()) ImGui::SetTooltip("Rétablir : %s", journal.RedoLabel().c_str());
        ImGui::SameLine(); if (ImGui::Button(showHistory ? "Masquer historique" : "Historique")) showHistory = !showHistory;
        ImGui::SameLine(0, 16); if (ImGui::Button("Importer CSV/TSV...")) PickCsv();
        ImGui::SameLine(); if (ImGui::Button("Exporter fiche...")) PickExport();
        ImGui::SameLine(0, 16);
        const char* tabs[] = {"Étude", "Cours", "Whiteboard", "Tableur", "Graphiques"};
        ui::Segmented("tabs", tabs, 5, &tab);
        ImGui::SameLine(); if (ImGui::Button(dark ? "Clair" : "Sombre")) { dark = !dark; ui::Apply(dark); }
        ImGui::EndChild();
    }

    void StatusBar() {
        ImGui::SetCursorPosY(ImGui::GetWindowHeight() - 24);
        ImGui::TextDisabled("%s", status.c_str());
        ImGui::SameLine(ImGui::GetWindowWidth() - 330);
        ImGui::Checkbox("Auto-sauvegarde", &autosave.enabled);
        ImGui::SameLine(); ImGui::SetNextItemWidth(70);
        int iv = (int)autosave.intervalSec; if (ImGui::DragInt("##iv", &iv, 1, 10, 600, "%d s")) autosave.intervalSec = iv;
    }

    void HistoryPanel() {
        ImGui::BeginChild("hist", ImVec2(250, -26), true);
        ImGui::TextDisabled("HISTORIQUE (%zu)", journal.Entries().size());
        ImGui::Separator();
        const auto& e = journal.Entries();
        for (int i = (int)e.size() - 1; i >= 0; --i) {
            char t[16]; std::tm tm{}; std::time_t w = e[i].when;
#if defined(_WIN32)
            localtime_s(&tm, &w);
#else
            localtime_r(&w, &tm);
#endif
            std::strftime(t, sizeof t, "%H:%M:%S", &tm);
            std::string lab = std::string(t) + "  " + e[i].label + "##h" + std::to_string(i);
            if (ImGui::Selectable(lab.c_str(), (size_t)i == journal.Current())) {
                if (auto s = journal.JumpTo((size_t)i)) { Apply(*s); status = "Retour à : " + e[i].label; Touch(); }
            }
        }
        ImGui::EndChild();
    }

    // ---------------------------------------------------------------- onglet Étude
    void StudyTab() {
        const Exercise& ex = exercises[exIdx];
        float w = ImGui::GetContentRegionAvail().x * 0.48f;
        ImGui::BeginChild("left", ImVec2(w, 0), true);
        ImGui::SetNextItemWidth(-1);
        if (ImGui::BeginCombo("##ex", (ex.id + " - " + ex.title).c_str())) {
            for (int i = 0; i < (int)exercises.size(); ++i)
                if (ImGui::Selectable((exercises[i].id + " - " + exercises[i].title).c_str(), i == exIdx)) { exIdx = i; hintsShown = 0; exMsg.clear(); studyTab = exercises[i].domain == ExDomain::Python ? 0 : 1; }
            ImGui::EndCombo();
        }
        ImGui::TextWrapped("Intuition : %s", ex.intuition.c_str());
        ImGui::TextDisabled("Formalisation"); ImGui::TextWrapped("%s", ex.spec.c_str());
        ImGui::TextWrapped("Consigne : %s", ex.task.c_str());
        if (ImGui::Button("Charger le code de départ")) {
            (ex.domain == ExDomain::Sql ? doc.sql : doc.python) = ex.starter; Commit("Code de départ " + ex.id);
        }
        ImGui::SameLine(); if (ImGui::Button("Indice")) hintsShown = std::min<int>(hintsShown + 1, (int)ex.hints.size());
        ImGui::SameLine();
        if (ImGui::Button("Vérifier ma solution")) {
            if (ex.domain == ExDomain::Python) { pyRes = py.Run(doc.python); if (pyRes.success) plot.Sync(py, sheet); }
            else { sqlRes = db.Execute(doc.sql); AfterSql("Exécution SQL"); }
            auto r = ex.validate(db, py, sqlRes); exOk = r.first; exMsg = r.second;
        }
        for (int i = 0; i < hintsShown; ++i) ImGui::BulletText("%s", ex.hints[i].c_str());
        if (!exMsg.empty()) ImGui::TextColored(exOk ? ui::Ok(dark) : ui::Danger(dark), "%s", exMsg.c_str());
        ImGui::Separator(); ImGui::TextDisabled("Notes de cours (LaTeX : $x^2$ ou $$\\frac{a}{b}$$)");
        ImGui::SameLine(); if (ImGui::SmallButton(notesPreview ? "Éditer" : "Aperçu")) notesPreview = !notesPreview;
        if (notesPreview) { ImGui::BeginChild("notesprev", ImVec2(-1, -1), true); ui::RenderMarkdown(doc.notes, dark); ImGui::EndChild(); }
        else { ImGui::InputTextMultiline("##notes", &doc.notes, ImVec2(-1, -1)); TextEdited("Notes", "notes"); }
        ImGui::EndChild();

        ImGui::SameLine();
        ImGui::BeginChild("right", ImVec2(0, 0), false);
        if (ImGui::BeginTabBar("rt")) {
            if (ImGui::BeginTabItem("Python", nullptr, studyTab == 0 ? ImGuiTabItemFlags_SetSelected : 0)) {
                if (ImGui::Button("Exécuter")) { pyRes = py.Run(doc.python); if (pyRes.success) plot.Sync(py, sheet); }
                if (!PythonSandbox::kAvailable) { ImGui::SameLine(); ImGui::TextColored(ui::Danger(dark), "Python non compilé"); }
                if (ui::Fonts().mono) ImGui::PushFont(ui::Fonts().mono);
                ImGui::InputTextMultiline("##py", &doc.python, ImVec2(-1, ImGui::GetContentRegionAvail().y * 0.6f));
                if (ui::Fonts().mono) ImGui::PopFont();
                TextEdited("Code Python", "py");
                ImGui::TextDisabled("Sortie"); ImGui::BeginChild("pyout", ImVec2(0, 0), true);
                ImGui::TextUnformatted(pyRes.out.c_str());
                if (!pyRes.err.empty()) ImGui::TextColored(ui::Danger(dark), "%s", pyRes.err.c_str());
                ImGui::EndChild(); ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("SQLite3", nullptr, studyTab == 1 ? ImGuiTabItemFlags_SetSelected : 0)) {
                if (ImGui::Button("Exécuter SQL")) { sqlRes = db.Execute(doc.sql); AfterSql("Exécution SQL"); }
                ImGui::SameLine(); if (ImGui::Button("Envoyer vers le tableur")) { sheet.ImportSql(sqlRes); Commit("SQL vers tableur"); tab = kSheet; }
                ImGui::SameLine(); ImGui::TextDisabled("Tables :");
                for (auto& t : db.ListTables()) { ImGui::SameLine(); if (ImGui::SmallButton(t.c_str())) { doc.sql = "SELECT * FROM " + Database::QuoteIdent(t) + " LIMIT 50;"; sqlRes = db.Execute(doc.sql); Commit("Explorer " + t); } }
                if (ui::Fonts().mono) ImGui::PushFont(ui::Fonts().mono);
                ImGui::InputTextMultiline("##sql", &doc.sql, ImVec2(-1, 130));
                if (ui::Fonts().mono) ImGui::PopFont();
                TextEdited("Requête SQL", "sql");
                if (!sqlRes.success && !sqlRes.error.empty()) ImGui::TextColored(ui::Danger(dark), "%s", sqlRes.error.c_str());
                else if (!sqlRes.columns.empty()) {
                    ImGui::TextDisabled("%zu ligne(s) - %.2f ms", sqlRes.rows.size(), sqlRes.elapsedMs);
                    if (ImGui::BeginTable("sqlres", (int)sqlRes.columns.size(), ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollX | ImGuiTableFlags_ScrollY, ImVec2(0, 0))) {
                        for (auto& c : sqlRes.columns) ImGui::TableSetupColumn(c.c_str());
                        ImGui::TableHeadersRow();
                        for (auto& r : sqlRes.rows) { ImGui::TableNextRow(); for (size_t c = 0; c < r.size(); ++c) { ImGui::TableSetColumnIndex((int)c); ImGui::TextUnformatted(r[c].c_str()); } }
                        ImGui::EndTable();
                    }
                }
                ImGui::EndTabItem();
            }
            ImGui::EndTabBar();
        }
        studyTab = -1;
        ImGui::EndChild();
    }

    void TextEdited(const char* label, const char* key) {
        if (ImGui::IsItemEdited()) Touch();
        if (ImGui::IsItemDeactivatedAfterEdit()) Commit(label, "");
        (void)key;
    }

    // ---------------------------------------------------------------- barre d'outils du whiteboard
    void WbToolbar() {
        ImGui::BeginChild("wbtb", ImVec2(0, 84), true, ImGuiWindowFlags_NoScrollbar);
        const char* tools[] = {"Stylo", "Surligneur", "Gomme", "Bloc", "Lien", "Équation"};
        int t = (int)wb.tool; if (ui::Segmented("wbtools", tools, 6, &t)) wb.tool = (ui::Tool)t;
        ImGui::SameLine(); ImGui::ColorEdit3("##ink", wb.color, ImGuiColorEditFlags_NoInputs);
        ImGui::SameLine(0, 16); ImGui::SetNextItemWidth(190);
        std::vector<std::string> names; for (auto& l : doc.layers) names.push_back(l.name);
        wb.activeLayer = std::clamp(wb.activeLayer, 0, (int)doc.layers.size() - 1);
        if (ImGui::BeginCombo("##layer", doc.layers[wb.activeLayer].name.c_str())) {
            for (int i = 0; i < (int)names.size(); ++i) if (ImGui::Selectable(names[i].c_str(), i == wb.activeLayer)) wb.activeLayer = i;
            ImGui::EndCombo();
        }
        ImGui::SameLine(); if (ImGui::Checkbox("Visible", &doc.layers[wb.activeLayer].visible)) Commit("Visibilité du calque");
        ImGui::SameLine(); ImGui::SetNextItemWidth(135);
        ImGui::SliderFloat("##lop", &doc.layers[wb.activeLayer].opacity, 0.1f, 1.0f, "opacité %.2f");
        if (ImGui::IsItemDeactivatedAfterEdit()) Commit("Opacité du calque");
        ImGui::SameLine(); if (ImGui::Button("+ Calque")) { doc.layers.push_back({"Calque " + std::to_string(doc.layers.size() + 1), true, 1.0f}); wb.activeLayer = (int)doc.layers.size() - 1; Commit("Nouveau calque"); }
        ImGui::SameLine(); if (ImGui::Button("Effacer les tracés")) { doc.strokes.clear(); Commit("Effacer les tracés"); }
        // ligne 2 : support de cours PDF
        if (ImGui::Button("Ouvrir un PDF de cours...")) PickPdf();
        if (wb.pdf.Loaded()) {
            ImGui::SameLine(); ImGui::TextDisabled("%s", wb.pdf.Path().filename().string().c_str());
            ImGui::SameLine(); ImGui::Text("Page"); ImGui::SameLine(); ImGui::SetNextItemWidth(90);
            int pg = wb.CurrentPdfPage() + 1;
            if (ImGui::InputInt("##pg", &pg, 1, 5)) wb.JumpToPdfPage(std::clamp(pg, 1, wb.pdf.PageCount()) - 1);
            ImGui::SameLine(); ImGui::Text("/ %d", wb.pdf.PageCount());
            ImGui::SameLine(); ImGui::Checkbox("Afficher le PDF", &wb.pdfVisible);
            ImGui::SameLine(); ImGui::SetNextItemWidth(160); ImGui::SliderFloat("##po", &wb.pdfOpacity, 0.15f, 1.0f, "opacité PDF %.2f");
            if (ImGui::IsItemDeactivatedAfterEdit()) Touch();
            ImGui::SameLine(); if (ImGui::Button("Retirer le PDF")) { wb.ClosePdf(); doc.pdfPath.clear(); Commit("Retirer le PDF"); }
        } else {
            ImGui::SameLine(); ImGui::TextDisabled(PdfDocument_Available() ? "Les surlignages et notes restent ancrés au texte du cours." : "Lecteur PDF non compilé dans cette version.");
        }
        ImGui::EndChild();
    }
    static bool PdfDocument_Available() { return ui::PdfDocument::kAvailable; }

    // ---------------------------------------------------------------- onglet Cours (modules + supports PDF)
    fs::path FindLocal(const SupportDoc& d) const {
        for (const fs::path& dir : {coursesDir, coursesDir2}) {
            if (dir.empty()) continue;
            std::error_code ec; fs::path f = dir / d.file;
            if (fs::exists(f, ec)) return f;
        }
        return {};
    }
    void ApplySnippet(const Snippet& sn) {
        if (sn.target == "python") { doc.python = sn.code; studyTab = 0; tab = kStudy; Commit("Exemple de cours (Python)"); }
        else if (sn.target == "sql") { doc.sql = sn.code; studyTab = 1; tab = kStudy; Commit("Exemple de cours (SQL)"); }
        else {
            std::istringstream in(sn.code); std::string line;
            while (std::getline(in, line)) {
                size_t bar = line.find('|'); if (bar == std::string::npos) continue;
                std::string ref = line.substr(0, bar), val = line.substr(bar + 1);
                if (ref.size() < 2 || !std::isalpha((unsigned char)ref[0])) continue;
                int c = std::toupper((unsigned char)ref[0]) - 'A', r = std::atoi(ref.c_str() + 1) - 1;
                sheet.SetRaw(r, c, val);
            }
            sheet.Recalculate(); tab = kSheet; Commit("Exemple de cours (tableur)");
        }
    }
    void CoursesTab() {
        ImGui::BeginChild("clib", ImVec2(330, 0), true);
        ImGui::TextDisabled("MODULES DE COURS");
        for (int i = 0; i < (int)modules.size(); ++i)
            if (ImGui::Selectable(modules[i].title.c_str(), supIdx < 0 && i == modIdx)) { modIdx = i; supIdx = -1; }
        ImGui::Spacing(); ImGui::TextDisabled("SUPPORTS PDF (%zu)", supports.size()); ImGui::Separator();
        std::string last;
        for (int i = 0; i < (int)supports.size(); ++i) {
            if (supports[i].theme != last) { last = supports[i].theme; ImGui::Spacing(); ImGui::TextColored(ui::Accent(dark), "%s", last.c_str()); }
            bool local = !FindLocal(supports[i]).empty();
            ImGui::PushStyleColor(ImGuiCol_Text, local ? ui::Ok(dark) : ImGui::GetStyleColorVec4(ImGuiCol_TextDisabled));
            ImGui::TextUnformatted(local ? "●" : "○"); ImGui::PopStyleColor(); ImGui::SameLine();
            if (ImGui::Selectable((supports[i].title + "##s" + std::to_string(i)).c_str(), supIdx == i)) supIdx = i;
        }
        ImGui::EndChild();
        ImGui::SameLine();
        ImGui::BeginChild("creader", ImVec2(0, 0), true);
        if (supIdx >= 0) {
            const SupportDoc& d = supports[supIdx];
            ImGui::TextColored(ui::Accent(dark), "%s", d.title.c_str()); ImGui::TextDisabled("%s", d.theme.c_str()); ImGui::Separator();
            fs::path local = FindLocal(d);
            if (!local.empty()) {
                ImGui::TextColored(ui::Ok(dark), "Fichier trouvé : %s", local.string().c_str());
                if (ImGui::Button("Ouvrir dans le lecteur PDF (tableau blanc)")) OpenPdf(local.string());
            } else {
                ImGui::TextWrapped("Ce support n'est pas encore sur cet ordinateur. Téléchargez-le depuis votre Drive et placez-le dans :");
                ImGui::TextDisabled("%s", coursesDir.string().c_str());
                ImGui::TextWrapped("sous le nom « %s ». Il s'ouvrira alors ici, avec surlignage et annotations.", d.file.c_str());
            }
            if (ImGui::Button("Ouvrir dans Google Drive")) SDL_OpenURL(DriveUrl(d.driveId).c_str());
            ImGui::SameLine(); if (ImGui::Button("Choisir un PDF sur le disque...")) PickPdf();
        } else if (modIdx >= 0 && modIdx < (int)modules.size()) {
            CourseModule& m = modules[modIdx];
            ImGui::TextColored(ui::Accent(dark), "%s", m.title.c_str()); ImGui::TextDisabled("Sources : %s", m.source.c_str()); ImGui::Separator();
            for (int si = 0; si < (int)m.sections.size(); ++si) {
                Section& sec = m.sections[si];
                ImGui::PushID(si);
                if (ImGui::CollapsingHeader(sec.title.c_str(), ImGuiTreeNodeFlags_DefaultOpen)) {
                    std::vector<std::string> eqs;
                    ui::RenderMarkdown(sec.body, dark, 0, &eqs);
                    for (int k = 0; k < (int)eqs.size(); ++k) {
                        ImGui::PushID(1000 + k);
                        if (ImGui::SmallButton(("Poser la formule " + std::to_string(k + 1) + " sur le tableau blanc").c_str())) {
                            wb.AddEquation(doc, eqs[k], wb.ViewCenterWorld(), dark); Commit("Formule de cours sur le tableau blanc"); status = "Formule ajoutée au tableau blanc"; }
                        ImGui::PopID();
                    }
                    for (int k = 0; k < (int)sec.snippets.size(); ++k) {
                        ImGui::PushID(2000 + k);
                        if (ImGui::Button((sec.snippets[k].label + "  >").c_str())) ApplySnippet(sec.snippets[k]);
                        ImGui::PopID();
                    }
                }
                ImGui::PopID();
            }
        }
        ImGui::EndChild();
    }

    // ---------------------------------------------------------------- jeu de démonstration (captures d'écran)
    void LoadDemo() {
        ProjectState s = Capture();
        s.title = "Cours de finance - démonstration";
        s.notes = "# Notes de cours\n\n## Valeur temporelle\nLa valeur future d'un capital $PV$ placé au taux $r$ pendant $n$ périodes :\n$$FV = PV \\times (1 + r)^n$$\n\n## Black-Scholes\n$$C = S_0\\, e^{-qT} N(d_1) - K\\, e^{-rT} N(d_2)$$\n- Le rendement attendu suit le CAPM : $R_i = R_f + \\beta_i (R_m - R_f)$.\n> Exemple : $S_0 = K = 100$, $T = 1$, $r = 5\\%$, $\\sigma = 20\\%$ donnent $C \\approx 10{,}45$.\n";
        s.equations.clear(); s.strokes.clear(); s.nodes.clear(); s.edges.clear();
        auto eq = [&](float x, float y, const char* l, float r, float g, float b) { Equation q; q.id = (int)s.equations.size() + 1; q.x = x; q.y = y; q.latex = l; q.r = r; q.g = g; q.b = b; s.equations.push_back(q); };
        auto node = [&](int id, float x, float y, float w, const char* t, const char* sub, float r, float g, float b) { Node n; n.id = id; n.x = x; n.y = y; n.w = w; n.title = t; n.subtitle = sub; n.r = r; n.g = g; n.b = b; s.nodes.push_back(n); };
        if (demoMargin) {            // annotations dans la marge d'un PDF de cours (page A4 = 794 unités de large)
            eq(830, 30, "C = S_0 N(d_1) - K e^{-rT} N(d_2)", 0.0f, 0.48f, 1.0f);
            eq(830, 105, "d_1 = \\frac{\\ln(S_0/K) + (r + \\sigma^2/2)\\,T}{\\sigma \\sqrt{T}}", 0.95f, 0.61f, 0.07f);
            eq(830, 215, "\\mathrm{ES}_\\alpha = E[L \\mid L > \\mathrm{VaR}_\\alpha]", 0.88f, 0.22f, 0.24f);
            node(1, 830, 330, 150, "Cycle d'exploitation", "Stocks + Créances - Fourn.", 0.0f, 0.48f, 1.0f);
            node(2, 1000, 330, 150, "Variation du BFR", "Impact sur le cash-flow", 0.95f, 0.61f, 0.07f);
            node(3, 1170, 330, 150, "Trésorerie nette", "TN = FRNG - BFR", 0.16f, 0.66f, 0.27f);
            Stroke hl; hl.layer = 0; hl.highlighter = true; hl.r = 1; hl.g = 0.84f; hl.b = 0.04f; hl.a = 0.32f; hl.width = 19;
            for (int i = 0; i <= 8; ++i) hl.pts.push_back({64.0f + i * 20.0f, 182.0f, 1});
            s.strokes.push_back(hl);
            Stroke ar; ar.layer = 1; ar.r = 0.04f; ar.g = 0.52f; ar.b = 1; ar.a = 1; ar.width = 2.5f;
            for (int i = 0; i <= 24; ++i) { float t = i / 24.0f; ar.pts.push_back({235 + 585 * t, 180 - 120 * std::sin(t * 1.5707f) * t, 1}); }
            s.strokes.push_back(ar);
        } else {
            eq(60, 40, "C = S_0 N(d_1) - K e^{-rT} N(d_2)", 0.0f, 0.48f, 1.0f);
            eq(60, 120, "d_1 = \\frac{\\ln(S_0/K) + (r + \\sigma^2/2)\\,T}{\\sigma \\sqrt{T}}", 0.95f, 0.61f, 0.07f);
            eq(60, 220, "\\mathrm{VaR}_\\alpha: \\; P(L > \\mathrm{VaR}_\\alpha) = \\alpha \\qquad \\mathrm{ES}_\\alpha = E[L \\mid L > \\mathrm{VaR}_\\alpha]", 0.88f, 0.22f, 0.24f);
            eq(60, 310, "\\sigma_p^2 = \\sum_{i=1}^{n} \\sum_{j=1}^{n} w_i w_j \\sigma_{ij} = w^T \\Sigma w", 0.16f, 0.66f, 0.27f);
            node(1, 560, 60, 175, "Cycle d'exploitation", "Stocks + Créances - Fournisseurs", 0.0f, 0.48f, 1.0f);
            node(2, 800, 60, 175, "Variation du BFR", "Impact sur le cash-flow", 0.95f, 0.61f, 0.07f);
            node(3, 1040, 60, 175, "Trésorerie nette", "TN = FRNG - BFR", 0.16f, 0.66f, 0.27f);
            Stroke u; u.layer = 1; u.r = 0.88f; u.g = 0.22f; u.b = 0.24f; u.a = 1; u.width = 3;
            for (int i = 0; i <= 24; ++i) u.pts.push_back({60 + i * 11.0f, 98 + 4 * std::sin(i * 0.9f), 1});
            s.strokes.push_back(u);
            Stroke h; h.layer = 0; h.highlighter = true; h.r = 1; h.g = 0.84f; h.b = 0.04f; h.a = 0.32f; h.width = 18;
            for (int i = 0; i <= 14; ++i) h.pts.push_back({560.0f + i * 20.0f, 190.0f + (i % 2) * 1.5f, 1});
            s.strokes.push_back(h);
            Stroke a; a.layer = 1; a.r = 0.04f; a.g = 0.52f; a.b = 1; a.a = 1; a.width = 3;
            for (int i = 0; i <= 18; ++i) { float t = i / 18.0f; a.pts.push_back({620 + 200 * t, 300 - 60 * std::sin(t * 3.14159f), 1}); }
            s.strokes.push_back(a);
        }
        s.edges = {{1, 2, "Détermine"}, {2, 3, "Consomme"}};
        s.python = "import random\nrandom.seed(42)\nrendements = [random.gauss(0.08, 0.20) for _ in range(5000)]\nx_vals = [random.gauss(0.07, 0.15) for _ in range(5000)]\nrendements = [0.015 + 1.25 * x + random.gauss(0, 0.09) for x in x_vals]\n";
        Apply(s); journal.Reset(Capture(), "Démonstration");
        pyRes = py.Run(doc.python); plot.Sync(py, sheet);
        sqlRes = db.Execute("SELECT e.nom, b.exercice, (b.stocks + b.creances_clients - b.dettes_fournisseurs) AS bfr, (b.tresorerie_active - b.tresorerie_passive) AS tn FROM entreprises e JOIN bilans_annuels b ON e.id = b.entreprise_id ORDER BY bfr DESC;");
        modified = false;
    }

    // ---------------------------------------------------------------- onglet Tableur
    void SheetTab() {
        ImGui::Text("%s", Spreadsheet::RefName(sel_r, sel_c).c_str()); ImGui::SameLine();
        ImGui::SetNextItemWidth(460);
        if (focusFormula) { ImGui::SetKeyboardFocusHere(); focusFormula = false; }
        if (ImGui::InputText("##formula", &formula, ImGuiInputTextFlags_EnterReturnsTrue)) {
            sheet.SetCell(sel_r, sel_c, formula);
            Commit("Cellule " + Spreadsheet::RefName(sel_r, sel_c));
            if (sel_r + 1 < Spreadsheet::kRows) { ++sel_r; formula = sheet.Get(sel_r, sel_c).raw; }
        }
        ImGui::SameLine(); if (ImGui::Button("Importer CSV/TSV...")) PickCsv();
        ImGui::SameLine(); if (ImGui::Button("Importer dernier résultat SQL")) { sheet.ImportSql(sqlRes); Commit("SQL vers tableur"); }
        ImGui::SameLine(); if (ImGui::Button("Vider")) { sheet.Clear(); sheet.Recalculate(); Commit("Vider le tableur"); }
        if (ImGui::BeginTable("grid", Spreadsheet::kCols + 1, ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollX | ImGuiTableFlags_ScrollY | ImGuiTableFlags_NoSavedSettings, ImVec2(0, 0))) {
            ImGui::TableSetupScrollFreeze(1, 1);
            ImGui::TableSetupColumn("#", ImGuiTableColumnFlags_WidthFixed, 38);
            for (int c = 0; c < Spreadsheet::kCols; ++c) ImGui::TableSetupColumn(Spreadsheet::ColName(c).c_str(), ImGuiTableColumnFlags_WidthFixed, 110);
            ImGui::TableHeadersRow();
            ImGuiListClipper clip; clip.Begin(Spreadsheet::kRows);
            while (clip.Step()) for (int r = clip.DisplayStart; r < clip.DisplayEnd; ++r) {
                ImGui::TableNextRow(); ImGui::TableSetColumnIndex(0); ImGui::TextDisabled("%d", r + 1);
                for (int c = 0; c < Spreadsheet::kCols; ++c) {
                    ImGui::TableSetColumnIndex(c + 1);
                    const auto& cell = sheet.Get(r, c);
                    std::string lab = (cell.display.empty() ? " " : cell.display) + "##" + std::to_string(r) + "_" + std::to_string(c);
                    if (cell.isError) ImGui::PushStyleColor(ImGuiCol_Text, ui::Danger(dark));
                    if (ImGui::Selectable(lab.c_str(), r == sel_r && c == sel_c, ImGuiSelectableFlags_AllowDoubleClick)) {
                        sel_r = r; sel_c = c; formula = cell.raw;
                        if (ImGui::IsMouseDoubleClicked(0)) focusFormula = true;
                    }
                    if (cell.isError) ImGui::PopStyleColor();
                }
            }
            ImGui::EndTable();
        }
    }

    // ---------------------------------------------------------------- fenêtres modales
    void Modals() {
        if (openUnsaved) { ImGui::OpenPopup("Modifications non enregistrées"); openUnsaved = false; }
        if (openRecovery) { ImGui::OpenPopup("Récupération"); openRecovery = false; }
        if (openCsv) { ImGui::OpenPopup("Importer un fichier CSV / TSV"); openCsv = false; }
        if (openPath) { ImGui::OpenPopup("Chemin du fichier"); openPath = false; }
        ImVec2 c = ImGui::GetMainViewport()->GetCenter();
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));

        if (ImGui::BeginPopupModal("Modifications non enregistrées", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
            ImGui::Text("« %s » contient des modifications non enregistrées.", DisplayName().c_str());
            if (ImGui::Button("Enregistrer")) { SaveCmd(); ImGui::CloseCurrentPopup(); if (!modified) Run(pending); else pending = Pending::None; }
            ImGui::SameLine(); if (ImGui::Button("Ne pas enregistrer")) { ImGui::CloseCurrentPopup(); Run(pending); }
            ImGui::SameLine(); if (ImGui::Button("Annuler")) { pending = Pending::None; ImGui::CloseCurrentPopup(); }
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Récupération", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
            ImGui::TextWrapped("Une auto-sauvegarde plus récente a été trouvée (%s).\nVoulez-vous la restaurer ?", recoveryFile.filename().string().c_str());
            if (ImGui::Button("Restaurer")) { LoadInto(recoveryFile, recoveryTarget); ImGui::CloseCurrentPopup(); }
            ImGui::SameLine();
            if (ImGui::Button("Ignorer")) {
                if (!recoveryTarget.empty()) LoadInto(recoveryTarget, recoveryTarget);
                else AutoSave::DiscardAll(sessionPath);
                ImGui::CloseCurrentPopup();
            }
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Chemin du fichier", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
            ImGui::TextDisabled("Boîtes de dialogue natives indisponibles : saisissez le chemin.");
            ImGui::SetNextItemWidth(520); ImGui::InputText("##pp", &pathBuf);
            if (ImGui::Button("OK")) { std::string p = pathBuf; ImGui::CloseCurrentPopup(); Handle(pathPurpose, p); }
            ImGui::SameLine(); if (ImGui::Button("Annuler")) ImGui::CloseCurrentPopup();
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Importer un fichier CSV / TSV", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) CsvModal();
    }

    void CsvModal() {
        ImGui::TextDisabled("%s", csvPath.c_str());
        const char* dl[] = {"Auto", "Virgule ,", "Point-virgule ;", "Tabulation", "Barre |"};
        ImGui::SetNextItemWidth(170); if (ImGui::Combo("Séparateur", &csvDelim, dl, 5)) ReparseCsv();
        if (!csv.ok()) { ImGui::TextColored(ui::Danger(dark), "%s", csv.error.c_str()); }
        else {
            ImGui::SameLine(); ImGui::Text("%zu colonnes, %zu lignes%s%s", csv.header.size(), csv.rows.size(), csv.hasHeader ? ", en-tête détecté" : ", sans en-tête", csv.decimalComma ? ", décimale virgule" : "");
            if (ImGui::BeginTable("prev", (int)std::min<size_t>(csv.header.size(), 8), ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollX, ImVec2(640, 190))) {
                int nc = (int)std::min<size_t>(csv.header.size(), 8);
                for (int k = 0; k < nc; ++k) { const char* tn = csv.types[k] == ColType::Integer ? " [ent]" : csv.types[k] == ColType::Real ? " [réel]" : " [texte]"; ImGui::TableSetupColumn((csv.header[k] + tn).c_str()); }
                ImGui::TableHeadersRow();
                for (size_t r = 0; r < std::min<size_t>(csv.rows.size(), 8); ++r) { ImGui::TableNextRow(); for (int k = 0; k < nc; ++k) { ImGui::TableSetColumnIndex(k); ImGui::TextUnformatted(csv.rows[r][k].c_str()); } }
                ImGui::EndTable();
            }
            ImGui::RadioButton("Tableur", &csvDest, 0); ImGui::SameLine(); ImGui::RadioButton("Table SQLite3", &csvDest, 1); ImGui::SameLine(); ImGui::RadioButton("Les deux", &csvDest, 2);
            if (csvDest != 0) { ImGui::SetNextItemWidth(240); ImGui::InputText("Nom de la table", &csvTable); }
            if (csvDest != 1) ImGui::TextDisabled("Le tableur sera remplacé (annulable avec Annuler).");
        }
        ImGui::BeginDisabled(!csv.ok());
        if (ImGui::Button("Importer")) { DoCsvImport(); ImGui::CloseCurrentPopup(); }
        ImGui::EndDisabled();
        ImGui::SameLine(); if (ImGui::Button("Annuler")) ImGui::CloseCurrentPopup();
        ImGui::EndPopup();
    }

    void OnDrop(const char* path) {
        fs::path p = path; std::string e = p.extension().string();
        for (auto& ch : e) ch = (char)std::tolower((unsigned char)ch);
        if (e == ".financelab") { if (modified) { status = "Enregistrez d'abord le projet courant, puis rouvrez le fichier."; } else OpenFile(p); }
        else if (e == ".pdf") OpenPdf(path);
        else if (e == ".csv" || e == ".tsv" || e == ".txt") BeginCsv(path);
        else status = "Type de fichier non pris en charge : " + e;
    }
};
} // namespace

namespace {
// Polices : DejaVu (Latin, grec, symboles mathématiques) cherchées à côté de l'exécutable ou dans assets/fonts.
std::string FindFont(const char* name) {
    std::vector<fs::path> dirs;
    if (const char* b = SDL_GetBasePath()) { dirs.push_back(fs::path(b) / "assets" / "fonts"); dirs.push_back(fs::path(b) / ".." / "assets" / "fonts"); }
    dirs.push_back(fs::path("assets") / "fonts");
#ifdef FINANCELAB_ASSET_DIR
    dirs.push_back(fs::path(FINANCELAB_ASSET_DIR) / "fonts");
#endif
    for (auto& d : dirs) { std::error_code ec; fs::path f = d / name; if (fs::exists(f, ec)) return f.string(); }
    return "";
}
void LoadFonts(float scale) {
    static const ImWchar ranges[] = {0x20, 0x17F, 0x2C6, 0x2DC, 0x370, 0x3FF, 0x2000, 0x206F, 0x2100, 0x214F, 0x2190, 0x21FF, 0x2200, 0x22FF, 0x25A0, 0x25FF, 0x27E8, 0x27E9, 0};
    ImGuiIO& io = ImGui::GetIO();
    auto load = [&](const char* n, float px) -> ImFont* { std::string p = FindFont(n); return p.empty() ? nullptr : io.Fonts->AddFontFromFileTTF(p.c_str(), px * scale, nullptr, ranges); };
    ui::MathFonts& f = ui::Fonts();
    f.ui = load("DejaVuSans.ttf", 15.0f);
    if (!f.ui) { f.ui = io.Fonts->AddFontDefault(); }
    io.FontDefault = f.ui;
    f.roman = load("DejaVuSerif.ttf", 15.0f); f.italic = load("DejaVuSerif-Italic.ttf", 15.0f); f.mono = load("DejaVuSansMono.ttf", 14.0f);
    if (!f.roman) f.roman = f.ui;
    if (!f.italic) f.italic = f.roman;
}
struct Cli { bool demo = false, dark = false, preview = false; int tab = 0, frames = 8, module = -1, support = -1, exercise = -1, studyTab = -1; std::string shot, pdf; int pdfPage = 0; };
}

int main(int argc, char** argv) {
    Cli cli;
    for (int i = 1; i < argc; ++i) {
        std::string a = argv[i]; auto next = [&]() -> std::string { return i + 1 < argc ? argv[++i] : ""; };
        if (a == "--demo") cli.demo = true; else if (a == "--preview") cli.preview = true; else if (a == "--dark") cli.dark = true;
        else if (a == "--tab") cli.tab = std::atoi(next().c_str()); else if (a == "--frames") cli.frames = std::atoi(next().c_str());
        else if (a == "--shot") cli.shot = next(); else if (a == "--pdf") cli.pdf = next(); else if (a == "--pdf-page") cli.pdfPage = std::atoi(next().c_str());
        else if (a == "--module") cli.module = std::atoi(next().c_str()); else if (a == "--exercise") cli.exercise = std::atoi(next().c_str());
        else if (a == "--study-tab") cli.studyTab = std::atoi(next().c_str());
    }
    if (!SDL_Init(SDL_INIT_VIDEO)) return 1;
#ifdef __APPLE__
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_FLAGS, SDL_GL_CONTEXT_FORWARD_COMPATIBLE_FLAG);
    const char* glsl = "#version 150";
#else
    const char* glsl = "#version 330";
#endif
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_Window* win = SDL_CreateWindow("FinanceLab", 1480, 920, SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (!win) return 1;
    SDL_GLContext gl = SDL_GL_CreateContext(win);
    if (!gl) return 1;
    SDL_GL_MakeCurrent(win, gl); SDL_GL_SetSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    io.IniFilename = nullptr;
    float scale = SDL_GetWindowDisplayScale(win); if (scale <= 0) scale = 1;
    ui::Apply(cli.dark);
    ImGui::GetStyle().ScaleAllSizes(scale);
    LoadFonts(scale);
    ImGui_ImplSDL3_InitForOpenGL(win, gl);
    ImGui_ImplOpenGL3_Init(glsl);

    {
        App app;
        app.dark = cli.dark; app.tab = cli.tab; app.notesPreview = cli.preview; app.demoMargin = !cli.pdf.empty();
        if (cli.demo) app.LoadDemo();
        if (cli.module >= 0) { app.modIdx = cli.module; app.supIdx = -1; }
        if (cli.exercise >= 0) app.exIdx = std::clamp(cli.exercise, 0, (int)app.exercises.size() - 1);
        if (cli.studyTab >= 0) app.studyTab = cli.studyTab;
        if (!cli.pdf.empty()) { app.OpenPdf(cli.pdf); app.tab = cli.tab; app.wb.JumpToPdfPage(cli.pdfPage); }
        int frameNo = 0;
        while (app.running) {
            SDL_Event ev;
            while (SDL_PollEvent(&ev)) {
                ImGui_ImplSDL3_ProcessEvent(&ev);
                if (ev.type == SDL_EVENT_QUIT) app.Guard(Pending::Quit);
                if (ev.type == SDL_EVENT_DROP_FILE && ev.drop.data) app.OnDrop(ev.drop.data);
            }
            ImGui_ImplOpenGL3_NewFrame(); ImGui_ImplSDL3_NewFrame(); ImGui::NewFrame();
            app.Frame(win);
            ImGui::Render();
            glViewport(0, 0, (int)io.DisplaySize.x * (int)io.DisplayFramebufferScale.x, (int)io.DisplaySize.y * (int)io.DisplayFramebufferScale.y);
            glClearColor(0.95f, 0.95f, 0.96f, 1); glClear(GL_COLOR_BUFFER_BIT);
            ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
            if (!cli.shot.empty() && ++frameNo == cli.frames) {              // capture d'écran PPM puis sortie
                int W = (int)io.DisplaySize.x * (int)io.DisplayFramebufferScale.x, H = (int)io.DisplaySize.y * (int)io.DisplayFramebufferScale.y;
                std::vector<unsigned char> px((size_t)W * H * 4), row((size_t)W * 3);
                glReadPixels(0, 0, W, H, GL_RGBA, GL_UNSIGNED_BYTE, px.data());
                FILE* f = std::fopen(cli.shot.c_str(), "wb");
                if (f) { std::fprintf(f, "P6\n%d %d\n255\n", W, H);
                    for (int y = H - 1; y >= 0; --y) { for (int x = 0; x < W; ++x) std::memcpy(&row[(size_t)x * 3], &px[((size_t)y * W + x) * 4], 3); std::fwrite(row.data(), 1, row.size(), f); }
                    std::fclose(f); }
                app.running = false;
            }
            SDL_GL_SwapWindow(win);
        }
        if (!cli.demo) AutoSave::DiscardAll(app.sessionPath);   // sortie propre : pas de récupération au prochain démarrage
    }

    ImGui_ImplOpenGL3_Shutdown(); ImGui_ImplSDL3_Shutdown(); ImGui::DestroyContext();
    SDL_GL_DestroyContext(gl); SDL_DestroyWindow(win); SDL_Quit();
    return 0;
}
