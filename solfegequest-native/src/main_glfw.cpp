// Hôte GLFW + OpenGL 3 (Linux / macOS) — sert aussi aux tests automatiques :
//   SQ_TEST="mode=comp;show=score;float=pianoRoll;select=4;hover=600,700"  actions au 3e cadre
//   SQ_SHOT=capture.ppm  SQ_FRAMES=40                                      capture puis fermeture
#include <GLFW/glfw3.h>

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <sstream>
#include <string>
#include <vector>

#include "../third_party/imgui/backends/imgui_impl_glfw.h"
#include "../third_party/imgui/backends/imgui_impl_opengl3.h"
#include "../third_party/imgui/imgui.h"
#include "app.hpp"
#include "audio.hpp"
#include "skeuo.hpp"
#include "theme.hpp"

using namespace sq;

struct Click { float x, y; int frame; bool right; };
static std::vector<Click> gClicks;

static void runTest(const std::string& script, ImVec2* hover) {
    std::stringstream ss(script);
    std::string cmd;
    App& a = app();
    while (std::getline(ss, cmd, ';')) {
        auto eq = cmd.find('=');
        std::string k = cmd.substr(0, eq), v = eq == std::string::npos ? "" : cmd.substr(eq + 1);
        if (k == "mode") a.go(v == "comp" ? Mode::Comp : v == "studio" ? Mode::Studio : v == "edu" ? Mode::Edu : Mode::Home);
        for (int i = 0; i < P_Count; ++i) {
            if (v != a.panels.p[i].key) continue;
            if (k == "show") a.panels.show(PanelId(i));
            if (k == "hide") a.panels.p[i].visible = false;
            if (k == "float") a.panels.p[i].wantFloat = true;
        }
        if (k == "hideall") for (auto& p : a.panels.p) p.visible = false;
        if (k == "reset") a.panels.resetLayout();
        if (k == "select") {  // select=indexPiste
            int ti = std::atoi(v.c_str());
            if (ti < int(a.doc.P.tracks.size()) && !a.doc.P.tracks[size_t(ti)].regions.empty()) {
                a.doc.selTrack = a.doc.P.tracks[size_t(ti)].id;
                a.doc.selRegion = a.doc.P.tracks[size_t(ti)].regions[0].id;
            }
        }
        if (k == "color") {  // color=indexPiste:#rrggbb
            auto c = v.find(':');
            int ti = std::atoi(v.substr(0, c).c_str());
            std::string hex = v.substr(c + 1);
            a.doc.edit("Couleur", [&](Project& P) { if (ti < int(P.tracks.size())) { P.tracks[size_t(ti)].color = hex; P.tracks[size_t(ti)].colorSet = true; } });
        }
        if (k == "popup") a.openTrackColor(a.doc.P.tracks.empty() ? "" : a.doc.P.tracks[0].id);
        if (k == "hover") {
            auto c = v.find(',');
            *hover = ImVec2(float(std::atof(v.substr(0, c).c_str())), float(std::atof(v.substr(c + 1).c_str())));
        }
        if (k == "click" || k == "rclick") {  // click=x,y[,décalage en cadres]
            float x, y;
            int df = 0;
            std::sscanf(v.c_str(), "%f,%f,%d", &x, &y, &df);
            gClicks.push_back({x, y, df, k == "rclick"});
        }
        if (k == "scale") theme().setUserScale(float(std::atof(v.c_str())));
        if (k == "play") audio().play();
        if (k == "home") a.homeCard = std::atoi(v.c_str());
        if (k == "piano") a.piano.open = true;
        if (k == "step") { a.piano.step = true; }
        if (k == "note") a.pianoPress(std::atoi(v.c_str()), true);
    }
}

