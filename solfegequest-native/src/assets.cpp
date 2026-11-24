#include "assets.hpp"

#ifdef _WIN32
#include <windows.h>

#include "resource_ids.h"

namespace sq {
Blob asset(Asset a) {
    int id = 0;
    switch (a) {
        case Asset::Samples: id = SQ_RES_SAMPLES; break;
        case Asset::Inter: id = SQ_RES_INTER; break;
        case Asset::InterSemiBold: id = SQ_RES_INTER_SB; break;
        case Asset::Fraunces: id = SQ_RES_FRAUNCES; break;
        case Asset::Bravura: id = SQ_RES_BRAVURA; break;
        case Asset::Icons: id = SQ_RES_ICONS; break;
        case Asset::Symbols: id = SQ_RES_SYMBOLS; break;
        case Asset::Data: id = SQ_RES_DATA; break;
    }
    Blob b;
    HMODULE mod = GetModuleHandleW(nullptr);
    HRSRC r = FindResourceW(mod, MAKEINTRESOURCEW(id), MAKEINTRESOURCEW(10));
    if (!r) return b;
    HGLOBAL g = LoadResource(mod, r);
    if (!g) return b;
    b.data = static_cast<const uint8_t*>(LockResource(g));
    b.size = SizeofResource(mod, r);
    return b;
}
}  // namespace sq

#else

#ifndef SQ_ASSET_DIR
#error "SQ_ASSET_DIR doit pointer vers le dossier assets/"
#endif
#ifdef __APPLE__
#define SQ_SYM(x) "_" #x
#define SQ_SECTION ".const_data"
#else
#define SQ_SYM(x) #x
#define SQ_SECTION ".section .rodata"
#endif
#define SQ_INCBIN(name, file)                                                                  \
    __asm__(SQ_SECTION "\n.balign 16\n.globl " SQ_SYM(name##_start) "\n" SQ_SYM(name##_start) ":\n" \
            ".incbin \"" SQ_ASSET_DIR "/" file "\"\n.globl " SQ_SYM(name##_end) "\n" SQ_SYM(name##_end) ":\n" \
            ".byte 0\n.text\n");                                                               \
    extern "C" const uint8_t name##_start[];                                                   \
    extern "C" const uint8_t name##_end[];

SQ_INCBIN(sq_samples, "samples.bin")
SQ_INCBIN(sq_inter, "Inter.ttf")
SQ_INCBIN(sq_inter_sb, "Inter-SemiBold.ttf")
SQ_INCBIN(sq_fraunces, "Fraunces.ttf")
SQ_INCBIN(sq_bravura, "Bravura.ttf")
SQ_INCBIN(sq_icons, "Icons.ttf")
SQ_INCBIN(sq_symbols, "Symbols.ttf")
SQ_INCBIN(sq_data, "data.json")

namespace sq {
Blob asset(Asset a) {
    switch (a) {
        case Asset::Samples: return {sq_samples_start, size_t(sq_samples_end - sq_samples_start)};
        case Asset::Inter: return {sq_inter_start, size_t(sq_inter_end - sq_inter_start)};
        case Asset::InterSemiBold: return {sq_inter_sb_start, size_t(sq_inter_sb_end - sq_inter_sb_start)};
        case Asset::Fraunces: return {sq_fraunces_start, size_t(sq_fraunces_end - sq_fraunces_start)};
        case Asset::Bravura: return {sq_bravura_start, size_t(sq_bravura_end - sq_bravura_start)};
        case Asset::Icons: return {sq_icons_start, size_t(sq_icons_end - sq_icons_start)};
        case Asset::Symbols: return {sq_symbols_start, size_t(sq_symbols_end - sq_symbols_start)};
        case Asset::Data: return {sq_data_start, size_t(sq_data_end - sq_data_start)};
    }
    return {};
}
}  // namespace sq
#endif
