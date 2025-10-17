import { toast } from 'react-toastify';
import { DecryptErrorType } from '~/decrypt-worker/util/DecryptError';
import { applyTemplate } from '~/util/applyTemplate';

export interface FileErrorProps {
  error: null | string;
  code: null | string;
}

const errorMap = new Map<string | null | DecryptErrorType, string>([
  [DecryptErrorType.UNSUPPORTED_FILE, '不支持的文件类型'],
]);

const ERROR_TEMPLATE = `解密错误：{{summary}}

详细错误信息：
\`\`\`text
{{error}}
\`\`\`

<!-- 报告错误时请提交上述【全部内容】 -->
`;

export function FileError({ error, code }: FileErrorProps) {
  const summary = errorMap.get(code) ?? '未知错误';

  const copyError = () => {
    if (error) {
      navigator.clipboard.writeText(applyTemplate(ERROR_TEMPLATE, { summary, error })).then(
        () => toast.success('错误信息已复制到剪贴板'),
        (e) => toast.error(`复制错误信息失败: ${e as Error}`),
      );
    }
  };

  return (
    <>
      <p>
        解密错误：
        <span className="text-red-600">{summary}</span>
      </p>
      {error && (
        <div className="collapse border-error border w-full text-left my-2 py-0">
          <input className="[&&&]:py-2 [&&&]:min-h-[1.5rem]" type="checkbox" />
          <div className="collapse-title font-semibold text-center [&&&]:min-h-[1.5rem] [&&&]:py-2">详细错误信息</div>
          <div className="collapse-content text-sm overflow-hidden">
            <pre className="overflow-x-auto w-full">{error}</pre>
            <p className="mt-2 text-center">
              <button type="button" className="btn btn-secondary" onClick={copyError}>
                复制
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
