// Phase de chargement : SEUL fichier qui analyse du JSON (nlohmann/json, sans exceptions). Les textes sont lus une fois,
// recopiés dans des structures C++ (core.hpp), puis plus jamais relus pendant la partie. Un champ absent est signalé dans
// les avertissements et remplacé par la valeur de repli déclarée dans core.hpp — même règle que pg_load() dans r88.
#include <nlohmann/json.hpp>
#include "g1/monde.hpp"

namespace g1 {
using J = nlohmann::json;

namespace {
struct Lecteur {
  std::vector<std::string>& av; std::string ctx;
  template <class T> void num(const J& o, const char* k, T& v) {
    auto it = o.find(k);
    if (it == o.end() || !it->is_number()) { av.push_back(ctx + "." + k + " absent : repli " + std::to_string(double(v))); return; }
    v = it->template get<T>();
  }
  template <class T> void opt(const J& o, const char* k, T& v) { auto it = o.find(k); if (it != o.end() && it->is_number()) v = it->template get<T>(); }
  void str(const J& o, const char* k, std::string& v) { auto it = o.find(k); if (it != o.end() && it->is_string()) v = it->get<std::string>(); }
  void boolean(const J& o, const char* k, bool& v) { auto it = o.find(k); if (it != o.end() && it->is_boolean()) v = it->get<bool>(); }
  template <size_t N> bool vec(const J& o, const char* k, double (&v)[N]) {
    auto it = o.find(k); if (it == o.end() || !it->is_array() || it->size() < N) return false;
    for (size_t i = 0; i < N; ++i) { if (!(*it)[i].is_number()) return false; v[i] = (*it)[i].get<double>(); }
    return true;
  }
};
J analyser(const char* txt, const char* nom, std::string& erreur) {
  J j = J::parse(txt ? txt : "", nullptr, false, true);   // pas d'exception, commentaires autorisés
  if (j.is_discarded() || !j.is_object()) erreur = std::string(nom) + " : JSON invalide";
  return j;
}
uint32_t couleur(const J& o) {
  auto it = o.find("couleur"); if (it == o.end() || !it->is_string()) return 0xffffff;
  std::string s = it->get<std::string>(); if (!s.empty() && s[0] == '#') s.erase(0, 1);
  return uint32_t(std::strtoul(s.c_str(), nullptr, 16));
}
template <class E> E enumParNom(const J& o, const char* k, std::initializer_list<const char*> noms, E repli) {
  auto it = o.find(k); if (it == o.end() || !it->is_string()) return repli;
  int i = 0; for (auto n : noms) { if (*it == n) return E(i); ++i; }
  return repli;
}
const std::initializer_list<const char*> ZONES = {"aucune", "residentiel_faible", "residentiel_moyen", "residentiel_dense", "bidonville",
                                                  "commercial", "industriel", "ressource", "militaire", "agricole"};
const std::initializer_list<const char*> ROLES = {"residentiel", "hopital", "usine", "pont", "qg", "avant_poste", "mine", "radio", "banque", "ruine", "stade"};
}  // namespace

int Donnees::arme(const std::string& id) const { for (size_t i = 0; i < armes.size(); ++i) if (armes[i].id == id) return int(i); return 0; }
int Donnees::faction(const std::string& id) const {
  for (size_t i = 0; i < factions.size(); ++i) if (factions[i].id == id) return int(i);
  return -1;
}

bool chargerDonnees(Donnees& d, const char* tMat, const char* tArmes, const char* tScen, const char* tReg, std::string& erreur) {
  d = Donnees{}; erreur.clear();
  J jm = analyser(tMat, "materiaux.json", erreur), ja = analyser(tArmes, "armes.json", erreur),
    js = analyser(tScen, "scenario", erreur), jr = analyser(tReg, "reglages.json", erreur);
  if (!erreur.empty()) return false;
  Lecteur L{d.avertissements, ""};

  for (auto& m : jm["materiaux"]) {
    Materiau x; L.ctx = "materiaux"; L.str(m, "nom", x.nom); L.num(m, "epaisseur_mm", x.epaisseurMm); L.num(m, "resistance", x.resistance); L.num(m, "pv_par_m3", x.pvParM3);
    d.materiaux.push_back(x);
  }
  if (d.materiaux.empty()) d.materiaux.push_back(Materiau{"defaut"});
  auto mat = [&](const J& o) { auto it = o.find("materiau"); if (it != o.end() && it->is_string()) for (size_t i = 0; i < d.materiaux.size(); ++i) if (d.materiaux[i].nom == *it) return int(i); return 0; };

  for (auto& a : ja["armes"]) {
    Arme x; L.ctx = "armes"; L.str(a, "id", x.id); L.str(a, "nom", x.nom); L.ctx += "." + x.id;
    L.num(a, "v0", x.v0); L.num(a, "masse_g", x.masseG); L.num(a, "trainee_k", x.traineeK); L.num(a, "cadence_rpm", x.cadenceRpm);
    L.num(a, "dispersion_moa", x.dispersionMoa); L.num(a, "degats", x.degats); L.num(a, "penetration_mm", x.penetrationMm); L.num(a, "portee", x.portee);
    L.num(a, "chargeur", x.chargeur); L.num(a, "rechargement", x.rechargement); L.num(a, "usure_par_tir", x.usureParTir); L.num(a, "enrayement_base", x.enrayementBase);
    L.boolean(a, "explosif", x.explosif); L.opt(a, "rayon_explosion", x.rayonExplosion); L.opt(a, "impulsion", x.impulsion);
    d.armes.push_back(x);
  }
  if (d.armes.empty()) { erreur = "armes.json : aucune arme"; return false; }

  ScenarioCfg& s = d.scenario; L.ctx = "scenario";
  L.str(js, "id", s.id); L.str(js, "nom", s.nom); L.str(js, "epoque", s.epoque); L.opt(js, "graine", s.graine); L.opt(js, "heure_depart", s.heureDepart);
  if (auto w = js.find("monde"); w != js.end() && w->is_object()) {
    L.ctx = "scenario.monde"; L.num(*w, "taille", s.taille); L.num(*w, "cellule", s.cellule); L.num(*w, "alt_min", s.altMin); L.num(*w, "alt_max", s.altMax);
    L.num(*w, "rugosite", s.rugosite); L.opt(*w, "niveau_eau", s.niveauEau);
  } else d.avertissements.push_back("scenario.monde absent : monde par défaut");
  for (auto& a : js["aplanir"]) if (a.is_array() && a.size() >= 5) s.aplanir.push_back({a[0].get<double>(), a[1].get<double>(), a[2].get<double>(), a[3].get<double>(), a[4].get<double>()});

  for (auto& f : js["factions"]) {
    FactionCfg x; L.ctx = "factions"; L.str(f, "id", x.id); L.str(f, "nom", x.nom); L.str(f, "type", x.type); L.ctx += "." + x.id; x.couleur = couleur(f);
    L.num(f, "tresor", x.tresor); L.opt(f, "dette", x.dette); L.num(f, "masse_monetaire", x.masseMonetaire); L.num(f, "impot", x.impot);
    if (auto b = f.find("budget"); b != f.end() && b->is_object()) {
      const char* postes[NB_POSTES] = {"education", "defense", "sante", "infrastructures", "dette"};
      for (int p = 0; p < NB_POSTES; ++p) L.opt(*b, postes[p], x.budget[p]);
    }
    L.str(f, "doctrine", x.doctrine); L.num(f, "agressivite", x.agressivite); L.num(f, "prudence", x.prudence); L.num(f, "corruption", x.corruption);
    L.num(f, "moral", x.moral); L.num(f, "stabilite", x.stabilite); L.boolean(f, "ia", x.ia);
    d.factions.push_back(x);
  }
  if (d.factions.empty()) { erreur = "scenario : aucune faction"; return false; }
  if (d.factions.size() > size_t(MAX_FACTIONS)) { erreur = "scenario : plus de 8 factions"; return false; }
  auto fac = [&](const J& o) { auto it = o.find("faction"); return (it != o.end() && it->is_string()) ? d.faction(*it) : -1; };

  for (auto& q : js["quartiers"]) {
    QuartierCfg x{}; double r[4]; if (!L.vec(q, "rect", r)) continue;
    x.x0 = r[0]; x.z0 = r[1]; x.x1 = r[2]; x.z1 = r[3]; x.zone = enumParNom(q, "zone", ZONES, Zone::ResidentielMoyen);
    L.opt(q, "densite", x.densite); double hh[2] = {x.hauteurMin, x.hauteurMax}; if (L.vec(q, "hauteur", hh)) { x.hauteurMin = float(hh[0]); x.hauteurMax = float(hh[1]); }
    x.materiau = mat(q); L.opt(q, "ruine", x.ruine); x.faction = fac(q); s.quartiers.push_back(x);
  }
  for (auto& o : js["structures"]) {
    StructureCfg x; double p[2], dim[3]; if (!L.vec(o, "pos", p)) continue;
    x.role = enumParNom(o, "role", ROLES, Role::Residentiel); x.x = p[0]; x.z = p[1];
    if (L.vec(o, "dim", dim)) { x.l = float(dim[0]); x.h = float(dim[1]); x.p = float(dim[2]); }
    L.opt(o, "lacet", x.lacet); x.materiau = mat(o); x.faction = fac(o); s.structures.push_back(x);
  }
  for (auto& r : js["routes"]) if (r.is_array() && r.size() >= 4) s.routes.push_back({r[0].get<double>(), r[1].get<double>(), r[2].get<double>(), r[3].get<double>()});
  for (auto& e : js["escouades"]) {
    EscouadeCfg x; double p[2], o[2]; if (!L.vec(e, "pos", p)) continue; x.x = p[0]; x.z = p[1]; x.objX = p[0]; x.objZ = p[1];
    if (L.vec(e, "objectif", o)) { x.objX = o[0]; x.objZ = o[1]; }
    x.faction = std::max(0, fac(e)); L.opt(e, "nb", x.nb); L.str(e, "arme", x.arme); s.escouades.push_back(x);
  }
  for (auto& r : js["relations"]) {   // [faction a, faction b, valeur −100..100, "guerre" | "paix"]
    if (!r.is_array() || r.size() < 3 || !r[0].is_string() || !r[1].is_string() || !r[2].is_number()) continue;
    int a = d.faction(r[0]), b = d.faction(r[1]); if (a < 0 || b < 0) continue;
    s.relations.push_back({a, b, r[2].get<float>(), r.size() > 3 && r[3] == "guerre"});
  }
  for (auto& e : js["chronologie"]) {
    EvenementCfg x; L.opt(e, "heure", x.heure); L.str(e, "type", x.type); L.str(e, "cible", x.cible); L.opt(e, "valeur", x.valeur); L.str(e, "texte", x.texte);
    s.chronologie.push_back(x);
  }
  if (auto j = js.find("joueur"); j != js.end() && j->is_object()) {
    s.factionJoueur = std::max(0, fac(*j)); s.statut = enumParNom(*j, "statut", {"voyageur", "agent", "commandant"}, Statut::Voyageur);
    double p[2]; if (L.vec(*j, "pos", p)) { s.joueurX = p[0]; s.joueurZ = p[1]; }
    L.str(*j, "arme", s.armeJoueur);
  }
  if (auto a = js.find("actes"); a != js.end() && a->is_object()) L.opt(*a, "capital_acte_II", s.capitalActeII);

  Reglages& g = d.reglages; L.ctx = "reglages";
  L.num(jr, "marche", g.marche); L.num(jr, "course", g.course); L.num(jr, "sprint", g.sprint); L.num(jr, "accel", g.accel); L.num(jr, "gravite", g.gravite);
  L.num(jr, "perception", g.perception); L.num(jr, "perception_nuit", g.perceptionNuit); L.num(jr, "champ_vision", g.champVision); L.num(jr, "delai_perception", g.delaiPerception);
  L.num(jr, "suppression_seuil", g.suppressionSeuil); L.num(jr, "capture_rayon", g.captureRayon); L.num(jr, "capture_temps", g.captureTemps);
  L.num(jr, "ravitaillement_rayon", g.ravitaillementRayon); L.num(jr, "convoi_vitesse", g.convoiVitesse); L.num(jr, "convoi_charge", g.convoiCharge);
  L.num(jr, "inflation_inertie", g.inflationInertie); L.num(jr, "fmi_seuil", g.fmiSeuil); L.num(jr, "fmi_pret", g.fmiPret);
  L.num(jr, "suspicion_montee", g.suspicionMontee); L.num(jr, "suspicion_descente", g.suspicionDescente); L.num(jr, "sanctions_duree", g.sanctionsDuree);
  return true;
}

}  // namespace g1
