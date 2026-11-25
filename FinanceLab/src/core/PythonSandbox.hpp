#pragma once
// Interpréteur CPython embarqué (optionnel : -DFINANCELAB_WITH_PYTHON=ON).
#include <optional>
#include <string>
#include <vector>
#ifdef FINANCELAB_WITH_PYTHON
#include <Python.h>
#endif

namespace cl {

struct PyResult { bool success = false; std::string out, err; };

#ifdef FINANCELAB_WITH_PYTHON
class PythonSandbox {
public:
    static constexpr bool kAvailable = true;
    PythonSandbox() {
        Py_Initialize();
        globals_ = PyModule_GetDict(PyImport_AddModule("__main__"));
        PyRun_SimpleString("import math, statistics, random\n"
                           "def black_scholes_call(S,K,T,r,sigma):\n"
                           "    d1=(math.log(S/K)+(r+0.5*sigma**2)*T)/(sigma*math.sqrt(T)); d2=d1-sigma*math.sqrt(T)\n"
                           "    N=lambda x:0.5*(1+math.erf(x/math.sqrt(2)))\n"
                           "    return S*N(d1)-K*math.exp(-r*T)*N(d2)\n");
    }
    ~PythonSandbox() { if (Py_IsInitialized()) Py_Finalize(); }

    PyResult Run(const std::string& code) {
        PyResult r;
        PyRun_SimpleString("import sys, io\n_cl_o=io.StringIO(); _cl_e=io.StringIO()\n_cl_so,_cl_se=sys.stdout,sys.stderr\nsys.stdout,sys.stderr=_cl_o,_cl_e\n");
        PyObject* res = PyRun_String(code.c_str(), Py_file_input, globals_, globals_);
        if (!res) { PyErr_Print(); r.success = false; } else { Py_DECREF(res); r.success = true; }
        PyRun_SimpleString("sys.stdout,sys.stderr=_cl_so,_cl_se\n_cl_ov=_cl_o.getvalue(); _cl_ev=_cl_e.getvalue()\n");
        r.out = Str("_cl_ov"); r.err = Str("_cl_ev");
        if (!r.err.empty()) r.success = false;
        return r;
    }
    std::optional<double> GetDouble(const std::string& n) {
        PyObject* o = PyDict_GetItemString(globals_, n.c_str());
        if (!o) return std::nullopt;
        if (PyFloat_Check(o)) return PyFloat_AsDouble(o);
        if (PyLong_Check(o)) return (double)PyLong_AsLong(o);
        return std::nullopt;
    }
    std::vector<double> GetList(const std::string& n) {
        std::vector<double> out;
        PyObject* o = PyDict_GetItemString(globals_, n.c_str());
        if (!o || !PySequence_Check(o) || PyUnicode_Check(o) || PyBytes_Check(o)) return out;
        PyObject* seq = PySequence_Fast(o, "seq");
        if (!seq) { PyErr_Clear(); return out; }
        Py_ssize_t len = PySequence_Fast_GET_SIZE(seq);
        for (Py_ssize_t i = 0; i < len; ++i) {
            PyObject* it = PySequence_Fast_GET_ITEM(seq, i);
            if (PyFloat_Check(it)) out.push_back(PyFloat_AsDouble(it));
            else if (PyLong_Check(it)) out.push_back((double)PyLong_AsLong(it));
        }
        Py_DECREF(seq);
        return out;
    }
private:
    PyObject* globals_ = nullptr;
    std::string Str(const char* n) {
        PyObject* o = PyDict_GetItemString(globals_, n);
        if (o && PyUnicode_Check(o)) { const char* u = PyUnicode_AsUTF8(o); return u ? u : ""; }
        return "";
    }
};
#else
class PythonSandbox {
public:
    static constexpr bool kAvailable = false;
    PyResult Run(const std::string&) { return {false, "", "Python n'est pas compilé dans cette version (CMake : -DFINANCELAB_WITH_PYTHON=ON)."}; }
    std::optional<double> GetDouble(const std::string&) { return std::nullopt; }
    std::vector<double> GetList(const std::string&) { return {}; }
};
#endif

} // namespace cl
