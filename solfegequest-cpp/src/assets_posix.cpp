// Build de test hors Windows (Linux/macOS) : embarque les fichiers avec .incbin.
// SQ_RES_DIR est fourni par CMake / build.sh (chemin absolu du dossier res/).
#ifndef _WIN32
#include "assets.hpp"

#ifndef SQ_RES_DIR
#error "SQ_RES_DIR doit pointer vers le dossier res/"
#endif

#ifdef __APPLE__
#define SQ_SYM(x) "_" #x
#define SQ_SECTION ".const_data"
#else
#define SQ_SYM(x) #x
#define SQ_SECTION ".section .rodata"
#endif

#define SQ_INCBIN(name, file)                                   \
    __asm__(SQ_SECTION "\n"                                     \
            ".balign 16\n"                                      \
            ".globl " SQ_SYM(name##_start) "\n" SQ_SYM(name##_start) ":\n" \
            ".incbin \"" SQ_RES_DIR "/" file "\"\n"             \
            ".globl " SQ_SYM(name##_end) "\n" SQ_SYM(name##_end) ":\n"     \
            ".byte 0\n"                                         \
            ".text\n");                                         \
    extern "C" const uint8_t name##_start[];                    \
    extern "C" const uint8_t name##_end[];

SQ_INCBIN(sq_app_html_gz, "app.html.gz")
SQ_INCBIN(sq_icon_png, "icon.png")
SQ_INCBIN(sq_icon_ico, "app.ico")

namespace sq {

Blob assetAppHtmlGz() { return {sq_app_html_gz_start, size_t(sq_app_html_gz_end - sq_app_html_gz_start)}; }
Blob assetIconPng() { return {sq_icon_png_start, size_t(sq_icon_png_end - sq_icon_png_start)}; }
Blob assetIconIco() { return {sq_icon_ico_start, size_t(sq_icon_ico_end - sq_icon_ico_start)}; }

}  // namespace sq
#endif
