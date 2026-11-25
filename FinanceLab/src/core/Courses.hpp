#pragma once
// Bibliothèque de cours : modules rédigés (formules LaTeX) et catalogue des supports PDF du Drive.
#include <string>
#include <vector>

namespace cl {

struct Snippet { std::string label, target, code; };           // target : "python" | "sheet" (lignes CELLULE|valeur) | "sql"
struct Section { std::string title, body; std::vector<Snippet> snippets; };
struct CourseModule { std::string id, title, theme, source; std::vector<Section> sections; };

struct SupportDoc { std::string title, theme, driveId, file; };   // file : nom attendu dans le dossier courses/

inline std::string DriveUrl(const std::string& id) { return "https://drive.google.com/file/d/" + id + "/view"; }

inline std::vector<CourseModule> BuiltinModules() {
    std::vector<CourseModule> m;
    m.push_back({"fq-1", "1. Valeur temporelle de l'argent", "Finance quantitative", "L'antisèche de la finance quantitative (A. K. Jha) + document « Quant »", {
        {"Capitalisation et actualisation",
         "L'argent a un coût : le temps. On compare des flux à des dates différentes en les ramenant à une date commune.\n\n"
         "## Valeur future\n$$FV = PV \\times (1 + r)^n$$\n"
         "- $PV$ : somme d'aujourd'hui, $r$ : taux, $n$ : nombre de périodes. Chaque période, les intérêts produisent eux-mêmes des intérêts (effet « boule de neige »).\n"
         "- Exemple : 100 € à 5 % pendant 1 an donnent $100 \\times (1+0{,}05)^1 = 105$.\n\n"
         "## Valeur actuelle\n$$PV = \\frac{FV}{(1 + r)^n}$$\n"
         "> Lien gestion : c'est la base du business plan et de la VAN d'un investissement : on actualise les flux futurs pour décider si le projet est rentable.\n\n"
         "## Capitalisation continue\n$$A = P\\, e^{r t}$$\n"
         "Les marchés ne s'arrêtent jamais : $e$ modélise une croissance fluide, sans paliers annuels.",
         {{"FV de 1000 à 5 % sur 3 ans (Python)", "python", "fv = 1000 * (1 + 0.05) ** 3\nprint(f'FV = {fv:.2f}')"},
          {"Tableur : FV, PV et valeur continue", "sheet", "A1|Valeur future\nB1|=1000*(1+0.05)^3\nA2|Valeur actuelle\nB2|=B1/(1+0.05)^3\nA3|Valeur continue\nB3|=1000*EXP(0.05*3)"}}}}});
    m.push_back({"fq-2", "2. Statistiques et théorie du portefeuille", "Finance quantitative", "Antisèche (sections 1 et 3), Quant, cours de statistiques", {
        {"Moyenne, variance, écart-type",
         "$$\\mu = \\frac{1}{n} \\sum_{i=1}^{n} x_i \\qquad \\sigma^2 = \\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\mu)^2 \\qquad \\sigma = \\sqrt{\\sigma^2}$$\n"
         "- La variance mesure la dispersion autour de la moyenne ; l'écart-type est dans la même unité que les données.\n"
         "- Exemple : pour 2, 4, 6 : $\\mu = 4$, $\\sigma^2 = 8/3$, $\\sigma \\approx 1{,}63$.",
         {{"Statistiques du jeu 2, 4, 6 (tableur)", "sheet", "A1|2\nA2|4\nA3|6\nC1|Moyenne\nD1|=AVERAGE(A1:A3)\nC2|Ecart-type (échantillon)\nD2|=STDEV(A1:A3)"}}},
        {"Rendement et risque d'un portefeuille",
         "$$E(R_p) = \\sum_{i=1}^{n} w_i\\, E(R_i)$$\n"
         "$$\\sigma_p^2 = \\sum_{i=1}^{n} \\sum_{j=1}^{n} w_i w_j \\sigma_{ij} = w^T \\Sigma w$$\n"
         "- $w_i$ : poids de l'actif $i$, $\\Sigma$ : matrice de covariance. Elle dit si les actifs montent ensemble ou se compensent.\n"
         "- Deux actifs : $\\sigma_p^2 = w_1^2\\sigma_1^2 + w_2^2\\sigma_2^2 + 2 w_1 w_2 \\rho\\, \\sigma_1 \\sigma_2$.\n"
         "> Lien gestion : on passe de l'équilibre emplois/ressources du bilan à l'équilibre rendement/risque.",
         {{"Variance d'un portefeuille à 2 actifs (Python)", "python", "w1, w2 = 0.6, 0.4\ns1, s2, rho = 0.20, 0.30, 0.5\nvar_p = w1**2*s1**2 + w2**2*s2**2 + 2*w1*w2*rho*s1*s2\nprint(var_p, var_p ** 0.5)"}}},
        {"CAPM, bêta et Sharpe",
         "$$R_i = R_f + \\beta_i (R_m - R_f) \\qquad \\beta = \\frac{\\mathrm{Cov}(R_i, R_m)}{\\mathrm{Var}(R_m)}$$\n"
         "$$\\text{Sharpe} = \\frac{R_p - R_f}{\\sigma_p}$$\n"
         "- Si $R_f = 2\\%$, $R_m = 8\\%$ et $\\beta = 1{,}2$ : $R_i = 2\\% + 1{,}2 \\times 6\\% = 9{,}2\\%$.\n"
         "- Le bêta est un amplificateur : $\\beta = 1{,}5$ et marché à +10 % donnent environ +15 %.\n"
         "- Sharpe : (15 % - 5 %) / 10 % = 1.",
         {{"Nuage et régression OLS (onglet Graphiques)", "python", "import random\nrandom.seed(1)\nx_vals = []\nrendements = []\nfor _ in range(800):\n    m = random.gauss(0.07, 0.15)\n    x_vals.append(m)\n    rendements.append(0.01 + 1.3 * m + random.gauss(0, 0.08))"}}}}});
    m.push_back({"fq-3", "3. Évaluation des options", "Finance quantitative", "Antisèche (section 2), Binomial Option Pricer", {
        {"Modèle de Black-Scholes",
         "Prix d'un call européen avec dividende continu $q$ :\n$$C = S_0\\, e^{-qT} N(d_1) - K\\, e^{-rT} N(d_2)$$\n"
         "$$d_1 = \\frac{\\ln(S_0/K) + (r - q + \\sigma^2/2)\\,T}{\\sigma \\sqrt{T}} \\qquad d_2 = d_1 - \\sigma \\sqrt{T}$$\n"
         "- $S_0$ : cours, $K$ : prix d'exercice, $T$ : échéance, $r$ : taux sans risque, $\\sigma$ : volatilité.\n"
         "- Exemple : $S_0 = K = 100$, $T = 1$, $r = 5\\%$, $\\sigma = 20\\%$ donnent $C \\approx 10{,}45$.",
         {{"Call Black-Scholes (tableur, fonction BSCALL)", "sheet", "A1|Call BS (sigma 20 %)\nB1|=BSCALL(100,100,1,0.05,0.2)\nA2|Call BS (sigma 30 %)\nB2|=BSCALL(100,100,1,0.05,0.3)"},
          {"Call Black-Scholes (Python)", "python", "call = black_scholes_call(100, 100, 1, 0.05, 0.20)\nprint(round(call, 4))"}}},
        {"Modèle binomial",
         "$$C = \\frac{1}{(1+r)^T} \\sum_{i=0}^{T} \\binom{T}{i} p^i (1-p)^{T-i} \\max(S_0 u^i d^{T-i} - K, 0)$$\n"
         "- On construit un arbre de prix : à chaque pas, hausse ($u$) ou baisse ($d$). $p$ est la probabilité neutre au risque.\n"
         "- Le modèle trinomial ajoute un état « inchangé » ; il convient bien aux options américaines.",
         {}},
        {"Autres modèles",
         "- **Heston** : volatilité stochastique, $dS_t = \\mu S_t\\,dt + \\sqrt{v_t}\\, S_t\\, dW_t^1$.\n"
         "- **Merton** : diffusion avec sauts, $dS_t = (\\mu - \\lambda k) S_t\\,dt + \\sqrt{v_t}\\, S_t\\, dW_t^1 + J\\, dN_t$.\n"
         "- **Différences finies** : on résout $V_{SS} + V_t + r S V_S - r V = 0$ numériquement quand la solution analytique n'existe pas.",
         {}}}});
    m.push_back({"fq-4", "4. Calcul stochastique", "Finance quantitative", "Antisèche (section 5), document « Quant »", {
        {"Mouvement brownien géométrique",
         "$$dS_t = \\mu S_t\\, dt + \\sigma S_t\\, dW_t$$\n"
         "- $\\mu$ : dérive (tendance), $\\sigma$ : volatilité (nervosité), $dW_t \\sim N(0, dt)$ : le choc aléatoire.\n"
         "- Image : tu marches sur une plage vers une direction ($\\mu$), mais le vent te pousse au hasard à chaque pas ($\\sigma\\, dW_t$).\n"
         "- Solution exacte : $S_T = S_0 \\exp\\left((\\mu - \\tfrac{\\sigma^2}{2})T + \\sigma \\sqrt{T}\\, Z\\right)$ avec $Z \\sim N(0,1)$.\n"
         "> Lien gestion : la demande moyenne d'un stock est la dérive ; les pics imprévus sont le terme aléatoire, d'où le stock de sécurité.",
         {{"30 trajectoires GBM (onglet Graphiques > Courbe)", "python", "import math, random\nrandom.seed(7)\nS0, mu, sigma, dt = 100.0, 0.08, 0.22, 1/50\ntrajectoires_gbm = []\nfor _ in range(30):\n    p = [S0]\n    for _ in range(50):\n        z = random.gauss(0, 1)\n        p.append(p[-1]*math.exp((mu-0.5*sigma**2)*dt + sigma*math.sqrt(dt)*z))\n    trajectoires_gbm.append(p)\nrendements = trajectoires_gbm[0]"}}},
        {"Lemme d'Itô",
         "$$df = \\left( \\frac{\\partial f}{\\partial t} + \\mu S \\frac{\\partial f}{\\partial S} + \\frac{1}{2} \\sigma^2 S^2 \\frac{\\partial^2 f}{\\partial S^2} \\right) dt + \\sigma S \\frac{\\partial f}{\\partial S}\\, dW_t$$\n"
         "- Delta : $\\partial f / \\partial S$. Gamma : $\\partial^2 f / \\partial S^2$.\n"
         "- Le terme $\\tfrac{1}{2}\\sigma^2 S^2 \\partial^2 f/\\partial S^2$ n'existe pas en calcul classique : à cause du hasard, la convexité crée de la valeur.\n"
         "- Exemple : pour $f = S^2$, on applique la formule pour trouver $df$.",
         {}},
        {"Diffusion avec sauts",
         "$$dS_t = \\mu S_t\\, dt + \\sigma S_t\\, dW_t + dJ_t$$\n"
         "Étend le GBM avec des sauts soudains (annonce de résultats, par exemple).", {}}}});
    m.push_back({"fq-5", "5. Mesures du risque", "Finance quantitative", "Antisèche (section 4), document « Quant »", {
        {"Value at Risk et Expected Shortfall",
         "$$P(L > \\mathrm{VaR}_\\alpha) = \\alpha \\qquad \\mathrm{ES}_\\alpha = E[\\,L \\mid L > \\mathrm{VaR}_\\alpha\\,]$$\n"
         "- « À 95 % ($\\alpha = 5\\%$), je ne perds pas plus de X demain. » Il reste 5 % de chances (la queue) que tout s'effondre.\n"
         "- Trois méthodes : simulation historique, paramétrique, Monte Carlo.\n"
         "- Plusieurs actifs, approche paramétrique : $\\mathrm{VaR} \\propto \\sqrt{w^T \\Sigma w}$.\n"
         "- L'ES moyenne les pertes au-delà de la VaR : elle décrit la queue, pas seulement le seuil.\n"
         "> Lien gestion : c'est l'équivalent financier du point de commande : un seuil pour que la probabilité de rupture reste très faible.",
         {{"Distribution et VaR (onglet Graphiques > Distribution)", "python", "import random\nrandom.seed(42)\nrendements = [random.gauss(0.08, 0.20) for _ in range(5000)]\nrendements.sort()\nvar_95 = -rendements[int(0.05 * len(rendements))]\nprint(f'VaR 95% = {var_95:.2%}')"}}},
        {"Autres mesures",
         "- **CVaR crédit** : $\\mathrm{CVaR} = EL + UL$ (perte attendue + perte inattendue), par exemple 500 000 + 300 000 = 800 000.\n"
         "- **LVaR** : $\\mathrm{LVaR} = \\mathrm{VaR} + \\text{coût de liquidité}$.\n"
         "- **Ratio de Sharpe** : $(R_p - R_f)/\\sigma_p$.", {}}}});
    m.push_back({"af-1", "6. Diagnostic financier : BFR et trésorerie", "Analyse financière", "Supports d'analyse financière (OHADA / IFRS), exercice SQL", {
        {"Équilibre fonctionnel",
         "$$\\mathrm{BFR} = \\text{Stocks} + \\text{Créances clients} - \\text{Dettes fournisseurs}$$\n"
         "$$\\mathrm{TN} = \\mathrm{FRNG} - \\mathrm{BFR} = \\text{Trésorerie active} - \\text{Trésorerie passive}$$\n"
         "- Une entreprise rentable (EBE élevé) peut faire faillite si son BFR croît plus vite que son fonds de roulement.\n"
         "- La base SQL de la session contient trois entreprises (référentiels SYSCOHADA et IFRS) pour s'entraîner.",
         {{"BFR de chaque entreprise (SQL)", "sql", "SELECT e.nom, b.exercice,\n       (b.stocks + b.creances_clients - b.dettes_fournisseurs) AS bfr,\n       (b.tresorerie_active - b.tresorerie_passive) AS tn\nFROM entreprises e JOIN bilans_annuels b ON e.id = b.entreprise_id\nORDER BY bfr DESC;"}}}}});
    return m;
}

// Supports PDF du dossier Drive (nom de fichier = titre du Drive).
inline std::vector<SupportDoc> BuiltinSupports() {
    auto d = [](const char* t, const char* th, const char* id) { return SupportDoc{t, th, id, std::string(t) + ".pdf"}; };
    return {
        d("L'ANTISECHE DE LA FINANCE QUANTITATIVE", "Finance quantitative", "1JtNAwNCA9QEpcEcb0KMyPlL1h5z9hTGK"),
        d("MATHEMATICAL SKILLS FOR QUANTITATIVE FINANCE", "Finance quantitative", "1nw5fYqEhNsTaJC90qNr37T6z-MatawUx"),
        d("Calcul Stochastique appliqué à la finance", "Finance quantitative", "1xq_70R7EF4greGXxZSytqjfxXGj687va"),
        d("Stochastic_Pro", "Finance quantitative", "1yhz4u6YhQl-rUMMbw7e-coglHxf9BjuM"),
        d("Binomial Option Pricer", "Finance quantitative", "1XPzDqog-RU_xSahI6km7MGdhZqkGe7eV"),
        d("Rapport_option_pricing", "Finance quantitative", "1imMe-q9W_OJANfrjfM2DBrj3eQKklWxm"),
        d("Local Volatility and Dupire's Equation", "Finance quantitative", "1D5nwsqbnipokDEfX_Xudefif5N2HUJ0i"),
        d("Statistical Tests for Mean Reversion", "Finance quantitative", "1h_3SDWJQysEqVi3VESZLHEihJeVlrCGc"),
        d("Session 1 Quant Finance", "Finance quantitative", "1pu5yBhe2hOd-iuhivT4UA952srnaWdmB"),
        d("BASICS OF FINANCE", "Finance quantitative", "1MqArbopMLzRkR0fb4dOOyK2Wp_JUyjI8"),
        d("50 SCHÉMAS POUR COMPRENDRE LA FINANCE_", "Finance quantitative", "1qKfx23Prf_XxOBS9e9VrROy3MbYgglVQ"),
        d("CFA Quantitative Method and Economic Level 1", "Finance quantitative", "1jSu_Imv4T1DgKjGwMCXeNsVaSviPmqkx"),
        d("MFE_PROGRAMS_", "Finance quantitative", "10oKTVzqyhGSVwKaqWaJ9HFXRgy1oakQC"),
        d("ANALYSE FONDAMENTALE DES ACTIONS_", "Analyse financière", "1WL8FIjasS06pDVj5gIeR8MYbTboWovQw"),
        d("PDF sur le Diagnostic financier__", "Analyse financière", "1J2FXHZ3K3BS-5iYuz2T8nx6HSPoQk2aY"),
        d("Mini Formation en analyse financière et crédit en OHADA", "Analyse financière", "1-Hx2jAeY70XJfZ9FeHBxJMjDrvZejD5b"),
        d("Tableau de Bord Budgétaire Avancé - Projet en Excel_VBA", "Analyse financière", "1PVtj3FH6jc94LYYmZoOw0DFamXlaTuT6"),
        d("Analyse_Financière_Révision_Académique", "Analyse financière", "1HK3Tk0VduOyamfEXsvRXOLZOLI8VABv1"),
        d("ANALYSE_FINANCIÈRE", "Analyse financière", "13xHtedPfHYPBH9dbmluzKD1Rswdq77NX"),
        d("projection macroeconomique de l'Algérie_", "Analyse financière", "1rWjCyx_yO4b_HuSqmUOZjNj6TcbpE18x"),
        d("Econometrics Models", "Statistiques et économétrie", "1bYr-xgiq-O4BDEE-lBFeopN9kyrvzhjq"),
        d("INFERENCE_STATS", "Statistiques et économétrie", "1SK_gwitpSqHRGcJD1K4eq7zI4DsaCjtZ"),
        d("Guides des testes statistiques", "Statistiques et économétrie", "1iHud5G2t52omqQbSbYIp3hvaJIuHGqLw"),
        d("Liaison entre variables qualitatives_", "Statistiques et économétrie", "1OhiM49FJ3eoMe5BQbhdQWgXnKab0lz-Z"),
        d("Paper Report MIDAS Regressions", "Statistiques et économétrie", "1UYf9H1pEPfE7gRU-VDg-40PMiGJ0nKKy"),
        d("Time series analysis and forecasting of US GDP growth__", "Statistiques et économétrie", "1brp9tmCrIACH3bGI8jFq_SRn0ZLeFjjK"),
        d("LogisticRegression", "Statistiques et économétrie", "1QKW57dUkfoPxzfwq-I3pzu1Bwbg3mubl"),
        d("BayesianLogistic", "Statistiques et économétrie", "1zn3nLvvpOSCN9rFPiS5HCdCPJn5S02j8"),
        d("Statistics Python_", "Python, R et SQL", "1aGiDjU0fnLIegtA6kRTh9-2H4svjA2-j"),
        d("python_", "Python, R et SQL", "13eaNDcyJx0mFWlg89LEMzIyuK92ueOHQ"),
        d("Python Interview Questions_", "Python, R et SQL", "1Qf7NqIjK36mZR8mmBgzAef0POXS-tqdF"),
        d("Ecrire du code  Python _ le rendu de monnaie", "Python, R et SQL", "186gtjWX_u4jyvq2nD89Q0d1JwuqQV_MG"),
        d("MANIPULATION ET ANALYSE DE DONNÉES AVEC R", "Python, R et SQL", "1N3hYKRvRM-uJY9lgXI1P95YedfEQ2rdK"),
        d("Classification of Iris dataset using k-NN in R", "Python, R et SQL", "1G8scm2LTEwSOiOb7f450z_9rCzLN3iYB"),
        d("SQL Complete Cheatsheet", "Python, R et SQL", "17IxZtNz-olSJzt1nJDbDxPMje2Lm0ar3"),
        d("SQL Notes", "Python, R et SQL", "1J6OrFKFFOwmdcKHAqA1xOFWR_ZldvQ4y"),
        d("SQL et Systèmes de Gestion de Bases de Données", "Python, R et SQL", "17R-D-oKWZ1sagAk97oEfjHEHJa5zxH22"),
        d("Ma vie avec Excel_", "Excel et Power BI", "1HY8KxB8Uwa2BlQ8rjuyUR22S01HDPpD5"),
        d("Glossaire Power BI", "Excel et Power BI", "1n2U9E4Zca0uV7LT2LI9yYbznpWTT21ts"),
        d("Day_26_Dax", "Excel et Power BI", "1gLdMH6L5jnoLHYjz0Tfdku3alO99Qa_k"),
        d("MF Recsys — NDCG_AUC", "Excel et Power BI", "1uN2nQHy5nXJl0yKXbysINZSUCEQyaBlo"),
    };
}

} // namespace cl