int main() {
    if (!glfwInit()) return 1;
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    int W = std::getenv("SQ_W") ? std::atoi(std::getenv("SQ_W")) : 1440, H = std::getenv("SQ_H") ? std::atoi(std::getenv("SQ_H")) : 900;
    GLFWwindow* win = glfwCreateWindow(W, H, "Solfège Quest", nullptr, nullptr);
    if (!win) return 1;
    glfwMakeContextCurrent(win);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable | ImGuiConfigFlags_NavEnableKeyboard;
    io.IniFilename = nullptr;
    io.ConfigWindowsMoveFromTitleBarOnly = true;
    ImGui_ImplGlfw_InitForOpenGL(win, true);
    ImGui_ImplOpenGL3_Init("#version 150");

    App& a = app();
    a.setTitle = [win](const char* t) { glfwSetWindowTitle(win, t); };
    a.init();
    skeuo::createTexture = [](const unsigned* px, int w, int h) -> ImTextureID {
        GLuint t = 0;
        glGenTextures(1, &t);
        glBindTexture(GL_TEXTURE_2D, t);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
        glPixelStorei(GL_UNPACK_ALIGNMENT, 4);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, px);
        return ImTextureID(intptr_t(t));
    };
    skeuo::init();

    const char* test = std::getenv("SQ_TEST");
    const char* shot = std::getenv("SQ_SHOT");
    int frames = std::getenv("SQ_FRAMES") ? std::atoi(std::getenv("SQ_FRAMES")) : 30;
    ImVec2 hover(-1, -1);
    int frame = 0;
    while (!glfwWindowShouldClose(win) && !a.quit) {
        glfwPollEvents();
        if (theme().fontsDirty) {
            theme().buildFonts();
            ImGui_ImplOpenGL3_DestroyFontsTexture();
            ImGui_ImplOpenGL3_CreateFontsTexture();
        }
        a.panels.applyPending();
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        if (hover.x >= 0) io.AddMousePosEvent(hover.x, hover.y);
        for (auto& c : gClicks) {  // déplacement, appui, relâchement sur des cadres successifs
            int t = frame - 3 - c.frame;
            if (t == 1) io.AddMousePosEvent(c.x, c.y);
            if (t == 2) io.AddMouseButtonEvent(c.right ? 1 : 0, true);
            if (t == 3) io.AddMouseButtonEvent(c.right ? 1 : 0, false);
        }
        ImGui::NewFrame();
        a.frame();
        ImGui::Render();
        int dw, dh;
        glfwGetFramebufferSize(win, &dw, &dh);
        glViewport(0, 0, dw, dh);
        glClearColor(0.07f, 0.07f, 0.08f, 1);
        glClear(GL_COLOR_BUFFER_BIT);
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
        ++frame;
        if (test && frame == 3) runTest(test, &hover);
        if (std::getenv("SQ_LEVELS") && frame % 20 == 0)
            std::fprintf(stderr, "niveau cadre %d : pos=%.2f lecture=%d G=%.3f D=%.3f piste0=%.3f piste4=%.3f (%s)\n", frame, audio().position(), audio().playing(),
                         audio().masterLevel(0), audio().masterLevel(1), audio().trackLevel(0), audio().trackLevel(4), audio().backendName().c_str());
        if (shot && frame == frames && std::getenv("SQ_DUMP")) {
            Region* r = a.doc.selRegion.empty() ? nullptr : a.doc.P.region(a.doc.selRegion);
            std::fprintf(stderr, "ETAT pistes=%zu region=%s notes=%zu annulable=%d visibles=%d%d%d%d%d%d flottant(pianoRoll)=%d\n", a.doc.P.tracks.size(),
                         a.doc.selRegion.c_str(), r ? r->notes.size() : 0, a.doc.canUndo(), a.panels.p[0].visible, a.panels.p[1].visible, a.panels.p[2].visible,
                         a.panels.p[3].visible, a.panels.p[4].visible, a.panels.p[5].visible, a.panels.p[1].floating);
        }
        if (shot && frame == frames) {
            std::vector<unsigned char> px(size_t(dw) * dh * 3);
            glPixelStorei(GL_PACK_ALIGNMENT, 1);
            glReadPixels(0, 0, dw, dh, GL_RGB, GL_UNSIGNED_BYTE, px.data());
            FILE* f = std::fopen(shot, "wb");
            if (f) {
                std::fprintf(f, "P6\n%d %d\n255\n", dw, dh);
                for (int y = dh - 1; y >= 0; --y) std::fwrite(px.data() + size_t(y) * dw * 3, 1, size_t(dw) * 3, f);
                std::fclose(f);
            }
            break;
        }
        glfwSwapBuffers(win);
    }
    a.shutdown();
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(win);
    glfwTerminate();
    return 0;
}
