/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, ReactNode, useCallback, Component, ErrorInfo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Fuel, 
  Car, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Menu,
  X,
  BarChart3,
  LogIn,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, cleanObject, parseEntryDate, truncateLargeFields } from './lib/utils';
import { Entry, FixedCost, Category, AppState, AppSheetMapping, MaintenanceInterval } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_FIXED_COSTS, DEFAULT_EARNING_CATEGORIES, DEFAULT_MAINTENANCE_INTERVALS } from './constants';

// Firebase
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  deleteDoc,
  getDoc,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import ReactGA from 'react-ga4';
import { trackVisit, getGlobalStats } from './services/statsService';
import { GlobalStats } from './types';
import ErrorBoundary from './components/ErrorBoundary';

import LandingPage from './components/LandingPage';
import TrialExpiredView from './components/TrialExpiredView';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import FuelMap from './components/FuelMap';
import MaintenanceView from './components/MaintenanceView';
import TutorialModal from './components/TutorialModal';
import PWAPrompt from './components/PWAPrompt';
import AIVideoStudio from './components/AIVideoStudio';
import firebaseConfig from '../firebase-applet-config.json';
import MarketingFlyer from './components/MarketingFlyer';

const APP_VERSION = '1.1.7';
 
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
        console.error("Firestore connectivity test:", error);
      }
    }
    testConnection();
  }, []);
  
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'map' | 'reports' | 'settings' | 'maintenance'>('dashboard');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [dismissedTutorialSession, setDismissedTutorialSession] = useState(false);
  const [isAIVideoStudioOpen, setIsAIVideoStudioOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [state, setState] = useState<AppState>({
    entries: [],
    fixedCosts: DEFAULT_FIXED_COSTS,
    categories: DEFAULT_CATEGORIES,
    earningCategories: DEFAULT_EARNING_CATEGORIES,
    currentKm: 0,
    targetKm: 0,
    maintenanceIntervals: DEFAULT_MAINTENANCE_INTERVALS,
    appConfig: {
      publishedVersion: APP_VERSION,
      betaVersion: APP_VERSION,
      maintenanceMode: false
    },
    isConfigLoaded: false
  });

  // Force update if hardcoded app version changes
  useEffect(() => {
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion && lastVersion !== APP_VERSION) {
      console.log(`New version detected: ${APP_VERSION}. Clearing cache...`);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister();
          }
          localStorage.setItem('app_version', APP_VERSION);
          window.location.reload();
        });
      } else {
        localStorage.setItem('app_version', APP_VERSION);
        window.location.reload();
      }
    } else {
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);

  const [appStartTime] = useState(Date.now());

  // Force update if remote publishedVersion changes
  useEffect(() => {
    // Only check for remote updates if we have successfully loaded the config from Firebase
    if (!state.isConfigLoaded || !state.appConfig?.publishedVersion) return;
    
    const adminMode = user?.email === "leandrosolon@gmail.com";
    const remoteVersion = state.appConfig.publishedVersion;
    const currentStoredVersion = localStorage.getItem('remote_published_version');
    
    // Default the stored version if it doesn't exist yet
    if (!currentStoredVersion) {
      localStorage.setItem('remote_published_version', remoteVersion);
      return;
    }

    // Only reload if the remote version changes mid-session or across sessions
    if (currentStoredVersion !== remoteVersion && !adminMode) {
      console.log(`Remote update detected! Old: ${currentStoredVersion}, New: ${remoteVersion}. Clearing cache...`);
      localStorage.setItem('remote_published_version', remoteVersion);
      
      const reloadWithClearedCache = async () => {
        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            for (let key of keys) {
              await caches.delete(key);
            }
          }
        } catch (e) {
             console.error("Erro ao limpar cache:", e);
        } finally {
          window.location.reload();
        }
      };
      
      reloadWithClearedCache();
    } else {
      // Just track it silently
      localStorage.setItem('remote_published_version', remoteVersion);
    }
  }, [state.appConfig?.publishedVersion, state.isConfigLoaded, user, appStartTime]);

  // Initialize GA once
  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_ID || 'G-H0GPB9JDNC';
    if (gaId) {
      ReactGA.initialize(gaId);
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    }
  }, []);

  // Track Tab Changes
  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_ID || 'G-H0GPB9JDNC';
    if (gaId && isAuthReady) {
      ReactGA.send({ 
        hitType: "pageview", 
        page: user ? `/${activeTab}` : '/landing',
        title: user ? (activeTab.charAt(0).toUpperCase() + activeTab.slice(1)) : 'Home'
      });
    }
  }, [activeTab, user, isAuthReady]);
  // Auth Listener
  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).catch(error => {
      console.error("Erro no resultado do redirect:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError("Este domínio não está autorizado no Firebase. Adicione o domínio atual aos domínios autorizados no console do Firebase.");
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError("Erro de rede ao processar o login. Verifique sua conexão ou tente novamente.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        console.log("Logged in user:", currentUser.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Online/Offline Listener
  useEffect(() => {
    if (isAuthReady && user) {
      trackVisit({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthReady, user]);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    // Sync User Config
    const userDocRef = doc(db, 'users', user.uid);
    const unsubConfig = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Merge categories to ensure new defaults (like subcategories) are added
        const userCategories = data.categories || [];
        const mergedCategories = [...userCategories];
        
        DEFAULT_CATEGORIES.forEach(defaultCat => {
          const exists = mergedCategories.some(c => c.id === defaultCat.id);
          if (!exists) {
            mergedCategories.push(defaultCat);
          }
        });

        // Merge maintenance intervals
        const userIntervals = data.maintenanceIntervals || [];
        const mergedIntervals = [...userIntervals];
        
        DEFAULT_MAINTENANCE_INTERVALS.forEach(defaultInt => {
          const exists = mergedIntervals.some(m => m.id === defaultInt.id);
          if (!exists) {
            mergedIntervals.push(defaultInt);
          }
        });

        setState(prev => ({
          ...prev,
          fixedCosts: data.fixedCosts || DEFAULT_FIXED_COSTS,
          categories: mergedCategories,
          earningCategories: data.earningCategories || DEFAULT_EARNING_CATEGORIES,
          currentKm: data.currentKm || 0,
          targetKm: data.targetKm || 0,
          maintenanceIntervals: mergedIntervals,
          trialStartDate: data.trialStartDate,
          appSheetMapping: data.appSheetMapping,
          hasSeenTutorial: data.hasSeenTutorial ?? false,
          tutorialOptOut: data.tutorialOptOut ?? false
        }));
      } else {
        // Initialize user doc if it doesn't exist
        const now = new Date().toISOString();
        setDoc(userDocRef, cleanObject({
          email: user.email,
          displayName: user.displayName,
          fixedCosts: DEFAULT_FIXED_COSTS,
          categories: DEFAULT_CATEGORIES,
          earningCategories: DEFAULT_EARNING_CATEGORIES,
          currentKm: 0,
          targetKm: 0,
          maintenanceIntervals: DEFAULT_MAINTENANCE_INTERVALS,
          trialStartDate: now,
          visitCount: 1,
          lastSeen: now,
          tutorialOptOut: false
        }), { merge: true });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Sync Entries
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(entriesRef, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Entry[];
      
      // Sort by data desc, then createdAt time desc to ensure chronological order
      const sortedEntries = entriesData.sort((a, b) => {
        const dateA = a.data + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
        const dateB = b.data + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
        return dateB.localeCompare(dateA);
      });
      
      setState(prev => ({ ...prev, entries: sortedEntries }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/entries`);
    });

    // Sync App Config
    const configRef = doc(db, 'config', 'app');
    const unsubAppConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data() as any;
        console.log("App Config Loaded:", config);
        setState(prev => ({ ...prev, appConfig: config, isConfigLoaded: true }));
      } else {
        console.log("App Config not found, using defaults");
        // Default config if it doesn't exist yet
        setState(prev => ({ 
          ...prev, 
          appConfig: {
            publishedVersion: '1.1.3',
            betaVersion: '1.1.3',
            maintenanceMode: true
          },
          isConfigLoaded: true
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/app');
    });

    // Fetch Global Stats
    getGlobalStats().then(stats => {
      if (stats) setGlobalStats(stats);
    });

    // Fetch Global Stats
    getGlobalStats().then(stats => {
      if (stats) setGlobalStats(stats);
    });

    return () => {
      unsubConfig();
      unsubEntries();
      unsubAppConfig();
    };
  }, [user, isAuthReady]);

  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    return user.email.toLowerCase().trim() === 'leandrosolon@gmail.com';
  }, [user]);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    console.log("Iniciando processo de login...");
    try {
      // Prefer popup as it's more reliable in this environment
      console.log("Usando popup para login...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login bem-sucedido:", result.user.email);
    } catch (error: any) {
      console.error("Erro detalhado de login:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelado pelo usuário (popup fechado).");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError("Este domínio não está autorizado no Firebase Authentication. Por favor, adicione-o aos 'Domínios Autorizados' no console do Firebase.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError("O login com Google não está ativado no seu projeto Firebase. Ative-o no console do Firebase.");
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError("Erro de rede ao tentar conectar com o Google. Verifique sua conexão com a internet ou tente desativar extensões de bloqueio (AdBlock/VPN).");
      } else {
        setAuthError(`Erro ao entrar: ${error.message || "Erro desconhecido"}. Verifique se o domínio está autorizado no Firebase.`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Clear state immediately for UI responsiveness
      setUser(null);
      setIsAuthReady(false);
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear any local storage that might interfere
      localStorage.clear();
      sessionStorage.clear();
      
      // Force a clean redirect to the origin
      window.location.replace(window.location.origin);
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback in case of error
      window.location.replace(window.location.origin);
    }
  };

  const currentMonthEntries = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return state.entries.filter(entry => {
      const date = parseEntryDate(entry.data);
      return isWithinInterval(date, { start, end });
    });
  }, [state.entries]);

  const totals = useMemo(() => {
    const earnings = currentMonthEntries
      .filter(e => e.tipo === 'Ganhos')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const expenses = currentMonthEntries
      .filter(e => e.tipo === 'Despesa')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');

    const activeFixedCosts = state.fixedCosts.filter(fc => {
      const start = fc.dataInicio || '0000-00';
      const end = fc.dataFim || '9999-12';
      return currentMonthStr >= start && currentMonthStr <= end;
    });

    const totalFixedCosts = activeFixedCosts.reduce((acc, curr) => acc + curr.valorMensal, 0);
    
    // Identify which expenses are payments of fixed costs
    const fixedCostPaymentIds: string[] = [];
    const fixedCostPayments = currentMonthEntries.filter(e => {
      if (e.tipo !== 'Despesa') return false;
      const cat = state.categories.find(c => c.id === e.categoriaId);
      const categoryName = cat?.nome.toLowerCase().trim() || '';
      const obs = e.obs?.toLowerCase().trim() || '';
      
      const isFixed = activeFixedCosts.some(fc => {
        const fcItem = fc.item.toLowerCase().trim();
        // Match if category name is in fixed cost item name or vice versa
        // Or if observation contains the fixed cost item name
        return fcItem.includes(categoryName) || categoryName.includes(fcItem) || obs.includes(fcItem);
      });

      if (isFixed && e.id) {
        fixedCostPaymentIds.push(e.id);
      }
      return isFixed;
    });

    const paidFixedCostsSum = fixedCostPayments.reduce((acc, curr) => acc + curr.valor, 0);

    // Expenses that are NOT fixed cost payments (daily expenses)
    const dailyExpenses = expenses - paidFixedCostsSum;

    // Saldo a Pagar = (Total Fixed Costs - Paid Fixed Costs) + Daily Expenses
    // We use Math.max(0, ...) to ensure we don't show negative balance if a payment was higher than expected
    const remainingFixedCosts = Math.max(0, totalFixedCosts - paidFixedCostsSum);
    const balanceToPay = remainingFixedCosts + dailyExpenses;

    // Real Profit = Earnings - Daily Expenses - Total Fixed Costs
    // This correctly accounts for the fixed costs once, regardless of whether they were paid or not
    const balance = earnings - dailyExpenses - totalFixedCosts;

    // Prepare detail of paid fixed costs
    const paidFixedCostsDetails = fixedCostPayments.map(e => {
        const cat = state.categories.find(c => c.id === e.categoriaId);
        return {
            item: cat?.nome || 'Despesa',
            valor: e.valor,
            data: e.data
        };
    });

    const todayStr = format(now, 'yyyy/MM/dd');
    const todayEntries = currentMonthEntries.filter(e => e.data === todayStr);

    const todayEarnings = todayEntries
      .filter(e => e.tipo === 'Ganhos')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);

    const todayExpensesRaw = todayEntries
      .filter(e => e.tipo === 'Despesa')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);

    const todayFixedCostPayments = todayEntries.filter(e => {
      if (e.tipo !== 'Despesa') return false;
      const cat = state.categories.find(c => c.id === e.categoriaId);
      const categoryName = cat?.nome.toLowerCase().trim() || '';
      const obs = e.obs?.toLowerCase().trim() || '';
      return activeFixedCosts.some(fc => {
        const fcItem = fc.item.toLowerCase().trim();
        return fcItem.includes(categoryName) || categoryName.includes(fcItem) || obs.includes(fcItem);
      });
    }).reduce((acc, curr) => acc + curr.valor, 0);

    const todayExpenses = todayExpensesRaw - todayFixedCostPayments;

    const totalMonthlyObligations = totalFixedCosts + dailyExpenses;
    const progress = totalMonthlyObligations > 0 
        ? Math.min(100, (earnings / totalMonthlyObligations) * 100) 
        : 100;

    // Identify unpaid fixed costs
    const unpaidFixedCosts = activeFixedCosts.filter(fc => {
        const paidAmount = fixedCostPayments
            .filter(e => {
                const cat = state.categories.find(c => c.id === e.categoriaId);
                const categoryName = cat?.nome.toLowerCase().trim() || '';
                const obs = e.obs?.toLowerCase().trim() || '';
                const fcItem = fc.item.toLowerCase().trim();
                return fcItem.includes(categoryName) || categoryName.includes(fcItem) || obs.includes(fcItem);
            })
            .reduce((acc, e) => acc + e.valor, 0);
        
        // Define a tolerance of R$ 50,00 to treat as "Paid" even if values differ slightly
        const TOLERANCE = 50.00;
        return (fc.valorMensal - paidAmount) > TOLERANCE;
    }).map(fc => fc.item);
    
    return { earnings, expenses, totalFixedCosts, paidFixedCostsSum, balance, progress, balanceToPay, dailyExpenses, todayEarnings, todayExpenses, paidFixedCostsDetails, unpaidFixedCosts, fixedCostPaymentIds };
  }, [currentMonthEntries, state.fixedCosts, state.categories]);

  const nextOilChange = useMemo(() => {
    const oilInterval = state.maintenanceIntervals.find(m => m.id === 'oil')?.intervaloKm || 10000;
    const oilEntries = state.entries.filter(e => {
      const cat = state.categories.find(c => c.id === e.categoriaId);
      const name = cat?.nome.toLowerCase() || '';
      return (name === 'troca de oleo' || name === 'troca de óleo') && e.km;
    });
    if (oilEntries.length === 0) return null;
    const maxOilKm = Math.max(...oilEntries.map(e => e.km || 0));
    return maxOilKm + oilInterval;
  }, [state.entries, state.categories, state.maintenanceIntervals]);

  const lastRecordedKm = useMemo(() => {
    // 1. Try to find the highest KM in entries (most reliable for current car state)
    const kmEntries = state.entries.filter(e => e.km && e.km > 0);
    if (kmEntries.length > 0) {
      // Sort by date desc to get the chronologically last KM
      const sortedKmEntries = [...kmEntries].sort((a, b) => {
        const dateA = a.data + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
        const dateB = b.data + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
        return dateB.localeCompare(dateA);
      });
      return sortedKmEntries[0].km || 0;
    }
    
    // 2. Fallback to currentKm from config
    if (state.currentKm > 0) return state.currentKm;
    
    return 0;
  }, [state.currentKm, state.entries]);

  const handleAddEntry = async (entry: Omit<Entry, 'id'>) => {
    if (!user) return;
    
    const cleanedEntry = truncateLargeFields(cleanObject(entry));
    const batch = writeBatch(db);
    
    try {
      if (editingEntry) {
        const entryRef = doc(db, 'users', user.uid, 'entries', editingEntry.id);
        batch.set(entryRef, cleanedEntry);
      } else {
        const entriesRef = collection(db, 'users', user.uid, 'entries');
        const newEntryRef = doc(entriesRef);
        batch.set(newEntryRef, cleanedEntry);
        
        // Track contribution for new entries
        const userDocRef = doc(db, 'users', user.uid);
        batch.set(userDocRef, { 
          hasContributed: true,
          lastSeen: new Date().toISOString()
        }, { merge: true });
      }

      // Update current KM in user config if provided
      if (entry.km) {
        const userDocRef = doc(db, 'users', user.uid);
        batch.set(userDocRef, { currentKm: entry.km }, { merge: true });
      }
      
      await batch.commit();
      setEditingEntry(null);
      setIsEntryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/entries`);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'users', user.uid, 'entries', id);
      await deleteDoc(entryRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/entries/${id}`);
    }
  };

  const handleUpdateFixedCosts = useCallback(async (costs: FixedCost[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ fixedCosts: costs }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateEarningCategories = useCallback(async (categories: Category[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ earningCategories: categories }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateEntries = useCallback(async (entries: Entry[]) => {
    // This is used for clear all or bulk import
    if (!user) return;
    try {
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      
      // If clearing all
      if (entries.length === 0) {
        const batch = writeBatch(db);
        state.entries.forEach(e => {
          batch.delete(doc(entriesRef, e.id));
        });
        await batch.commit();
        return;
      }

      // If importing
      // Firestore batches are limited to 500 operations
      const BATCH_SIZE = 400;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = entries.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(e => {
          const { id, ...data } = e;
          const entryId = id || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
          batch.set(doc(entriesRef, entryId), truncateLargeFields(cleanObject(data)));
        });
        
        await batch.commit();
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/entries (bulk)`);
    }
  }, [user, state.entries]);

  const handleUpdateCategories = useCallback(async (categories: Category[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ categories: categories }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateAppSheetMapping = useCallback(async (mapping: AppSheetMapping) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ appSheetMapping: mapping }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateTargetKm = useCallback(async (km: number) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ targetKm: km }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateCurrentKm = useCallback(async (km: number) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ currentKm: km }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateMaintenanceIntervals = useCallback(async (intervals: MaintenanceInterval[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanObject({ maintenanceIntervals: intervals }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleUpdateAppConfig = useCallback(async (config: any) => {
    if (!isAdmin) return;
    try {
      const configRef = doc(db, 'config', 'app');
      await setDoc(configRef, cleanObject(config));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/app');
    }
  }, [isAdmin]);

  const handleCloseTutorial = useCallback(async (dontShowAgain: boolean) => {
    if (!user) return;
    setDismissedTutorialSession(true);
    try {
      if (dontShowAgain) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { tutorialOptOut: true }, { merge: true });
      }
      // Suggest Fixed Costs by switching tab
      setActiveTab('settings');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }, [user]);

  const handleStartWithExamples = useCallback(async () => {
    if (!user) return;
    try {
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const batch = writeBatch(db);
      const today = format(new Date(), 'yyyy/MM/dd');
      
      const examples = [
        {
          data: today,
          tipo: 'Ganhos',
          categoriaId: '10',
          valor: 250.50,
          obs: 'Exemplo: Ganhos totais do dia (Uber/99)',
          ganhos: { '1': 150.50, '2': 100.00 },
          createdAt: new Date().toISOString()
        },
        {
          data: today,
          tipo: 'Despesa',
          categoriaId: '1', // Abastecimento
          valor: 120.00,
          km: 125400,
          combustivel: 'Gasolina',
          quantidade: 20.5,
          valorUnitario: 5.85,
          obs: 'Exemplo: Abastecimento no Posto Shell',
          createdAt: new Date().toISOString()
        },
        {
          data: today,
          tipo: 'Despesa',
          categoriaId: '2', // Alimentação
          valor: 35.00,
          obs: 'Exemplo: Almoço no Restaurante do Posto',
          createdAt: new Date().toISOString()
        }
      ];

      examples.forEach(ex => {
        batch.set(doc(entriesRef), ex);
      });

      await batch.commit();
      await handleCloseTutorial(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/entries`);
    }
  }, [user, handleCloseTutorial]);

  const isTrialExpired = useMemo(() => {
    // Admin bypass
    if (user?.email === 'leandrosolon@gmail.com') return false;
    
    if (!state.trialStartDate) return false;
    const start = new Date(state.trialStartDate).getTime();
    const now = new Date().getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return (now - start) > thirtyDaysInMs;
  }, [state.trialStartDate, user?.email]);

  const isBeta = isAdmin && state.appConfig?.betaVersion !== state.appConfig?.publishedVersion && state.appConfig?.betaVersion !== APP_VERSION;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} error={authError} />;
  }

  if (isTrialExpired) {
    return <TrialExpiredView onLogout={handleLogout} />;
  }

  if (state.appConfig?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertCircle className="size-16 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold">Manutenção em Andamento</h1>
          <p className="text-slate-500 max-w-xs mx-auto">
            Estamos atualizando o LucroNoVolante para trazer novidades. Voltamos em breve!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PWAPrompt />
      <div className={cn(
        "min-h-screen bg-[#0047AB] text-white font-sans pb-20 selection:bg-blue-400 selection:text-white",
        isBeta && "beta-mode"
      )}>
      {/* Beta/Staging Banner */}
      {isBeta && (
        <div className="bg-purple-600 text-white text-[10px] font-bold py-1 px-4 text-center z-[100] flex items-center justify-center gap-2">
          <TrendingUp size={12} />
          MODO BETA: Você está visualizando alterações em validação (v{state.appConfig?.betaVersion})
        </div>
      )}
      
      {/* Offline Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-[10px] font-bold py-1 px-4 text-center z-[100] flex items-center justify-center gap-2"
          >
            <AlertCircle size={12} />
            MODO OFFLINE: Seus registros serão sincronizados quando houver internet.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#0047AB]/80 backdrop-blur-md text-white p-4 sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
              <Car className="text-[#0047AB] size-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">LucroNoVolante</h1>
              {user.displayName && (
                <p className="text-[10px] opacity-80 font-medium mt-0.5">Olá, {user.displayName.split(' ')[0]}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] opacity-80 uppercase font-semibold">Saldo do Mês</p>
              <p className={cn(
                "font-bold text-sm",
                totals.balance >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard 
                totals={totals} 
                fixedCosts={state.fixedCosts} 
                nextOilChange={nextOilChange}
                currentKm={lastRecordedKm}
                targetKm={state.targetKm}
                maintenanceIntervals={state.maintenanceIntervals}
                entries={state.entries}
                categories={state.categories}
                onViewMaintenance={() => setActiveTab('maintenance')}
                onOpenAIStudio={() => setIsAIVideoStudioOpen(true)}
                isAdmin={isAdmin}
                uniqueVisitors={globalStats?.uniqueVisitors}
                email={user?.email || undefined}
              />
            </motion.div>
          )}
          {activeTab === 'maintenance' && (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <MaintenanceView 
                currentKm={lastRecordedKm}
                maintenanceIntervals={state.maintenanceIntervals}
                entries={state.entries}
                categories={state.categories}
              />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EntryList 
                entries={state.entries} 
                categories={state.categories} 
                onDelete={handleDeleteEntry} 
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setIsEntryModalOpen(true);
                }}
              />
            </motion.div>
          )}
          {activeTab === 'map' && user?.email === 'leandrosolon@gmail.com' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FuelMap 
                entries={state.entries}
                categories={state.categories}
                activeTab={activeTab}
              />
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReportsView 
                entries={state.entries} 
                categories={state.categories} 
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsView 
                fixedCosts={state.fixedCosts} 
                onUpdateFixedCosts={handleUpdateFixedCosts}
                earningCategories={state.earningCategories}
                onUpdateEarningCategories={handleUpdateEarningCategories}
                entries={state.entries}
                onUpdateEntries={handleUpdateEntries}
                categories={state.categories}
                onUpdateCategories={handleUpdateCategories}
                appSheetMapping={state.appSheetMapping}
                onUpdateAppSheetMapping={handleUpdateAppSheetMapping}
                targetKm={state.targetKm}
                onUpdateTargetKm={handleUpdateTargetKm}
                currentKm={state.currentKm}
                onUpdateCurrentKm={handleUpdateCurrentKm}
                lastRecordedKm={lastRecordedKm}
                maintenanceIntervals={state.maintenanceIntervals}
                onUpdateMaintenanceIntervals={handleUpdateMaintenanceIntervals}
                isAdmin={isAdmin}
                appConfig={state.appConfig}
                onUpdateAppConfig={handleUpdateAppConfig}
                isAIVideoStudioOpen={isAIVideoStudioOpen}
                setIsAIVideoStudioOpen={setIsAIVideoStudioOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Version Info */}
      <footer className="py-6 px-4 text-center space-y-2">
        <p className="text-[10px] text-blue-300/50 font-medium">
          v{APP_VERSION}
        </p>
        {isAdmin && (
          <div className="text-[8px] text-blue-300/30 font-mono space-y-1">
            <p>Project: {firebaseConfig.projectId}</p>
            <p>DB: {firebaseConfig.firestoreDatabaseId}</p>
          </div>
        )}
      </footer>
      <button
        onClick={() => {
          setEditingEntry(null);
          setIsEntryModalOpen(true);
        }}
        className="fixed bottom-24 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-colors z-40"
      >
        <PlusCircle className="size-8" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-30">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex justify-around items-center">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard />} 
            label="Painel" 
          />
          <NavButton 
            active={activeTab === 'maintenance'} 
            onClick={() => setActiveTab('maintenance')} 
            icon={<Fuel />} 
            label="Revisão" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History />} 
            label="Histórico" 
          />
          {isAdmin && (
            <NavButton 
              active={activeTab === 'map'} 
              onClick={() => setActiveTab('map')} 
              icon={<MapPin />} 
              label="Mapa" 
            />
          )}
          <NavButton 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
            icon={<BarChart3 />} 
            label="Relatórios" 
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings />} 
            label="Custos" 
          />
        </div>
        <div className="text-[8px] text-slate-300 text-center mt-1 font-bold">v{APP_VERSION}</div>
      </nav>

      {/* Entry Modal */}
      <AnimatePresence>
        {!state.tutorialOptOut && !dismissedTutorialSession && user && (
          <TutorialModal 
            onClose={(dontShowAgain) => handleCloseTutorial(dontShowAgain)} 
            onStartWithExamples={handleStartWithExamples}
          />
        )}
        {isAdmin && isAIVideoStudioOpen && (
          <AIVideoStudio onClose={() => setIsAIVideoStudioOpen(false)} />
        )}
        {isEntryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEntryModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-slate-900"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-lg">{editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                <button 
                  onClick={() => {
                    setIsEntryModalOpen(false);
                    setEditingEntry(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-6" />
                </button>
              </div>
              <div className="p-4 max-h-[80vh] overflow-y-auto">
                <EntryForm 
                  onSubmit={handleAddEntry} 
                  categories={state.categories} 
                  earningCategories={state.earningCategories}
                  lastKm={lastRecordedKm}
                  entries={state.entries}
                  initialData={editingEntry || undefined}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-all duration-200",
        active ? "text-blue-600 scale-110" : "text-slate-500 hover:text-slate-700"
      )}
    >
      <div className={cn(
        "p-1 rounded-xl transition-colors",
        active ? "bg-blue-50" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"
        />
      )}
    </button>
  );
}

