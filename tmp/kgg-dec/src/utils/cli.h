#pragma once

#include <str_helper.h>
#include <filesystem>
#include <unordered_map>
#include <utility>
#include <vector>

typedef std::pair<std::vector<lsr::string>, std::unordered_map<lsr::string, lsr::string>> parsed_raw_args_t;

class CliParser {
   public:
    CliParser();
    void parse_from_cli(int argc, char** argv);

    [[nodiscard]] std::filesystem::path get_infra_dll() const;
    [[nodiscard]] std::filesystem::path get_db_path() const;
    [[nodiscard]] lsr::string get_file_suffix() const {
        return get_with_default(LSR_STR("suffix"), LSR_STR("_kgg-dec"));
    }
    [[nodiscard]] bool get_scan_all_file_ext() const {
        return get_with_default(LSR_STR("scan-all-file-ext"), LSR_STR("0")) == LSR_STR("1");
    };
    [[nodiscard]] std::vector<lsr::string> get_input_files() const { return positional_args_; }

   private:
    std::vector<lsr::string> positional_args_{};
    std::unordered_map<lsr::string, lsr::string> named_args_{};

    static parsed_raw_args_t parse();
    [[nodiscard]] lsr::string get_with_default(const lsr::string& key, const lsr::string& default_value) const {
        if (const auto& it = named_args_.find(key); it != named_args_.end()) {
            return it->second;
        }
        return default_value;
    }
};
