#pragma once

#include <algorithm>
#include "infra/infra.h"
#include "qmc2/qmc2.h"

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

#include <endian_helper.h>
#include <str_helper.h>
#include <array>
#include <condition_variable>
#include <filesystem>
#include <fstream>
#include <mutex>
#include <queue>
#include <vector>

class KggTask {
   public:
    explicit KggTask(std::filesystem::path kgg_path, std::filesystem::path out_dir)
        : kgg_path_(std::move(kgg_path)), out_dir_(std::move(out_dir)) {}

    void log(const lsr::string& level, const lsr::string& msg) const {
        lsr_eprintf("[%s] %s (%s)\n", level.c_str(), msg.c_str(), kgg_path_.filename().c_str());
    }
    void warning(const lsr::string& msg) const { log(LSR_STR("WARN"), msg); }
    void error(const lsr::string& msg) const { log(LSR_STR("ERR "), msg); }
    void info(const lsr::string& msg) const { log(LSR_STR("INFO"), msg); }

    void Execute(const Infra::kgm_ekey_db_t& ekey_db, const lsr::string_view suffix) const {
        constexpr static std::array<uint8_t, 16> kMagicHeader{0x7C, 0xD5, 0x32, 0xEB, 0x86, 0x02, 0x7F, 0x4B,
                                                              0xA8, 0xAF, 0xA6, 0x8E, 0x0F, 0xFF, 0x99, 0x14};

        std::ifstream kgg_stream_in(kgg_path_, std::ios::binary);
        std::array<uint8_t, 0x400> header{};
        kgg_stream_in.read(reinterpret_cast<char*>(header.data()), header.size());
        if (!std::equal(kMagicHeader.cbegin(), kMagicHeader.cend(), header.cbegin())) {
            warning(LSR_STR("invalid kgg header (not a kgg file)"));
            return;
        }
        const auto offset_to_audio = Endian::le_read<uint32_t>(&header[0x10]);
        if (const auto mode = Endian::le_read<uint32_t>(&header[0x14]); mode != 5) {
            lsr_eprintf("[WARN] unsupported enc_version (expect=0x05, got 0x%02x) (%s)\n", mode,
                        kgg_path_.filename().c_str());
            return;
        }
        uint32_t audio_hash_len = *reinterpret_cast<uint32_t*>(&header[0x44]);
        if (audio_hash_len != 0x20) {
            lsr_eprintf("audio hash length invalid (expect=0x20, got 0x%02x) (%s)\n", audio_hash_len,
                        kgg_path_.filename().c_str());
            return;
        }
        std::string audio_hash(&header[0x48], &header[0x48 + audio_hash_len]);
        std::string ekey{};
        if (auto it = ekey_db.find(audio_hash); it != ekey_db.end()) {
            ekey = it->second;
        } else {
            warning(LSR_STR("ekey not found"));
            return;
        }

        auto qmc2 = QMC2::Create(ekey);
        if (!qmc2) {
            error(LSR_STR("create qmc2 instance failed (ekey decode error?)"));
            fprintf(stderr, "%s\n", ekey.c_str());
            return;
        }

        std::array<uint8_t, 4> magic{};
        kgg_stream_in.seekg(offset_to_audio, std::ios::beg);
        kgg_stream_in.read(reinterpret_cast<char*>(magic.data()), 4);
        qmc2->Decrypt(magic, 0);
        auto real_ext = DetectRealExt(magic);

        lsr::string new_name = kgg_path_.stem().native() + lsr::string(suffix) + LSR_STR(".") + real_ext;
        auto out_path = out_dir_ / new_name;

        if (exists(out_path)) {
            warning(lsr::string(LSR_STR("output file already exists: ")) + new_name);
            return;
        }

        kgg_stream_in.seekg(0, std::ios::end);
        const auto file_size = static_cast<size_t>(kgg_stream_in.tellg());
        kgg_stream_in.seekg(offset_to_audio, std::ios::beg);
        std::ofstream ofs_decrypted(out_path, std::ios::binary);
        if (!ofs_decrypted.is_open()) {
            error(LSR_STR("failed to open output file"));
            return;
        }

        size_t offset{0};
        thread_local std::vector<uint8_t> temp_buffer(1024 * 1024, 0);
        auto read_page_len = static_cast<std::streamsize>(temp_buffer.size());

        while (!kgg_stream_in.eof()) {
            kgg_stream_in.read(reinterpret_cast<char*>(temp_buffer.data()), read_page_len);
            const auto n = kgg_stream_in.gcount();
            qmc2->Decrypt(std::span(temp_buffer.begin(), temp_buffer.begin() + n), offset);
            ofs_decrypted.write(reinterpret_cast<char*>(temp_buffer.data()), n);
            offset += n;
        }

        if (offset + offset_to_audio != file_size) {
            warning(LSR_STR("OK (size mismatch)"));
        } else {
            info(lsr::string(LSR_STR("** OK **  -> ")) + out_path.filename().native());
        }
    }

