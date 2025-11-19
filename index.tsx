import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants & Data ---
const WIZARD_STORAGE_KEY = 'cab-wizard-storage';

const DEFAULT_CHECKLIST_QUESTIONS = [
    { id: 1, text: "A mudança foi testada e validada em ambiente de Qualidade (QA)?", required: true },
    { id: 2, text: "O plano de rollback (reversão) foi documentado e testado?", required: true },
    { id: 3, text: "Existe indisponibilidade prevista no ambiente produtivo?", required: true },
    { id: 4, text: "Os usuários chave foram comunicados sobre a janela da mudança?", required: true },
    { id: 5, text: "A documentação técnica foi atualizada?", required: false }
];

const DEFAULT_SAP_CHECKLIST_QUESTIONS = [
    { id: 1, text: "A request de transporte foi liberada corretamente?", required: true },
    { id: 2, text: "Há dependências de outras requests?", required: true },
    { id: 3, text: "A ordem de importação foi definida?", required: true }
];

const initialFormData = {
    informacoesGerais: {
        motivoMudanca: '',
        liderMudanca: '',
        classificacao: 'Padrão',
        dataMudanca: '',
        indisponibilidadeInicio: '',
        indisponibilidadeFim: ''
    },
    checklist: DEFAULT_CHECKLIST_QUESTIONS.map(q => ({ ...q, answer: '' })),
    checklistSAP: DEFAULT_SAP_CHECKLIST_QUESTIONS.map(q => ({ ...q, answer: '' }))
};

// --- Helper Components ---

