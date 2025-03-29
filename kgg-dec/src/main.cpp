#include <sqlite3_wrapper.h>

#include <filesystem>
#include <queue>

#include "infra/infra.h"
#include "jobs.hpp"
#include "str_helper.h"
#include "utils/cli.h"

using Infra::kgm_ekey_db_t;

void WalkFileOrDir(KggTaskQueue& queue, const std::filesystem::path& input_path, bool scan_all_exts) {
    std::queue<std::filesystem::path> file_queue;
    file_queue.push(absolute(input_path));

    while (!file_queue.empty()) {
        auto target_path = std::move(file_queue.front());
        file_queue.pop();

        if (is_regular_file(target_path)) {
            if (!scan_all_exts && target_path.extension() != L".kgg") {
                continue;
            }

            queue.Push(std::make_unique<KggTask>(target_path, target_path.parent_path()));
            continue;
        }

        if (is_directory(target_path)) {
            for (auto const& dir_entry : std::filesystem::directory_iterator{target_path}) {
                file_queue.push(dir_entry.path());
            }
            continue;
        }

        lsr_eprintf("[WARN] invalid path: %s\n", target_path.c_str());
    }
}

void print_license() {
    fputs("  This software is free and open source, licensed under the MIT license.\n", stderr);
    fputs("  For more details, check out: https://git.unlock-music.dev/um/kgg-dec\n", stderr);
}

void print_usage() {
    fputs(
        "Usage: kgg-dec "
        "[--scan-all-file-ext 0] "
        "[--db /path/to/KGMusicV3.db] "
        "[--suffix _kgg-dec] "
        "[--] "
        "[FILE]...\n\n\n",
        stderr);
}

void print_banner() {
    fprintf(stderr, "kgg-dec v" KGGDEC_PROJECT_VERSION " by LSR\n");
    print_license();
    print_usage();
}

int main(int argc, char** argv) {
    CliParser cli_args;
    print_banner();

    cli_args.parse_from_cli(argc, argv);

    bool scan_all_exts = cli_args.get_scan_all_file_ext();

    auto kgm_db_path = cli_args.get_db_path();
    auto file_suffix = cli_args.get_file_suffix();
    {
        bool cli_arg_error{false};

        if (!exists(kgm_db_path)) {
            fputs("[ERR ] KGMusicV3.db not found\n", stderr);
            cli_arg_error = true;
        }
        if (cli_arg_error) {
            return 1;
        }
    }

    kgm_ekey_db_t ekey_db;
    if (const auto rc = Infra::dump_ekey(ekey_db, kgm_db_path); rc != 0) {
        fprintf(stderr, "[ERR ] dump ekey failed %d (%s)", rc, sqlite3_errstr(rc));
        return 1;
    }

#ifndef NDEBUG
    fprintf(stderr, "ekey_db:\n");
    for (auto& [a, b] : ekey_db) {
        fprintf(stderr, "%s --> %s\n", a.c_str(), b.c_str());
    }
#endif

    KggTaskQueue queue(ekey_db, file_suffix);
    auto thread_count =
#ifndef NDEBUG
        1;
#else
        std::max(static_cast<int>(std::thread::hardware_concurrency()) - 2, 2);
#endif

    for (int i = 0; i < thread_count; i++) {
        queue.AddWorkerThread();
    }

    auto input_files = cli_args.get_input_files();
    if (input_files.empty()) {
        input_files.emplace_back(LSR_STR("."));
    }
    for (auto& positional_arg : input_files) {
        WalkFileOrDir(queue, positional_arg, scan_all_exts);
    }
    queue.Join();

    return 0;
}
