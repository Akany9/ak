#include "gunzip.hpp"

#include <stdexcept>

namespace sq {
namespace {

struct BitReader {
    const uint8_t* p;
    size_t n;
    size_t pos = 0;
    uint32_t buf = 0;
    int cnt = 0;

    uint32_t bits(int need) {
        while (cnt < need) {
            if (pos >= n) throw std::runtime_error("gzip : flux tronqué");
            buf |= uint32_t(p[pos++]) << cnt;
            cnt += 8;
        }
        uint32_t v = buf & ((1u << need) - 1u);
        buf >>= need;
        cnt -= need;
        return v;
    }
    void align() { buf = 0; cnt = 0; }
};

struct Huffman {
    uint16_t count[16] = {};
    uint16_t symbol[288] = {};

    void build(const uint8_t* lengths, int n) {
        for (auto& c : count) c = 0;
        for (int i = 0; i < n; ++i) count[lengths[i]]++;
        count[0] = 0;
        uint16_t offs[16] = {};
        for (int i = 1; i < 16; ++i) offs[i] = uint16_t(offs[i - 1] + count[i - 1]);
        for (int i = 0; i < n; ++i)
            if (lengths[i]) symbol[offs[lengths[i]]++] = uint16_t(i);
    }

    int decode(BitReader& br) const {
        int code = 0, first = 0, index = 0;
        for (int len = 1; len < 16; ++len) {
            code |= int(br.bits(1));
            int c = count[len];
            if (code - c < first) return symbol[index + (code - first)];
            index += c;
            first += c;
            first <<= 1;
            code <<= 1;
        }
        throw std::runtime_error("gzip : code de Huffman invalide");
    }
};

const uint16_t kLenBase[29] = {3,  4,  5,  6,  7,  8,  9,  10, 11,  13,  15,  17,  19,  23, 27,
                               31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258};
const uint8_t kLenExtra[29] = {0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2,
                               2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0};
const uint16_t kDistBase[30] = {1,   2,   3,   4,   5,   7,    9,    13,   17,   25,
                                33,  49,  65,  97,  129, 193,  257,  385,  513,  769,
                                1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577};
const uint8_t kDistExtra[30] = {0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6,
                                6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13};

void inflateBlock(BitReader& br, std::string& out, const Huffman& lit, const Huffman& dist) {
    for (;;) {
        int sym = lit.decode(br);
        if (sym < 256) {
            out.push_back(char(sym));
        } else if (sym == 256) {
            return;
        } else {
            sym -= 257;
            if (sym >= 29) throw std::runtime_error("gzip : longueur invalide");
            size_t len = kLenBase[sym] + br.bits(kLenExtra[sym]);
            int ds = dist.decode(br);
            if (ds >= 30) throw std::runtime_error("gzip : distance invalide");
            size_t d = kDistBase[ds] + br.bits(kDistExtra[ds]);
            if (d > out.size()) throw std::runtime_error("gzip : distance trop grande");
            size_t from = out.size() - d;
            for (size_t i = 0; i < len; ++i) out.push_back(out[from + i]);
        }
    }
}

void inflate(BitReader& br, std::string& out) {
    Huffman fixedLit, fixedDist;
    {
        uint8_t l[288];
        for (int i = 0; i < 144; ++i) l[i] = 8;
        for (int i = 144; i < 256; ++i) l[i] = 9;
        for (int i = 256; i < 280; ++i) l[i] = 7;
        for (int i = 280; i < 288; ++i) l[i] = 8;
        fixedLit.build(l, 288);
        uint8_t dl[30];
        for (auto& x : dl) x = 5;
        fixedDist.build(dl, 30);
    }
    int last;
    do {
        last = int(br.bits(1));
        int type = int(br.bits(2));
        if (type == 0) {
            br.align();
            if (br.pos + 4 > br.n) throw std::runtime_error("gzip : bloc tronqué");
            unsigned len = br.p[br.pos] | (br.p[br.pos + 1] << 8);
            unsigned nlen = br.p[br.pos + 2] | (br.p[br.pos + 3] << 8);
            br.pos += 4;
            if ((len ^ 0xFFFFu) != nlen) throw std::runtime_error("gzip : bloc brut invalide");
            if (br.pos + len > br.n) throw std::runtime_error("gzip : bloc tronqué");
            out.append(reinterpret_cast<const char*>(br.p + br.pos), len);
            br.pos += len;
        } else if (type == 1) {
            inflateBlock(br, out, fixedLit, fixedDist);
        } else if (type == 2) {
            int nlen = int(br.bits(5)) + 257;
            int ndist = int(br.bits(5)) + 1;
            int ncode = int(br.bits(4)) + 4;
            static const uint8_t order[19] = {16, 17, 18, 0, 8, 7, 9, 6, 10, 5,
                                              11, 4,  12, 3, 13, 2, 14, 1, 15};
            uint8_t lengths[320] = {};
            for (int i = 0; i < ncode; ++i) lengths[order[i]] = uint8_t(br.bits(3));
            Huffman lencode;
            lencode.build(lengths, 19);
            int idx = 0;
            uint8_t all[320] = {};
            while (idx < nlen + ndist) {
                int sym = lencode.decode(br);
                if (sym < 16) {
                    all[idx++] = uint8_t(sym);
                } else {
                    uint8_t val = 0;
                    int rep;
                    if (sym == 16) {
                        if (idx == 0) throw std::runtime_error("gzip : répétition invalide");
                        val = all[idx - 1];
                        rep = 3 + int(br.bits(2));
                    } else if (sym == 17) {
                        rep = 3 + int(br.bits(3));
                    } else {
                        rep = 11 + int(br.bits(7));
                    }
                    if (idx + rep > nlen + ndist) throw std::runtime_error("gzip : trop de longueurs");
                    while (rep--) all[idx++] = val;
                }
            }
            Huffman lit, dist;
            lit.build(all, nlen);
            dist.build(all + nlen, ndist);
            inflateBlock(br, out, lit, dist);
        } else {
            throw std::runtime_error("gzip : type de bloc invalide");
        }
    } while (!last);
}

}  // namespace

std::string gunzip(const uint8_t* data, size_t size) {
    if (size < 18 || data[0] != 0x1f || data[1] != 0x8b || data[2] != 8)
        throw std::runtime_error("gzip : en-tête invalide");
    uint8_t flg = data[3];
    size_t pos = 10;
    if (flg & 4) {  // FEXTRA
        if (pos + 2 > size) throw std::runtime_error("gzip : en-tête tronqué");
        pos += 2 + (data[pos] | (data[pos + 1] << 8));
    }
    if (flg & 8) { while (pos < size && data[pos]) ++pos; ++pos; }   // FNAME
    if (flg & 16) { while (pos < size && data[pos]) ++pos; ++pos; }  // FCOMMENT
    if (flg & 2) pos += 2;                                           // FHCRC
    if (pos >= size) throw std::runtime_error("gzip : en-tête tronqué");

    std::string out;
    uint32_t isize = uint32_t(data[size - 4]) | uint32_t(data[size - 3]) << 8 |
                     uint32_t(data[size - 2]) << 16 | uint32_t(data[size - 1]) << 24;
    out.reserve(isize);
    BitReader br{data + pos, size - pos};
    inflate(br, out);
    if (uint32_t(out.size()) != isize) throw std::runtime_error("gzip : taille incorrecte");
    return out;
}

}  // namespace sq
