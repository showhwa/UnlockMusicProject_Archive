const useBase64 = () => Java.use('android.util.Base64');
const useActivityThread = () => Java.use('android.app.ActivityThread');
const newByteArray = (size) => Java.array('byte', new Array(size).fill(0));
const useSystem = () => Java.use('java.lang.System');
const useCipher = () => Java.use('javax.crypto.Cipher');
const useIvParameterSpec = () => Java.use('javax.crypto.spec.IvParameterSpec');
const useSQLiteDatabase = () => Java.use('net.sqlcipher.database.SQLiteDatabase');
const useString = () => Java.use('java.lang.String');
const useKeyStore = () => Java.use('java.security.KeyStore');
const useCharset = () => Java.use('java.nio.charset.Charset');

const from_base64 = (str) => useBase64().decode(str, 0);
const to_base64 = (bytes) => useBase64().encodeToString(bytes, 0);
const getContext = () => useActivityThread().currentApplication().getApplicationContext();

function getEncryptedDatabaseKey() {
    return getContext().getSharedPreferences("KeyPref", 0).getString("DB_EN_PWD", "");
}

function aesDecrypt(buffer, key) {
    const System = useSystem();
    const Cipher = useCipher();
    const IvParameterSpec = useIvParameterSpec();

    if (!buffer || buffer.length <= buffer[0] + 1) {
        throw new Error('Invalid encrypted key');
    }
    const iv = newByteArray(buffer[0]);
    const encryptedPayload = newByteArray(buffer.length - 1 - buffer[0]);

    System.arraycopy(buffer, 1, iv, 0, iv.length);
    System.arraycopy(buffer, iv.length + 1, encryptedPayload, 0, encryptedPayload.length);

    const aes = Cipher.getInstance('AES/CBC/PKCS7Padding');
    aes.init(2, key, IvParameterSpec.$new(iv));
    const decryptedKey = aes.doFinal(encryptedPayload);

    if (decryptedKey.length <= 0x80) {
        throw new Error('decrypted data is too short');
    }

    const strippedData = newByteArray(decryptedKey.length - 0x80);
    System.arraycopy(decryptedKey, 0x80, strippedData, 0, strippedData.length);

    return strippedData;
}

async function getDatabaseKey() {
    return new Promise((resolve, reject) => {
        Java.perform(() => {
            try {
                const JString = useString();
                const KeyStore = useKeyStore();
                const Charset = useCharset();

                const keyStore = KeyStore.getInstance('AndroidKeyStore');
                keyStore.load(null);
                const key = keyStore.getKey('musicRootKey', null);
                if (!key) {
                    throw new Error('musicRootKey not ready');
                }
                const encryptedKey = from_base64(getEncryptedDatabaseKey());
                const decryptedKey = aesDecrypt(encryptedKey, key);
                resolve(JString.$new(decryptedKey, Charset.forName('UTF-8')).toString());
            } catch (e) {
                console.error('exception: ', e);
                reject(e);
            }
        });
    });
}

async function dumpAudioKeys() {
    return new Promise((resolve, reject) => {
        Java.perform(async () => {
            const OPEN_READONLY = 1;
            let db;
            try {
                const SQLCipherDatabase = useSQLiteDatabase();
                const context = getContext();
                const dbPath = context.getDatabasePath('rxdownload_download2.db').getAbsolutePath();

                db = SQLCipherDatabase.openDatabase(dbPath, await getDatabaseKey(), null, OPEN_READONLY, null);

                const result = [];
                const cursor = db.query(`
                    SELECT relative_path, download_path, secretKey, encrypt_iv
                    FROM download_record2
                    WHERE encrypt_type = "AES/OFB"
                `, null);
                if (cursor && cursor.moveToFirst()) {
                    do {
                        const dir = cursor.getString(0);
                        const name = cursor.getString(1);
                        const key = cursor.getString(2).trim();
                        const iv = cursor.getString(3).trim();
                        const fullPath = dir.replace(/\/$/, '') + '/' + name;
                        result.push({ name, key, iv, fullPath });
                    } while (cursor.moveToNext());
                }
                resolve(result);
            } catch (e) {
                console.error('exception: ', e);
                reject(e);
            } finally {
                db?.close();
            }
        });
    });
}

rpc.exports.dumpAudioKeys = dumpAudioKeys;
rpc.exports.getDatabaseKey = getDatabaseKey;

// test: com.huawei.music (version 12.11.37.310)
function getDbPwd() {
    const EncrptKey = Java.use('com.android.common.components.encrypt.EncrptKey');
    return EncrptKey.g();
}
rpc.exports.getDbPwd = getDbPwd;
