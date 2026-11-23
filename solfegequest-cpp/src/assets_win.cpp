#ifdef _WIN32
#include <windows.h>

#include "assets.hpp"
#include "resource_ids.h"

namespace sq {
namespace {

Blob load(int id) {
    Blob b;
    HMODULE mod = GetModuleHandleW(nullptr);
    HRSRC r = FindResourceW(mod, MAKEINTRESOURCEW(id), MAKEINTRESOURCEW(10 /* RT_RCDATA */));
    if (!r) return b;
    HGLOBAL g = LoadResource(mod, r);
    if (!g) return b;
    b.data = static_cast<const uint8_t*>(LockResource(g));
    b.size = SizeofResource(mod, r);
    return b;
}

}  // namespace

Blob assetAppHtmlGz() { return load(SQ_RES_APP_HTML_GZ); }
Blob assetIconPng() { return load(SQ_RES_ICON_PNG); }
Blob assetIconIco() { return load(SQ_RES_ICON_ICO); }

}  // namespace sq
#endif
