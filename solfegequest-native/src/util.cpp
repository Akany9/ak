#include "util.hpp"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#include <commdlg.h>
#include <shlobj.h>
#else
#include <sys/stat.h>
#endif

namespace sq {

#ifdef _WIN32
static std::wstring widen(const std::string& s) {
    if (s.empty()) return {};
    int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), int(s.size()), nullptr, 0);
    std::wstring w(size_t(n), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), int(s.size()), &w[0], n);
    return w;
}
static std::string narrow(const std::wstring& w) {
    if (w.empty()) return {};
    int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), int(w.size()), nullptr, 0, nullptr, nullptr);
    std::string s(size_t(n), '\0');
    WideCharToMultiByte(CP_UTF8, 0, w.data(), int(w.size()), &s[0], n, nullptr, nullptr);
    return s;
}
static FILE* openF(const std::string& p, const char* mode) {
    return _wfopen(widen(p).c_str(), widen(mode).c_str());
}
#else
static FILE* openF(const std::string& p, const char* mode) { return std::fopen(p.c_str(), mode); }
#endif

bool readFile(const std::string& path, std::string& out) {
    FILE* f = openF(path, "rb");
    if (!f) return false;
    out.clear();
    char buf[65536];
    size_t n;
    while ((n = std::fread(buf, 1, sizeof buf, f)) > 0) out.append(buf, n);
    std::fclose(f);
    return true;
}

bool writeFile(const std::string& path, const std::string& data) {
    std::string tmp = path + ".tmp";
    FILE* f = openF(tmp, "wb");
    if (!f) return false;
    bool ok = std::fwrite(data.data(), 1, data.size(), f) == data.size();
    ok = std::fclose(f) == 0 && ok;
    if (!ok) return false;
#ifdef _WIN32
    return MoveFileExW(widen(tmp).c_str(), widen(path).c_str(), MOVEFILE_REPLACE_EXISTING) != 0;
#else
    return std::rename(tmp.c_str(), path.c_str()) == 0;
#endif
}

std::string joinPath(const std::string& a, const std::string& b) {
#ifdef _WIN32
    const char sep = '\\';
#else
    const char sep = '/';
#endif
    if (a.empty()) return b;
    return (a.back() == '/' || a.back() == '\\') ? a + b : a + sep + b;
}

std::string dataDir() {
    static std::string dir;
    if (!dir.empty()) return dir;
#ifdef _WIN32
    PWSTR p = nullptr;
    std::string base;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &p))) {
        base = narrow(p);
        CoTaskMemFree(p);
    }
    dir = joinPath(joinPath(base, "SolfegeQuest"), "native");
    SHCreateDirectoryExW(nullptr, widen(dir).c_str(), nullptr);
#else
    const char* x = std::getenv("XDG_DATA_HOME");
    std::string base = x && *x ? x : std::string(std::getenv("HOME") ? std::getenv("HOME") : ".") + "/.local/share";
    dir = base + "/SolfegeQuest/native";
    std::string cur;
    for (size_t i = 0; i <= dir.size(); ++i) {
        if (i == dir.size() || dir[i] == '/')
            if (!cur.empty()) mkdir(cur.c_str(), 0755);
        if (i < dir.size()) cur.push_back(dir[i]);
    }
#endif
    return dir;
}

