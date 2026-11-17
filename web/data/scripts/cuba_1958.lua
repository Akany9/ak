-- Scénario historique : Cuba, 1958 — de la guérilla à l'État (script Lua, module r88).
-- Machine à états : maquis → offensive → liberation_santiago → gouvernement

function on_scenario_init()
  r88.set_weather("clair", 0)
  r88.set_state("maquis")
  r88.message("Sierra Maestra, 1958. Radio Rebelde émet depuis La Plata.")
end

function on_hour(h)
  if h == 2 then r88.price_shock("biens", 0.15); r88.message("Récolte sucrière : hausse des cours.") end
  if h == 4 then r88.crisis("regime", 0.15); r88.set_relation("usa", "regime", 10); r88.message("Embargo américain sur les armes à destination du régime.") end
  if h == 8 then r88.reinforce("regime", 12); r88.message("Offensive d'été : renforts gouvernementaux.") end
  if h == 12 then r88.reinforce("m26j", 8); r88.message("Des volontaires rejoignent la colonne.") end
  if h % 24 == 18 then r88.set_weather("pluie", 0.4 + 0.4 * math.random()) elseif h % 24 == 22 then r88.set_weather("clair", 0) end
end

function on_event(type, json)
  if type ~= "capture" then return end
  local par = tonumber(json:match('"par":(%d+)'))
  if not par or r88.faction_id(par) ~= "m26j" then return end
  local postes = r88.held("m26j", "avant_poste")
  if r88.held("m26j", "qg") >= 2 then
    r88.set_state("gouvernement"); r88.message("Le Cuartel Moncada est tombé : transition vers la gestion de l'État.")
  elseif postes >= 3 then
    r88.set_state("liberation_santiago")
  elseif postes >= 2 and r88.state() == "maquis" then
    r88.set_state("offensive"); r88.message("La colonne descend de la Sierra.")
  end
end
