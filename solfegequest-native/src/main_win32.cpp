// Hôte Windows : Win32 + Direct3D 11 (fenêtre native, aucune dépendance hors Windows).
#include <windows.h>
#include <d3d11.h>
#include <shellapi.h>

#include <algorithm>
#include <string>

#include "../third_party/imgui/backends/imgui_impl_dx11.h"
#include "../third_party/imgui/backends/imgui_impl_win32.h"
#include "../third_party/imgui/imgui.h"
#include "app.hpp"
#include "resource_ids.h"
#include "theme.hpp"

using namespace sq;

extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam);

static ID3D11Device* gDev = nullptr;
static ID3D11DeviceContext* gCtx = nullptr;
static IDXGISwapChain* gSwap = nullptr;
static ID3D11RenderTargetView* gRtv = nullptr;
static UINT gResizeW = 0, gResizeH = 0;
static bool gOccluded = false;

static void createRtv() {
    ID3D11Texture2D* back = nullptr;
    gSwap->GetBuffer(0, IID_PPV_ARGS(&back));
    if (back) {
        gDev->CreateRenderTargetView(back, nullptr, &gRtv);
        back->Release();
    }
}
static void releaseRtv() {
    if (gRtv) { gRtv->Release(); gRtv = nullptr; }
}

static bool createDevice(HWND hwnd) {
    DXGI_SWAP_CHAIN_DESC sd{};
    sd.BufferCount = 2;
    sd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    sd.BufferDesc.RefreshRate.Numerator = 60;
    sd.BufferDesc.RefreshRate.Denominator = 1;
    sd.Flags = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    sd.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    sd.OutputWindow = hwnd;
    sd.SampleDesc.Count = 1;
    sd.Windowed = TRUE;
    sd.SwapEffect = DXGI_SWAP_EFFECT_DISCARD;
    const D3D_FEATURE_LEVEL levels[] = {D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_0};
    D3D_FEATURE_LEVEL got;
    HRESULT hr = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &sd, &gSwap, &gDev, &got, &gCtx);
    if (hr == DXGI_ERROR_UNSUPPORTED)  // pas de carte graphique compatible : rendu logiciel WARP
        hr = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &sd, &gSwap, &gDev, &got, &gCtx);
    if (hr != S_OK) return false;
    createRtv();
    return true;
}

static void destroyDevice() {
    releaseRtv();
    if (gSwap) gSwap->Release();
    if (gCtx) gCtx->Release();
    if (gDev) gDev->Release();
}

static LRESULT WINAPI wndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    if (ImGui_ImplWin32_WndProcHandler(hWnd, msg, wParam, lParam)) return true;
    switch (msg) {
        case WM_SIZE:
            if (wParam == SIZE_MINIMIZED) return 0;
            gResizeW = LOWORD(lParam);
            gResizeH = HIWORD(lParam);
            return 0;
        case WM_GETMINMAXINFO: {
            auto* mm = reinterpret_cast<MINMAXINFO*>(lParam);
            mm->ptMinTrackSize = {960, 600};
            return 0;
        }
        case WM_DPICHANGED: {
            float user = theme().scale / std::max(0.5f, theme().dpi);
            theme().dpi = float(HIWORD(wParam)) / 96.f;
            theme().setUserScale(user);
            const RECT* r = reinterpret_cast<RECT*>(lParam);
            SetWindowPos(hWnd, nullptr, r->left, r->top, r->right - r->left, r->bottom - r->top, SWP_NOZORDER | SWP_NOACTIVATE);
            return 0;
        }
        case WM_SYSCOMMAND:
            if ((wParam & 0xfff0) == SC_KEYMENU) return 0;  // pas de menu Alt
            break;
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
    }
    return DefWindowProcW(hWnd, msg, wParam, lParam);
}

