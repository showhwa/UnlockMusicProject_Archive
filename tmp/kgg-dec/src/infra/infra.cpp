#include "infra.h"

#include <aes.h>
#include <endian_helper.h>
#include <md5.h>
#include <sqlite3_wrapper.h>

#include <algorithm>
#include <array>
#include <fstream>
#include <vector>

namespace Infra {
using std::size_t;

constexpr size_t kPageSize = 0x400;

inline bool is_valid_page_1_header(const uint8_t* page1) {
    const auto o10 = Endian::le_read<uint32_t>(&page1[0x10]);
    const auto o14 = Endian::le_read<uint32_t>(&page1[0x14]);
    const uint32_t v6 = (o10 & 0xff) << 8 | (o10 & 0xff00) << 16;
    return o14 == 0x20204000 && (v6 - 0x200) <= 0xFE00 && ((v6 - 1) & v6) == 0;
}

void derive_page_key(uint8_t* aes_key, uint8_t* aes_iv, const uint8_t* p_master_key, const uint32_t page_no) {
    std::array<uint8_t, 0x18> buffer{};

    // Setup buffer
    std::copy_n(p_master_key, 0x10, buffer.begin());
    Endian::le_write(&buffer[0x10], page_no);
    Endian::le_write(&buffer[0x14], 0x546C4173);

    // Derive Key
    md5(aes_key, buffer.data(), buffer.size());

    // Derive IV
    for (uint32_t ebx{page_no + 1}, i = 0; i < 16; i += 4) {
        uint32_t eax = 0x7FFFFF07 * (ebx / 0xce26);
        uint32_t ecx = 0x9EF4 * ebx - eax;
        if (ecx & 0x8000'0000) {
            ecx += 0x7FFF'FF07;
        }
        ebx = ecx;
        Endian::le_write(&buffer[i], ebx);
    }
    md5(aes_iv, buffer.data(), 0x10);

    // Cleanup
    std::ranges::fill(buffer, 0xcc);
}

static const uint8_t kDefaultMasterKey[0x10] = {
    0x1d, 0x61, 0x31, 0x45, 0xb2, 0x47, 0xbf, 0x7f,  //
    0x3d, 0x18, 0x96, 0x72, 0x14, 0x4f, 0xe4, 0xbf,  //
};

static constexpr std::array<uint8_t, 0x10> kSQLiteDatabaseHeader = {  //
    'S', 'Q', 'L', 'i', 't', 'e', ' ', 'f', 'o', 'r', 'm', 'a', 't', ' ', '3', 0};

int load_db(std::vector<uint8_t>& db_data, const std::filesystem::path& db_path) {
    using namespace AES;
    db_data.clear();

    std::ifstream ifs_db(db_path, std::ios::binary);
    if (!ifs_db.is_open()) {
        return SQLITE_CANTOPEN;
    }

    ifs_db.seekg(0, std::ios::end);
    const auto db_size = static_cast<size_t>(ifs_db.tellg());
    const auto last_page = db_size / kPageSize;
    if (db_size % kPageSize != 0) {
        return SQLITE_CORRUPT;
    }
    ifs_db.seekg(0, std::ios::beg);

    db_data.resize(db_size);
    auto p_page = db_data.data();

    AES_ctx ctx_aes{};
    for (size_t page_no = 1; page_no <= last_page; page_no++, p_page += kPageSize) {
        ifs_db.read(reinterpret_cast<char*>(p_page), kPageSize);
        if (!ifs_db) [[unlikely]] {
            return SQLITE_IOERR;
        }

        {
            uint8_t aes_key[16];
            uint8_t aes_iv[16];
            derive_page_key(aes_key, aes_iv, kDefaultMasterKey, static_cast<uint32_t>(page_no));
            AES_init_ctx_iv(&ctx_aes, aes_key, aes_iv);
        }

        if (page_no == 1) [[unlikely]] {
            if (std::equal(kSQLiteDatabaseHeader.cbegin(), kSQLiteDatabaseHeader.cend(), p_page)) {
                ifs_db.read(reinterpret_cast<char*>(p_page + kPageSize),
                            static_cast<std::streamsize>(db_size - kPageSize));
                AES_cleanup(&ctx_aes);
                return SQLITE_OK;  // no encryption
            }

            if (!is_valid_page_1_header(p_page)) {
                AES_cleanup(&ctx_aes);
                db_data.clear();
                return SQLITE_CORRUPT;  // header validation failed
            }
            std::array<uint8_t, 8> backup{};  // backup magic numbers
            std::copy_n(&p_page[0x10], 0x08, backup.begin());
            std::copy_n(&p_page[0x08], 0x08, &p_page[0x10]);
            AES_CBC_decrypt_buffer(&ctx_aes, p_page + 0x10, kPageSize - 0x10);
            if (!std::equal(backup.cbegin(), backup.cend(), &p_page[0x10])) {
                db_data.clear();
                return SQLITE_CORRUPT;  // header validation failed
            }
            std::ranges::copy(kSQLiteDatabaseHeader, p_page);
        } else {
            AES_CBC_decrypt_buffer(&ctx_aes, p_page, kPageSize);
        }
        AES_cleanup(&ctx_aes);
    }

    return SQLITE_OK;
}

int dump_ekey(kgm_ekey_db_t& result, const std::filesystem::path& db_path) {
    result.clear();

    std::vector<uint8_t> db_data;
    int rc = load_db(db_data, db_path);
    if (rc != SQLITE_OK) {
        return rc;
    }

    // Open an in-memory database
    sqlite3* db = nullptr;
    rc = sqlite3_open(":memory:", &db);
    if (rc != SQLITE_OK) {
        return rc;
    }

    const auto p_db_bytes = db_data.data();
    const auto len = static_cast<sqlite3_int64>(db_data.size());
    rc = sqlite3_deserialize(db, "main", p_db_bytes, len, len, SQLITE_DESERIALIZE_READONLY);
    if (rc != SQLITE_OK) {
        sqlite3_close(db);
        return rc;
    }

    sqlite3_stmt* stmt{nullptr};
    rc = sqlite3_prepare_v2(db,
                            "select EncryptionKeyId, EncryptionKey from ShareFileItems"
                            " where EncryptionKey != ''",
                            -1, &stmt, nullptr);

    if (rc != SQLITE_OK) {
        sqlite3_close(db);
        return rc;
    }

    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
        const auto* ekey_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        const auto* ekey = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        result[ekey_id] = ekey;
    }

    if (rc != SQLITE_DONE) {
        sqlite3_close(db);
        return rc;
    }

    sqlite3_finalize(stmt);

    return sqlite3_close(db);
}

}  // namespace Infra
