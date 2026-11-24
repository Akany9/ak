# Solfège Quest (C++20 / Dear ImGui) — make linux | make win   (make -j8 recommandé)
IMGUI   := third_party/imgui
SRC     := app comp_panels panels theme project catalog audio util assets skeuo svgicons piano
IMSRC   := imgui imgui_draw imgui_tables imgui_widgets
FLAGS   := -std=c++20 -O2 -Wall -Wno-unused-function -Wno-missing-field-initializers -Wno-format-truncation -Wno-unused-result \
           -DIMGUI_DEFINE_MATH_OPERATORS -I$(IMGUI)

# ---- Linux (GLFW + OpenGL 3) : sert aux tests
LCXX    := g++
LOBJ    := $(SRC:%=build/l/%.o) $(IMSRC:%=build/l/im_%.o) build/l/main_glfw.o build/l/im_glfw.o build/l/im_gl3.o build/l/miniz.o
linux: dist/solfegequest
dist/solfegequest: $(LOBJ)
	@mkdir -p dist
	$(LCXX) $^ -lglfw -lGL -ldl -lpthread -lm -o $@
build/l/%.o: src/%.cpp src/*.hpp
	@mkdir -p build/l
	$(LCXX) $(FLAGS) -DSQ_ASSET_DIR='"$(CURDIR)/assets"' -c $< -o $@
build/l/assets.o: src/assets.cpp assets/*
	@mkdir -p build/l
	$(LCXX) $(FLAGS) -DSQ_ASSET_DIR='"$(CURDIR)/assets"' -c $< -o $@
build/l/im_%.o: $(IMGUI)/%.cpp
	@mkdir -p build/l
	$(LCXX) $(FLAGS) -c $< -o $@
build/l/im_glfw.o: $(IMGUI)/backends/imgui_impl_glfw.cpp
	$(LCXX) $(FLAGS) -c $< -o $@
build/l/im_gl3.o: $(IMGUI)/backends/imgui_impl_opengl3.cpp
	$(LCXX) $(FLAGS) -c $< -o $@
build/l/miniz.o: third_party/miniz/miniz.c
	@mkdir -p build/l
	gcc -O2 -c $< -o $@

# ---- Windows x64 (Win32 + Direct3D 11), compilation croisée MinGW-w64
CROSS   ?= x86_64-w64-mingw32
WCXX    := $(CROSS)-g++
WFLAGS  := $(FLAGS) -DUNICODE -D_UNICODE -DNOMINMAX -DWIN32_LEAN_AND_MEAN
WOBJ    := $(SRC:%=build/w/%.o) $(IMSRC:%=build/w/im_%.o) build/w/main_win32.o build/w/im_win32.o build/w/im_dx11.o build/w/miniz.o build/w/res.o
win: dist/SolfegeQuest.exe
dist/SolfegeQuest.exe: $(WOBJ)
	@mkdir -p dist
	$(WCXX) -municode -mwindows -static -static-libgcc -static-libstdc++ -s $^ \
	  -ld3d11 -ld3dcompiler -ldxgi -ldwmapi -lgdi32 -lole32 -lshell32 -lcomdlg32 -luuid -lwinmm -o $@
build/w/%.o: src/%.cpp src/*.hpp
	@mkdir -p build/w
	$(WCXX) $(WFLAGS) -c $< -o $@
build/w/im_%.o: $(IMGUI)/%.cpp
	@mkdir -p build/w
	$(WCXX) $(WFLAGS) -c $< -o $@
build/w/im_win32.o: $(IMGUI)/backends/imgui_impl_win32.cpp
	$(WCXX) $(WFLAGS) -c $< -o $@
build/w/im_dx11.o: $(IMGUI)/backends/imgui_impl_dx11.cpp
	$(WCXX) $(WFLAGS) -c $< -o $@
build/w/miniz.o: third_party/miniz/miniz.c
	@mkdir -p build/w
	$(CROSS)-gcc -O2 -c $< -o $@
build/w/res.o: res/app.rc src/resource_ids.h assets/* res/app.ico res/app.manifest
	@mkdir -p build/w
	$(CROSS)-windres --codepage=65001 -I src -O coff $< -o $@

clean:
	rm -rf build dist
.PHONY: linux win clean
