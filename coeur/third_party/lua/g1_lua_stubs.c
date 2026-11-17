/* Game 1 : bibliothèques os et io volontairement vides (simulation déterministe, aucun accès fichier ni horloge). */
#include "lua.h"
#include "lauxlib.h"
int luaopen_os(lua_State* L) { lua_newtable(L); return 1; }
int luaopen_io(lua_State* L) { lua_newtable(L); return 1; }
