// Décompression gzip (RFC 1952 / DEFLATE RFC 1951), sans dépendance.
// Utilisée seulement pour les rares clients HTTP qui n'acceptent pas gzip.
#pragma once
#include <cstdint>
#include <string>

namespace sq {

// Décompresse un flux gzip complet. Lève std::runtime_error si le flux est invalide.
std::string gunzip(const uint8_t* data, size_t size);

}  // namespace sq
