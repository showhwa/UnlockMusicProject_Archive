import { Light as SyntaxHighlighter, type SyntaxHighlighterProps } from 'react-syntax-highlighter';
import hljsStyleGitHub from 'react-syntax-highlighter/dist/esm/styles/hljs/github';

export function CodeHighlight({ children, ...props }: SyntaxHighlighterProps) {
  return (
    <SyntaxHighlighter style={hljsStyleGitHub} {...props}>
      {children}
    </SyntaxHighlighter>
  );
}
