// Solfège Quest — lanceur de bureau en C++ (remplace la version Go, même comportement).
//
// 1. contient toute l'application (HTML autonome gzip, icônes) en ressources ;
// 2. la sert uniquement sur 127.0.0.1, port 47213 (ou suivants si occupé) ;
// 3. l'ouvre dans une fenêtre « application » d'Edge (à défaut Chrome, Brave), profil dédié ;
// 4. se ferme quand la fenêtre est fermée.
//
// L'interface est strictement celle de l'application web embarquée : le HTML servi est
// octet pour octet celui de la version Go.

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "assets.hpp"
#include "gunzip.hpp"
#include "http_server.hpp"
#include "resource_ids.h"

#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#else
#include <signal.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>
#endif

namespace sq {
namespace {

const char* kAppName = "Solfège Quest";
const char* kIdBody = "SolfegeQuest";
const int kDefaultPort = 47213;
const int kPortTries = 24;  // 47213 … 47236
const auto kStartGrace = std::chrono::seconds(120);
const auto kPingIdle = std::chrono::seconds(150);  // > 60 s : fenêtre réduite = minuteries ralenties

using Clock = std::chrono::steady_clock;

// ------------------------------------------------------------------ chaînes / chemins

#ifdef _WIN32
std::wstring widen(const std::string& s) {
    if (s.empty()) return {};
    int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), int(s.size()), nullptr, 0);
    std::wstring w(size_t(n), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), int(s.size()), &w[0], n);
    return w;
}
std::string narrow(const std::wstring& w) {
    if (w.empty()) return {};
    int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), int(w.size()), nullptr, 0, nullptr, nullptr);
    std::string s(size_t(n), '\0');
    WideCharToMultiByte(CP_UTF8, 0, w.data(), int(w.size()), &s[0], n, nullptr, nullptr);
    return s;
}
std::string getenvU(const char* name) {
    std::wstring wn = widen(name);
    DWORD n = GetEnvironmentVariableW(wn.c_str(), nullptr, 0);
    if (!n) return {};
    std::wstring v(n, L'\0');
    n = GetEnvironmentVariableW(wn.c_str(), &v[0], n);
    v.resize(n);
    return narrow(v);
}
const char kSep = '\\';
bool fileExists(const std::string& p) {
    DWORD a = GetFileAttributesW(widen(p).c_str());
    return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}
void mkdirs(const std::string& p) { SHCreateDirectoryExW(nullptr, widen(p).c_str(), nullptr); }
#else
std::string getenvU(const char* name) {
    const char* v = std::getenv(name);
    return v ? v : "";
}
const char kSep = '/';
bool fileExists(const std::string& p) {
    struct stat st;
    return ::stat(p.c_str(), &st) == 0 && S_ISREG(st.st_mode);
}
void mkdirs(const std::string& p) {
    std::string cur;
    for (size_t i = 0; i <= p.size(); ++i) {
        if (i == p.size() || p[i] == '/') {
            if (!cur.empty()) ::mkdir(cur.c_str(), 0755);
        }
        if (i < p.size()) cur.push_back(p[i]);
    }
}
#endif

std::string join(const std::string& a, const std::string& b) {
    if (a.empty()) return b;
    if (a.back() == '\\' || a.back() == '/') return a + b;
    return a + kSep + b;
}

std::string format(const char* fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    char buf[2048];
    vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    return buf;
}

// Dossier de données : %LOCALAPPDATA%\SolfegeQuest (Windows), ~/.local/share/SolfegeQuest ailleurs.
std::string dataDir() {
#ifdef _WIN32
    std::string base = getenvU("LOCALAPPDATA");
    if (base.empty()) {
        PWSTR p = nullptr;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &p))) {
            base = narrow(p);
            CoTaskMemFree(p);
        }
    }
    if (base.empty()) {
        wchar_t tmp[MAX_PATH];
        GetTempPathW(MAX_PATH, tmp);
        base = narrow(tmp);
    }
    return join(base, "SolfegeQuest");
