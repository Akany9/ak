// Liaisons Lua (sol2) du cœur : module `r88` du document d'architecture. Les erreurs de script ne font jamais tomber
// la simulation : elles deviennent des événements « erreur_script » (sol2 sans exceptions, erreurs Lua par setjmp,
// qui fonctionne en natif comme en WebAssembly grâce à wasi-sdk + -mllvm -wasm-enable-sjlj).
#define SOL_ALL_SAFETIES_ON 1
#include <sol/sol.hpp>
#include "g1/script.hpp"
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {
static const char* METEOS[] = {"clair", "pluie", "brouillard", "rain_fog", "neige"};
static const char* DECRETS[NB_DECRETS] = {"etat_urgence", "couvre_feu", "conscription", "nationalisation", "liberte_presse", "planche_a_billets", "travail_force"};
static const char* BIENS[NB_BIENS] = {"nourriture", "carburant", "munitions", "minerai", "petrole", "biens"};
static std::string echapper(const std::string& s) { std::string r; for (char c : s) { if (c == '"' || c == '\\') r += '\\'; if (c == '\n') { r += "\\n"; continue; } r += c; } return r; }

struct Script::Impl {
  Monde& m; sol::state lua; bool ok = false;
  explicit Impl(Monde& mo) : m(mo) {}
  int faction(const std::string& id) const { int f = m.D.faction(id); return f; }
  void erreur(const std::string& ou, const sol::error& e) { m.emettre("{\"type\":\"erreur_script\",\"ou\":\"" + ou + "\",\"message\":\"" + echapper(e.what()) + "\"}"); }
  void lier() {
    lua.open_libraries(sol::lib::base, sol::lib::math, sol::lib::table, sol::lib::string);
    // déterminisme : le hasard de Lua passe par le générateur du cœur (même graine → même partie)
    lua["math"]["random"] = [this](sol::variadic_args va) -> double {
      double u = m.rng.unif(); if (va.size() == 0) return u;
      long a = 1, b = va[0].as<long>(); if (va.size() > 1) { a = b; b = va[1].as<long>(); }
      return double(a + long(u * double(b - a + 1)));
    };
    lua["math"]["randomseed"] = [](sol::variadic_args) {};
    sol::table r = lua["r88"].get_or_create<sol::table>();
    r.set_function("spawn_squad", [this](const std::string& fid, double x, double z, int n, sol::optional<std::string> arme, sol::optional<double> ox, sol::optional<double> oz) {
      int f = faction(fid); if (f < 0 || n <= 0) return -1;
      int a = arme ? m.D.arme(*arme) : 0, premier = -1, esc = 2000 + int(m.unites.size());
      for (int k = 0; k < n; ++k) {
        int u = m.creerUnite(f, x + (k % 4) * 2.5, z + (k / 4) * 2.5, a, false); if (premier < 0) premier = u;
        m.unites[u].escouade = esc; m.unites[u].objX = ox.value_or(x); m.unites[u].objZ = oz.value_or(z);
      }
      m.emettre("{\"type\":\"escouade\",\"faction\":" + std::to_string(f) + ",\"nb\":" + std::to_string(n) + "}");
      return premier;
    });
    r.set_function("set_weather", [this](const std::string& type, double intensite) {
      int k = 0; for (int i = 0; i < 5; ++i) if (type == METEOS[i]) k = i;
      m.meteo = k; m.meteoIntensite = float(std::clamp(intensite, 0.0, 1.0));
      m.emettre("{\"type\":\"meteo\",\"meteo\":\"" + std::string(METEOS[k]) + "\",\"intensite\":" + std::to_string(m.meteoIntensite) + "}");
    });
    r.set_function("message", [this](const std::string& t) { m.emettre("{\"type\":\"script\",\"texte\":\"" + echapper(t) + "\"}"); });
    r.set_function("declare_war", [this](const std::string& a, const std::string& b) {
      int fa = faction(a), fb = faction(b); if (fa < 0 || fb < 0) return; const size_t N = m.factions.size();
      m.guerre[fa * N + fb] = m.guerre[fb * N + fa] = 1; m.relations[fa * N + fb] = m.relations[fb * N + fa] = -100;
      m.emettre("{\"type\":\"guerre\",\"agresseur\":" + std::to_string(fa) + ",\"cible\":" + std::to_string(fb) + ",\"rapport\":0}"); m.ralentir("déclaration de guerre");
    });
    r.set_function("make_peace", [this](const std::string& a, const std::string& b) {
      int fa = faction(a), fb = faction(b); if (fa < 0 || fb < 0) return; const size_t N = m.factions.size(); m.guerre[fa * N + fb] = m.guerre[fb * N + fa] = 0;
    });
    r.set_function("set_relation", [this](const std::string& a, const std::string& b, double v) {
      int fa = faction(a), fb = faction(b); if (fa < 0 || fb < 0) return; const size_t N = m.factions.size(); m.relations[fa * N + fb] = m.relations[fb * N + fa] = float(std::clamp(v, -100.0, 100.0));
    });
    r.set_function("decree", [this](const std::string& f, const std::string& d, bool on) {
      int fi = faction(f); for (int k = 0; k < NB_DECRETS; ++k) if (d == DECRETS[k] && fi >= 0) { Statut s = m.statut; m.statut = Statut::Commandant; m.decreter(fi, k, on); m.statut = s; }
    });
    r.set_function("reinforce", [this](const std::string& f, double n) { int fi = faction(f); if (fi >= 0) m.factions[fi].effectifs += float(n); });
    r.set_function("price_shock", [this](const std::string& b, double k) { for (int i = 0; i < NB_BIENS; ++i) if (b == BIENS[i]) m.prix[i] *= float(1 + k); });
    r.set_function("crisis", [this](const std::string& f, double k) { int fi = faction(f); if (fi >= 0) { m.factions[fi].stabilite = std::max(0.f, m.factions[fi].stabilite - float(k)); m.factions[fi].moral -= float(k) * 0.5f; } });
    r.set_function("set_status", [this](const std::string& s) { if (s == "voyageur") m.statut = Statut::Voyageur; else if (s == "agent") m.statut = Statut::Agent; else if (s == "commandant") { m.statut = Statut::Commandant; m.suspicion = 1; } m.emettre("{\"type\":\"statut\",\"statut\":" + std::to_string(int(m.statut)) + "}"); });
    r.set_function("slow_down", [this](const std::string& raison) { m.ralentir(raison.c_str()); });
    r.set_function("hour", [this]() { return m.temps / 3600.0; });
    r.set_function("day", [this]() { return int(m.heure / 24) + 1; });
    r.set_function("act", [this]() { return m.acte; });
    r.set_function("random", [this]() { return double(m.rng.unif()); });
    r.set_function("faction_id", [this](int i) { return (i >= 0 && i < int(m.factions.size())) ? m.factions[i].c.id : std::string(); });
    r.set_function("famine", [this](const std::string& f, double k) { int fi = faction(f); if (fi >= 0) m.factions[fi].stock[Nourriture] *= float(1 - std::clamp(k, 0.0, 1.0)); });
    r.set_function("faction", [this](const std::string& f, sol::this_state s) {
      sol::state_view L(s); sol::table t = L.create_table(); int fi = faction(f); if (fi < 0) return t; const Faction& x = m.factions[fi];
      t["tresor"] = x.tresor; t["moral"] = x.moral; t["stabilite"] = x.stabilite; t["unites"] = x.unitesVivantes; t["structures"] = x.nbStructures; t["sanctions"] = x.sanctions; t["munitions"] = x.stock[Munitions];
      return t;
    });
    r.set_function("units_in_area", [this](const std::string& f, double x, double z, double rayon) {
      int fi = faction(f), n = 0; for (auto& u : m.unites) if (u.etat != EtatUnite::Mort && (fi < 0 || u.faction == fi) && std::hypot(u.x - x, u.z - z) <= rayon) ++n; return n;
    });
    r.set_function("held", [this](const std::string& f, const std::string& role) {   // nombre de structures d'un rôle tenues par la faction
      static const char* R[] = {"residentiel", "hopital", "usine", "pont", "qg", "avant_poste", "mine", "radio", "banque", "ruine", "stade"};
      int fi = faction(f), n = 0; for (auto& s : m.structures) if (s.c.faction == fi && s.etat < 2 && role == R[int(s.c.role)]) ++n; return n;
    });
    // machine à états narrative déterministe : l'état courant est exporté (g1_narratif) et chaque transition est un événement
    r.set_function("set_state", [this](const std::string& e) {
      if (e == m.narratif) return; std::string avant = m.narratif; m.narratif = e;
      m.emettre("{\"type\":\"narratif\",\"de\":\"" + echapper(avant) + "\",\"vers\":\"" + echapper(e) + "\"}");
    });
    r.set_function("state", [this]() { return m.narratif; });
  }
};

Script::Script(Monde& m) : p_(std::make_unique<Impl>(m)) { p_->lier(); }
Script::~Script() = default;
bool Script::actif() const { return p_->ok; }

bool Script::charger(const std::string& src, const std::string& nom, std::string& erreur) {
  auto r = p_->lua.safe_script(src, sol::script_pass_on_error, "@" + nom);
  if (!r.valid()) { sol::error e = r; erreur = e.what(); return false; }
  p_->ok = true;
  sol::protected_function init = p_->lua["on_scenario_init"];
  if (init.valid()) { auto x = init(); if (!x.valid()) { sol::error e = x; erreur = e.what(); return false; } }
  return true;
}
void Script::heure(int h) {
  if (!p_->ok) return; sol::protected_function f = p_->lua["on_hour"]; if (!f.valid()) return;
  auto x = f(h); if (!x.valid()) { sol::error e = x; p_->erreur("on_hour", e); }
}
void Script::evenement(const std::string& type, const std::string& json) {
  if (!p_->ok) return; sol::protected_function f = p_->lua["on_event"]; if (!f.valid()) return;
  auto x = f(type, json); if (!x.valid()) { sol::error e = x; p_->erreur("on_event", e); }
}
}  // namespace g1
