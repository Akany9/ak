#include "http_server.hpp"

#include <algorithm>
#include <cctype>
#include <cstring>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
using sock_t = SOCKET;
static const sock_t kBad = INVALID_SOCKET;
static void closeSock(sock_t s) { closesocket(s); }
#else
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <signal.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>
using sock_t = int;
static const sock_t kBad = -1;
static void closeSock(sock_t s) { ::close(s); }
#endif

namespace sq {

namespace {

void setTimeouts(sock_t s, int ms) {
#ifdef _WIN32
    DWORD t = DWORD(ms);
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char*>(&t), sizeof t);
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, reinterpret_cast<const char*>(&t), sizeof t);
#else
    timeval tv{ms / 1000, (ms % 1000) * 1000};
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof tv);
#endif
}

bool sendAll(sock_t s, const char* p, size_t n) {
    while (n > 0) {
        int chunk = int(std::min<size_t>(n, 1 << 20));
#ifdef _WIN32
        int k = ::send(s, p, chunk, 0);
#else
        ssize_t k = ::send(s, p, size_t(chunk), MSG_NOSIGNAL);
#endif
        if (k <= 0) return false;
        p += k;
        n -= size_t(k);
    }
    return true;
}

std::string lower(std::string s) {
    for (auto& c : s) c = char(std::tolower(static_cast<unsigned char>(c)));
    return s;
}

std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t");
    if (a == std::string::npos) return {};
    size_t b = s.find_last_not_of(" \t\r");
    return s.substr(a, b - a + 1);
}

std::string percentDecode(const std::string& in) {
    std::string out;
    for (size_t i = 0; i < in.size(); ++i) {
        if (in[i] == '%' && i + 2 < in.size() && std::isxdigit(static_cast<unsigned char>(in[i + 1])) &&
            std::isxdigit(static_cast<unsigned char>(in[i + 2]))) {
            out.push_back(char(std::stoi(in.substr(i + 1, 2), nullptr, 16)));
            i += 2;
        } else {
            out.push_back(in[i]);
        }
    }
    return out;
}

}  // namespace

const char* statusText(int status) {
    switch (status) {
        case 200: return "OK";
        case 204: return "No Content";
        case 304: return "Not Modified";
        case 400: return "Bad Request";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 405: return "Method Not Allowed";
        case 413: return "Request Entity Too Large";
        case 500: return "Internal Server Error";
        default: return "Unknown";
    }
}

void netInit() {
#ifdef _WIN32
    static bool done = false;
    if (!done) {
        WSADATA w;
        WSAStartup(MAKEWORD(2, 2), &w);
        done = true;
    }
#else
    signal(SIGPIPE, SIG_IGN);
#endif
}

HttpServer::HttpServer() : listenSock_(intptr_t(kBad)) { netInit(); }

HttpServer::~HttpServer() { stop(); }

bool HttpServer::listen(int port) {
    sock_t s = ::socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == kBad) return false;
#ifdef _WIN32
    // Comme Go sous Windows : aucun partage du port avec un autre processus.
    BOOL excl = TRUE;
    setsockopt(s, SOL_SOCKET, SO_EXCLUSIVEADDRUSE, reinterpret_cast<const char*>(&excl), sizeof excl);
#else
    int one = 1;
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);
#endif
    sockaddr_in a{};
    a.sin_family = AF_INET;
    a.sin_port = htons(uint16_t(port));
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);  // jamais sur le réseau
    if (::bind(s, reinterpret_cast<sockaddr*>(&a), sizeof a) != 0 || ::listen(s, 64) != 0) {
        closeSock(s);
        return false;
    }
    socklen_t len = sizeof a;
    getsockname(s, reinterpret_cast<sockaddr*>(&a), &len);
    port_ = ntohs(a.sin_port);
    listenSock_ = intptr_t(s);
    return true;
}

void HttpServer::start(Handler handler) {
    handler_ = std::move(handler);
    running_ = true;
    thread_ = std::thread([this] { acceptLoop(); });
}

void HttpServer::stop() {
    if (!running_.exchange(false)) return;
    sock_t s = sock_t(listenSock_);
    listenSock_ = intptr_t(kBad);
#ifndef _WIN32
    ::shutdown(s, SHUT_RDWR);
#endif
    closeSock(s);
    if (thread_.joinable()) thread_.join();
}

void HttpServer::acceptLoop() {
    while (running_) {
        sock_t c = ::accept(sock_t(listenSock_), nullptr, nullptr);
        if (c == kBad) {
            if (!running_) break;
            continue;
        }
        int one = 1;
        setsockopt(c, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<const char*>(&one), sizeof one);
        std::thread([this, c] { serveConnection(intptr_t(c)); }).detach();
    }
}