#else
    std::string base = getenvU("XDG_DATA_HOME");
    if (base.empty()) base = join(getenvU("HOME"), ".local/share");
    return join(base, "SolfegeQuest");
#endif
}

// ------------------------------------------------------------------ journal

class Journal {
public:
    void open(const std::string& path) {
        std::lock_guard<std::mutex> l(m_);
#ifdef _WIN32
        f_ = _wfopen(widen(path).c_str(), L"wb");
#else
        f_ = std::fopen(path.c_str(), "wb");
#endif
    }
    void log(const std::string& msg) {
        std::lock_guard<std::mutex> l(m_);
        std::time_t t = std::time(nullptr);
        std::tm tm{};
#ifdef _WIN32
        localtime_s(&tm, &t);
#else
        localtime_r(&t, &tm);
#endif
        char ts[32];
        std::strftime(ts, sizeof ts, "%Y/%m/%d %H:%M:%S", &tm);
        std::string line = std::string(ts) + " " + msg + "\n";
        if (f_) {
            std::fwrite(line.data(), 1, line.size(), f_);
            std::fflush(f_);
        }
#ifndef _WIN32
        std::fwrite(line.data(), 1, line.size(), stderr);
#endif
    }

private:
    std::mutex m_;
    FILE* f_ = nullptr;
};

Journal journal;

void messageBox(const std::string& text, bool error) {
#ifdef _WIN32
    MessageBoxW(nullptr, widen(text).c_str(), widen(kAppName).c_str(),
                MB_OK | MB_SETFOREGROUND | (error ? MB_ICONERROR : MB_ICONINFORMATION));
#else
    std::fprintf(stderr, "%s\n", text.c_str());
    (void)error;
#endif
}

[[noreturn]] void fatal(const std::string& msg) {
    journal.log("erreur : " + msg);
    messageBox(msg, true);
    std::exit(1);
}

// Sortie texte (--version, --help) : console du parent si elle existe, sinon boîte de dialogue.
void printOut(const std::string& text) {
#ifdef _WIN32
    if (AttachConsole(ATTACH_PARENT_PROCESS)) {
        HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
        std::wstring w = widen(text);
        DWORD n;
        if (!WriteConsoleW(h, w.c_str(), DWORD(w.size()), &n, nullptr))
            WriteFile(h, text.data(), DWORD(text.size()), &n, nullptr);  // sortie redirigée
        FreeConsole();
    } else {
        messageBox(text, false);
    }
#else
    std::fputs(text.c_str(), stdout);
#endif
}

// ------------------------------------------------------------------ options

struct Options {
    std::string profile;
    std::string browser;
    int port = kDefaultPort;
    bool noBrowser = false;
    bool version = false;
};

const char* kUsage =
    "Usage : SolfegeQuest.exe [options]\n"
    "  --profile <dossier>   dossier du profil du navigateur (défaut : %LOCALAPPDATA%\\SolfegeQuest\\profile)\n"
    "  --browser <chemin>    chemin d'un navigateur Chromium à utiliser\n"
    "  --port <n>            port local (par défaut : 47213, puis les suivants s'il est occupé)\n"
    "  --no-browser          ne pas ouvrir de fenêtre (serveur seul — tests)\n"
    "  --version             affiche la version\n";

