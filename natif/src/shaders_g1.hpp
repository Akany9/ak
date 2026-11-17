// Shaders embarqués : en-têtes générés à la construction par bgfx shaderc (bgfx_compile_shaders ... AS_HEADERS), un
// tableau par profil (glsl, essl, spv, dxbc, dxil, mtl). embedded_shader.h choisit le bon selon le moteur de rendu.
#pragma once
#ifndef BGFX_PLATFORM_SUPPORTS_WGSL
#define BGFX_PLATFORM_SUPPORTS_WGSL 0   // profil wgsl compilé seulement avec le moteur WebGPU (BGFX_CONFIG_RENDERER_WEBGPU)
#endif
#if !defined(_WIN32)   // profils Direct3D (dxbc / dxil) compilés seulement sous Windows (voir bgfx_compile_shaders)
#define BGFX_PLATFORM_SUPPORTS_DXBC 0
#define BGFX_PLATFORM_SUPPORTS_DXIL 0
#endif
#include <bgfx/embedded_shader.h>

#if BGFX_PLATFORM_SUPPORTS_GLSL
#include "glsl/vs_terrain.sc.bin.h"
#include "glsl/fs_terrain.sc.bin.h"
#include "glsl/vs_instance.sc.bin.h"
#include "glsl/fs_instance.sc.bin.h"
#include "glsl/vs_couleur.sc.bin.h"
#include "glsl/fs_couleur.sc.bin.h"
#include "glsl/vs_imgui.sc.bin.h"
#include "glsl/fs_imgui.sc.bin.h"
#include "glsl/vs_outline.sc.bin.h"
#include "glsl/fs_outline.sc.bin.h"
#include "glsl/vs_ecran.sc.bin.h"
#include "glsl/fs_thermal.sc.bin.h"
#include "glsl/fs_copie.sc.bin.h"
#endif
#if BGFX_PLATFORM_SUPPORTS_ESSL
#include "essl/vs_terrain.sc.bin.h"
#include "essl/fs_terrain.sc.bin.h"
#include "essl/vs_instance.sc.bin.h"
#include "essl/fs_instance.sc.bin.h"
#include "essl/vs_couleur.sc.bin.h"
#include "essl/fs_couleur.sc.bin.h"
#include "essl/vs_imgui.sc.bin.h"
#include "essl/fs_imgui.sc.bin.h"
#include "essl/vs_outline.sc.bin.h"
#include "essl/fs_outline.sc.bin.h"
#include "essl/vs_ecran.sc.bin.h"
#include "essl/fs_thermal.sc.bin.h"
#include "essl/fs_copie.sc.bin.h"
#endif
#if BGFX_PLATFORM_SUPPORTS_SPIRV
#include "spirv/vs_terrain.sc.bin.h"
#include "spirv/fs_terrain.sc.bin.h"
#include "spirv/vs_instance.sc.bin.h"
#include "spirv/fs_instance.sc.bin.h"
#include "spirv/vs_couleur.sc.bin.h"
#include "spirv/fs_couleur.sc.bin.h"
#include "spirv/vs_imgui.sc.bin.h"
#include "spirv/fs_imgui.sc.bin.h"
#include "spirv/vs_outline.sc.bin.h"
#include "spirv/fs_outline.sc.bin.h"
#include "spirv/vs_ecran.sc.bin.h"
#include "spirv/fs_thermal.sc.bin.h"
#include "spirv/fs_copie.sc.bin.h"
#endif
#if BGFX_PLATFORM_SUPPORTS_DXBC
#include "dxbc/vs_terrain.sc.bin.h"
#include "dxbc/fs_terrain.sc.bin.h"
#include "dxbc/vs_instance.sc.bin.h"
#include "dxbc/fs_instance.sc.bin.h"
#include "dxbc/vs_couleur.sc.bin.h"
#include "dxbc/fs_couleur.sc.bin.h"
#include "dxbc/vs_imgui.sc.bin.h"
#include "dxbc/fs_imgui.sc.bin.h"
#include "dxbc/vs_outline.sc.bin.h"
#include "dxbc/fs_outline.sc.bin.h"
#include "dxbc/vs_ecran.sc.bin.h"
#include "dxbc/fs_thermal.sc.bin.h"
#include "dxbc/fs_copie.sc.bin.h"
#endif
#if BGFX_PLATFORM_SUPPORTS_DXIL
#include "dxil/vs_terrain.sc.bin.h"
#include "dxil/fs_terrain.sc.bin.h"
#include "dxil/vs_instance.sc.bin.h"
#include "dxil/fs_instance.sc.bin.h"
#include "dxil/vs_couleur.sc.bin.h"
#include "dxil/fs_couleur.sc.bin.h"
#include "dxil/vs_imgui.sc.bin.h"
#include "dxil/fs_imgui.sc.bin.h"
#include "dxil/vs_outline.sc.bin.h"
#include "dxil/fs_outline.sc.bin.h"
#include "dxil/vs_ecran.sc.bin.h"
#include "dxil/fs_thermal.sc.bin.h"
#include "dxil/fs_copie.sc.bin.h"
#endif
#if BGFX_PLATFORM_SUPPORTS_METAL
#include "metal/vs_terrain.sc.bin.h"
#include "metal/fs_terrain.sc.bin.h"
#include "metal/vs_instance.sc.bin.h"
#include "metal/fs_instance.sc.bin.h"
#include "metal/vs_couleur.sc.bin.h"
#include "metal/fs_couleur.sc.bin.h"
#include "metal/vs_imgui.sc.bin.h"
#include "metal/fs_imgui.sc.bin.h"
#include "metal/vs_outline.sc.bin.h"
#include "metal/fs_outline.sc.bin.h"
#include "metal/vs_ecran.sc.bin.h"
#include "metal/fs_thermal.sc.bin.h"
#include "metal/fs_copie.sc.bin.h"
#endif

namespace g1shaders {
static const bgfx::EmbeddedShader liste[] = {
  BGFX_EMBEDDED_SHADER(vs_terrain), BGFX_EMBEDDED_SHADER(fs_terrain), BGFX_EMBEDDED_SHADER(vs_instance), BGFX_EMBEDDED_SHADER(fs_instance),
  BGFX_EMBEDDED_SHADER(vs_couleur), BGFX_EMBEDDED_SHADER(fs_couleur), BGFX_EMBEDDED_SHADER(vs_imgui), BGFX_EMBEDDED_SHADER(fs_imgui),
  BGFX_EMBEDDED_SHADER(vs_outline), BGFX_EMBEDDED_SHADER(fs_outline), BGFX_EMBEDDED_SHADER(vs_ecran), BGFX_EMBEDDED_SHADER(fs_thermal), BGFX_EMBEDDED_SHADER(fs_copie),
  BGFX_EMBEDDED_SHADER_END()};
inline bgfx::ProgramHandle programme(const char* vs, const char* fs) {
  bgfx::RendererType::Enum t = bgfx::getRendererType();
  return bgfx::createProgram(bgfx::createEmbeddedShader(liste, t, vs), bgfx::createEmbeddedShader(liste, t, fs), true);
}
}  // namespace g1shaders
