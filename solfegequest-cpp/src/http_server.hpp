// Mini-serveur HTTP/1.1 (keep-alive, un thread par connexion), lié à 127.0.0.1 uniquement.
#pragma once
#include <atomic>
#include <functional>
#include <map>
#include <string>
#include <thread>

namespace sq {

struct Request {
    std::string method;
    std::string path;   // sans la chaîne de requête
    std::string query;
    std::map<std::string, std::string> headers;  // noms en minuscules
    std::string body;

    std::string header(const std::string& lowerName) const {
        auto it = headers.find(lowerName);
        return it == headers.end() ? std::string() : it->second;
    }
};

struct Response {
    int status = 200;
    std::map<std::string, std::string> headers;
    // Corps : soit `body`, soit un tampon externe (`ext`, `extSize`) qui reste valide.
    std::string body;
    const uint8_t* ext = nullptr;
    size_t extSize = 0;
};

using Handler = std::function<void(const Request&, Response&)>;

class HttpServer {
public:
    HttpServer();
    ~HttpServer();

    // Écoute sur 127.0.0.1:port. Renvoie false si le port est occupé.
    bool listen(int port);
    int port() const { return port_; }

    // Lance la boucle d'acceptation dans un thread.
    void start(Handler handler);
    void stop();

private:
    void acceptLoop();
    void serveConnection(intptr_t sock);

    intptr_t listenSock_;
    int port_ = 0;
    Handler handler_;
    std::thread thread_;
    std::atomic<bool> running_{false};
};

// Client HTTP minimal : GET http://127.0.0.1:port<path>, renvoie le code (0 si échec).
int httpGetLocal(int port, const std::string& path, std::string* body, int timeoutMs);

const char* statusText(int status);

// Initialisation réseau (WSAStartup sous Windows ; sans effet ailleurs).
void netInit();

}  // namespace sq
