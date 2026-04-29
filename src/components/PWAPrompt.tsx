import { useEffect, useState } from 'react';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

export default function PWAPrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log('App pronto para uso offline');
      },
    });
    setUpdateServiceWorker(() => update);
  }, []);

  useEffect(() => {
    if (needRefresh && updateServiceWorker) {
      // Don't auto-prompt/reload, let the UI handle it
    }
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg z-[1000] flex items-center justify-between">
      <p className="text-sm font-medium">Nova versão disponível!</p>
      <button 
        onClick={() => updateServiceWorker?.(true)}
        className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold"
      >
        Atualizar
      </button>
    </div>
  );
}
