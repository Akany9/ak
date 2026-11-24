// Utilitaires : fichiers (chemins UTF-8), dossier de données, boîtes de dialogue de fichiers,
// noms de notes en français, couleurs.
#pragma once
#include <cstdint>
#include <string>

namespace sq {

bool readFile(const std::string& path, std::string& out);
bool writeFile(const std::string& path, const std::string& data);
std::string dataDir();                       // %LOCALAPPDATA%\SolfegeQuest\native (créé au besoin)
std::string joinPath(const std::string& a, const std::string& b);

// Boîtes de dialogue natives ; renvoient "" si annulé.
std::string openFileDialog(const char* title);
std::string saveFileDialog(const char* title, const std::string& suggested);
void messageBox(const std::string& text, bool error);

std::string pitchName(int midi, bool flats = false);  // « Sol4 »
const char* const* frenchSteps();                     // Do Ré Mi Fa Sol La Si

// Couleurs « #rrggbb »
uint32_t hexColor(const std::string& hex, float alpha = 1.f);  // → ImU32 (ABGR)
uint32_t mixColor(uint32_t a, uint32_t b, float t);
float luminance(uint32_t c);
std::string colorToHex(const float rgb[3]);
void hexToFloat(const std::string& hex, float rgb[3]);

}  // namespace sq
