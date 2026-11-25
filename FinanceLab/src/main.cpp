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
#include "ui/Effects.hpp"
#include "ui/Fonts.hpp"
#include "ui/MathRender.hpp"
#include "ui/Plot.hpp"
#include "ui/Ribbon.hpp"
#include "ui/Theme.hpp"
#include "ui/Whiteboard.hpp"

#include <cstdio>
#include <cstring>
#include <fstream>
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
    // affichage
    float uiScale = 1.0f;           // préférence utilisateur (0,8 à 1,75), multipliée par l'échelle de l'écran
    bool uiDirty = false;           // polices / style à reconstruire avant la prochaine image
    bool showInspector = false;     // inspecteur d'étalonnage du tableau blanc
    int ribbonTab = 0;              // 0 Accueil, 1 Insertion, 2 Format de la forme (contextuel), 3 Création, 4 Affichage
    bool ribbonCollapsed = false;
    int ribbonSeen = -1;            // dernier élément sélectionné vu par le ruban
    fs::path prefsPath;
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
        prefsPath = fs::path(pref ? pref : ".") / "preferences.ini";
        coursesDir = fs::path(pref ? pref : ".") / "courses";
        if (const char* base = SDL_GetBasePath()) coursesDir2 = fs::path(base) / "courses";
        if (pref) SDL_free(pref);
        std::error_code ec; fs::create_directories(coursesDir, ec);
        NewProject(false);
        if (auto r = AutoSave::FindRecovery(sessionPath)) { recoveryFile = *r; recoveryTarget.clear(); openRecovery = true; }
    }

    // ------------------------------------------------------------------ préférences d'affichage
    void LoadPrefs() {
        std::ifstream in(prefsPath); std::string line;
        while (std::getline(in, line)) {
            size_t q = line.find('='); if (q == std::string::npos) continue;
            std::string k = line.substr(0, q), v = line.substr(q + 1);
            if (k == "ui_scale") uiScale = std::clamp((float)std::atof(v.c_str()), 0.8f, 1.75f);
            else if (k == "dark") dark = v == "1";
            else if (k == "autosave") autosave.enabled = v == "1";
        }
    }
    void SavePrefs() const {
        std::ofstream out(prefsPath);
        out << "ui_scale=" << uiScale << "\ndark=" << (dark ? 1 : 0) << "\nautosave=" << (autosave.enabled ? 1 : 0) << "\n";
    }
    void SetScale(float v) {
        v = std::clamp(std::round(v * 20.0f) / 20.0f, 0.8f, 1.75f);
        if (std::fabs(v - uiScale) > 1e-3f) { uiScale = v; uiDirty = true; status = "Échelle de l'interface : " + std::to_string((int)std::lround(v * 100)) + " %"; SavePrefs(); }
    }
    void SetDark(bool d) { if (d != dark) { dark = d; ui::Apply(dark); SavePrefs(); } }

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
        if (io.KeyCtrl && !io.WantTextInput) {                          // échelle : Ctrl + / Ctrl - / Ctrl 0
            if (ImGui::IsKeyPressed(ImGuiKey_Equal) || ImGui::IsKeyPressed(ImGuiKey_KeypadAdd)) SetScale(uiScale + 0.05f);
            if (ImGui::IsKeyPressed(ImGuiKey_Minus) || ImGui::IsKeyPressed(ImGuiKey_KeypadSubtract)) SetScale(uiScale - 0.05f);
            if (ImGui::IsKeyPressed(ImGuiKey_0) || ImGui::IsKeyPressed(ImGuiKey_Keypad0)) SetScale(1.0f);
        }

        std::string title = "FinanceLab - " + DisplayName() + (modified ? " *" : "");
        static std::string lastTitle; if (title != lastTitle) { SDL_SetWindowTitle(win, title.c_str()); lastTitle = title; }

        const ImGuiViewport* vp = ImGui::GetMainViewport();
        const ui::Palette& pal = ui::Pal();
        // Fond de fenêtre : dégradé vertical + bande de barre d'outils unifiée et barre d'état (style NSWindow).
        float barH = ui::S(52), statusH = ui::S(28);
        ImDrawList* bg = ImGui::GetBackgroundDrawList();
        ImVec2 a = vp->Pos, b(vp->Pos.x + vp->Size.x, vp->Pos.y + vp->Size.y);
        bg->AddRectFilledMultiColor(a, b, ui::U32(pal.bgTop), ui::U32(pal.bgTop), ui::U32(pal.bgBottom), ui::U32(pal.bgBottom));
        bg->AddRectFilledMultiColor(a, {b.x, a.y + barH}, ui::U32(ui::WithAlpha(pal.bar, 1)), ui::U32(ui::WithAlpha(pal.bar, 1)), ui::U32(ui::WithAlpha(pal.bgTop, 1)), ui::U32(ui::WithAlpha(pal.bgTop, 1)));
        bg->AddLine({a.x, a.y + barH}, {b.x, a.y + barH}, ui::U32(pal.hairline), 1);
        bg->AddLine({a.x, a.y + 0.5f}, {b.x, a.y + 0.5f}, ui::U32(ImVec4(1, 1, 1, dark ? 0.08f : 0.9f)), 1);
        bg->AddRectFilled({a.x, b.y - statusH}, b, ui::U32(ui::WithAlpha(pal.bar, 0.9f)));
        bg->AddLine({a.x, b.y - statusH}, {b.x, b.y - statusH}, ui::U32(pal.hairline), 1);

        ImGui::SetNextWindowPos(vp->WorkPos); ImGui::SetNextWindowSize(vp->WorkSize);
        ImGui::PushStyleColor(ImGuiCol_WindowBg, ImVec4(0, 0, 0, 0));
        ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0);
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ui::S(ImVec2(12, 0)));
        ImGui::Begin("##shell", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoSavedSettings);
        ImGui::PopStyleVar(2); ImGui::PopStyleColor();
        Toolbar(barH);
        ImGui::SetCursorPosY(barH + ui::S(10));
        float histW = showHistory ? ui::S(250) : 0.0f;
        ImGui::BeginChild("main", ImVec2(-histW - (showHistory ? ui::S(10) : 0), -statusH - ui::S(10)), false);
        if (tab == kStudy) StudyTab(); else if (tab == kCourses) CoursesTab();
        else if (tab == kBoard) BoardTab();
        else if (tab == kSheet) SheetTab(); else plot.Render(py, sheet, ImVec2(0, 0), dark);
        ImGui::EndChild();
        if (showHistory) { ImGui::SameLine(0, ui::S(10)); HistoryPanel(statusH); }
        StatusBar(statusH);
        ImGui::End();
        Modals();
    }

    // Barre d'outils unifiée : marque (Valky) · fichier · édition · onglets centrés · import/export · affichage.
    void Toolbar(float barH) {
        ImGui::SetCursorPos({ImGui::GetStyle().WindowPadding.x, 0});
        ImGui::BeginChild("tb", ImVec2(0, barH), ImGuiChildFlags_None, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoBackground);
        float fh = ImGui::GetFrameHeight(), y = (barH - fh) * 0.5f, W = ImGui::GetWindowWidth();
        auto tw = [](const char* l) { return ImGui::CalcTextSize(l, nullptr, true).x + ImGui::GetStyle().FramePadding.x * 2; };
        const char* tabs[] = {"Étude", "Cours", "Whiteboard", "Tableur", "Graphiques"};
        float segW = ui::SegmentedWidth(tabs, 5), sp = ui::S(2);
        float brandW = ui::Fonts().title ? ui::Fonts().title->CalcTextSizeA(ui::Fonts().title->FontSize * ImGui::GetIO().FontGlobalScale, 1e9f, 0, "FinanceLab").x + ui::S(14) : 0;
        float leftW = tw("Nouveau") + tw("Ouvrir…") + tw("Enregistrer") + tw("Annuler") + tw("Rétablir") + tw("Historique") + sp * 4 + ui::S(10);
        float rightFull = tw("Importer…") + tw("Exporter…") + tw("Affichage") + sp * 2 + ui::S(8);
        float rightCompact = tw("Fichiers") + tw("Affichage") + sp + ui::S(8);
        float gaps = ui::S(32);
        // Repli progressif quand la place manque (petite fenêtre ou grande échelle) : marque masquée, import/export regroupés.
        bool showBrand = brandW + leftW + segW + rightFull + gaps <= W;
        bool compact = !showBrand && leftW + segW + rightFull + gaps > W;
        float rightW = compact ? rightCompact : rightFull;
        ImGui::SetCursorPosY(y);
        if (showBrand) {
            if (ui::Fonts().title) ImGui::PushFont(ui::Fonts().title);
            ImGui::SetCursorPosY((barH - ImGui::GetFontSize()) * 0.5f - ui::S(1));
            ImGui::TextUnformatted("FinanceLab");
            if (ui::Fonts().title) ImGui::PopFont();
            ImGui::SameLine(0, ui::S(14)); ImGui::SetCursorPosY(y);
        }
        if (ui::ToolButton("Nouveau")) Guard(Pending::New);
        ImGui::SameLine(0, sp); if (ui::ToolButton("Ouvrir…")) Guard(Pending::Open);
        ImGui::SameLine(0, sp); if (ui::ToolButton("Enregistrer")) SaveCmd();
        if (ImGui::BeginPopupContextItem("saveas")) { if (ImGui::MenuItem("Enregistrer sous…", "Ctrl+Maj+S")) SaveAs(); ImGui::EndPopup(); }
        if (ImGui::IsItemHovered(ImGuiHoveredFlags_DelayNormal)) ImGui::SetTooltip("Ctrl+S  ·  clic droit : Enregistrer sous…");
        ImGui::SameLine(0, ui::S(10));
        ImGui::BeginDisabled(!journal.CanUndo()); if (ui::ToolButton("Annuler")) Undo(); ImGui::EndDisabled();
        if (ImGui::IsItemHovered(ImGuiHoveredFlags_AllowWhenDisabled) && journal.CanUndo()) ImGui::SetTooltip("Annuler : %s", journal.UndoLabel().c_str());
        ImGui::SameLine(0, sp); ImGui::BeginDisabled(!journal.CanRedo()); if (ui::ToolButton("Rétablir")) Redo(); ImGui::EndDisabled();
        if (ImGui::IsItemHovered(ImGuiHoveredFlags_AllowWhenDisabled) && journal.CanRedo()) ImGui::SetTooltip("Rétablir : %s", journal.RedoLabel().c_str());
        ImGui::SameLine(0, sp); if (ui::ToolButton("Historique", showHistory)) showHistory = !showHistory;
        float leftEnd = ImGui::GetItemRectMax().x - ImGui::GetWindowPos().x;
        float segX = std::max(leftEnd + ui::S(16), (W - segW) * 0.5f);
        if (segX + segW > W - rightW - ui::S(12)) segX = leftEnd + ui::S(16);
        ImGui::SameLine(); ImGui::SetCursorPos({segX, y});
        ui::Segmented("tabs", tabs, 5, &tab);
        ImGui::SameLine(); ImGui::SetCursorPos({std::max(segX + segW + ui::S(12), W - rightW), y});
        if (compact) {
            if (ui::ToolButton("Fichiers", ImGui::IsPopupOpen("files"))) ImGui::OpenPopup("files");
            if (ImGui::BeginPopup("files")) {
                if (ImGui::MenuItem("Importer CSV / TSV…")) PickCsv();
                if (ImGui::MenuItem("Exporter la fiche de révision…")) PickExport();
                if (ImGui::MenuItem("Enregistrer sous…", "Ctrl+Maj+S")) SaveAs();
                ImGui::EndPopup();
            }
        } else {
            if (ui::ToolButton("Importer…")) PickCsv();
            if (ImGui::IsItemHovered(ImGuiHoveredFlags_DelayNormal)) ImGui::SetTooltip("Importer un fichier CSV / TSV (tableur ou SQLite)");
            ImGui::SameLine(0, sp); if (ui::ToolButton("Exporter…")) PickExport();
            if (ImGui::IsItemHovered(ImGuiHoveredFlags_DelayNormal)) ImGui::SetTooltip("Exporter la fiche de révision (HTML + Markdown)");
        }
        ImGui::SameLine(0, sp); if (ui::ToolButton("Affichage", ImGui::IsPopupOpen("prefs"))) ImGui::OpenPopup("prefs");
        PrefsPopover();
        ImGui::EndChild();
    }

    // Popover « Affichage » : échelle de l'interface, apparence, polices et shaders détectés.
    void PrefsPopover() {
        ImGui::SetNextWindowSize({ui::S(330), 0});
        if (!ImGui::BeginPopup("prefs")) return;
        ui::SectionLabel("ÉCHELLE DE L'INTERFACE");
        float pct = uiScale * 100.0f;
        ImGui::SetNextItemWidth(-1);
        if (ImGui::SliderFloat("##scale", &pct, 80, 175, "%.0f %%")) {}
        if (ImGui::IsItemDeactivatedAfterEdit()) SetScale(pct / 100.0f);
        const float presets[] = {0.9f, 1.0f, 1.1f, 1.25f, 1.5f};
        for (int i = 0; i < 5; ++i) {
            if (i) ImGui::SameLine(0, ui::S(4));
            char lb[16]; std::snprintf(lb, sizeof lb, "%d %%", (int)std::lround(presets[i] * 100));
            if (ui::Button(lb, {(ImGui::GetContentRegionAvail().x - ui::S(4) * (4 - i)) / (5 - i), 0}, std::fabs(presets[i] - uiScale) < 1e-3f)) SetScale(presets[i]);
        }
        ImGui::TextDisabled("Raccourcis : Ctrl + / Ctrl - / Ctrl 0");
        ImGui::Spacing(); ui::SectionLabel("APPARENCE");
        int mode = dark ? 1 : 0; const char* modes[] = {"Clair", "Sombre"};
        if (ui::Segmented("theme", modes, 2, &mode)) SetDark(mode == 1);
        ImGui::Spacing(); ui::SectionLabel("POLICES");
        ImGui::TextDisabled("Interface : %s", ui::FontInfo().ui.c_str());
        ImGui::TextDisabled("Titres : %s", ui::FontInfo().title.c_str());
        ImGui::TextDisabled("Code : %s", ui::FontInfo().mono.c_str());
        ImGui::PushTextWrapPos(ImGui::GetCursorPos().x + ui::S(300));
        ImGui::TextDisabled("Déposez SF-Pro-Text-Regular.otf et Valky-Regular.otf dans assets/fonts pour les activer.");
        ImGui::PopTextWrapPos();
        ImGui::Spacing(); ui::SectionLabel("RENDU");
        ImGui::TextDisabled("Shaders GLSL (fonds, étalonnage, verre) : %s", ui::fx::Available() ? "actifs" : "indisponibles");
        ImGui::EndPopup();
    }

    void StatusBar(float statusH) {
        float y = ImGui::GetWindowHeight() - statusH;
        ImGui::SetCursorPosY(y + (statusH - ImGui::GetFontSize()) * 0.5f);
        ImGui::TextDisabled("%s", status.c_str());
        ImGui::SetWindowFontScale(0.92f);
        float fh = ImGui::GetFrameHeight();
        float w = ui::S(250);
        ImGui::SameLine(ImGui::GetWindowWidth() - w);
        ImGui::SetCursorPosY(y + (statusH - fh) * 0.5f);
        if (ui::Switch("Auto-sauvegarde", &autosave.enabled)) SavePrefs();
        ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(64)); ImGui::SetCursorPosY(y + (statusH - fh) * 0.5f);
        int iv = (int)autosave.intervalSec; if (ImGui::DragInt("##iv", &iv, 1, 10, 600, "%d s")) autosave.intervalSec = iv;
        ImGui::SetWindowFontScale(1.0f);
    }

    void HistoryPanel(float statusH) {
        ui::BeginCard("hist", ImVec2(ui::S(250), -statusH - ui::S(10)));
        ui::SectionLabel(("HISTORIQUE (" + std::to_string(journal.Entries().size()) + ")").c_str());
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
        ui::EndCard();
    }

    // ---------------------------------------------------------------- onglet Étude
    void StudyTab() {
        const Exercise& ex = exercises[exIdx];
        float w = ImGui::GetContentRegionAvail().x * 0.48f;
        ui::BeginCard("left", ImVec2(w, 0));
        ImGui::SetNextItemWidth(-1);
        if (ImGui::BeginCombo("##ex", (ex.id + " - " + ex.title).c_str())) {
            for (int i = 0; i < (int)exercises.size(); ++i)
                if (ImGui::Selectable((exercises[i].id + " - " + exercises[i].title).c_str(), i == exIdx)) { exIdx = i; hintsShown = 0; exMsg.clear(); studyTab = exercises[i].domain == ExDomain::Python ? 0 : 1; }
            ImGui::EndCombo();
        }
        ImGui::TextWrapped("Intuition : %s", ex.intuition.c_str());
        ImGui::TextDisabled("Formalisation"); ImGui::TextWrapped("%s", ex.spec.c_str());
        ImGui::TextWrapped("Consigne : %s", ex.task.c_str());
        if (ui::Button("Charger le code de départ")) {
            (ex.domain == ExDomain::Sql ? doc.sql : doc.python) = ex.starter; Commit("Code de départ " + ex.id);
        }
        ImGui::SameLine(); if (ui::Button("Indice")) hintsShown = std::min<int>(hintsShown + 1, (int)ex.hints.size());
        ImGui::SameLine();
        if (ui::Button("Vérifier ma solution", {0, 0}, true)) {
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

        ImGui::SameLine(0, ui::S(10));
        ImGui::BeginChild("right", ImVec2(0, 0), false);
        if (ImGui::BeginTabBar("rt")) {
            if (ImGui::BeginTabItem("Python", nullptr, studyTab == 0 ? ImGuiTabItemFlags_SetSelected : 0)) {
                if (ui::Button("Exécuter")) { pyRes = py.Run(doc.python); if (pyRes.success) plot.Sync(py, sheet); }
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
                if (ui::Button("Exécuter SQL")) { sqlRes = db.Execute(doc.sql); AfterSql("Exécution SQL"); }
                ImGui::SameLine(); if (ui::Button("Envoyer vers le tableur")) { sheet.ImportSql(sqlRes); Commit("SQL vers tableur"); tab = kSheet; }
                ImGui::SameLine(); ImGui::TextDisabled("Tables :");
                for (auto& t : db.ListTables()) { ImGui::SameLine(); if (ImGui::SmallButton(t.c_str())) { doc.sql = "SELECT * FROM " + Database::QuoteIdent(t) + " LIMIT 50;"; sqlRes = db.Execute(doc.sql); Commit("Explorer " + t); } }
                if (ui::Fonts().mono) ImGui::PushFont(ui::Fonts().mono);
                ImGui::InputTextMultiline("##sql", &doc.sql, ImVec2(-1, ui::S(130)));
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

    // ---------------------------------------------------------------- onglet Whiteboard (barre d'outils + inspecteur)
    void BoardTab() {
        Ribbon();
        ImGui::Spacing();
        float iw = showInspector ? ui::S(268) : 0.0f;
        auto o = wb.Render(doc, ImVec2(showInspector ? -iw - ui::S(10) : 0, 0), dark);
        if (o.changed) Commit(o.label);
        if (showInspector) { ImGui::SameLine(0, ui::S(10)); Inspector(iw); }
    }

    // ================================================================ ruban (PowerPoint / Word)
    void Ribbon() {
        namespace rb = ui::ribbon;
        Shape* sel = wb.Selected(doc);
        int selId = sel ? sel->id : -1;
        if (selId != ribbonSeen) { if (selId > 0) ribbonTab = 2; else if (ribbonTab == 2) ribbonTab = 0; ribbonSeen = selId; }
        if (!sel && ribbonTab == 2) ribbonTab = 0;
        float tabsH = ImGui::GetFontSize() + ui::S(10);
        float bodyH = rb::ContentHeight() + ImGui::GetFontSize() * 0.84f + ui::S(8) + ImGui::GetStyle().ScrollbarSize;
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ui::S(ImVec2(10, 6)));
        ui::BeginCard("ribbon", ImVec2(0, tabsH + (ribbonCollapsed ? 0 : bodyH + ui::S(6)) + ui::S(12)), ImGuiWindowFlags_NoScrollbar);
        ImGui::PopStyleVar();
        // onglets
        const char* all[] = {"Accueil", "Insertion", "Format de la forme", "Création", "Affichage"};
        std::vector<const char*> names; std::vector<int> map;
        for (int i = 0; i < 5; ++i) if (i != 2 || sel) { names.push_back(all[i]); map.push_back(i); }
        int cur = 0; for (int i = 0; i < (int)map.size(); ++i) if (map[i] == ribbonTab) cur = i;
        int ctx = -1; for (int i = 0; i < (int)map.size(); ++i) if (map[i] == 2) ctx = i;
        if (rb::Tabs(names.data(), (int)names.size(), &cur, ctx)) { ribbonTab = map[cur]; ribbonCollapsed = false; }
        ImGui::SameLine(ImGui::GetContentRegionMax().x - ImGui::GetFrameHeight());
        if (rb::IconButton("##collapse", false, [&](ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) {
                float mx = (a.x + b.x) * 0.5f, my = (a.y + b.y) * 0.5f, k = (b.x - a.x) * 0.3f;
                if (ribbonCollapsed) { dl->AddLine({mx - k, my - k * 0.5f}, {mx, my + k * 0.5f}, c, ui::S(1.6f)); dl->AddLine({mx, my + k * 0.5f}, {mx + k, my - k * 0.5f}, c, ui::S(1.6f)); }
                else { dl->AddLine({mx - k, my + k * 0.5f}, {mx, my - k * 0.5f}, c, ui::S(1.6f)); dl->AddLine({mx, my - k * 0.5f}, {mx + k, my + k * 0.5f}, c, ui::S(1.6f)); }
            }, ribbonCollapsed ? "Afficher le ruban" : "Réduire le ruban")) ribbonCollapsed = !ribbonCollapsed;
        if (!ribbonCollapsed) {
            ImGui::Separator();
            ImGui::BeginChild("rbody", ImVec2(0, bodyH), ImGuiChildFlags_None, ImGuiWindowFlags_HorizontalScrollbar | ImGuiWindowFlags_NoBackground);
            ImGui::SetCursorPos({ImGui::GetCursorPosX(), ImGui::GetCursorPosY() + ui::S(2)});
            switch (ribbonTab) {
                case 0: RibbonHome(sel); break;
                case 1: RibbonInsert(); break;
                case 2: if (sel) RibbonFormat(*sel); break;
                case 3: RibbonDesign(); break;
                default: RibbonView(); break;
            }
            ImGui::EndChild();
        }
        ui::EndCard();
    }

    void RibbonHome(Shape* sel) {
        namespace rb = ui::ribbon;
        rb::BeginGroup("Outils");
        const char* tools[] = {"Stylo", "Surligneur", "Gomme", "Bloc", "Lien", "Équation", "Élément"};
        int t = (int)wb.tool; if (ui::Segmented("wbtools", tools, 7, &t)) { wb.tool = (ui::Tool)t; wb.Deselect(); }
        float ink[4] = {wb.color[0], wb.color[1], wb.color[2], 1};
        if (rb::ColorButton("ink", ink, "✎", "Couleur de l'encre et des nouveaux éléments")) { wb.color[0] = ink[0]; wb.color[1] = ink[1]; wb.color[2] = ink[2]; }
        ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(130)); ImGui::SliderFloat("##brush", &wb.brush, 1, 30, "épaisseur %.1f");
        ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(110)); ImGui::SliderFloat("##opa", &wb.opacity, 0.1f, 1, "opacité %.2f");
        rb::EndGroup();

        rb::BeginGroup("Calques");
        wb.activeLayer = std::clamp(wb.activeLayer, 0, (int)doc.layers.size() - 1);
        ImGui::SetNextItemWidth(ui::S(170));
        if (ImGui::BeginCombo("##layer", doc.layers[wb.activeLayer].name.c_str())) {
            for (int i = 0; i < (int)doc.layers.size(); ++i) if (ImGui::Selectable(doc.layers[i].name.c_str(), i == wb.activeLayer)) wb.activeLayer = i;
            ImGui::EndCombo();
        }
        ImGui::SameLine(); if (ui::Switch("Visible", &doc.layers[wb.activeLayer].visible)) Commit("Visibilité du calque");
        ImGui::SetNextItemWidth(ui::S(120)); ImGui::SliderFloat("##lop", &doc.layers[wb.activeLayer].opacity, 0.1f, 1.0f, "opacité %.2f");
        if (ImGui::IsItemDeactivatedAfterEdit()) Commit("Opacité du calque");
        ImGui::SameLine(); if (ui::Button("+ Calque")) { doc.layers.push_back({"Calque " + std::to_string(doc.layers.size() + 1), true, 1.0f}); wb.activeLayer = (int)doc.layers.size() - 1; Commit("Nouveau calque"); }
        rb::EndGroup();

        rb::BeginGroup("Édition");
        ImGui::BeginDisabled(!sel);
        if (ui::Button("Dupliquer")) { if (wb.Duplicate(doc)) Commit("Dupliquer un élément"); }
        ImGui::SameLine(); if (ui::Button("Supprimer")) { int id = sel->id; doc.shapes.erase(std::remove_if(doc.shapes.begin(), doc.shapes.end(), [&](const Shape& h) { return h.id == id; }), doc.shapes.end()); wb.Deselect(); Commit("Supprimer un élément"); }
        if (ui::Button("Premier plan")) { if (wb.Reorder(doc, +1)) Commit("Premier plan"); }
        ImGui::SameLine(); if (ui::Button("Arrière-plan")) { if (wb.Reorder(doc, -1)) Commit("Arrière-plan"); }
        ImGui::EndDisabled();
        ImGui::SameLine(); if (ui::Button("Effacer les tracés")) { doc.strokes.clear(); Commit("Effacer les tracés"); }
        rb::EndGroup();
    }

    void RibbonInsert() {
        namespace rb = ui::ribbon;
        rb::BeginGroup("Formes et cartons");
        const int row1[] = {(int)ShapeKind::Rect, (int)ShapeKind::Ellipse, (int)ShapeKind::Triangle, (int)ShapeKind::Diamond, (int)ShapeKind::Hexagon, (int)ShapeKind::Star, (int)ShapeKind::BlockArrow};
        const int row2[] = {(int)ShapeKind::Arrow, (int)ShapeKind::TextBox, (int)ShapeKind::Title, (int)ShapeKind::LowerThird, (int)ShapeKind::Note, (int)ShapeKind::Bubble};
        auto tile = [&](int k) {
            if (rb::ShapeTile(k, wb.tool == ui::Tool::Element && wb.shapeKind == k)) {
                wb.tool = ui::Tool::Element; wb.shapeKind = k; wb.Deselect();
                status = std::string("Cliquez (ou glissez) sur le tableau pour poser : ") + ShapeKindName(k);
            }
        };
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, {ui::S(2), ImGui::GetStyle().ItemSpacing.y});
        for (int i = 0; i < 7; ++i) { if (i) ImGui::SameLine(); tile(row1[i]); }
        for (int i = 0; i < 6; ++i) { if (i) ImGui::SameLine(); tile(row2[i]); }
        ImGui::PopStyleVar();
        rb::EndGroup();

        rb::BeginGroup("Dispositions de texte");
        float th = ui::ribbon::ContentHeight(), tw = th * 1.25f;
        const char* lnames[] = {"Titre et sous-titre", "Titre et liste à puces", "Deux colonnes", "Citation", "Chiffre clé", "Définition encadrée", "Comparaison"};
        for (int i = 0; i < 7; ++i) {
            if (i) ImGui::SameLine(0, ui::S(4));
            ImGui::PushID(i);
            if (rb::Tile("##lay", {tw, th}, false, [&](ImDrawList* dl, ImVec2 a, ImVec2 b) { DrawLayoutPreview(dl, i, a, b); }, lnames[i])) InsertLayout(i);
            ImGui::PopID();
        }
        rb::EndGroup();

        rb::BeginGroup("Contenu");
        if (ui::Button("Équation")) { wb.tool = ui::Tool::Equation; status = "Cliquez sur le tableau pour poser une équation LaTeX"; }
        ImGui::SameLine(); if (ui::Button("Bloc de schéma")) wb.tool = ui::Tool::Block;
        if (ui::Button("PDF de cours…")) PickPdf();
        rb::EndGroup();
    }

    // Styles rapides : rangée 1 « intense » (dégradé, texte blanc, ombre), rangée 2 « subtil » (teinte claire, contour).
    static void QuickStyle(Shape& h, int row, int i) {
        const int idx[6] = {4, 5, 3, 7, 8, 9};
        ImVec4 c = ui::ribbon::ThemeColors()[idx[i]];
        if (row == 0) {
            ImVec4 d = ui::ribbon::Shade(c, 4);
            h.r = c.x; h.g = c.y; h.b = c.z; h.a = 1; h.c2[0] = d.x; h.c2[1] = d.y; h.c2[2] = d.z; h.c2[3] = 1;
            h.fill = (int)FillType::Linear; h.angle = 90; h.fillAlpha = 1; h.outline = false; h.shadow = true;
            h.tc[0] = h.tc[1] = h.tc[2] = 1; h.tc[3] = 1;
        } else {
            ImVec4 l = ui::ribbon::Shade(c, 1), d = ui::ribbon::Shade(c, 5);
            h.r = l.x; h.g = l.y; h.b = l.z; h.a = 1; h.fill = (int)FillType::Solid; h.fillAlpha = 1; h.outline = true; h.shadow = false;
            h.lc[0] = c.x; h.lc[1] = c.y; h.lc[2] = c.z; h.lc[3] = 1; h.stroke = std::max(h.stroke, 1.5f);
            h.tc[0] = d.x; h.tc[1] = d.y; h.tc[2] = d.z; h.tc[3] = 1;
        }
        if (h.kind == (int)ShapeKind::LowerThird) { h.lc[0] = c.x; h.lc[1] = c.y; h.lc[2] = c.z; }
    }

    void RibbonFormat(Shape& h) {
        namespace rb = ui::ribbon;
        std::string label;                  // libellé du journal si une modification ponctuelle a eu lieu
        auto deact = [&](const char* l) { if (ImGui::IsItemDeactivatedAfterEdit()) label = l; };
        bool line = h.kind == (int)ShapeKind::Arrow;

        if (!line) {
            rb::BeginGroup("Styles rapides");
            float s = ImGui::GetFrameHeight();
            for (int row = 0; row < 2; ++row) for (int i = 0; i < 6; ++i) {
                if (i) ImGui::SameLine(0, ui::S(3));
                ImGui::PushID(row * 6 + i);
                if (rb::Tile("##qs", {s * 1.2f, s}, false, [&](ImDrawList* dl, ImVec2 a, ImVec2 b) {
                        Shape q; q.kind = (int)ShapeKind::Rect; q.radius = 4; q.stroke = 1.2f; QuickStyle(q, row, i); q.shadow = false;
                        q.text = "Abc"; q.fontSize = 11; q.alignH = 1; q.alignV = 1;
                        ui::shapes::Draw(dl, q, {a.x + ui::S(3), a.y + ui::S(3)}, {b.x - ui::S(3), b.y - ui::S(3)}, ui::Scale(), false);
                    }, row == 0 ? "Effet intense" : "Effet subtil")) { QuickStyle(h, row, i); label = "Style rapide"; }
                ImGui::PopID();
            }
            rb::EndGroup();

            rb::BeginGroup("Remplissage");
            ImGui::PushID("fill");
            const char* ft[] = {"Aucun", "Uni", "Linéaire", "Radial"};
            if (ui::Segmented("ft", ft, 4, &h.fill)) label = "Type de remplissage";
            float c1[4] = {h.r, h.g, h.b, h.a};
            if (rb::ColorButton("c1", c1, "■", "Couleur de remplissage")) { h.r = c1[0]; h.g = c1[1]; h.b = c1[2]; h.a = c1[3]; if (h.fill == (int)FillType::None) h.fill = (int)FillType::Solid; label = "Couleur de remplissage"; }
            if (h.fill >= (int)FillType::Linear) {
                ImGui::SameLine(0, ui::S(2)); if (rb::ColorButton("c2", h.c2, "◧", "Seconde couleur du dégradé")) label = "Couleur du dégradé";
            }
            ImGui::SameLine(); if (rb::GradientGallery(h)) label = "Dégradé";
            if (h.fill == (int)FillType::Linear) { ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(58)); ImGui::DragFloat("##ang", &h.angle, 1, 0, 360, "%.0f°"); deact("Angle du dégradé"); }
            ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(76)); ImGui::SliderFloat("##fa", &h.fillAlpha, 0, 1, "opac. %.2f"); deact("Opacité du remplissage");
            ImGui::PopID();
            rb::EndGroup();
        }

        rb::BeginGroup("Contour");
        ImGui::PushID("ol");
        if (!line) { if (ui::Switch("##on", &h.outline)) label = "Contour"; ImGui::SameLine(); }
        if (rb::ColorButton("lc", h.lc, "✎", "Couleur du contour")) { h.outline = true; label = "Couleur du contour"; }
        ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(70)); ImGui::DragFloat("##w", &h.stroke, 0.1f, 0.5f, 20, "%.1f pt"); deact("Épaisseur du contour");
        const char* dashes[] = {"——", "– –", "···"};
        if (ui::Segmented("dash", dashes, 3, &h.dash)) label = "Style de trait";
        if (ui::shapes::IsBoxy(h.kind)) { ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(78)); ImGui::DragFloat("##rad", &h.radius, 0.3f, 0, 60, "arrondi %.0f"); deact("Arrondi des angles"); }
        ImGui::PopID();
        rb::EndGroup();

        rb::BeginGroup("Effets de forme");
        ImGui::PushID("fx");
        auto fxb = [&](const char* n, bool* v, const char* tip) {
            if (ui::Button(n, {ui::S(64), 0}, *v)) { *v = !*v; label = std::string("Effet : ") + n; }
            if (ImGui::IsItemHovered(ImGuiHoveredFlags_DelayNormal)) ImGui::SetTooltip("%s", tip);
        };
        fxb("Ombre", &h.shadow, "Ombre portée douce"); ImGui::SameLine(0, ui::S(3));
        fxb("Lueur", &h.glow, "Halo lumineux autour de la forme"); ImGui::SameLine(0, ui::S(3));
        fxb("Brillance", &h.gloss, "Reflet supérieur façon verre bombé");
        fxb("Biseau", &h.bevel, "Arêtes éclairées depuis le haut à gauche"); ImGui::SameLine(0, ui::S(3));
        fxb("Néon", &h.neon, "Contour lumineux à cœur blanc"); ImGui::SameLine(0, ui::S(3));
        ImGui::BeginDisabled(!ui::fx::Available() || !ui::shapes::IsBoxy(h.kind));
        fxb("Verre", &h.glass, "Verre dépoli (shader GLSL) : floute ce qui est dessous");
        ImGui::EndDisabled();
        ImGui::PopID();
        rb::EndGroup();

        if (!line) {
            rb::BeginGroup("Police");
            ImGui::PushID("font");
            if (rb::FontCombo("##font", h.font, ui::S(150))) label = "Police";
            ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(54)); ImGui::DragFloat("##fs", &h.fontSize, 0.2f, 6, 160, "%.0f"); deact("Taille du texte");
            ImGui::SameLine(0, ui::S(2)); if (ui::ToolButton("A+")) { h.fontSize = std::min(160.0f, std::round(h.fontSize * 1.15f)); label = "Agrandir le texte"; }
            ImGui::SameLine(0, ui::S(2)); if (ui::ToolButton("A-")) { h.fontSize = std::max(6.0f, std::round(h.fontSize / 1.15f)); label = "Réduire le texte"; }
            if (rb::TextToggle("G", &h.bold, "Gras")) label = "Gras";
            ImGui::SameLine(0, ui::S(2)); if (rb::TextToggle("S", &h.underline, "Souligné", nullptr, true)) label = "Souligné";
            ImGui::SameLine(0, ui::S(2)); if (rb::ColorButton("tc", h.tc, "A", "Couleur du texte")) label = "Couleur du texte";
            ImGui::SameLine(0, ui::S(2)); if (rb::TextToggle("O##ts", &h.textShadow, "Ombre du texte")) label = "Ombre du texte";
            ImGui::SameLine(0, ui::S(2)); if (rb::TextToggle("◌##to", &h.textOutline, "Contour du texte (halo)")) label = "Contour du texte";
            ImGui::SameLine(0, ui::S(6)); if (ui::ToolButton("Texte…")) wb.EditText(h.id);
            if (ImGui::IsItemHovered(ImGuiHoveredFlags_DelayNormal)) ImGui::SetTooltip("Modifier le texte (ou double-clic sur l'élément)");
            ImGui::PopID();
            rb::EndGroup();

            rb::BeginGroup("Paragraphe");
            ImGui::PushID("para");
            const char* ah[] = {"Aligner à gauche", "Centrer", "Aligner à droite"};
            const char* av[] = {"Haut", "Milieu", "Bas"};
            for (int i = 0; i < 3; ++i) {
                if (i) ImGui::SameLine(0, ui::S(2));
                ImGui::PushID(i);
                if (rb::IconButton("##ah", h.alignH == i, [&](ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) { rb::DrawAlignH(dl, a, b, c, i); }, ah[i])) { h.alignH = i; label = "Alignement"; }
                ImGui::PopID();
            }
            ImGui::SameLine(0, ui::S(8));
            if (rb::IconButton("##bul", h.bullets, [&](ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) { rb::DrawBullets(dl, a, b, c); }, "Puces")) { h.bullets = !h.bullets; label = "Puces"; }
            for (int i = 0; i < 3; ++i) {
                if (i) ImGui::SameLine(0, ui::S(2));
                ImGui::PushID(10 + i);
                if (rb::IconButton("##av", h.alignV == i, [&](ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) { rb::DrawAlignV(dl, a, b, c, i); }, av[i])) { h.alignV = i; label = "Alignement vertical"; }
                ImGui::PopID();
            }
            ImGui::SameLine(0, ui::S(8)); ImGui::SetNextItemWidth(ui::S(72)); ImGui::DragFloat("##ls", &h.lineSpacing, 0.01f, 0.8f, 3, "↕ %.2f"); deact("Interligne");
            ImGui::PopID();
            rb::EndGroup();

        }
        if (!label.empty()) Commit(label);
    }

    void RibbonDesign() {
        namespace rb = ui::ribbon;
        rb::BeginGroup("Arrière-plan du tableau");
        float th = rb::ContentHeight(), tw = th * 1.1f;
        ImGui::BeginDisabled(!ui::fx::Available());
        static const ImVec4 a[7][2] = {{ui::Rgb(250, 250, 252), ui::Rgb(220, 224, 232)}, {ui::Rgb(251, 248, 240), ui::Rgb(236, 230, 214)}, {ui::Rgb(252, 252, 253), ui::Rgb(190, 192, 200)},
                                       {ui::Rgb(251, 253, 252), ui::Rgb(150, 205, 215)}, {ui::Rgb(41, 56, 51), ui::Rgb(60, 78, 70)}, {ui::Rgb(250, 214, 196), ui::Rgb(196, 220, 255)}, {ui::Rgb(10, 13, 28), ui::Rgb(40, 30, 70)}};
        for (int i = 0; i < ui::fx::kBackdropCount; ++i) {
            if (i) ImGui::SameLine(0, ui::S(4));
            ImGui::PushID(i);
            if (rb::Tile("##bg", {tw, th}, doc.look.backdrop == i, [&](ImDrawList* dl, ImVec2 p, ImVec2 q) {
                    ImVec2 m(p.x + ui::S(4), p.y + ui::S(4)), n(q.x - ui::S(4), q.y - ui::S(16));
                    dl->AddRectFilledMultiColor(m, n, ImGui::ColorConvertFloat4ToU32(a[i][0]), ImGui::ColorConvertFloat4ToU32(a[i][1]), ImGui::ColorConvertFloat4ToU32(a[i][1]), ImGui::ColorConvertFloat4ToU32(a[i][0]));
                    if (i == 0) for (float x = m.x + ui::S(6); x < n.x; x += ui::S(6)) dl->AddLine({x, m.y}, {x, n.y}, IM_COL32(200, 205, 215, 255));
                    if (i == 2) for (float y = m.y + ui::S(5); y < n.y; y += ui::S(6)) for (float x = m.x + ui::S(5); x < n.x; x += ui::S(6)) dl->AddCircleFilled({x, y}, 0.9f, IM_COL32(150, 150, 160, 255));
                    dl->AddRect(m, n, IM_COL32(0, 0, 0, 30));
                    ImGui::SetWindowFontScale(0.8f);
                    const char* nm = ui::fx::BackdropNames()[i]; ImVec2 ts = ImGui::CalcTextSize(nm);
                    dl->AddText(ImGui::GetFont(), ImGui::GetFontSize(), {(p.x + q.x - ts.x) * 0.5f, q.y - ui::S(14)}, ui::U32(ui::Pal().text), nm);
                    ImGui::SetWindowFontScale(1.0f);
                }, ui::fx::BackdropNames()[i])) { doc.look.backdrop = i; Commit("Fond du tableau blanc"); }
            ImGui::PopID();
        }
        ImGui::EndDisabled();
        rb::EndGroup();

        rb::BeginGroup("Étalonnage");
        ImGui::BeginDisabled(!ui::fx::Available());
        if (ui::Button("Inspecteur", {0, 0}, showInspector)) showInspector = !showInspector;
        ImGui::SameLine(); if (ui::Switch("Actif", &doc.look.grade)) Commit(doc.look.grade ? "Activer l'étalonnage" : "Désactiver l'étalonnage");
        ImGui::SetNextItemWidth(ui::S(170));
        if (ImGui::Combo("##look", &doc.look.preset, ui::fx::PresetNames(), ui::fx::kPresetCount)) { doc.look.grade = true; Commit(std::string("Look : ") + ui::fx::PresetNames()[doc.look.preset]); }
        ImGui::EndDisabled();
        rb::EndGroup();

        rb::BeginGroup("Apparence");
        int mode = dark ? 1 : 0; const char* modes[] = {"Clair", "Sombre"};
        if (ui::Segmented("theme", modes, 2, &mode)) SetDark(mode == 1);
        rb::EndGroup();
    }

    void RibbonView() {
        namespace rb = ui::ribbon;
        rb::BeginGroup("Support de cours PDF");
        if (ui::Button("Ouvrir un PDF…")) PickPdf();
        if (wb.pdf.Loaded()) {
            ImGui::SameLine(); ImGui::AlignTextToFramePadding(); ImGui::Text("Page"); ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(88));
            int pg = wb.CurrentPdfPage() + 1;
            if (ImGui::InputInt("##pg", &pg, 1, 5)) wb.JumpToPdfPage(std::clamp(pg, 1, wb.pdf.PageCount()) - 1);
            ImGui::SameLine(); ImGui::Text("/ %d", wb.pdf.PageCount());
            ui::Switch("Afficher", &wb.pdfVisible);
            ImGui::SameLine(); ImGui::SetNextItemWidth(ui::S(130)); ImGui::SliderFloat("##po", &wb.pdfOpacity, 0.15f, 1.0f, "opacité %.2f");
            if (ImGui::IsItemDeactivatedAfterEdit()) Touch();
            ImGui::SameLine(); if (ui::Button("Retirer")) { wb.ClosePdf(); doc.pdfPath.clear(); Commit("Retirer le PDF"); }
        } else ImGui::TextDisabled(PdfDocument_Available() ? "Surlignages et notes restent ancrés au texte du cours." : "Lecteur PDF non compilé dans cette version.");
        rb::EndGroup();

        rb::BeginGroup("Vue");
        if (ui::Button("Réinitialiser la vue")) wb.ResetView();
        if (ui::Button("Tout désélectionner")) wb.Deselect();
        rb::EndGroup();

        rb::BeginGroup("Échelle de l'interface");
        if (ui::Button("−")) SetScale(uiScale - 0.05f);
        ImGui::SameLine(); ImGui::AlignTextToFramePadding(); ImGui::Text("%d %%", (int)std::lround(uiScale * 100));
        ImGui::SameLine(); if (ui::Button("+")) SetScale(uiScale + 0.05f);
        if (ui::Button("100 %", {0, 0}, std::fabs(uiScale - 1) < 1e-3f)) SetScale(1.0f);
        rb::EndGroup();
    }

    // ---------------------------------------------------------------- dispositions de texte
    void DrawLayoutPreview(ImDrawList* dl, int i, ImVec2 a, ImVec2 b) {
        ImVec2 m(a.x + ui::S(5), a.y + ui::S(5)), n(b.x - ui::S(5), b.y - ui::S(5));
        dl->AddRectFilled(m, n, ui::U32(dark ? ui::Rgb(58, 58, 62) : ui::Rgb(255, 255, 255)), ui::S(2));
        dl->AddRect(m, n, IM_COL32(0, 0, 0, 40), ui::S(2));
        float W = n.x - m.x, H = n.y - m.y;
        ImU32 t = ui::U32(ui::Pal().text), g = ui::U32(ui::WithAlpha(ui::Pal().textDim, 0.7f)), acc = ui::U32(ui::Pal().accent);
        auto bar = [&](float x, float y, float w, float h, ImU32 c) { dl->AddRectFilled({m.x + W * x, m.y + H * y}, {m.x + W * (x + w), m.y + H * (y + h)}, c, 1); };
        switch (i) {
            case 0: bar(0.15f, 0.32f, 0.7f, 0.14f, t); bar(0.25f, 0.56f, 0.5f, 0.07f, g); break;
            case 1: bar(0.1f, 0.12f, 0.6f, 0.12f, t); for (int k = 0; k < 3; ++k) { dl->AddCircleFilled({m.x + W * 0.14f, m.y + H * (0.42f + k * 0.17f)}, 1.6f, acc); bar(0.2f, 0.39f + k * 0.17f, 0.6f, 0.06f, g); } break;
            case 2: bar(0.1f, 0.1f, 0.5f, 0.12f, t); for (int c = 0; c < 2; ++c) { bar(0.1f + c * 0.44f, 0.36f, 0.3f, 0.07f, acc); for (int k = 0; k < 3; ++k) bar(0.1f + c * 0.44f, 0.5f + k * 0.13f, 0.36f, 0.05f, g); } break;
            case 3: { ImFont* f = ui::FamilyFont("serif"); dl->AddText(f, H * 0.6f, {m.x + W * 0.06f, m.y - H * 0.05f}, acc, "“"); bar(0.22f, 0.35f, 0.66f, 0.07f, t); bar(0.22f, 0.5f, 0.56f, 0.07f, t); bar(0.5f, 0.72f, 0.38f, 0.05f, g); break; }
            case 4: { ImFont* f = ui::FamilyFont("title"); ImVec2 ts = f->CalcTextSizeA(H * 0.5f, 1e9f, 0, "42 %"); dl->AddText(f, H * 0.5f, {m.x + (W - ts.x) * 0.5f, m.y + H * 0.12f}, acc, "42 %"); bar(0.25f, 0.72f, 0.5f, 0.07f, g); break; }
            case 5: bar(0.08f, 0.18f, 0.84f, 0.64f, ui::U32(ui::WithAlpha(ui::Pal().accent, 0.14f))); bar(0.08f, 0.18f, 0.04f, 0.64f, acc); bar(0.18f, 0.28f, 0.4f, 0.09f, t); bar(0.18f, 0.48f, 0.64f, 0.06f, g); bar(0.18f, 0.62f, 0.5f, 0.06f, g); break;
            default: bar(0.06f, 0.2f, 0.42f, 0.66f, ui::U32(ui::Rgb(52, 199, 89, 0.3f))); bar(0.52f, 0.2f, 0.42f, 0.66f, ui::U32(ui::Rgb(255, 59, 48, 0.3f)));
                     bar(0.12f, 0.28f, 0.26f, 0.08f, t); bar(0.58f, 0.28f, 0.26f, 0.08f, t); for (int k = 0; k < 2; ++k) { bar(0.12f, 0.5f + k * 0.14f, 0.3f, 0.05f, g); bar(0.58f, 0.5f + k * 0.14f, 0.3f, 0.05f, g); } break;
        }
    }

    // Insère une disposition prête à l'emploi au centre de la vue (comme les mises en page de PowerPoint).
    void InsertLayout(int i) {
        ImVec2 c = wb.ViewCenterWorld(); c.x -= 200; c.y -= 120;
        const float acc[3] = {ui::Pal().accent.x, ui::Pal().accent.y, ui::Pal().accent.z};
        const float ink[3] = {0.11f, 0.11f, 0.13f};
        int firstId = ui::Whiteboard::NextShapeId(doc);
        auto add = [&](ShapeKind k, float x, float y, float w, float h, const std::string& text, const char* font, float size, int ah, const float* col, bool bold = false, bool bullets = false) -> Shape& {
            Shape s = ui::Whiteboard::DefaultShape((int)k, k == ShapeKind::Rect ? acc : ink);
            s.id = ui::Whiteboard::NextShapeId(doc); s.x = c.x + x; s.y = c.y + y; if (k != ShapeKind::Title) { s.w = w; s.h = h; }
            s.text = text; s.font = font; s.fontSize = size; s.alignH = ah; s.alignV = 0; s.bold = bold; s.bullets = bullets;
            s.tc[0] = col[0]; s.tc[1] = col[1]; s.tc[2] = col[2]; s.tc[3] = 1; s.textShadow = false;
            doc.shapes.push_back(s); return doc.shapes.back();
        };
        const float dim[3] = {0.42f, 0.43f, 0.47f};
        switch (i) {
            case 0: add(ShapeKind::TextBox, 0, 0, 440, 70, "Titre de la séance", "title", 44, 1, ink);
                    add(ShapeKind::TextBox, 0, 78, 440, 40, "Sous-titre ou objectif du cours", "ui", 20, 1, dim); break;
            case 1: add(ShapeKind::TextBox, 0, 0, 440, 56, "Points clés", "title", 36, 0, ink);
                    add(ShapeKind::TextBox, 0, 64, 440, 130, "Premier point à retenir\nDeuxième point à retenir\nTroisième point à retenir", "ui", 19, 0, ink, false, true); break;
            case 2: add(ShapeKind::TextBox, 0, 0, 520, 56, "Comparer deux approches", "title", 34, 0, ink);
                    add(ShapeKind::TextBox, 0, 64, 250, 34, "Approche A", "ui", 20, 0, acc, true);
                    add(ShapeKind::TextBox, 0, 100, 250, 110, "Hypothèse\nMéthode\nRésultat", "ui", 17, 0, ink, false, true);
                    add(ShapeKind::TextBox, 270, 64, 250, 34, "Approche B", "ui", 20, 0, acc, true);
                    add(ShapeKind::TextBox, 270, 100, 250, 110, "Hypothèse\nMéthode\nRésultat", "ui", 17, 0, ink, false, true); break;
            case 3: { Shape& q = add(ShapeKind::TextBox, 0, 0, 460, 120, "« Le risque vient de ne pas savoir ce que l'on fait. »", "italic", 28, 1, ink); q.lineSpacing = 1.25f;
                      add(ShapeKind::TextBox, 200, 124, 260, 30, "— Warren Buffett", "ui", 17, 2, dim); break; }
            case 4: add(ShapeKind::TextBox, 0, 0, 360, 110, "42 %", "title", 88, 1, acc);
                    add(ShapeKind::TextBox, 0, 112, 360, 40, "Part des flux actualisés au-delà de 5 ans", "ui", 18, 1, dim); break;
            case 5: { Shape& r = add(ShapeKind::Rect, 0, 0, 460, 150, "", "ui", 18, 0, ink);
                      r.fill = (int)FillType::Solid; r.fillAlpha = 0.10f; r.outline = false; r.radius = 8;
                      Shape& bar = add(ShapeKind::Rect, 0, 0, 8, 150, "", "ui", 18, 0, ink); bar.fill = (int)FillType::Solid; bar.fillAlpha = 1; bar.outline = false; bar.radius = 3;
                      add(ShapeKind::TextBox, 20, 10, 420, 34, "Définition", "ui", 20, 0, acc, true);
                      add(ShapeKind::TextBox, 20, 46, 420, 96, "Le BFR mesure le besoin de financement né du décalage entre encaissements et décaissements du cycle d'exploitation.", "serif", 17, 0, ink); break; }
            default: {
                const float green[3] = {0.2f, 0.78f, 0.35f}, red[3] = {1.0f, 0.23f, 0.19f}, dg[3] = {0.08f, 0.42f, 0.2f}, dr[3] = {0.62f, 0.1f, 0.08f};
                for (int k = 0; k < 2; ++k) {
                    const float* cc = k ? red : green;
                    Shape& r = add(ShapeKind::Rect, k * 250.0f, 0, 235, 190, "", "ui", 18, 0, ink);
                    r.r = cc[0]; r.g = cc[1]; r.b = cc[2]; r.fill = (int)FillType::Solid; r.fillAlpha = 0.14f; r.lc[0] = cc[0]; r.lc[1] = cc[1]; r.lc[2] = cc[2]; r.stroke = 1.5f; r.radius = 12;
                    add(ShapeKind::TextBox, k * 250.0f + 6, 8, 223, 34, k ? "Limites" : "Avantages", "ui", 20, 0, k ? dr : dg, true);
                    add(ShapeKind::TextBox, k * 250.0f + 6, 46, 223, 130, k ? "Sensible aux hypothèses\nTaux difficile à estimer" : "Simple à calculer\nComparable entre projets", "ui", 16, 0, ink, false, true);
                }
            }
        }
        (void)firstId;
        const char* names[] = {"Titre et sous-titre", "Titre et liste", "Deux colonnes", "Citation", "Chiffre clé", "Définition", "Comparaison"};
        wb.tool = ui::Tool::Element; wb.Select(doc.shapes.back().id);
        Commit(std::string("Disposition : ") + names[i]);
        status = std::string("Disposition insérée : ") + names[i] + " (double-clic sur un texte pour le modifier)";
    }

    // Inspecteur d'étalonnage façon logiciel de montage (roues remplacées par des curseurs compacts).
    void Inspector(float w) {
        Look& L = doc.look;
        ui::BeginCard("insp", ImVec2(w, 0));
        ui::TitleText("Étalonnage", ui::Pal().text);
        ImGui::SameLine(ImGui::GetContentRegionMax().x - ui::S(44));
        if (ui::Switch("##gr", &L.grade)) Commit(L.grade ? "Activer l'étalonnage" : "Désactiver l'étalonnage");
        ImGui::BeginDisabled(!L.grade);
        ui::SectionLabel("LOOK");
        for (int i = 0; i < ui::fx::kPresetCount; ++i) {
            ImVec2 bs((ImGui::GetContentRegionAvail().x - ImGui::GetStyle().ItemSpacing.x) * 0.5f, 0);
            if (i % 2) ImGui::SameLine(); else bs.x = (ImGui::GetContentRegionAvail().x - ImGui::GetStyle().ItemSpacing.x) * 0.5f;
            if (ui::Button(ui::fx::PresetNames()[i], bs, L.preset == i)) { L.preset = i; Commit(std::string("Look : ") + ui::fx::PresetNames()[i]); }
        }
        bool any = false;
        auto slider = [&](const char* label, float* v, float lo, float hi, const char* fmt, float def) {
            ImGui::PushID(label);
            ImGui::AlignTextToFramePadding(); ImGui::TextUnformatted(label);
            ImGui::SameLine(ImGui::GetContentRegionMax().x - ui::S(150));
            ImGui::SetNextItemWidth(ui::S(150));
            ImGui::SliderFloat("##v", v, lo, hi, fmt);
            if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(0)) { *v = def; any = true; }
            if (ImGui::IsItemDeactivatedAfterEdit()) any = true;
            ImGui::PopID();
        };
        slider("Intensité", &L.mix, 0, 1, "%.2f", 1);
        ImGui::Spacing(); ui::SectionLabel("CORRECTION PRIMAIRE");
        slider("Exposition", &L.exposure, -2, 2, "%+.2f IL", 0);
        slider("Contraste", &L.contrast, 0.5f, 1.6f, "%.2f", 1);
        slider("Saturation", &L.saturation, 0, 2, "%.2f", 1);
        slider("Température", &L.temperature, -1, 1, "%+.2f", 0);
        slider("Teinte", &L.tint, -1, 1, "%+.2f", 0);
        slider("Fondu", &L.fade, 0, 1, "%.2f", 0);
        slider("Netteté", &L.sharpen, 0, 1, "%.2f", 0);
        ImGui::Spacing(); ui::SectionLabel("OPTIQUE ET PELLICULE");
        slider("Vignettage", &L.vignette, 0, 1, "%.2f", 0);
        slider("Grain", &L.grain, 0, 1, "%.2f", 0);
        slider("Aberration", &L.aberration, 0, 1, "%.2f", 0);
        if (ui::Switch("Format cinéma 2,39:1", &L.letterbox)) any = true;
        if (any) Commit("Réglage d'étalonnage");
        ImGui::Spacing();
        if (ui::Button("Réinitialiser", {-1, 0})) { int bgm = L.backdrop; L = Look{}; L.backdrop = bgm; L.grade = true; Commit("Réinitialiser l'étalonnage"); }
        ImGui::EndDisabled();
        ImGui::Spacing();
        ImGui::PushTextWrapPos(0);
        ImGui::TextDisabled("Double-clic sur un curseur : valeur neutre. L'étalonnage s'applique au tableau blanc et au PDF.");
        ImGui::PopTextWrapPos();
        ui::EndCard();
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
        { ImVec4 sb = ui::Pal().sidebar; ui::BeginCard("clib", ImVec2(ui::S(320), 0), 0, &sb); }
        ui::SectionLabel("MODULES DE COURS");
        for (int i = 0; i < (int)modules.size(); ++i)
            if (ImGui::Selectable(modules[i].title.c_str(), supIdx < 0 && i == modIdx)) { modIdx = i; supIdx = -1; }
        ImGui::Spacing(); ui::SectionLabel(("SUPPORTS PDF (" + std::to_string(supports.size()) + ")").c_str()); ImGui::Separator();
        std::string last;
        for (int i = 0; i < (int)supports.size(); ++i) {
            if (supports[i].theme != last) { last = supports[i].theme; ImGui::Spacing(); ImGui::TextColored(ui::Accent(dark), "%s", last.c_str()); }
            bool local = !FindLocal(supports[i]).empty();
            ImGui::PushStyleColor(ImGuiCol_Text, local ? ui::Ok(dark) : ImGui::GetStyleColorVec4(ImGuiCol_TextDisabled));
            ImGui::TextUnformatted(local ? "●" : "○"); ImGui::PopStyleColor(); ImGui::SameLine();
            if (ImGui::Selectable((supports[i].title + "##s" + std::to_string(i)).c_str(), supIdx == i)) supIdx = i;
        }
        ImGui::EndChild();
        ImGui::SameLine(0, ui::S(10));
        ui::BeginCard("creader", ImVec2(0, 0));
        if (supIdx >= 0) {
            const SupportDoc& d = supports[supIdx];
            ui::TitleText(d.title.c_str(), ui::Pal().text); ImGui::TextDisabled("%s", d.theme.c_str()); ImGui::Separator();
            fs::path local = FindLocal(d);
            if (!local.empty()) {
                ImGui::TextColored(ui::Ok(dark), "Fichier trouvé : %s", local.string().c_str());
                if (ui::Button("Ouvrir dans le lecteur PDF (tableau blanc)")) OpenPdf(local.string());
            } else {
                ImGui::TextWrapped("Ce support n'est pas encore sur cet ordinateur. Téléchargez-le depuis votre Drive et placez-le dans :");
                ImGui::TextDisabled("%s", coursesDir.string().c_str());
                ImGui::TextWrapped("sous le nom « %s ». Il s'ouvrira alors ici, avec surlignage et annotations.", d.file.c_str());
            }
            if (ui::Button("Ouvrir dans Google Drive")) SDL_OpenURL(DriveUrl(d.driveId).c_str());
            ImGui::SameLine(); if (ui::Button("Choisir un PDF sur le disque...")) PickPdf();
        } else if (modIdx >= 0 && modIdx < (int)modules.size()) {
            CourseModule& m = modules[modIdx];
            ui::TitleText(m.title.c_str(), ui::Pal().text); ImGui::TextDisabled("Sources : %s", m.source.c_str()); ImGui::Separator();
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
                        if (ui::Button((sec.snippets[k].label + "  >").c_str())) ApplySnippet(sec.snippets[k]);
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
            // éléments de montage : titre, bandeau, post-it, bulle, flèche
            auto shape = [&](ShapeKind k, float x, float y, float w, float h, const char* t, const char* sub, float r, float g, float b) -> Shape& {
                float rgb[3] = {r, g, b};
                Shape e = ui::Whiteboard::DefaultShape((int)k, rgb); e.id = (int)s.shapes.size() + 1; e.x = x; e.y = y;
                if (k != ShapeKind::Title) { e.w = w; e.h = h; }
                e.text = t; e.sub = sub; s.shapes.push_back(e); return s.shapes.back(); };
            shape(ShapeKind::Title, 560, 380, 0, 0, "Gestion du risque", "", 0.11f, 0.11f, 0.13f);
            shape(ShapeKind::Note, 1040, 380, 175, 150, "VaR 99 % sur 10 jours : multiplier la VaR 1 jour par racine de 10.", "", 1, 0.84f, 0.04f);
            shape(ShapeKind::Arrow, 1030, 450, -120, 40, "", "", 0.88f, 0.22f, 0.24f);
            shape(ShapeKind::LowerThird, 60, 420, 360, 66, "Black-Scholes-Merton", "Prix d'un call européen sans dividende", 0.0f, 0.48f, 1.0f);
            { Shape& b = shape(ShapeKind::Bubble, 600, 470, 230, 64, "Le BFR se finance par le FRNG.", "", 1, 1, 1);
              b.lc[0] = 0.16f; b.lc[1] = 0.66f; b.lc[2] = 0.27f; }
            // formes mises en forme : dégradés, effets et texte formaté
            { Shape& st = shape(ShapeKind::Star, 1240, 170, 140, 130, "", "", 1.0f, 0.95f, 0.6f);
              st.fill = (int)FillType::Radial; st.fillAlpha = 1; st.c2[0] = 0.93f; st.c2[1] = 0.55f; st.c2[2] = 0.05f; st.glow = true; st.outline = false; }
            { Shape& ba = shape(ShapeKind::BlockArrow, 870, 170, 170, 80, "Cash-flow", "", 0.2f, 0.55f, 1.0f);
              ba.fill = (int)FillType::Linear; ba.fillAlpha = 1; ba.c2[0] = 0.0f; ba.c2[1] = 0.25f; ba.c2[2] = 0.7f; ba.outline = false; ba.gloss = true; ba.bevel = true; ba.shadow = true;
              ba.tc[0] = ba.tc[1] = ba.tc[2] = 1; ba.bold = true; ba.fontSize = 17; ba.alignH = 0; }
            { Shape& tb = shape(ShapeKind::TextBox, 1222, 330, 168, 250, "À retenir\n- La VaR ignore la queue de distribution\n- L'ES est sous-additive\n- Bâle III retient l'ES à 97,5 %", "", 0, 0, 0);
              tb.font = "serif"; tb.fontSize = 14; tb.lineSpacing = 1.3f; tb.fill = (int)FillType::Solid; tb.r = 1; tb.g = 1; tb.b = 1; tb.fillAlpha = 0.85f; tb.outline = true; tb.lc[0] = 0.8f; tb.lc[1] = 0.8f; tb.lc[2] = 0.84f; tb.stroke = 1; tb.dash = (int)Dash::Dashed; }
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
        ImGui::SetNextItemWidth(ui::S(460));
        if (focusFormula) { ImGui::SetKeyboardFocusHere(); focusFormula = false; }
        if (ImGui::InputText("##formula", &formula, ImGuiInputTextFlags_EnterReturnsTrue)) {
            sheet.SetCell(sel_r, sel_c, formula);
            Commit("Cellule " + Spreadsheet::RefName(sel_r, sel_c));
            if (sel_r + 1 < Spreadsheet::kRows) { ++sel_r; formula = sheet.Get(sel_r, sel_c).raw; }
        }
        ImGui::SameLine(); if (ui::Button("Importer CSV/TSV...")) PickCsv();
        ImGui::SameLine(); if (ui::Button("Importer dernier résultat SQL")) { sheet.ImportSql(sqlRes); Commit("SQL vers tableur"); }
        ImGui::SameLine(); if (ui::Button("Vider")) { sheet.Clear(); sheet.Recalculate(); Commit("Vider le tableur"); }
        if (ImGui::BeginTable("grid", Spreadsheet::kCols + 1, ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollX | ImGuiTableFlags_ScrollY | ImGuiTableFlags_NoSavedSettings, ImVec2(0, 0))) {
            ImGui::TableSetupScrollFreeze(1, 1);
            ImGui::TableSetupColumn("#", ImGuiTableColumnFlags_WidthFixed, ui::S(38));
            for (int c = 0; c < Spreadsheet::kCols; ++c) ImGui::TableSetupColumn(Spreadsheet::ColName(c).c_str(), ImGuiTableColumnFlags_WidthFixed, ui::S(110));
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
            if (ui::Button("Enregistrer", {0, 0}, true)) { SaveCmd(); ImGui::CloseCurrentPopup(); if (!modified) Run(pending); else pending = Pending::None; }
            ImGui::SameLine(); if (ui::Button("Ne pas enregistrer")) { ImGui::CloseCurrentPopup(); Run(pending); }
            ImGui::SameLine(); if (ui::Button("Annuler")) { pending = Pending::None; ImGui::CloseCurrentPopup(); }
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Récupération", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
            ImGui::TextWrapped("Une auto-sauvegarde plus récente a été trouvée (%s).\nVoulez-vous la restaurer ?", recoveryFile.filename().string().c_str());
            if (ui::Button("Restaurer")) { LoadInto(recoveryFile, recoveryTarget); ImGui::CloseCurrentPopup(); }
            ImGui::SameLine();
            if (ui::Button("Ignorer")) {
                if (!recoveryTarget.empty()) LoadInto(recoveryTarget, recoveryTarget);
                else AutoSave::DiscardAll(sessionPath);
                ImGui::CloseCurrentPopup();
            }
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Chemin du fichier", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
            ImGui::TextDisabled("Boîtes de dialogue natives indisponibles : saisissez le chemin.");
            ImGui::SetNextItemWidth(ui::S(520)); ImGui::InputText("##pp", &pathBuf);
            if (ui::Button("OK")) { std::string p = pathBuf; ImGui::CloseCurrentPopup(); Handle(pathPurpose, p); }
            ImGui::SameLine(); if (ui::Button("Annuler")) ImGui::CloseCurrentPopup();
            ImGui::EndPopup();
        }
        ImGui::SetNextWindowPos(c, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
        if (ImGui::BeginPopupModal("Importer un fichier CSV / TSV", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) CsvModal();
    }

    void CsvModal() {
        ImGui::TextDisabled("%s", csvPath.c_str());
        const char* dl[] = {"Auto", "Virgule ,", "Point-virgule ;", "Tabulation", "Barre |"};
        ImGui::SetNextItemWidth(ui::S(170)); if (ImGui::Combo("Séparateur", &csvDelim, dl, 5)) ReparseCsv();
        if (!csv.ok()) { ImGui::TextColored(ui::Danger(dark), "%s", csv.error.c_str()); }
        else {
            ImGui::SameLine(); ImGui::Text("%zu colonnes, %zu lignes%s%s", csv.header.size(), csv.rows.size(), csv.hasHeader ? ", en-tête détecté" : ", sans en-tête", csv.decimalComma ? ", décimale virgule" : "");
            if (ImGui::BeginTable("prev", (int)std::min<size_t>(csv.header.size(), 8), ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollX, ui::S(ImVec2(640, 190)))) {
                int nc = (int)std::min<size_t>(csv.header.size(), 8);
                for (int k = 0; k < nc; ++k) { const char* tn = csv.types[k] == ColType::Integer ? " [ent]" : csv.types[k] == ColType::Real ? " [réel]" : " [texte]"; ImGui::TableSetupColumn((csv.header[k] + tn).c_str()); }
                ImGui::TableHeadersRow();
                for (size_t r = 0; r < std::min<size_t>(csv.rows.size(), 8); ++r) { ImGui::TableNextRow(); for (int k = 0; k < nc; ++k) { ImGui::TableSetColumnIndex(k); ImGui::TextUnformatted(csv.rows[r][k].c_str()); } }
                ImGui::EndTable();
            }
            ImGui::RadioButton("Tableur", &csvDest, 0); ImGui::SameLine(); ImGui::RadioButton("Table SQLite3", &csvDest, 1); ImGui::SameLine(); ImGui::RadioButton("Les deux", &csvDest, 2);
            if (csvDest != 0) { ImGui::SetNextItemWidth(ui::S(240)); ImGui::InputText("Nom de la table", &csvTable); }
            if (csvDest != 1) ImGui::TextDisabled("Le tableur sera remplacé (annulable avec Annuler).");
        }
        ImGui::BeginDisabled(!csv.ok());
        if (ui::Button("Importer", {0, 0}, true)) { DoCsvImport(); ImGui::CloseCurrentPopup(); }
        ImGui::EndDisabled();
        ImGui::SameLine(); if (ui::Button("Annuler")) ImGui::CloseCurrentPopup();
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
struct Cli { int ribbon = -1, select = -1; bool demo = false, dark = false, preview = false, inspector = false; float scale = 0; int backdrop = -1, look = -1, element = -1; int tab = 0, frames = 8, module = -1, support = -1, exercise = -1, studyTab = -1; std::string shot, pdf; int pdfPage = 0; };
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
        else if (a == "--scale") cli.scale = (float)std::atof(next().c_str()); else if (a == "--backdrop") cli.backdrop = std::atoi(next().c_str());
        else if (a == "--look") cli.look = std::atoi(next().c_str()); else if (a == "--inspector") cli.inspector = true;
        else if (a == "--elements") cli.element = 1;
        else if (a == "--ribbon") cli.ribbon = std::atoi(next().c_str()); else if (a == "--select") cli.select = std::atoi(next().c_str());
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
    // Échelle : SDL_GetWindowDisplayScale = densité de pixels (Retina) x échelle de contenu (Windows 150 %).
    // Les coordonnées ImGui sont en points : on rastérise les polices à la densité réelle (texte net)
    // et on dimensionne l'interface selon l'échelle de contenu x la préférence utilisateur.
    auto rebuildUi = [&](float userScale, bool dark, bool backendReady) {
        float density = SDL_GetWindowPixelDensity(win); if (density <= 0) density = 1;
        float content = SDL_GetWindowDisplayScale(win) / density; if (content <= 0) content = 1;
        ui::Scale() = content * userScale;
        io.Fonts->Clear();
        ui::LoadFonts(ui::Scale() * density);
        io.FontGlobalScale = 1.0f / density;
        ui::TypesetCache().clear();
        ui::Apply(dark);
        if (backendReady) { ImGui_ImplOpenGL3_DestroyFontsTexture(); ImGui_ImplOpenGL3_CreateFontsTexture(); }
    };
    ImGui_ImplSDL3_InitForOpenGL(win, gl);
    ImGui_ImplOpenGL3_Init(glsl);
    ui::fx::Init();

    {
        App app;
        if (!cli.demo) app.LoadPrefs();          // captures de démonstration reproductibles
        if (cli.scale > 0) app.uiScale = std::clamp(cli.scale, 0.8f, 1.75f);
        if (cli.dark) app.dark = true;
        rebuildUi(app.uiScale, app.dark, false); app.tab = cli.tab; app.notesPreview = cli.preview; app.demoMargin = !cli.pdf.empty();
        if (cli.demo) app.LoadDemo();
        if (cli.backdrop >= 0) app.doc.look.backdrop = cli.backdrop;
        if (cli.look >= 0) { app.doc.look.grade = true; app.doc.look.preset = cli.look; app.doc.look.vignette = 0.35f; app.doc.look.grain = 0.25f; }
        if (cli.inspector) { app.showInspector = true; app.doc.look.grade = true; }
        if (cli.element > 0) app.wb.tool = ui::Tool::Element;
        if (cli.select > 0) { app.wb.tool = ui::Tool::Element; app.wb.Select(cli.select); }
        if (cli.ribbon >= 0) { app.ribbonTab = cli.ribbon; app.ribbonSeen = cli.select > 0 ? cli.select : -1; }
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
                if (ev.type == SDL_EVENT_WINDOW_DISPLAY_SCALE_CHANGED) app.uiDirty = true;   // déplacement vers un autre écran
            }
            if (app.uiDirty) { rebuildUi(app.uiScale, app.dark, true); app.uiDirty = false; }
            ImGui_ImplOpenGL3_NewFrame(); ImGui_ImplSDL3_NewFrame(); ImGui::NewFrame();
            app.Frame(win);
            ImGui::Render();
            glViewport(0, 0, (int)io.DisplaySize.x * (int)io.DisplayFramebufferScale.x, (int)io.DisplaySize.y * (int)io.DisplayFramebufferScale.y);
            { ImVec4 c = ui::Pal().bgTop; glClearColor(c.x, c.y, c.z, 1); } glClear(GL_COLOR_BUFFER_BIT);
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

    ui::fx::Shutdown();
    ImGui_ImplOpenGL3_Shutdown(); ImGui_ImplSDL3_Shutdown(); ImGui::DestroyContext();
    SDL_GL_DestroyContext(gl); SDL_DestroyWindow(win); SDL_Quit();
    return 0;
}
