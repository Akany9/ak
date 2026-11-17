-- Scénario historique : Berlin, avril 1945 (document d'architecture r88, brique 4 : scripting Lua / sol2).
-- Le script ne dispose que du module r88 : il pilote la chronologie et la machine à états narrative, la simulation
-- reste dans le cœur C++ (déterministe : math.random utilise le générateur du cœur).
-- Machine à états : arrivee → reconnaissance → assaut → tete_de_pont → reichstag

local FJ = "armee_rouge"   -- faction du joueur

function on_scenario_init()
  r88.set_weather("rain_fog", 0.5)
  r88.set_state("arrivee")
  r88.message("29 avril 1945, 7 h 30. Ponts de la Spree. Reconnaître le dispositif adverse avant l'assaut.")
  -- Escouades soviétiques (secteur est) — exemple du document d'architecture
  r88.spawn_squad("armee_rouge", 760, -300, 6, "ppsh41", 490, 110)
  -- Défense allemande (secteur centre) : troupes ADULTES uniquement (aucun mineur n'est simulé)
  r88.spawn_squad("wehrmacht", 60, 260, 6, "kar98k", 60, 260)
end

function on_hour(h)
  if h == 1 then r88.reinforce("armee_rouge", 8); r88.message("Arrivée d'une compagnie de fusiliers.") end
  if h == 2 then r88.price_shock("nourriture", 0.6); r88.message("Pénurie alimentaire dans la ville assiégée.") end
  if h == 3 then r88.crisis("wehrmacht", 0.2); r88.message("Désertions dans les unités de la défense.") end
  if h == 4 then r88.set_weather("pluie", 0.3) end
  if h == 6 then r88.famine("wehrmacht", 0.4); r88.message("Les dépôts de vivres du secteur sud sont épuisés.") end
  if h == 12 and r88.state() ~= "reichstag" then
    r88.set_status("commandant"); r88.set_state("assaut"); r88.message("Commandement d'une section confié au joueur.")
  end
end

local function avancement()
  if r88.held(FJ, "qg") >= 2 then
    r88.set_state("reichstag"); r88.message("Le Reichstag est tombé.")
  elseif r88.held(FJ, "avant_poste") >= 5 then   -- 3 avant-postes de départ + 2 pris sur la rive sud
    r88.set_state("tete_de_pont"); r88.message("Tête de pont établie sur la rive sud de la Spree.")
  end
end

function on_event(type, json)
  if type == "identite_revelee" and r88.state() == "arrivee" then r88.set_state("reconnaissance") end
  if type == "capture" then
    local par = tonumber(json:match('"par":(%d+)'))
    if par and r88.faction_id(par) == FJ then avancement() end
  end
  if type == "pont_coupe" then r88.message("Un pont est tombé : les convois cherchent un autre passage.") end
end
