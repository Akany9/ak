/* Chargeur du cœur de simulation C++ compilé en WebAssembly (g1_coeur.wasm). COUCHE PLATE-FORME UNIQUEMENT :
   aucune règle ni décision de jeu ici (même rôle que web/pg_gameplay.js dans PES Hub r88). Elle transmet les textes JSON
   au chargement, l'entrée du joueur à chaque image, et expose l'état (Float32Array partagés avec la mémoire WebAssembly)
   au rendu three.js. Fonctionne dans le navigateur et sous Node (tests). */
export const STRIDE = { unite: 16, structure: 12, projectile: 7, convoi: 8, faction: 24, route: 5 };   // include/g1/api.h
export const MODE = { tactique: 0, exploration: 1, strategique: 2 };
export const DECRETS = ["État d'urgence", "Couvre-feu", "Conscription", "Nationalisation", "Liberté de la presse", "Planche à billets", "Travail forcé"];
export const POSTES = ["Éducation", "Défense", "Santé", "Infrastructures", "Dette"];
export const BIENS = ["nourriture", "carburant", "munitions", "minerai", "pétrole", "biens"];
export const HEATMAPS = ["PIB local", "Chômage", "Pollution", "Densité", "Ressources", "Contrôle", "Incertitude (brouillard)"];
export const ROLES = ["résidentiel", "hôpital", "usine", "pont", "QG", "avant-poste", "mine", "radio", "banque", "ruine", "stade"];
export const ETATS_UNITE = ["patrouille", "engagement", "couverture", "repli", "mort", "joueur"];
export const STATUTS = ["Voyageur", "Agent", "Commandant"];
export const BOUTONS = { sprint: 1, accroupi: 2, tir: 4, visee: 8, recharger: 16 };

export class Coeur {
  static async create(wasmBytes) {
    const c = new Coeur(); let mem = null;
    const wasi = {   // impression d'erreurs seulement (fd_write) ; aucun fichier, aucune horloge (simulation déterministe)
      fd_write: (fd, iov, n, out) => { const v = new DataView(mem.buffer); let s = "", t = 0;
        for (let i = 0; i < n; i++) { const p = v.getUint32(iov + 8 * i, true), l = v.getUint32(iov + 8 * i + 4, true); s += new TextDecoder().decode(new Uint8Array(mem.buffer, p, l)); t += l; }
        (fd === 2 ? console.error : console.log)("[g1] " + s.trimEnd()); v.setUint32(out, t, true); return 0; },
      fd_close: () => 0, fd_seek: () => 0, fd_fdstat_get: () => 0, proc_exit: (c) => { throw new Error("g1 : arrêt " + c); },
      environ_get: () => 0, environ_sizes_get: (a, b) => { const v = new DataView(mem.buffer); v.setUint32(a, 0, true); v.setUint32(b, 0, true); return 0; },
      clock_time_get: () => 0, args_get: () => 0, args_sizes_get: (a, b) => { const v = new DataView(mem.buffer); v.setUint32(a, 0, true); v.setUint32(b, 0, true); return 0; },
    };
    const mod = await WebAssembly.compile(wasmBytes), imports = {};
    for (const im of WebAssembly.Module.imports(mod)) {   // toute importation WASI non fournie : bouchon neutre
      imports[im.module] ??= {}; imports[im.module][im.name] = (im.module === "wasi_snapshot_preview1" && wasi[im.name]) || (() => 0);
    }
    const instance = await WebAssembly.instantiate(mod, imports);
    c.x = instance.exports; mem = c.x.memory; c.x._initialize?.(); c.enc = new TextEncoder(); c.dec = new TextDecoder();
    return c;
  }
  str(ptr) { const m = new Uint8Array(this.x.memory.buffer); let e = ptr; while (m[e]) e++; return this.dec.decode(m.subarray(ptr, e)); }
  put(s) { const b = this.enc.encode(s), p = this.x.g1_alloc(b.length + 1), m = new Uint8Array(this.x.memory.buffer, p, b.length + 1); m.set(b); m[b.length] = 0; return p; }
  f32(ptr, n) { return new Float32Array(this.x.memory.buffer, ptr, n); }   // vue directe (refaite à chaque lecture : la mémoire peut grandir)

