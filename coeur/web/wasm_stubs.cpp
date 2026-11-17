// Bouchons pour la cible WebAssembly (wasm32-wasi, -fno-exceptions) : la libc++ précompilée référence le mécanisme
// d'exceptions (std::bad_alloc, flux). Le cœur n'en lance jamais (JSON_NOEXCEPTION) : toute exception = arrêt immédiat.
// Même principe que gameplay_cpp/web/wasm_stubs.cpp de r88.
#include <cstdlib>
extern "C" {
void* __cxa_allocate_exception(unsigned long) { std::abort(); }
void __cxa_free_exception(void*) { std::abort(); }
void __cxa_throw(void*, void*, void (*)(void*)) { std::abort(); }
void __cxa_rethrow() { std::abort(); }
void* __cxa_begin_catch(void*) { std::abort(); }
void __cxa_end_catch() {}
}