Options parseArgs(const std::vector<std::string>& args) {
    Options o;
    for (size_t i = 0; i < args.size(); ++i) {
        std::string a = args[i];
        if (a.size() < 2 || a[0] != '-') fatal(format("argument inattendu : %s\n\n%s", a.c_str(), kUsage));
        std::string name = a.substr(a[1] == '-' ? 2 : 1);  // -x et --x, comme le paquet flag de Go
        std::string value;
        bool hasValue = false;
        size_t eq = name.find('=');
        if (eq != std::string::npos) {
            value = name.substr(eq + 1);
            name = name.substr(0, eq);
            hasValue = true;
        }
        auto take = [&]() -> std::string {
            if (hasValue) return value;
            if (i + 1 >= args.size()) fatal(format("l'option -%s attend une valeur\n\n%s", name.c_str(), kUsage));
            return args[++i];
        };
        auto boolean = [&]() -> bool {
            if (!hasValue) return true;
            return value == "1" || value == "true" || value == "TRUE" || value == "True" || value == "t" || value == "T";
        };
        if (name == "profile") o.profile = take();
        else if (name == "browser") o.browser = take();
        else if (name == "port") {
            std::string v = take();
            char* end = nullptr;
            long p = std::strtol(v.c_str(), &end, 10);
            if (!end || *end || p < 1 || p > 65535) fatal(format("valeur invalide « %s » pour -port\n\n%s", v.c_str(), kUsage));
            o.port = int(p);
        } else if (name == "no-browser") o.noBrowser = boolean();
        else if (name == "version") o.version = boolean();
        else if (name == "h" || name == "help") { printOut(kUsage); std::exit(0); }
        else fatal(format("flag provided but not defined: -%s\n\n%s", name.c_str(), kUsage));
    }
    return o;
}

// ------------------------------------------------------------------ serveur

struct AppState {
    int port = 0;
    std::atomic<int64_t> lastPingMs{0};  // ms depuis le démarrage (0 = jamais)
    Clock::time_point started = Clock::now();
    std::string etag;
    std::once_flag plainOnce;
    std::string plainHtml;  // HTML décompressé (clients sans gzip seulement)

    void ping() {
        lastPingMs = std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - started).count() + 1;
    }
    // Vrai si un signal de vie est arrivé depuis `t`.
    bool pingedSince(Clock::time_point t) const {
        int64_t ms = lastPingMs.load();
        return ms && started + std::chrono::milliseconds(ms) >= t;
    }
};

uint64_t fnv1a(const uint8_t* p, size_t n) {
    uint64_t h = 1469598103934665603ull;
    for (size_t i = 0; i < n; ++i) h = (h ^ p[i]) * 1099511628211ull;
    return h;
}

bool acceptsGzip(const std::string& ae) {
    std::string s = ae;
    for (auto& c : s) c = char(std::tolower(static_cast<unsigned char>(c)));
    size_t p = s.find("gzip");
    if (p == std::string::npos) return false;
    size_t semi = s.find_first_of(",", p);
    std::string part = s.substr(p, semi == std::string::npos ? std::string::npos : semi - p);
    return part.find("q=0") == std::string::npos || part.find("q=0.") != std::string::npos;
}

Handler makeHandler(AppState& st) {
    return [&st](const Request& req, Response& res) {
        res.headers["X-Content-Type-Options"] = "nosniff";

        // Protection contre le DNS rebinding : seuls 127.0.0.1:port et localhost:port.
        std::string host = req.header("host");
        if (host != format("127.0.0.1:%d", st.port) && host != format("localhost:%d", st.port)) {
            res.status = 403;
            res.headers["Content-Type"] = "text/plain; charset=utf-8";
            res.body = "hôte refusé\n";
            return;
        }

        const std::string& p = req.path;
        bool get = req.method == "GET" || req.method == "HEAD";

        if (p == "/__sq/ping") {
            st.ping();
            res.status = 204;
            res.headers["Cache-Control"] = "no-store";
            return;
        }
        if (p == "/__sq/id") {
            res.headers["Content-Type"] = "text/plain; charset=utf-8";
            res.headers["Cache-Control"] = "no-store";
            res.body = kIdBody;
            return;
        }
        if (!get) {
            res.status = 405;
            res.headers["Allow"] = "GET, HEAD";
            res.headers["Content-Type"] = "text/plain; charset=utf-8";
            res.body = "Method Not Allowed\n";
            return;
        }
        if (p == "/" || p == "/index.html") {
            st.ping();
            res.headers["Content-Type"] = "text/html; charset=utf-8";
            res.headers["Cache-Control"] = "no-cache";
            res.headers["Vary"] = "Accept-Encoding";
            res.headers["ETag"] = st.etag;
            if (req.header("if-none-match") == st.etag) {
                res.status = 304;
                return;
            }
            Blob gz = assetAppHtmlGz();
            if (acceptsGzip(req.header("accept-encoding"))) {
                res.headers["Content-Encoding"] = "gzip";
                res.ext = gz.data;
                res.extSize = gz.size;
            } else {
                std::call_once(st.plainOnce, [&] { st.plainHtml = gunzip(gz.data, gz.size); });
                res.ext = reinterpret_cast<const uint8_t*>(st.plainHtml.data());
                res.extSize = st.plainHtml.size();
            }
            return;
        }
        if (p == "/icon.png") {
            Blob b = assetIconPng();
            res.headers["Content-Type"] = "image/png";
            res.headers["Cache-Control"] = "max-age=86400";
            res.ext = b.data;
            res.extSize = b.size;
            return;
        }
        if (p == "/favicon.ico") {
            Blob b = assetIconIco();
            res.headers["Content-Type"] = "image/x-icon";
            res.headers["Cache-Control"] = "max-age=86400";
            res.ext = b.data;
            res.extSize = b.size;
            return;
        }
        res.status = 404;
        res.headers["Content-Type"] = "text/plain; charset=utf-8";
        res.body = "404 page not found\n";
    };
}

