#include "cli.h"
#include <str_helper.h>

#ifdef _WIN32
// clang-format off
#include <clocale>
#include <Windows.h>
#include <shlobj.h>
#include <knownfolders.h>
// clang-format on
#endif

CliParser::CliParser() {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    setlocale(LC_ALL, ".UTF8");
#endif
}

void CliParser::parse_from_cli(int argc_, char** argv_) {
    int argc{argc_};
#ifdef _WIN32
    wchar_t** argv = CommandLineToArgvW(GetCommandLineW(), &argc);
#else
    char**& argv = argv_;
#endif

    std::vector<lsr::string> positional_args{};
    std::unordered_map<lsr::string, lsr::string> named_args{};

    bool positional_only{false};
    for (int i = 1; i < argc; i++) {
        lsr::string arg{argv[i]};
        if (arg == LSR_STR("--")) {
            positional_only = true;
            continue;
        }

        if (!positional_only && arg.starts_with(LSR_STR("--"))) {
            auto pos = arg.find(L'=');
            if (pos != lsr::string::npos) {
                named_args[arg.substr(2, pos - 2)] = arg.substr(pos + 1);
            } else if (++i < argc) {
                named_args[arg.substr(2)] = argv[i];
            } else {
                named_args[arg.substr(2)] = LSR_STR("");
            }
        } else {
            positional_args.push_back(arg);
        }
    }

#ifdef _WIN32
    LocalFree(argv);
#endif

    positional_args_ = positional_args;
    named_args_ = named_args;
}

std::filesystem::path CliParser::get_db_path() const {
    std::filesystem::path kugou_db{};

    if (const auto& it = named_args_.find(LSR_STR("db")); it != named_args_.end()) {
        kugou_db = std::filesystem::path{it->second};
    } else {
#ifdef _WIN32
        PWSTR pAppDirPath{};
        SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &pAppDirPath);
        kugou_db = std::filesystem::path{pAppDirPath} / L"Kugou8" / L"KGMusicV3.db";
        CoTaskMemFree(pAppDirPath);
#else
        kugou_db = std::filesystem::path{"KGMusicV3.db"};
#endif
    }

    return absolute(kugou_db);
}
