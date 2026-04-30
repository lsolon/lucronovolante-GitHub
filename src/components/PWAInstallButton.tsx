import { useState, useEffect } from 'react';
import { Download, Smartphone, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event fired');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex items-center gap-3">
        <div className="bg-emerald-100 p-2 rounded-full">
          <Smartphone className="text-emerald-600 size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 leading-tight">App Instalado!</p>
          <p className="text-xs text-emerald-700">O app já está na sua tela inicial.</p>
        </div>
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <div className="bg-white border border-gray-200 p-4 rounded-3xl flex items-center gap-3">
        <div className="bg-gray-100 p-2 rounded-full">
          <AlertCircle className="text-black size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-black leading-tight">Dica de Instalação</p>
          <p className="text-[10px] text-gray-700">Para instalar, toque no menu do navegador e selecione "Instalar App" ou "Adicionar à Tela de Início".</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="w-full bg-blue-600 text-white p-4 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-900/30 active:scale-[0.98] transition-all"
    >
      <Download className="size-5" />
      <span>Baixar App no Celular</span>
    </button>
  );
}
