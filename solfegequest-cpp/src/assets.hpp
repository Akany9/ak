// Fichiers embarqués dans l'exécutable : l'application (HTML gzip), l'icône PNG et l'icône ICO.
//  - Windows : ressources RCDATA (voir res/app.rc), lues avec FindResource/LoadResource ;
//  - autres systèmes (build de test) : .incbin (voir assets_posix.cpp).
#pragma once
#include <cstddef>
#include <cstdint>

namespace sq {

struct Blob {
    const uint8_t* data = nullptr;
    size_t size = 0;
};

Blob assetAppHtmlGz();  // res/app.html.gz
Blob assetIconPng();    // res/icon.png
Blob assetIconIco();    // res/app.ico

}  // namespace sq
