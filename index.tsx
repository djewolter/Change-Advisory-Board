
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppHeader, Tabs } from './components/layout/AppLayout';
import { AuthPage } from './components/pages/AuthPage';
import { HomePage } from './components/pages/HomePage';
import { NewRequestPage } from './components/pages/NewRequestPage';
import { MyRequestsPage } from './components/pages/MyRequestsPage';
import { AnalysisPage } from './components/pages/AnalysisPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { kanbanStatuses, WIZARD_STORAGE_KEY, USER_SESSION_KEY, REMEMBER_ME_KEY } from './constants/app-constants';

const App = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('home');
    const [requests, setRequests] = useState<any[]>([]);
    const [drafts, setDrafts] = useState<any[]>([]);
    
    useEffect(() => {
        const storedRequests = localStorage.getItem('cab-requests');
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        
        const storedDrafts = localStorage.getItem('cab-drafts');
        if (storedDrafts) setDrafts(JSON.parse(storedDrafts));
        
        const storedUser = localStorage.getItem(USER_SESSION_KEY);
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            const remembered = localStorage.getItem(REMEMBER_ME_KEY);
            if (remembered) {
                const { email, password } = JSON.parse(remembered);
                handleLogin(email, password, true);
            }
        }
    }, []);

    const handleLogin = (email: string, password: any, remember: boolean = false) => {
        if (password === '123456') {
            const rawName = email.split('@')[0];
            const formattedName = rawName
                .split('.')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ');

            const userData = { name: formattedName, email };
            setUser(userData);
            
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
            
            if (remember) {
                localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email, password }));
            } else {
                localStorage.removeItem(REMEMBER_ME_KEY);
            }
            
            return true;
        }
        return false;
    };

    const handleLogout = () => { 
        setUser(null); 
        localStorage.removeItem(USER_SESSION_KEY); 
        localStorage.removeItem(REMEMBER_ME_KEY); 
        setActiveTab('home'); 
    };

    const safeSaveToStorage = (key: string, data: any, setState: (d: any) => void) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            setState(data);
        } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`LocalStorage quota exceeded for ${key}. Attempting to prune data...`);
                
                const prunedData = data.slice(0, 15).map((item: any, index: number) => {
                    if (index > 2 && item.formData && item.formData.anexos) {
                        return { ...item, formData: { ...item.formData, anexos: [] } };
                    }
                    return item;
                });

                try {
                    localStorage.setItem(key, JSON.stringify(prunedData));
                    setState(prunedData);
                    alert("Aviso: O limite de armazenamento do navegador foi atingido. Para continuar salvando, anexos de solicitações antigas foram removidos automaticamente.");
                } catch (retryError) {
                    alert("Erro Crítico: Não há espaço suficiente no navegador para salvar novos dados. Por favor, limpe o cache ou remova solicitações antigas manualmente.");
                }
            }
        }
    };

    const addRequest = (formData: any, draftIdToDelete: string | null = null) => {
        const areaAfetada = formData.informacoesGerais.areaAfetada || 'Sistemas';
        const areaCode = areaAfetada === 'Sistemas' ? 'STM' : (areaAfetada === 'Infra' ? 'INF' : areaAfetada.toUpperCase().substring(0, 3));
        const rawClass = areaAfetada === 'Infra' ? formData.infra.tipoMudanca : formData.informacoesGerais.classificacao;
        const wMap: Record<string, string> = { 'Planejada': 'PLN', 'Programada': 'PRG', 'Emergencial': 'EMG', 'Padrão': 'PRD' };
        const wCode = wMap[rawClass] || 'PRD';
        
        const today = new Date();
        const yStr = today.getFullYear().toString() + 
                     String(today.getMonth() + 1).padStart(2, '0') + 
                     String(today.getDate()).padStart(2, '0');
        const xStr = Math.floor(1000 + Math.random() * 9000).toString();
        
        const newId = `CAB-${wCode}-${areaCode}-${yStr}-${xStr}`;

        const newRequest = { 
            id: newId, 
            title: areaAfetada === 'Infra' ? formData.infra.resumo : formData.informacoesGerais.motivoMudanca, 
            leader: formData.informacoesGerais.liderMudanca, 
            classification: rawClass, 
            status: 'Submitted', 
            formData, 
            solicitanteEmail: user.email 
        };
        
        const updated = [newRequest, ...requests];
        safeSaveToStorage('cab-requests', updated, setRequests);

        if (draftIdToDelete) {
            const updatedDrafts = drafts.filter(d => d.id !== draftIdToDelete);
            setDrafts(updatedDrafts);
            localStorage.setItem('cab-drafts', JSON.stringify(updatedDrafts));
        }
        
        // Limpa o rascunho temporário do wizard para este usuário após o envio
        localStorage.removeItem(`${WIZARD_STORAGE_KEY}_${user.email}`);
        
        return newId;
    };

    const saveDraft = (formData: any, existingId: string | null = null) => {
        const draftId = existingId || `DRAFT-${Date.now()}`;
        const newDraft = { 
            id: draftId, 
            title: (formData.informacoesGerais.areaAfetada === 'Infra' ? formData.infra.resumo : formData.informacoesGerais.motivoMudanca) || '(Sem título)', 
            savedAt: new Date().toISOString(), 
            formData, 
            solicitanteEmail: user.email 
        };
        const updated = [newDraft, ...drafts.filter(d => d.id !== draftId)];
        safeSaveToStorage('cab-drafts', updated, setDrafts);
        return draftId;
    };

    if (!user) return <AuthPage onLogin={handleLogin} onRegister={() => true} onRecover={() => '123456'} />;

    return (
        <>
            <AppHeader user={user} onLogout={handleLogout} />
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="container">
                {activeTab === 'home' && <HomePage requests={requests} setActiveTab={setActiveTab} kanbanStatuses={kanbanStatuses} />}
                {activeTab === 'newRequest' && <NewRequestPage addRequest={addRequest} currentUser={user} onSaveDraft={saveDraft} onAutoSaveDraft={saveDraft} />}
                {activeTab === 'myRequests' && (
                    <MyRequestsPage 
                        requests={requests} 
                        currentUser={user} 
                        kanbanStatuses={kanbanStatuses} 
                        drafts={drafts} 
                        onContinueDraft={(id: string) => { 
                            const draft = drafts.find(d => d.id === id);
                            if (draft) {
                                localStorage.setItem(`${WIZARD_STORAGE_KEY}_${user.email}`, JSON.stringify(draft));
                                setActiveTab('newRequest');
                            }
                        }} 
                        onDeleteDraft={(id: string) => { 
                            const updated = drafts.filter(d => d.id !== id); 
                            setDrafts(updated); 
                            localStorage.setItem('cab-drafts', JSON.stringify(updated)); 
                        }} 
                        onCreateFromCopy={(r: any) => { 
                            localStorage.setItem(`${WIZARD_STORAGE_KEY}_${user.email}`, JSON.stringify(r)); 
                            setActiveTab('newRequest'); 
                        }} 
                        onAdminNewRequest={() => {
                            localStorage.removeItem(`${WIZARD_STORAGE_KEY}_${user.email}`);
                            setActiveTab('newRequest');
                        }} 
                    />
                )}
                {activeTab === 'analysis' && <AnalysisPage requests={requests} kanbanStatuses={kanbanStatuses} onAdminNewRequest={() => setActiveTab('newRequest')} onNavigateToDashboard={() => setActiveTab('dashboard')} />}
                {activeTab === 'dashboard' && <DashboardPage onBack={() => setActiveTab('analysis')} />}
            </main>
        </>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
