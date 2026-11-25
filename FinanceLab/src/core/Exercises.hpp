#pragma once
// Banque d'exercices type « problem set » : intuition, formalisation, indices gradués, correcteur automatique.
#include "Database.hpp"
#include "PythonSandbox.hpp"
#include <cmath>
#include <cstdlib>
#include <functional>
#include <string>
#include <utility>
#include <vector>

namespace cl {

enum class ExDomain { Sql, Python };

struct Exercise {
    std::string id, course, title, intuition, spec, task, starter;
    ExDomain domain;
    std::vector<std::string> hints;
    std::function<std::pair<bool, std::string>(Database&, PythonSandbox&, const SqlResult&)> validate;
};

inline std::vector<Exercise> BuiltinExercises() {
    std::vector<Exercise> v;
    v.push_back({
        "FIN-SQL-01", "Finance d'entreprise & SQL", "Tensions de BFR et de trésorerie nette",
        "Une entreprise rentable (EBE élevé) peut faire faillite si son BFR croît plus vite que son fonds de roulement.",
        "BFR = Stocks + Créances clients - Dettes fournisseurs\nTN = Trésorerie active - Trésorerie passive",
        "Pour l'exercice 2025, retournez (nom, bfr, tresorerie_nette) des entreprises dont TN < 0, triées par BFR décroissant.",
        "SELECT e.nom,\n       (b.stocks + b.creances_clients - b.dettes_fournisseurs) AS bfr,\n       (b.tresorerie_active - b.tresorerie_passive) AS tresorerie_nette\nFROM entreprises e\nJOIN bilans_annuels b ON e.id = b.entreprise_id\nWHERE b.exercice = 2025\n-- complétez : filtre TN < 0 et ORDER BY\n;",
        ExDomain::Sql,
        {"Indice 1 : ajoutez AND (b.tresorerie_active - b.tresorerie_passive) < 0 dans le WHERE.",
         "Indice 2 : terminez par ORDER BY bfr DESC.",
         "Indice 3 : deux lignes attendues - Sahel Agro-Industrie (BFR 1 680 000) puis Atlas Logistique (BFR 610 000)."},
        [](Database&, PythonSandbox&, const SqlResult& user) -> std::pair<bool, std::string> {
            if (!user.success) return {false, "Votre requête a échoué : " + user.error};
            if (user.rows.size() != 2 || user.columns.size() < 3) return {false, "Attendu : 2 lignes et 3 colonnes (nom, bfr, tresorerie_nette) ; obtenu " + std::to_string(user.rows.size()) + " ligne(s)."};
            bool order = user.rows[0][0] == "Sahel Agro-Industrie" && user.rows[1][0] == "Atlas Logistique";
            bool bfr = std::fabs(std::atof(user.rows[0][1].c_str()) - 1680000) < 1 && std::fabs(std::atof(user.rows[1][1].c_str()) - 610000) < 1;
            if (!order) return {false, "Mauvaises entreprises ou mauvais tri (BFR décroissant)."};
            if (!bfr) return {false, "Les valeurs de BFR sont incorrectes : Stocks + Créances - Dettes fournisseurs."};
            return {true, "Validé : Sahel Agro-Industrie (BFR 1 680 000) puis Atlas Logistique (BFR 610 000)."};
        }});
    v.push_back({
        "QF-PY-01", "Finance quantitative", "Trajectoires GBM et VaR 95 %",
        "Le prix d'un actif risqué suit une dérive déterministe plus un choc brownien aléatoire.",
        "S_T = S0 * exp((mu - sigma^2/2) T + sigma sqrt(T) Z), Z ~ N(0,1)\nVaR95 = -Quantile_5%((S_T - S0)/S0)",
        "Simulez N = 10 000 prix terminaux (S0=100, mu=0.08, sigma=0.20, T=1, seed 42) et stockez la VaR 95 % (positive) dans var_95.",
        "import math, random\nrandom.seed(42)\nS0, mu, sigma, T, N = 100.0, 0.08, 0.20, 1.0, 10000\nrendements = []\nfor _ in range(N):\n    z = random.gauss(0.0, 1.0)\n    S_T = S0 * math.exp((mu - 0.5 * sigma**2) * T + sigma * math.sqrt(T) * z)\n    rendements.append((S_T - S0) / S0)\nrendements.sort()\nvar_95 = 0.0   # à compléter : quantile 5 % en positif\nprint(f'VaR 95% : {var_95:.4%}')\n",
        ExDomain::Python,
        {"Indice 1 : le 5e centile de la liste triée est à l'indice int(0.05 * N).",
         "Indice 2 : une perte de -22,5 % correspond à var_95 = +0.225, soit -rendements[int(0.05*N)].",
         "Indice 3 : l'ordre de grandeur attendu est 0.22."},
        [](Database&, PythonSandbox& py, const SqlResult&) -> std::pair<bool, std::string> {
            auto x = py.GetDouble("var_95");
            if (!x) return {false, "Variable var_95 introuvable (exécutez d'abord le script)."};
            if (std::fabs(*x - 0.22) < 0.03) return {true, "Excellent : VaR 95 % = " + std::to_string(*x * 100).substr(0, 5) + " %."};
            return {false, "var_95 = " + std::to_string(*x) + " hors cible : vérifiez le signe et l'indice du quantile."};
        }});

    auto pyEx = [&](std::string id, std::string course, std::string title, std::string intu, std::string spec, std::string task, std::string starter,
                    std::vector<std::string> hints, std::string var, double target, double tol) {
        v.push_back({id, course, title, intu, spec, task, starter, ExDomain::Python, hints,
            [var, target, tol](Database&, PythonSandbox& py, const SqlResult&) -> std::pair<bool, std::string> {
                auto x = py.GetDouble(var);
                if (!x) return {false, "Variable " + var + " introuvable (exécutez d'abord le script)."};
                if (std::fabs(*x - target) <= tol) return {true, "Correct : " + var + " = " + std::to_string(*x)};
                return {false, var + " = " + std::to_string(*x) + " : hors cible, relisez la formule du cours."};
            }});
    };
    pyEx("FQ-PY-02", "Finance quantitative (module 1)", "Valeur future et actualisation",
         "Un euro aujourd'hui vaut plus qu'un euro demain : on compare des flux en les ramenant à la même date.",
         "FV = PV (1+r)^n ; PV = FV / (1+r)^n",
         "Calculez la valeur actuelle (variable pv) de 1 157,63 reçus dans 3 ans avec un taux d'actualisation de 5 %.",
         "FV, r, n = 1157.63, 0.05, 3\npv = 0.0   # à compléter\nprint(pv)\n",
         {"Indice 1 : divisez FV par (1 + r) élevé à la puissance n.", "Indice 2 : pv = FV / (1 + r) ** n.", "Indice 3 : le résultat est proche de 1000."}, "pv", 1000.0, 0.05);
    pyEx("FQ-PY-03", "Finance quantitative (module 2)", "Variance d'un portefeuille à deux actifs",
         "La diversification réduit le risque tant que la corrélation est inférieure à 1.",
         "sigma_p^2 = w1^2 s1^2 + w2^2 s2^2 + 2 w1 w2 rho s1 s2",
         "Avec w = (0,6 ; 0,4), s = (20 % ; 30 %) et rho = 0,5, stockez la variance du portefeuille dans var_p.",
         "w1, w2 = 0.6, 0.4\ns1, s2, rho = 0.20, 0.30, 0.5\nvar_p = 0.0   # à compléter\nprint(var_p)\n",
         {"Indice 1 : trois termes, dont un terme croisé 2 w1 w2 rho s1 s2.", "Indice 2 : 0,36 x 0,04 = 0,0144 pour le premier terme.", "Indice 3 : la variance totale vaut 0,0432."}, "var_p", 0.0432, 1e-6);
    pyEx("FQ-PY-04", "Finance quantitative (module 2)", "Rendement attendu avec le CAPM",
         "Le rendement exigé d'un actif dépend de son bêta : sa sensibilité au marché.",
         "R_i = R_f + beta (R_m - R_f)",
         "Avec Rf = 2 %, Rm = 8 % et bêta = 1,2, stockez le rendement attendu (en décimal) dans er.",
         "rf, rm, beta = 0.02, 0.08, 1.2\ner = 0.0   # à compléter\nprint(er)\n",
         {"Indice 1 : la prime de risque de marché est Rm - Rf.", "Indice 2 : er = rf + beta * (rm - rf).", "Indice 3 : le résultat vaut 0,092."}, "er", 0.092, 1e-9);
    pyEx("FQ-PY-05", "Finance quantitative (module 3)", "Prix d'un call Black-Scholes",
         "Une option est une assurance : sa valeur augmente avec la volatilité.",
         "C = S N(d1) - K exp(-rT) N(d2)",
         "Utilisez la fonction black_scholes_call fournie pour un call S=K=100, T=1, r=5 %, sigma=20 % et stockez le prix dans call.",
         "call = 0.0   # à compléter avec black_scholes_call(S, K, T, r, sigma)\nprint(call)\n",
         {"Indice 1 : la fonction black_scholes_call(S, K, T, r, sigma) existe déjà.", "Indice 2 : call = black_scholes_call(100, 100, 1, 0.05, 0.20).", "Indice 3 : le prix est proche de 10,45."}, "call", 10.4506, 0.01);
    return v;
}

} // namespace cl
