import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore } from '@/lib/convertStore';

function App() {
  const [store] = useState(createConvertStore);

  return (
    <ConvertProvider store={store}>
      <AppShell />
    </ConvertProvider>
  );
}

export default App;