  /* textes : { materiaux, armes, scenario, reglages } (contenu des fichiers de coeur/data) */
  load(t) {
    const ps = [t.materiaux, t.armes, t.scenario, t.reglages].map(s => this.put(s));
    const ok = this.x.g1_load(...ps); ps.forEach(p => this.x.g1_free(p));
    if (!ok) throw new Error("cœur C++ : " + this.str(this.x.g1_error()));
    this.nf = this.x.g1_factions_count();
    this.factionsNoms = Array.from({ length: this.nf }, (_, i) => this.str(this.x.g1_faction_nom(i)));
    this.factionsIds = Array.from({ length: this.nf }, (_, i) => this.str(this.x.g1_faction_id(i)));
    return JSON.parse(this.str(this.x.g1_warnings()));
  }
  step(dt) { this.x.g1_step(dt); }
  tick() { this.x.g1_tick(); }
  input(avant, cote, lacet, tangage, cam, boutons) { this.x.g1_input(avant, cote, lacet, tangage, cam.x, cam.y, cam.z, boutons); }
  mode(m) { this.x.g1_mode(m); }
  decret(f, d, actif) { return !!this.x.g1_decret(f, d, actif ? 1 : 0); }
  budget(f, poste, part) { this.x.g1_budget(f, poste, part); }
  terraformer(outil, x, z, rayon, force, dev) { return !!this.x.g1_terraformer(outil, x, z, rayon, force, dev ? 1 : 0); }
  reponseDiplomatique(de, vers, accord, texte) { const p = this.put(texte || ""); this.x.g1_reponse_diplomatique(de, vers, accord ? 1 : 0, p); this.x.g1_free(p); }
  heightmap16(u16, cote, altMin, altMax) {
    const p = this.x.g1_alloc(u16.byteLength); new Uint8Array(this.x.memory.buffer, p, u16.byteLength).set(new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength));
    const ok = this.x.g1_heightmap16(p, cote, altMin, altMax); this.x.g1_free(p); return !!ok;
  }
  terrain() {
    // tous les appels (qui peuvent faire grandir la mémoire WebAssembly) AVANT de créer les vues : une vue créée plus tôt
    // serait détachée. Les vues renvoyées restent valides jusqu'au prochain appel au cœur.
    const n = this.x.g1_terrain_n(), pc = this.x.g1_cellules(), ph = this.x.g1_terrain_hauteurs();
    return { n, cellule: this.x.g1_terrain_cellule(), taille: this.x.g1_terrain_taille(), revision: this.x.g1_terrain_revision(), eau: this.x.g1_niveau_eau(),
             hauteurs: this.f32(ph, (n + 1) * (n + 1)), cellules: this.f32(pc, n * n * 4) };
  }
  heatmap(type) { const n = this.x.g1_terrain_n(); return this.f32(this.x.g1_heatmap(type), n * n); }
  structures() { const n = this.x.g1_structures_count(); return { n, d: this.f32(this.x.g1_structures(), n * STRIDE.structure) }; }
  unites() { const n = this.x.g1_unites_count(); return { n, d: this.f32(this.x.g1_unites(), n * STRIDE.unite) }; }
  projectiles() { const n = this.x.g1_projectiles_count(); return { n, d: this.f32(this.x.g1_projectiles(), n * STRIDE.projectile) }; }
  convois() { const n = this.x.g1_convois_count(); return { n, d: this.f32(this.x.g1_convois(), n * STRIDE.convoi) }; }
  routes() { const n = this.x.g1_routes_count(); return { n, d: this.f32(this.x.g1_routes(), n * STRIDE.route) }; }
  factions() { return this.f32(this.x.g1_factions(), this.nf * STRIDE.faction); }
  relations() { const r = this.f32(this.x.g1_relations(), this.nf * this.nf * 2); return { valeur: r.subarray(0, this.nf * this.nf), guerre: r.subarray(this.nf * this.nf) }; }
  strates(f) { return this.f32(this.x.g1_strates(f), 36); }
  decrets(f) { return this.f32(this.x.g1_decrets(f), DECRETS.length + POSTES.length); }
  tuiles() { const n = this.x.g1_tuiles_count(); return this.f32(this.x.g1_tuiles(), n * 2); }
  etat() { return this.f32(this.x.g1_etat(), 32); }
  events() { return JSON.parse(this.str(this.x.g1_events())); }
  hash() { return this.x.g1_hash() >>> 0; }
}
