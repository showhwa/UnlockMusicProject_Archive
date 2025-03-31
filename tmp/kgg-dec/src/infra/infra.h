#pragma once

#include <filesystem>
#include <unordered_map>

namespace Infra {

typedef std::unordered_map<std::string, std::string> kgm_ekey_db_t;

int dump_ekey(kgm_ekey_db_t& result, const std::filesystem::path& db_path);

}  // namespace Infra
