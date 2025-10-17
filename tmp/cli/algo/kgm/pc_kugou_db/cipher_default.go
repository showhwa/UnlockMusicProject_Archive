//go:build !windows

package pc_kugou_db

func CachedDumpEKey(dbPath string) (map[string]string, error) {
	return nil, nil
}
