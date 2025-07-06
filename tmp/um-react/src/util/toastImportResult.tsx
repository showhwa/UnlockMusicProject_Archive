import { toast } from 'react-toastify';

export function toastImportResult(name: string, keys: unknown[] | null) {
  if (keys?.length === 0) {
    toast.warning(() => (
      <div className="flex flex-col">
        <h3 className="text-lg font-bold">未导入密钥</h3>
        <div>选择的密钥数据库文件未发现任何可用的密钥。</div>
      </div>
    ));
  } else if (keys) {
    toast.success(() => (
      <div className="flex flex-col">
        <h3 className="text-lg font-bold">成功导入 {keys.length} 个密钥。</h3>
        <div>记得按下「保存」来应用。</div>
      </div>
    ));
  } else {
    toast.error(() => (
      <div className="flex flex-col">
        <h3 className="text-lg font-bold">未导入密钥</h3>
        <div>
          不支持从提供的密钥文件 <code>{name}</code> 导入密钥。
        </div>
      </div>
    ));
  }
}