const AppHeader = ({ user, onLogout }) => (
    <header className="app-header">
        <div className="logo-container">
            <div style={{ width: 32, height: 32, background: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#012169', fontWeight: 'bold' }}>S</div>
            <h1>SIPAL CAB</h1>
        </div>
        <div className="user-info">
            <span>Olá, <strong>{user.name}</strong></span>
            <button onClick={onLogout} className="logout-btn">Sair</button>
        </div>
    </header>
);

const Tabs = ({ activeTab, setActiveTab }) => (
    <nav className="tabs">
        <button className={`tab-button ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
        <button className={`tab-button ${activeTab === 'newRequest' ? 'active' : ''}`} onClick={() => setActiveTab('newRequest')}>Nova Mudança</button>
        <button className={`tab-button ${activeTab === 'myRequests' ? 'active' : ''}`} onClick={() => setActiveTab('myRequests')}>Minhas Solicitações</button>
        <button className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>Análise CAB</button>
    </nav>
);

// --- Page Components ---

const HomePage = ({ requests, kanbanStatuses, setActiveTab }) => {
    const pendingCount = requests.filter(r => r.status === 'Submitted').length;
    const approvedCount = requests.filter(r => r.status === 'Approved').length;
    
    return (
        <div className="card">
            <h2>Bem-vindo ao Painel CAB</h2>
            <p>Sistema de gerenciamento do Change Advisory Board.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                <div style={{ padding: '1.5rem', background: '#e3f2fd', borderRadius: '8px', borderLeft: '5px solid #2196f3' }}>
                    <h3 style={{ marginTop: 0, fontSize: '2rem', color: '#0d47a1' }}>{pendingCount}</h3>
                    <span style={{ color: '#546e7a' }}>Aguardando Aprovação</span>
                </div>
                <div style={{ padding: '1.5rem', background: '#e8f5e9', borderRadius: '8px', borderLeft: '5px solid #4caf50' }}>
                    <h3 style={{ marginTop: 0, fontSize: '2rem', color: '#1b5e20' }}>{approvedCount}</h3>
                    <span style={{ color: '#546e7a' }}>Aprovadas este mês</span>
                </div>
                <div style={{ padding: '1.5rem', background: '#fff3e0', borderRadius: '8px', borderLeft: '5px solid #ff9800', cursor: 'pointer' }} onClick={() => setActiveTab('newRequest')}>
                    <h3 style={{ marginTop: 0, fontSize: '1.5rem', color: '#e65100' }}>+ Nova</h3>
                    <span style={{ color: '#546e7a' }}>Criar Solicitação</span>
                </div>
            </div>

            <h3 style={{ marginTop: '2rem' }}>Solicitações Recentes</h3>
            <div className="request-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Status</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.slice(0, 5).map(req => (
                            <tr key={req.id}>
                                <td>{req.id}</td>
                                <td>{req.title}</td>
                                <td><span className={`status-badge status-${req.status.toLowerCase()}`}>{kanbanStatuses[req.status] || req.status}</span></td>
                                <td>{new Date(req.submittedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '1rem'}}>Nenhuma solicitação encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const NewRequestPage = ({ addRequest, currentUser, onSaveDraft, onAutoSaveDraft }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        // Load draft if exists
        const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
        if (stored) {
            const { formData: storedData } = JSON.parse(stored);
            setFormData(prev => ({...prev, ...storedData}));
        } else {
            // Set default leader to current user if empty
            if (!formData.informacoesGerais.liderMudanca) {
                setFormData(prev => ({
                    ...prev,
                    informacoesGerais: { ...prev.informacoesGerais, liderMudanca: currentUser.name }
                }));
            }
        }
    }, []);

    // Auto-save effect
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ formData, draftId: null }));
            if (onAutoSaveDraft) onAutoSaveDraft(formData);
        }, 2000);
        return () => clearTimeout(timer);
    }, [formData]);

    const updateField = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const updateChecklist = (type, index, answer) => {
        const key = type === 'sap' ? 'checklistSAP' : 'checklist';
        const newList = [...formData[key]];
        newList[index].answer = answer;
        setFormData(prev => ({ ...prev, [key]: newList }));
    };

    const handleSubmit = () => {
        if (!formData.informacoesGerais.motivoMudanca) {
            alert("Por favor, preencha o motivo da mudança.");
            return;
        }
        const id = addRequest(formData);
        localStorage.removeItem(WIZARD_STORAGE_KEY);
        alert(`Solicitação ${id} criada com sucesso!`);
        window.location.reload(); // Force return to home/list effectively
    };

    return (
        <div className="card wizard-form">
            <div className="wizard-header-section">
                <h2 className="wizard-title">Nova Solicitação de Mudança</h2>
            </div>
            
            <ul className="wizard-progress-bar">
                <li className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => setStep(1)}>
                    <div className="step-indicator">1</div>
                    <div className="step-label">Informações Gerais</div>
                </li>
                <li className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => setStep(2)}>
                    <div className="step-indicator">2</div>
                    <div className="step-label">Checklist & Risco</div>
                </li>
                <li className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => setStep(3)}>
                    <div className="step-indicator">3</div>
                    <div className="step-label">Revisão</div>
                </li>
            </ul>

            <div className="step-content">
                {step === 1 && (
                    <div className="form-grid">
                        <div className="form-field full-width">
                            <label>Motivo da Mudança / Título</label>
                            <input 
                                type="text" 
                                value={formData.informacoesGerais.motivoMudanca}
                                onChange={(e) => updateField('informacoesGerais', 'motivoMudanca', e.target.value)}
                                placeholder="Descreva brevemente o motivo da mudança"
                            />
                        </div>
                        <div className="form-field">
                            <label>Líder da Mudança</label>
                            <input 
                                type="text" 
                                value={formData.informacoesGerais.liderMudanca}
                                onChange={(e) => updateField('informacoesGerais', 'liderMudanca', e.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label>Classificação</label>
                            <select 
                                value={formData.informacoesGerais.classificacao}
                                onChange={(e) => updateField('informacoesGerais', 'classificacao', e.target.value)}
                            >
                                <option value="Padrão">Padrão</option>
                                <option value="Planejada">Planejada</option>
                                <option value="Emergencial">Emergencial</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Data Prevista</label>
                            <input 
                                type="date" 
                                value={formData.informacoesGerais.dataMudanca}
                                onChange={(e) => updateField('informacoesGerais', 'dataMudanca', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h3>Checklist Padrão</h3>
                        {formData.checklist.map((item, idx) => (
                            <div key={item.id} className="checklist-question-container" style={{padding: '1rem', marginBottom: '1rem'}}>
                                <p className="checklist-question-text">{item.text}</p>
                                <div className="checklist-answer-buttons">
                                    <button 
                                        className={`checklist-answer-btn sim ${item.answer === 'Sim' ? 'selected' : ''}`}
                                        onClick={() => updateChecklist('std', idx, 'Sim')}
                                    >Sim</button>
                                    <button 
                                        className={`checklist-answer-btn nao ${item.answer === 'Não' ? 'selected' : ''}`}
                                        onClick={() => updateChecklist('std', idx, 'Não')}
                                    >Não</button>
                                    <button 
                                        className={`checklist-answer-btn na ${item.answer === 'N/A' ? 'selected' : ''}`}
                                        onClick={() => updateChecklist('std', idx, 'N/A')}
                                    >N/A</button>
                                </div>
                            </div>
                        ))}
                        
                        <div className="card-like-section">
                            <legend>Indisponibilidade</legend>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Início</label>
                                    <input 
                                        type="datetime-local"
                                        value={formData.informacoesGerais.indisponibilidadeInicio}
                                        onChange={(e) => updateField('informacoesGerais', 'indisponibilidadeInicio', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Fim</label>
                                    <input 
                                        type="datetime-local"
                                        value={formData.informacoesGerais.indisponibilidadeFim}
                                        onChange={(e) => updateField('informacoesGerais', 'indisponibilidadeFim', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h3>Resumo da Solicitação</h3>
                        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '5px' }}>
                            <p><strong>Título:</strong> {formData.informacoesGerais.motivoMudanca}</p>
                            <p><strong>Líder:</strong> {formData.informacoesGerais.liderMudanca}</p>
                            <p><strong>Classificação:</strong> {formData.informacoesGerais.classificacao}</p>
                            <p><strong>Data:</strong> {formData.informacoesGerais.dataMudanca}</p>
                        </div>
                        <p style={{ marginTop: '1rem', color: '#666' }}>
                            Ao submeter, a solicitação entrará no fluxo de aprovação do CAB.
                        </p>
                    </div>
                )}
            </div>

            <div className="wizard-nav-sticky">
                <div className="main-nav-buttons">
                    <button 
                        className="nav-button secondary" 
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                    >
                        Voltar
                    </button>
                </div>
                <div className="main-nav-buttons">
                    {step < 3 ? (
                        <button className="nav-button" onClick={() => setStep(s => Math.min(3, s + 1))}>
                            Próximo
                        </button>
                    ) : (
                        <button className="submit-btn" onClick={handleSubmit}>
                            Submeter Solicitação
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MyRequestsPage = ({ requests, currentUser, drafts, onDeleteDraft, onContinueDraft, kanbanStatuses }) => {
    const myRequests = requests.filter(r => r.solicitanteEmail === currentUser.email);

    return (
        <div className="card">
            <h2>Minhas Solicitações</h2>
            
            {drafts && drafts.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3>Rascunhos</h3>
                    <div className="request-list">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Título</th>
                                    <th>Salvo em</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map(draft => (
                                    <tr key={draft.id}>
                                        <td>{draft.id}</td>
                                        <td>{draft.title}</td>
                                        <td>{new Date(draft.savedAt).toLocaleString()}</td>
                                        <td>
                                            <button className="btn-continue-draft" onClick={() => onContinueDraft(draft.id)}>Continuar</button>
                                            <button className="action-button remove-row-btn" onClick={() => onDeleteDraft(draft.id)} style={{marginLeft: '1rem'}}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <h3>Histórico</h3>
            <div className="request-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Status</th>
                            <th>Data Envio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myRequests.length > 0 ? myRequests.map(req => (
                            <tr key={req.id}>
                                <td>{req.id}</td>
                                <td>{req.title}</td>
                                <td><span className={`status-badge status-${req.status.toLowerCase()}`}>{kanbanStatuses[req.status] || req.status}</span></td>
                                <td>{new Date(req.submittedAt).toLocaleDateString()}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4}>Você ainda não enviou nenhuma solicitação.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AnalysisPage = ({ requests }) => {
    return (
        <div className="card">
            <h2>Análise CAB (Admin)</h2>
            <div className="request-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Solicitante</th>
                            <th>Título</th>
                            <th>Classificação</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td>{req.id}</td>
                                <td>{req.leader}</td>
                                <td>{req.title}</td>
                                <td><span className="impact-badge">{req.classification}</span></td>
                                <td>{req.status}</td>
                                <td>
                                    <button className="nav-button" style={{padding: '0.3rem 0.8rem', fontSize: '0.8rem'}}>Analisar</button>
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && <tr><td colSpan={6}>Nenhuma solicitação pendente.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Auth & App Components ---

const AuthPage = ({ onLogin, onRegister, onRecoverPassword }) => {
    const [mode, setMode] = useState('login'); // 'login', 'register', 'recover'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (mode === 'login') {
            const success = onLogin(formData.email, formData.password);
            if (!success) setError('Email ou senha incorretos.');
        } else if (mode === 'register') {
             if (!formData.name || !formData.email || !formData.password) {
                setError('Todos os campos são obrigatórios.');
                return;
            }
            const success = onRegister(formData.name, formData.email, formData.password);
            if (!success) setError('Este email já está cadastrado.');
        } else if (mode === 'recover') {
             if (!formData.email) {
                 setError('Por favor, informe seu email.');
                 return;
             }
             const result = onRecoverPassword(formData.email);
             if (result.success) {
                 setMessage(result.message);
                 setFormData(prev => ({ ...prev, password: '' }));
             } else {
                 setError(result.message);
             }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <h1>SIPAL CAB</h1>
                    <p style={{ color: '#6c757d' }}>Change Advisory Board</p>
                </div>
                
                <h2>
                    {mode === 'login' && 'Login'}
                    {mode === 'register' && 'Criar Conta'}
                    {mode === 'recover' && 'Recuperar Senha'}
                </h2>

                {error && <div className="auth-error">{error}</div>}
                {message && <div className="auth-error" style={{ backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb' }}>{message}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="form-field">
                            <label>Nome Completo</label>
                            <input 
                                type="text" 
                                placeholder="Seu nome"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    )}

                    <div className="form-field">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    {mode !== 'recover' && (
                        <div className="form-field">
                            <label>Senha</label>
                            <input 
                                type="password" 
                                placeholder="******"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    )}

                    <button type="submit" className="submit-btn auth-btn">
                        {mode === 'login' && 'Entrar'}
                        {mode === 'register' && 'Cadastrar'}
                        {mode === 'recover' && 'Enviar Email'}
                    </button>
                </form>

                <div className="auth-toggle">
                    {mode === 'login' && (
                        <>
                            <button onClick={() => { setMode('recover'); setError(''); setMessage(''); }} className="forgot-password-link">
                                Esqueci minha senha
                            </button>
                            <div style={{ marginTop: '1rem' }}>
                                <span>Não tem uma conta? </span>
                                <button onClick={() => { setMode('register'); setError(''); setMessage(''); }}>
                                    Cadastre-se
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'register' && (
                        <div>
                            <span>Já tem uma conta? </span>
                            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}>
                                Faça Login
                            </button>
                        </div>
                    )}

                    {mode === 'recover' && (
                        <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}>
                            Voltar para Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [requests, setRequests] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [users, setUsers] = useState([]); 
    
    const kanbanStatuses = {
        'Submitted': 'Aguardando Aprovação',
        'Approved': 'Aprovado',
        'Rejected': 'Rejeitado',
        'Pending Info': 'Pendente Informações',
        'In Progress': 'Em Execução',
        'Completed': 'Concluído',
        'Validation': 'Validação Final'
    };

    useEffect(() => {
        const storedRequests = localStorage.getItem('cab-requests');
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        
        const storedDrafts = localStorage.getItem('cab-drafts');
        if (storedDrafts) setDrafts(JSON.parse(storedDrafts));

        const storedUsers = localStorage.getItem('cab-users');
        if (storedUsers) setUsers(JSON.parse(storedUsers));
        
        const storedUser = sessionStorage.getItem('cab-user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const handleLogin = (email, password) => {
        if (password === '123456') {
            const userData = { name: 'Usuário Teste', email };
            setUser(userData);
            sessionStorage.setItem('cab-user', JSON.stringify(userData));
            return true;
        }
        const foundUser = users.find(u => u.email === email && u.password === password);
        if (foundUser) {
            const { password, ...userData } = foundUser;
            setUser(userData);
            sessionStorage.setItem('cab-user', JSON.stringify(userData));
            return true;
        }
        return false;
    };
    
    const handleRegister = (name, email, password) => {
        if (users.some(u => u.email === email)) return false;
        const newUser = { name, email, password };
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        localStorage.setItem('cab-users', JSON.stringify(updatedUsers));
        const { password: _, ...userData } = newUser;
        setUser(userData);
        sessionStorage.setItem('cab-user', JSON.stringify(userData));
        return true;
    };

    const handleRecoverPassword = (email) => {
        const foundUser = users.find(u => u.email === email);
        if (foundUser) {
            return { 
                success: true, 
                message: `Simulação: Email enviado para ${email}. Sua senha é: ${foundUser.password}` 
            };
        } else if (email === 'teste@sipal.com' || email.includes('teste')) {
             return { 
                success: true, 
                message: `Simulação: Email de recuperação enviado para ${email}. (Senha padrão: 123456)` 
            };
        }
        return { success: false, message: 'Email não encontrado.' };
    };

    const handleLogout = () => {
        setUser(null);
        sessionStorage.removeItem('cab-user');
        setActiveTab('home');
    };

    const addRequest = (formData, draftIdToDelete = null) => {
        const classificationMap = { 'Emergencial': 'EMG', 'Planejada': 'PLN', 'Padrão': 'PRD' };
        const classification = formData.informacoesGerais.classificacao;
        const typeCode = classificationMap[classification] || 'PRD';
        const today = new Date();
        const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const newId = `CAB-${typeCode}-${dateString}-${randomSuffix}`;

        const newRequest = {
            id: newId,
            title: formData.informacoesGerais.motivoMudanca,
            leader: formData.informacoesGerais.liderMudanca,
            classification: formData.informacoesGerais.classificacao,
            status: 'Submitted',
            submittedAt: new Date().toISOString(),
            formData: formData,
            solicitanteEmail: user.email
        };
        
        const updatedRequests = [newRequest, ...requests];
        setRequests(updatedRequests);
        localStorage.setItem('cab-requests', JSON.stringify(updatedRequests));
        
        if (draftIdToDelete) deleteDraft(draftIdToDelete);
        return newId;
    };

    const saveDraft = (formData, existingId = null) => {
        const draftId = existingId || `DRAFT-${Date.now()}`;
        const newDraft = {
            id: draftId,
            title: formData.informacoesGerais.motivoMudanca || '(Sem título)',
            savedAt: new Date().toISOString(),
            formData: formData,
            solicitanteEmail: user.email
        };
        const otherDrafts = drafts.filter(d => d.id !== draftId);
        const updatedDrafts = [newDraft, ...otherDrafts];
        setDrafts(updatedDrafts);
        localStorage.setItem('cab-drafts', JSON.stringify(updatedDrafts));
        return draftId;
    };

    const deleteDraft = (draftId) => {
        const updatedDrafts = drafts.filter(d => d.id !== draftId);
        setDrafts(updatedDrafts);
        localStorage.setItem('cab-drafts', JSON.stringify(updatedDrafts));
    };

    const continueDraft = (draftId) => {
        const draft = drafts.find(d => d.id === draftId);
        if (draft) {
            localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ formData: draft.formData, draftId: draft.id }));
            setActiveTab('newRequest');
        }
    };

    if (!user) {
        return <AuthPage onLogin={handleLogin} onRegister={handleRegister} onRecoverPassword={handleRecoverPassword} />;
    }

    return (
        <>
            <AppHeader user={user} onLogout={handleLogout} />
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="container">
                {activeTab === 'home' && (
                    <HomePage requests={requests} setActiveTab={setActiveTab} kanbanStatuses={kanbanStatuses} />
                )}
                {activeTab === 'newRequest' && (
                    <NewRequestPage 
                        addRequest={addRequest} 
                        currentUser={user} 
                        onSaveDraft={saveDraft}
                        onAutoSaveDraft={saveDraft}
                    />
                )}
                {activeTab === 'myRequests' && (
                    <MyRequestsPage 
                        requests={requests} 
                        currentUser={user} 
                        kanbanStatuses={kanbanStatuses}
                        drafts={drafts.filter(d => d.solicitanteEmail === user.email)}
                        onContinueDraft={continueDraft}
                        onDeleteDraft={deleteDraft}
                    />
                )}
                {activeTab === 'analysis' && (
                    <AnalysisPage requests={requests} />
                )}
            </main>
        </>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