#ifdef _WIN32
static std::string fileDialog(bool save, const char* title, const std::string& suggested) {
    wchar_t buf[MAX_PATH * 4] = {};
    std::wstring sug = widen(suggested);
    wcsncpy(buf, sug.c_str(), MAX_PATH * 4 - 1);
    std::wstring t = widen(title);
    OPENFILENAMEW of{};
    of.lStructSize = sizeof of;
    of.hwndOwner = GetActiveWindow();
    of.lpstrFilter = L"Projet Solfège Quest (*.sqproj)\0*.sqproj\0Tous les fichiers\0*.*\0";
    of.lpstrFile = buf;
    of.nMaxFile = MAX_PATH * 4;
    of.lpstrTitle = t.c_str();
    of.lpstrDefExt = L"sqproj";
    of.Flags = OFN_EXPLORER | OFN_NOCHANGEDIR | (save ? OFN_OVERWRITEPROMPT : OFN_FILEMUSTEXIST);
    BOOL ok = save ? GetSaveFileNameW(&of) : GetOpenFileNameW(&of);
    return ok ? narrow(buf) : std::string();
}
std::string openFileDialog(const char* title) { return fileDialog(false, title, ""); }
std::string saveFileDialog(const char* title, const std::string& suggested) { return fileDialog(true, title, suggested); }
void messageBox(const std::string& text, bool error) {
    MessageBoxW(GetActiveWindow(), widen(text).c_str(), L"Solfège Quest", MB_OK | (error ? MB_ICONERROR : MB_ICONINFORMATION));
}
#else
static std::string runZenity(const std::string& args) {
    std::string cmd = "zenity --file-selection " + args + " 2>/dev/null";
    FILE* p = popen(cmd.c_str(), "r");
    if (!p) return {};
    char buf[4096];
    std::string out;
    while (fgets(buf, sizeof buf, p)) out += buf;
    pclose(p);
    while (!out.empty() && (out.back() == '\n' || out.back() == '\r')) out.pop_back();
    return out;
}
std::string openFileDialog(const char* title) {
    return runZenity(std::string("--title=\"") + title + "\" --file-filter=\"*.sqproj\"");
}
std::string saveFileDialog(const char* title, const std::string& suggested) {
    return runZenity(std::string("--save --confirm-overwrite --title=\"") + title + "\" --filename=\"" + suggested + "\"");
}
void messageBox(const std::string& text, bool) { std::fprintf(stderr, "%s\n", text.c_str()); }
#endif

const char* const* frenchSteps() {
    static const char* s[] = {"Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"};
    return s;
}

std::string pitchName(int m, bool flats) {
    static const char* sh[] = {"Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"};
    static const char* fl[] = {"Do", "Ré♭", "Ré", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"};
    int pc = ((m % 12) + 12) % 12;
    return std::string(flats ? fl[pc] : sh[pc]) + std::to_string(m / 12 - 1);
}

uint32_t hexColor(const std::string& hex, float alpha) {
    unsigned r = 142, g = 142, b = 147;
    if (hex.size() >= 7 && hex[0] == '#') std::sscanf(hex.c_str() + 1, "%02x%02x%02x", &r, &g, &b);
    unsigned a = unsigned(std::lround(std::fmin(1.f, std::fmax(0.f, alpha)) * 255));
    return (a << 24) | (b << 16) | (g << 8) | r;
}

uint32_t mixColor(uint32_t a, uint32_t b, float t) {
    auto ch = [&](int s) {
        float x = float((a >> s) & 255), y = float((b >> s) & 255);
        return uint32_t(std::lround(x + (y - x) * t)) << s;
    };
    return ch(0) | ch(8) | ch(16) | ch(24);
}

float luminance(uint32_t c) {
    auto lin = [](float v) { v /= 255.f; return v <= 0.03928f ? v / 12.92f : std::pow((v + 0.055f) / 1.055f, 2.4f); };
    return 0.2126f * lin(float(c & 255)) + 0.7152f * lin(float((c >> 8) & 255)) + 0.0722f * lin(float((c >> 16) & 255));
}

std::string colorToHex(const float rgb[3]) {
    char buf[8];
    std::snprintf(buf, sizeof buf, "#%02x%02x%02x", int(std::lround(rgb[0] * 255)), int(std::lround(rgb[1] * 255)), int(std::lround(rgb[2] * 255)));
    return buf;
}

void hexToFloat(const std::string& hex, float rgb[3]) {
    uint32_t c = hexColor(hex);
    rgb[0] = float(c & 255) / 255.f;
    rgb[1] = float((c >> 8) & 255) / 255.f;
    rgb[2] = float((c >> 16) & 255) / 255.f;
}

}  // namespace sq