static std::wstring widen(const char* s) {
    int n = MultiByteToWideChar(CP_UTF8, 0, s, -1, nullptr, 0);
    std::wstring w(size_t(n), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s, -1, &w[0], n);
    if (!w.empty() && w.back() == L'\0') w.pop_back();
    return w;
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE, PWSTR, int) {
    ImGui_ImplWin32_EnableDpiAwareness();
    // une seule instance : la seconde ramène la première au premier plan
    HANDLE mutex = CreateMutexW(nullptr, TRUE, L"SolfegeQuest.Native.Instance");
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        if (HWND other = FindWindowW(L"SolfegeQuestWnd", nullptr)) {
            ShowWindow(other, SW_RESTORE);
            SetForegroundWindow(other);
        }
        return 0;
    }
    WNDCLASSEXW wc{sizeof(wc), CS_CLASSDC, wndProc, 0, 0, inst, LoadIconW(inst, MAKEINTRESOURCEW(SQ_RES_ICON_MAIN)), LoadCursorW(nullptr, IDC_ARROW),
                   nullptr, nullptr, L"SolfegeQuestWnd", LoadIconW(inst, MAKEINTRESOURCEW(SQ_RES_ICON_MAIN))};
    RegisterClassExW(&wc);
    POINT pt{0, 0};
    float dpi = ImGui_ImplWin32_GetDpiScaleForMonitor(MonitorFromPoint(pt, MONITOR_DEFAULTTOPRIMARY));
    int w = int(1440 * dpi), h = int(900 * dpi);
    RECT wa;
    SystemParametersInfoW(SPI_GETWORKAREA, 0, &wa, 0);
    w = std::min(w, int(wa.right - wa.left));
    h = std::min(h, int(wa.bottom - wa.top));
    HWND hwnd = CreateWindowW(wc.lpszClassName, L"Solfège Quest", WS_OVERLAPPEDWINDOW, wa.left + (wa.right - wa.left - w) / 2,
                              wa.top + (wa.bottom - wa.top - h) / 2, w, h, nullptr, nullptr, inst, nullptr);
    if (!createDevice(hwnd)) {
        destroyDevice();
        MessageBoxW(nullptr, L"Direct3D 11 est indisponible sur cet ordinateur.", L"Solfège Quest", MB_ICONERROR);
        return 1;
    }
    ShowWindow(hwnd, SW_SHOWDEFAULT);
    UpdateWindow(hwnd);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable | ImGuiConfigFlags_NavEnableKeyboard;
    io.IniFilename = nullptr;
    io.ConfigWindowsMoveFromTitleBarOnly = true;
    ImGui_ImplWin32_Init(hwnd);
    ImGui_ImplDX11_Init(gDev, gCtx);

    theme().dpi = ImGui_ImplWin32_GetDpiScaleForHwnd(hwnd);
    App& a = app();
    a.setTitle = [hwnd](const char* t) { SetWindowTextW(hwnd, widen(t).c_str()); };
    a.init();

    bool done = false;
    while (!done && !a.quit) {
        MSG msg;
        while (PeekMessageW(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
            if (msg.message == WM_QUIT) done = true;
        }
        if (done) break;
        if (gOccluded && gSwap->Present(0, DXGI_PRESENT_TEST) == DXGI_STATUS_OCCLUDED) {
            Sleep(10);
            continue;
        }
        gOccluded = false;
        if (gResizeW && gResizeH) {
            releaseRtv();
            gSwap->ResizeBuffers(0, gResizeW, gResizeH, DXGI_FORMAT_UNKNOWN, 0);
            gResizeW = gResizeH = 0;
            createRtv();
        }
        if (theme().fontsDirty) {
            theme().buildFonts();
            ImGui_ImplDX11_InvalidateDeviceObjects();  // l'atlas de polices est recréé au prochain NewFrame
        }
        a.panels.applyPending();
        ImGui_ImplDX11_NewFrame();
        ImGui_ImplWin32_NewFrame();
        ImGui::NewFrame();
        a.frame();
        ImGui::Render();
        const float clear[4] = {0.07f, 0.07f, 0.08f, 1};
        gCtx->OMSetRenderTargets(1, &gRtv, nullptr);
        gCtx->ClearRenderTargetView(gRtv, clear);
        ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
        HRESULT hr = gSwap->Present(1, 0);
        gOccluded = hr == DXGI_STATUS_OCCLUDED;
    }
    a.shutdown();
    ImGui_ImplDX11_Shutdown();
    ImGui_ImplWin32_Shutdown();
    ImGui::DestroyContext();
    destroyDevice();
    DestroyWindow(hwnd);
    UnregisterClassW(wc.lpszClassName, wc.hInstance);
    if (mutex) CloseHandle(mutex);
    return 0;
}
