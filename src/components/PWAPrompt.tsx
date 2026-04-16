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
      if (window.confirm('Nova versão disponível! Deseja atualizar agora?')) {
        updateServiceWorker(true);
      }
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