void HttpServer::serveConnection(intptr_t raw) {
    sock_t s = sock_t(raw);
    setTimeouts(s, 120000);
    std::string buf;
    char tmp[16384];
    const size_t kMaxHeader = 64 * 1024;
    const size_t kMaxBody = 16 * 1024 * 1024;

    for (;;) {
        // --- lecture de l'en-tête
        size_t hdrEnd;
        while ((hdrEnd = buf.find("\r\n\r\n")) == std::string::npos) {
            if (buf.size() > kMaxHeader) { closeSock(s); return; }
            int k = ::recv(s, tmp, sizeof tmp, 0);
            if (k <= 0) { closeSock(s); return; }
            buf.append(tmp, size_t(k));
        }
        std::string head = buf.substr(0, hdrEnd);
        buf.erase(0, hdrEnd + 4);

        Request req;
        size_t lineEnd = head.find("\r\n");
        std::string first = head.substr(0, lineEnd);
        size_t sp1 = first.find(' '), sp2 = first.rfind(' ');
        if (sp1 == std::string::npos || sp2 == sp1) { closeSock(s); return; }
        req.method = first.substr(0, sp1);
        std::string target = first.substr(sp1 + 1, sp2 - sp1 - 1);
        std::string version = first.substr(sp2 + 1);
        size_t q = target.find('?');
        req.path = percentDecode(target.substr(0, q));
        if (q != std::string::npos) req.query = target.substr(q + 1);

        size_t pos = (lineEnd == std::string::npos) ? head.size() : lineEnd + 2;
        while (pos < head.size()) {
            size_t e = head.find("\r\n", pos);
            if (e == std::string::npos) e = head.size();
            std::string line = head.substr(pos, e - pos);
            size_t c = line.find(':');
            if (c != std::string::npos) req.headers[lower(trim(line.substr(0, c)))] = trim(line.substr(c + 1));
            pos = e + 2;
        }

        // --- corps (Content-Length uniquement ; le client n'envoie rien d'autre)
        bool keepAlive = version == "HTTP/1.1";
        std::string conn = lower(req.header("connection"));
        if (conn.find("close") != std::string::npos) keepAlive = false;
        if (conn.find("keep-alive") != std::string::npos) keepAlive = true;

        if (!req.header("transfer-encoding").empty()) {
            const char* r = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            sendAll(s, r, std::strlen(r));
            closeSock(s);
            return;
        }
        size_t clen = 0;
        std::string cl = req.header("content-length");
        if (!cl.empty()) {
            try { clen = size_t(std::stoull(cl)); } catch (...) { closeSock(s); return; }
            if (clen > kMaxBody) {
                const char* r = "HTTP/1.1 413 Request Entity Too Large\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                sendAll(s, r, std::strlen(r));
                closeSock(s);
                return;
            }
        }
        while (buf.size() < clen) {
            int k = ::recv(s, tmp, sizeof tmp, 0);
            if (k <= 0) { closeSock(s); return; }
            buf.append(tmp, size_t(k));
        }
        req.body = buf.substr(0, clen);
        buf.erase(0, clen);

        // --- traitement
        Response res;
        try {
            handler_(req, res);
        } catch (...) {
            res = Response{};
            res.status = 500;
            res.body = "erreur interne\n";
            res.headers["Content-Type"] = "text/plain; charset=utf-8";
        }

        const uint8_t* bodyPtr = res.ext ? res.ext : reinterpret_cast<const uint8_t*>(res.body.data());
        size_t bodyLen = res.ext ? res.extSize : res.body.size();
        bool noBody = req.method == "HEAD" || res.status == 204 || res.status == 304;

        std::string out = "HTTP/1.1 " + std::to_string(res.status) + " " + statusText(res.status) + "\r\n";
        for (auto& h : res.headers) out += h.first + ": " + h.second + "\r\n";
        if (res.status != 204 && res.status != 304) out += "Content-Length: " + std::to_string(bodyLen) + "\r\n";
        out += keepAlive ? "Connection: keep-alive\r\n\r\n" : "Connection: close\r\n\r\n";

        if (!sendAll(s, out.data(), out.size())) { closeSock(s); return; }
        if (!noBody && bodyLen && !sendAll(s, reinterpret_cast<const char*>(bodyPtr), bodyLen)) {
            closeSock(s);
            return;
        }
        if (!keepAlive) {
#ifdef _WIN32
            ::shutdown(s, SD_SEND);
#else
            ::shutdown(s, SHUT_WR);
#endif
            closeSock(s);
            return;
        }
    }
}

int httpGetLocal(int port, const std::string& path, std::string* body, int timeoutMs) {
    netInit();
    sock_t s = ::socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == kBad) return 0;
    setTimeouts(s, timeoutMs);
    sockaddr_in a{};
    a.sin_family = AF_INET;
    a.sin_port = htons(uint16_t(port));
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    if (::connect(s, reinterpret_cast<sockaddr*>(&a), sizeof a) != 0) { closeSock(s); return 0; }
    std::string req = "GET " + path + " HTTP/1.1\r\nHost: 127.0.0.1:" + std::to_string(port) +
                      "\r\nConnection: close\r\n\r\n";
    if (!sendAll(s, req.data(), req.size())) { closeSock(s); return 0; }
    std::string resp;
    char tmp[4096];
    for (;;) {
        int k = ::recv(s, tmp, sizeof tmp, 0);
        if (k <= 0) break;
        resp.append(tmp, size_t(k));
        if (resp.size() > 1 << 20) break;
    }
    closeSock(s);
    if (resp.compare(0, 9, "HTTP/1.1 ") != 0 && resp.compare(0, 9, "HTTP/1.0 ") != 0) return 0;
    int code = std::atoi(resp.c_str() + 9);
    size_t e = resp.find("\r\n\r\n");
    if (body) *body = e == std::string::npos ? std::string() : resp.substr(e + 4);
    return code;
}

}  // namespace sq