bool runningHere(int port) {
    std::string body;
    return httpGetLocal(port, "/__sq/id", &body, 1500) == 200 && body.rfind(kIdBody, 0) == 0;
}

// ------------------------------------------------------------------ navigateur

struct BrowserProcess {
#ifdef _WIN32
    HANDLE handle = nullptr;
#else
    pid_t pid = 0;
#endif
    bool valid() const {
#ifdef _WIN32
        return handle != nullptr;
#else
        return pid > 0;
#endif
    }
};

std::vector<std::string> browsers(const std::string& forced) {
    std::vector<std::string> out;
    if (!forced.empty()) {
        out.push_back(forced);
        return out;
    }
#ifdef _WIN32
    const char* rel[] = {"Microsoft\\Edge\\Application\\msedge.exe", "Google\\Chrome\\Application\\chrome.exe",
                         "BraveSoftware\\Brave-Browser\\Application\\brave.exe"};
    const char* roots[] = {"ProgramFiles(x86)", "ProgramFiles", "ProgramW6432", "LOCALAPPDATA"};
    for (const char* r : rel) {
        for (const char* root : roots) {
            std::string base = getenvU(root);
            if (base.empty()) continue;
            std::string p = join(base, r);
            if (fileExists(p) && std::find(out.begin(), out.end(), p) == out.end()) out.push_back(p);
        }
    }
    // Dernier recours : msedge.exe / chrome.exe dans le PATH.
    for (const char* exe : {"msedge.exe", "chrome.exe"}) {
        wchar_t buf[MAX_PATH];
        if (SearchPathW(nullptr, widen(exe).c_str(), nullptr, MAX_PATH, buf, nullptr)) {
            std::string p = narrow(buf);
            if (std::find(out.begin(), out.end(), p) == out.end()) out.push_back(p);
        }
    }
#else
    const char* cands[] = {"/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium",
                           "/usr/bin/chromium-browser", "/usr/bin/brave-browser",
                           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"};
    for (const char* c : cands)
        if (fileExists(c)) out.push_back(c);
#endif
    return out;
}

std::vector<std::string> chromiumArgs(const std::string& url, const std::string& profile) {
    return {
        "--app=" + url,
        "--user-data-dir=" + profile,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-mode",
        "--hide-crash-restore-bubble",
        "--disable-session-crashed-bubble",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-features=Translate,TranslateUI,msEdgeShoppingUI,msWebOOUI",
        "--window-size=1400,900",
    };
}

#ifdef _WIN32
// Guillemets selon les règles de CommandLineToArgvW.
std::wstring quoteArg(const std::wstring& a) {
    if (!a.empty() && a.find_first_of(L" \t\"") == std::wstring::npos) return a;
    std::wstring out = L"\"";
    size_t bs = 0;
    for (wchar_t c : a) {
        if (c == L'\\') { ++bs; continue; }
        if (c == L'"') out.append(bs * 2 + 1, L'\\');
        else out.append(bs, L'\\');
        bs = 0;
        out.push_back(c);
    }
    out.append(bs * 2, L'\\');
    out.push_back(L'"');
    return out;
}
#endif

bool launch(const std::string& exe, const std::vector<std::string>& args, BrowserProcess& proc, std::string& err) {
#ifdef _WIN32
    std::wstring cmd = quoteArg(widen(exe));
    for (auto& a : args) cmd += L" " + quoteArg(widen(a));
    STARTUPINFOW si{};
    si.cb = sizeof si;
    PROCESS_INFORMATION pi{};
    std::vector<wchar_t> buf(cmd.begin(), cmd.end());
    buf.push_back(0);
    if (!CreateProcessW(widen(exe).c_str(), buf.data(), nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi)) {
        err = format("code %lu", static_cast<unsigned long>(GetLastError()));
        return false;
    }
    CloseHandle(pi.hThread);
    proc.handle = pi.hProcess;
    journal.log(format("fenêtre ouverte avec %s (pid %lu)", exe.c_str(), static_cast<unsigned long>(pi.dwProcessId)));
    return true;
#else
    pid_t pid = fork();
    if (pid < 0) { err = "fork"; return false; }
    if (pid == 0) {
        std::vector<char*> av;
        av.push_back(const_cast<char*>(exe.c_str()));
        for (auto& a : args) av.push_back(const_cast<char*>(a.c_str()));
        av.push_back(nullptr);
        execv(exe.c_str(), av.data());
        _exit(127);
    }
    proc.pid = pid;
    journal.log(format("fenêtre ouverte avec %s (pid %d)", exe.c_str(), int(pid)));
    return true;
#endif
}

bool openDefaultBrowser(const std::string& url) {
#ifdef _WIN32
    // Équivalent de « rundll32 url.dll,FileProtocolHandler <url> ».
    HINSTANCE r = ShellExecuteW(nullptr, L"open", widen(url).c_str(), nullptr, nullptr, SW_SHOWNORMAL);
    if (reinterpret_cast<INT_PTR>(r) > 32) return true;
    std::wstring cmd = L"rundll32.exe url.dll,FileProtocolHandler " + widen(url);
    std::vector<wchar_t> buf(cmd.begin(), cmd.end());
    buf.push_back(0);
    STARTUPINFOW si{};
    si.cb = sizeof si;
    PROCESS_INFORMATION pi{};
    if (!CreateProcessW(nullptr, buf.data(), nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi)) return false;
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return true;
#else
#ifdef __APPLE__
    std::string cmd = "open '" + url + "' >/dev/null 2>&1 &";
#else
    std::string cmd = "xdg-open '" + url + "' >/dev/null 2>&1 &";
#endif
    return std::system(cmd.c_str()) == 0;
#endif
}

BrowserProcess openWindow(int port, const Options& opt, const std::string& profile) {
    std::string url = format("http://127.0.0.1:%d/", port);
    BrowserProcess proc;
    for (auto& b : browsers(opt.browser)) {
        std::string err;
        if (launch(b, chromiumArgs(url, profile), proc, err)) return proc;
        journal.log(format("échec du lancement de %s : %s", b.c_str(), err.c_str()));
    }
    journal.log("aucun Edge/Chrome trouvé : navigateur par défaut");
    if (!openDefaultBrowser(url)) fatal("Impossible d'ouvrir la fenêtre : aucun navigateur disponible (" + url + ")");
    return proc;
}

// Attend la fin du navigateur ; true si le processus a vécu longtemps (= c'était lui la fenêtre).
bool waitProcess(BrowserProcess& p, std::chrono::seconds& lived) {
    auto t0 = Clock::now();
#ifdef _WIN32
    WaitForSingleObject(p.handle, INFINITE);
    CloseHandle(p.handle);
    p.handle = nullptr;
#else
    int status;
    waitpid(p.pid, &status, 0);
    p.pid = 0;
#endif
    lived = std::chrono::duration_cast<std::chrono::seconds>(Clock::now() - t0);
    return lived >= std::chrono::seconds(15);
}

// Reste en vie tant que la fenêtre est ouverte.
void waitIdle(AppState& st, BrowserProcess proc) {
    if (proc.valid()) {
        std::chrono::seconds lived{0};
        if (waitProcess(proc, lived)) {
            // Le navigateur dédié s'est fermé avec sa dernière fenêtre.
            journal.log(format("navigateur fermé après %llds", static_cast<long long>(lived.count())));
            return;
        }
        // Processus rendu immédiatement (le profil était déjà ouvert : la fenêtre a été confiée
        // au navigateur existant) → on se fie au signal de vie de la page.
    }
    for (;;) {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        auto now = Clock::now();
        if (now - st.started < kStartGrace) continue;
        if (!st.pingedSince(now - kPingIdle)) {
            journal.log("plus de signal de vie de la fenêtre");
            return;
        }
    }
}

int run(const std::vector<std::string>& args) {
    Options opt = parseArgs(args);
    if (opt.version) {
        printOut(std::string(kAppName) + " " + SQ_VERSION_STR + "\n");
        return 0;
    }

    std::string dir = dataDir();
    mkdirs(dir);
    journal.open(join(dir, "journal.txt"));
    std::string profile = opt.profile.empty() ? join(dir, "profile") : opt.profile;
    mkdirs(profile);
    journal.log(format("démarrage %s %s", kAppName, SQ_VERSION_STR));

    // Choix du port : le port demandé, sinon les suivants. Si une instance tourne déjà
    // sur l'un d'eux, on lui demande simplement une nouvelle fenêtre.
    HttpServer server;
    int port = 0;
    for (int i = 0; i < kPortTries && opt.port + i <= 65535; ++i) {
        int p = opt.port + i;
        if (server.listen(p)) {
            port = p;
            break;
        }
        if (runningHere(p)) {
            journal.log(format("instance déjà active sur %d : nouvelle fenêtre", p));
            if (!opt.noBrowser) {
                BrowserProcess bp = openWindow(p, opt, profile);
#ifdef _WIN32
                if (bp.handle) CloseHandle(bp.handle);
#else
                (void)bp;
#endif
            }
            return 0;
        }
    }
    if (!port)
        fatal(format("Aucun port local disponible entre %d et %d. Fermez l'application qui l'occupe puis réessayez.",
                     opt.port, std::min(65535, opt.port + kPortTries - 1)));
    if (port != opt.port)
        journal.log(format("attention : port %d utilisé à la place de %d — le navigateur y verra un stockage différent",
                           port, opt.port));

    AppState st;
    st.port = port;
    Blob gz = assetAppHtmlGz();
    if (!gz.data || !gz.size) fatal("application absente de l'exécutable (ressource manquante)");
    st.etag = format("\"sq-%016llx\"", static_cast<unsigned long long>(fnv1a(gz.data, gz.size)));

    server.start(makeHandler(st));
    journal.log(format("serveur prêt sur http://127.0.0.1:%d/", port));

    if (opt.noBrowser) {
        for (;;) std::this_thread::sleep_for(std::chrono::hours(1));
    }

    BrowserProcess proc = openWindow(port, opt, profile);
    waitIdle(st, proc);
    journal.log("arrêt");
    server.stop();
    return 0;
}

}  // namespace
}  // namespace sq

#ifdef _WIN32
int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    int argc = 0;
    LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    std::vector<std::string> args;
    for (int i = 1; i < argc; ++i) args.push_back(sq::narrow(argv[i]));
    LocalFree(argv);
    return sq::run(args);
}
#else
int main(int argc, char** argv) {
    std::vector<std::string> args(argv + 1, argv + argc);
    return sq::run(args);
}
#endif
