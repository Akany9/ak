// Ressources embarquées dans l'exécutable (Windows : RCDATA ; autres systèmes : .incbin).
#pragma once
#include <cstddef>
#include <cstdint>
#include <string_view>

namespace sq {

struct Blob {
    const uint8_t* data = nullptr;
    size_t size = 0;
    std::string_view view() const { return {reinterpret_cast<const char*>(data), size}; }
};

enum class Asset { Samples, Inter, InterSemiBold, Fraunces, Bravura, Icons, Symbols, Data };
Blob asset(Asset a);

}  // namespace sq