   private:
    std::filesystem::path kgg_path_;
    std::filesystem::path out_dir_;

    static const lsr::character* DetectRealExt(const std::span<uint8_t> magic) {
        if (std::equal(magic.begin(), magic.end(), "fLaC")) {
            return LSR_STR("flac");
        }
        if (std::equal(magic.begin(), magic.end(), "OggS")) {
            return LSR_STR("ogg");
        }
        return LSR_STR("mp3");
    }
};

class KggTaskQueue {
   public:
    explicit KggTaskQueue(Infra::kgm_ekey_db_t ekey_db, const lsr::string_view suffix)
        : ekey_db_(std::move(ekey_db)), suffix_(suffix) {}

    void Push(std::unique_ptr<KggTask> task) {
        std::lock_guard lock(mutex_);
        tasks_.push(std::move(task));
        signal_.notify_one();
    }

    std::unique_ptr<KggTask> Pop() {
        std::unique_lock lock(mutex_);
        signal_.wait(lock, [this] { return !tasks_.empty() || thread_end_; });
        if (tasks_.empty()) {
            return {};
        }

        auto task = std::move(tasks_.front());
        tasks_.pop();
        return task;
    }

    [[nodiscard]] bool Finished() {
        std::lock_guard lock(mutex_);
        return tasks_.empty();
    }

    void AddWorkerThread() { threads_.emplace(&KggTaskQueue::WorkerThreadBody, this); }

    void Join() {
        thread_end_ = true;
        signal_.notify_all();

        for (int i = 1; !threads_.empty(); i++) {
            threads_.front().join();
            threads_.pop();
#ifndef NDEBUG
            fprintf(stderr, "[INFO] thread %d joined\n", i);
#endif
        }
    }

   private:
    bool thread_end_{false};
    Infra::kgm_ekey_db_t ekey_db_;
    lsr::string suffix_;
    void WorkerThreadBody() {
        ReduceThreadPriority();
        std::unique_ptr<KggTask> task{nullptr};
        while ((task = Pop())) {
            task->Execute(ekey_db_, suffix_);
        }
    }

    static void ReduceThreadPriority() {
#ifdef _WIN32
        SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_BELOW_NORMAL);
#else
        pthread_t this_thread = pthread_self();
        sched_param params;
        int policy;

        if (pthread_getschedparam(this_thread, &policy, &params) != 0) {
            perror("pthread_getschedparam");
            return;
        }
        params.sched_priority = std::max(params.sched_priority, sched_get_priority_min(policy));
        if (pthread_setschedparam(this_thread, policy, &params) != 0) {
            perror("pthread_setschedparam");
        }
#endif
    }

    std::mutex mutex_{};
    std::condition_variable signal_;
    std::queue<std::unique_ptr<KggTask>> tasks_{};
    std::queue<std::thread> threads_{};
};
