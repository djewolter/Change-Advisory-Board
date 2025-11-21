import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';

// As per the brand guide, page 10
const sipalBlue = '#012169';
const sipalTeal = '#008479';

// Moved steps to global scope to be accessible by the PDF utility function
const steps = [
    "Informações Gerais", "Plano de Implantação", "Mapa de Transporte", "Caderno de Testes", 
    "Plano de Retorno", "Plano de Comunicação", "Risco de Mudança", "Segurança e Acessos", 
    "Contatos", "Checklist", "Checklist SAP", "Anexos e Envio", "Análise e Finalização"
];

const generateAndSavePdf = (formData, requestId = null) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    const addPageIfNeeded = () => {
        if (y > 270) { // Leave some margin at bottom
            doc.addPage();
            y = 20;
        }
    };
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SIPAL Change Advisory Board', pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(14);
    doc.text(`Requisição de Mudança - ${requestId || 'PREVIEW'}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    const addSectionHeader = (title) => {
        y += 7;
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 7;
    };
    
    const addField = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            value = '-';
        }
        if (Array.isArray(value)) {
            value = value.join(', ');
        }
        
        addPageIfNeeded();
        doc.setFontSize(10);
        
        const labelColWidth = 45;
        const valueColX = margin + labelColWidth;
        const valueColWidth = contentWidth - labelColWidth;
    
        doc.setFont('helvetica', 'bold');
        const labelLines = doc.splitTextToSize(label, labelColWidth - 2);
        doc.text(labelLines, margin, y);
    
        doc.setFont('helvetica', 'normal');
        const stringValue = String(value);
        const valueLines = doc.splitTextToSize(stringValue, valueColWidth);
        const isURL = (str) => typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
        
        const lineHeight = 5; // The increment used to advance `y`
        const isLink = isURL(stringValue) && stringValue.trim() !== '-';
    
        if (isLink) {
            const originalColor = doc.getTextColor();
            doc.setTextColor(0, 0, 255); // Blue color for links
            doc.text(valueLines, valueColX, y);
            doc.setTextColor(originalColor);
        } else {
            doc.text(valueLines, valueColX, y);
        }
    
        if (isLink) {
            const textMetrics = doc.getTextDimensions('T');
            const topOfTextBlock = y - textMetrics.h;
            const totalTextBlockHeight = valueLines.length * lineHeight;
            
            doc.link(valueColX, topOfTextBlock, valueColWidth, totalTextBlockHeight, { url: stringValue });
        }
        
        const lines = Math.max(labelLines.length, valueLines.length);
        y += (lines * lineHeight) + 3;
    };
    
    const addFullWidthText = (text, isBold = false) => {
        addPageIfNeeded();
        doc.setFontSize(10);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textLines = doc.splitTextToSize(text, contentWidth);
        doc.text(textLines, margin, y);
        y += (textLines.length * 5) + 3;
    };

    const addTable = (title, columns, data) => {
        addSectionHeader(title);
        if (!data || data.length === 0) {
            doc.setFont('helvetica', 'italic');
            doc.text("Nenhum item adicionado.", margin, y);
            y += 10;
            return;
        }

        data.forEach((row, index) => {
            y += 5;
            addPageIfNeeded();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`Item #${index + 1}`, margin, y);
            y += 7;
            
            doc.setFontSize(10);
            columns.forEach(col => {
                if (col.key === 'id') return;
                let value = row[col.key] || '-';
                addField(col.label, value);
            });
            
            y += 4;
            if (index < data.length - 1) {
                doc.setLineWidth(0.2);
                doc.line(margin, y, pageWidth - margin, y);
                y += 4;
            }
        });
    };
    
    // 1. Informações Gerais
    addSectionHeader(steps[0]);
    const { informacoesGerais } = formData;
    addField('Líder da Mudança:', informacoesGerais.liderMudanca);
    addField('Solicitante:', informacoesGerais.solicitante);
    addField('Líder do Produto:', informacoesGerais.liderProduto);
    addField('Data da Mudança:', informacoesGerais.dataMudanca ? new Date(informacoesGerais.dataMudanca + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-');
    addField('Motivo da Mudança:', informacoesGerais.motivoMudanca);
    addField('Impacto de Não Realizar:', informacoesGerais.impactoNaoRealizar);
    addField('Classificação:', informacoesGerais.classificacao);
    addField('Serviços Afetados:', informacoesGerais.servicosAfetados);
    addField('Sistemas Afetados:', informacoesGerais.sistemasAfetados);
    addField('Haverá indisponibilidade:', informacoesGerais.indisponibilidade);
    if (informacoesGerais.indisponibilidade !== 'Não') {
        addField('Início da Indisponibilidade:', informacoesGerais.indisponibilidadeInicio);
        addField('Fim da Indisponibilidade:', informacoesGerais.indisponibilidadeFim);
        addField('Período Máximo de Interrupção:', informacoesGerais.periodoMaximoInterrupcao);
    }
    addField('Restrições para a Mudança:', informacoesGerais.restricoesMudanca);
    addField('Referente ao SAP:', informacoesGerais.referenteSAP);
    if (informacoesGerais.referenteSAP === 'Sim') {
        addField('Frentes SAP:', informacoesGerais.frentesSAP);
    }

    // 2. Plano de Implantação
    const planoImplantacaoCols = [
        { key: 'nome', label: 'Nome da Atividade' },
        { key: 'etapa', label: 'Etapa' },
        { key: 'status', label: 'Status' },
        { key: 'dataPlanejada', label: 'Data Planejada' },
        { key: 'horaPlanejada', label: 'Hora Planejada' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'itemConfiguracao', label: 'Item de Configuração' },
        { key: 'tempoExecucao', label: 'Tempo de Execução' },
    ];
    addTable(steps[1], planoImplantacaoCols, formData.planoImplantacao);

    // 3. Mapa de Transporte (if SAP)
    if (informacoesGerais.referenteSAP === 'Sim') {
        const mapaTransporteCols = [
            { key: 'request', label: 'ID da Request' },
            { key: 'sequenciamento', label: 'Sequenciamento' },
            { key: 'tipoRequest', label: 'Tipo da Request' },
            { key: 'objetivoRequest', label: 'Objetivo' },
            { key: 'descricaoTecnica', label: 'Descrição Técnica' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'numeroCALM', label: 'Número CALM/Jira' },
            { key: 'goSipal', label: 'GO - SIPAL' },
            { key: 'status', label: 'Status' },
            { key: 'dataCriacao', label: 'Data de Criação' },
            { key: 'responsavelCriacao', label: 'Responsável Criação' },
            { key: 'responsavelImportacao', label: 'Responsável Importação' },
            { key: 'solicitante', label: 'Solicitante' },
            { key: 'evidenciaTeste', label: 'Evidência de Teste' },
            { key: 'planoRollback', label: 'Plano de Rollback' },
            { key: 'observacoes', label: 'Observações' },
        ];
        addTable(steps[2], mapaTransporteCols, formData.mapaTransporte);
    }

    // 4. Caderno de Testes
    const cadernoTestesCols = [
        { key: 'nome', label: 'Nome do Teste' },
        { key: 'plano', label: 'Plano' },
        { key: 'tipoTeste', label: 'Tipo de Teste' },
        { key: 'dataPlanejada', label: 'Data Planejada' },
        { key: 'horaPlanejada', label: 'Hora Planejada' },
        { key: 'atividade', label: 'Atividade de Teste' },
        { key: 'linkTeste', label: 'Link do Teste' },
        { key: 'predecessora', label: 'Predecessora' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'itemConfiguracao', label: 'Item de Configuração' },
        { key: 'tempoExecucao', label: 'Tempo de Execução' },
    ];
    addTable(steps[3], cadernoTestesCols, formData.cadernoTestes);

    // 5. Plano de Retorno
    const planoRetornoCols = [
        { key: 'dataPlanejada', label: 'Data Planejada' },
        { key: 'horaPlanejada', label: 'Hora Planejada' },
        { key: 'status', label: 'Status' },
        { key: 'dataRealizada', label: 'Data Realizada' },
        { key: 'horaRealizada', label: 'Hora Realizada' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'predecessora', label: 'Predecessora' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'observacao', label: 'Observação' },
    ];
    addTable(steps[4], planoRetornoCols, formData.planoRetorno);
    
    // 6. Plano de Comunicação
    addSectionHeader(steps[5]);
    const { comunicacaoChecklist } = formData;
    addField('Partes envolvidas validaram o plano?', comunicacaoChecklist.partesEnvolvidasValidaram || 'Não respondido');
    addField('Processo de acompanhamento comunicado?', comunicacaoChecklist.processoAcompanhamentoComunicado || 'Não respondido');
    addField('Comunicação de retorno contemplada?', comunicacaoChecklist.comunicacaoEventoRetorno || 'Não respondido');
    addField('Passo a passo para aplicação existe?', comunicacaoChecklist.passoAPassoAplicacao || 'Não respondido');
    addField('Tabela de contatos preenchida?', comunicacaoChecklist.tabelaContatosPreenchida || 'Não respondido');
    addField('Pontos focais informados?', comunicacaoChecklist.pontosFocaisInformados || 'Não respondido');
    
    const planoComunicacaoCols = [
        { key: 'data', label: 'Data' },
        { key: 'hora', label: 'Hora' },
        { key: 'status', label: 'Status' },
        { key: 'meio', label: 'Meio' },
        { key: 'atividade', label: 'Atividade/Público' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'contatoEscalonamento', label: 'Contato de Escalonamento' },
        { key: 'observacao', label: 'Observação' },
    ];
    addTable("Detalhamento da Comunicação", planoComunicacaoCols, formData.planoComunicacao);

    // 7. Risco de Mudança
    addSectionHeader(steps[6]);
    const { riscosGerais } = formData;
    addField('Plano de implantação claro sobre riscos/gatilhos?', riscosGerais.planoRetornoClaro || 'Não respondido');
    addField('Stakeholders consultados sobre riscos?', riscosGerais.stakeholdersConsultados || 'Não respondido');

    const planoRiscosCols = [
        { key: 'tipoRisco', label: 'Tipo Risco' },
        { key: 'risco', label: 'Risco' },
        { key: 'estrategia', label: 'Estratégia' },
        { key: 'acao', label: 'Ação' },
        { key: 'impacto', label: 'Impacto' },
        { key: 'mitigacao', label: 'Mitigação' },
    ];
    addTable("Detalhamento dos Riscos", planoRiscosCols, formData.planoRiscos);

    // 8. Segurança e Acessos
    const segurancaAcessosCols = [
        { key: 'nivelAcesso', label: 'Nível de acesso' },
        { key: 'plataforma', label: 'Plataforma' },
        { key: 'ambiente', label: 'Ambiente' },
        { key: 'gruposAcesso', label: 'Grupos de acesso' },
        { key: 'itemConfiguracao', label: 'Item de Configuração' },
        { key: 'areaNegocio', label: 'Área de Negócio' },
        { key: 'usuarios', label: 'Usuários' },
        { key: 'loginAcesso', label: 'Login de acesso' },
        { key: 'justificativa', label: 'Justificativa' },
    ];
    addTable(steps[7], segurancaAcessosCols, formData.segurancaAcessos.perfis);
    
    // 9. Contatos
    const contatosCols = [
        { key: 'nome', label: 'Nome' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'email', label: 'E-mail' },
        { key: 'telefones', label: 'Telefones' },
        { key: 'comunicacao', label: 'Comunicação' },
        { key: 'localAtuacao', label: 'Local de Atuação' },
        { key: 'liderImediato', label: 'Líder Imediato' },
        { key: 'emailLiderImediato', label: 'E-mail Líder' },
        { key: 'unidadeFilial', label: 'Unidade/Filial' },
        { key: 'area', label: 'Área' },
        { key: 'gestorArea', label: 'Gestor da Área' },
        { key: 'comunicacaoEnvolvida', label: 'Comunicação Envolvida' },
    ];
    addTable(steps[8], contatosCols, formData.contatos);
    
    // 10. Checklist
    addSectionHeader(steps[9]);
    formData.checklist.forEach(item => {
        addPageIfNeeded();
        y += 5;
        addFullWidthText(`${item.scope}: ${item.question}`, true);
        addField("Resposta:", item.answer || 'Não respondido');
        if (item.answer !== 'Sim') {
            addField("Justificativa:", item.justification);
        }
        y += 3;
    });

    // 11. Checklist SAP
    if (informacoesGerais.referenteSAP === 'Sim') {
        addSectionHeader(steps[10]);
        formData.checklistSAP.forEach(item => {
            addPageIfNeeded();
            y += 5;
            addFullWidthText(`(${item.id}) ${item.scope}: ${item.question}`, true);
            addField("Resposta:", item.answer || 'Não respondido');
            if (item.answer !== 'Sim') {
                addField("Justificativa:", item.justification);
            }
            addField("Link Evidências:", item.docLink);
            addField("Observação:", item.observacao);
            y += 3;
        });
    }

    // 12. Anexos
    addSectionHeader(steps[11].split(' ')[0]); // "Anexos"
    if (!formData.anexos || formData.anexos.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("Nenhum anexo.", margin, y);
        y += 10;
    } else {
        formData.anexos.forEach(anexo => {
            addField(anexo.name, `${(anexo.size / 1024).toFixed(2)} KB`);
        });
    }

    const lider = informacoesGerais.liderMudanca.replace(/\s/g, '_') || 'Lider';
    const data = informacoesGerais.dataMudanca || new Date().toISOString().split('T')[0];
    doc.save(`${requestId || 'RDM'}_${lider}_${data}.pdf`);
};

// SVG Logo Component
const SipalLogo = ({ width = 120 }) => (
    <svg width={width} viewBox="0 0 258.42 55.42" xmlns="http://www.w3.org/2000/svg">
        <style>
            {`.sipal-text{font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 50px; fill: ${sipalBlue};}
            .sipal-icon{fill: ${sipalTeal};}`}
        </style>
        <text className="sipal-text" x="0" y="45">SIPAL</text>
        <path className="sipal-icon" d="M258.42,24.28c0-11.45-8.23-21.24-19.1-23.45a27.18,27.18,0,0,0-10.15-.83c-15.1,0-27.34,12.24-27.34,27.34,0,12.78,8.79,23.51,20.59,26.54,4.25,1.09,8.71.9,12.83-.55,10.11-3.56,17-12.8,17.16-23.4.11-7.79-3.32-14.86-9-19.45-3.37-2.73-7.3-4.32-11.45-4.57-7.24-.43-14,3.48-17.72,9.52-.94,1.54-3.1,1.9-4.64.94s-1.9-3.1-.94-4.64c4.7-7.66,12.85-12.24,21.6-11.75,5.19.29,10,2.23,14.15,5.55,6.58,5.32,10.66,13.4,10.54,22.29-.19,12.91-8.8,24.26-21.2,28.48-5.11,1.74-10.57,2-15.86,.72C210.82,49.52,200,38.2,200,27.34c0-12.91,8.8-24.26,21.2-28.48,5.11-1.74,10.57,2,15.86,.72,7.39,1.78,13.63,6.88,17.2,13.59.9,1.7,3.22,2.24,4.92,1.34s2.24-3.22,1.34-4.92C254.1,1.52,246.33-2.16,238.16.89c-5.8,2.15-10.6,6.33-13.8,11.5-2.25,3.63-3.48,7.84-3.53,12.19-.08,8.12,3.8,15.5,10.1,20,4.25,3.02,9.3,4.42,14.41,3.87,8.23-.9,15.1-6.55,17.61-14.17A24.51,24.51,0,0,0,258.42,24.28Z"/>
    </svg>
);

// App Header
const AppHeader = ({ user, onLogout }) => (
    <header className="app-header">
        <div className="logo-container">
            <SipalLogo />
            <h1>Change Advisory Board</h1>
        </div>
        {user && (
            <div className="user-info">
                <span>Bem-vindo(a), <strong>{user.name}</strong></span>
                <button onClick={onLogout} className="logout-btn">Sair</button>
            </div>
        )}
    </header>
);

// Tabs Navigation
const Tabs = ({ activeTab, setActiveTab }) => (
    <nav className="tabs">
        <button
            className={`tab-button ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
        >
            Início
        </button>
        <button
            className={`tab-button ${activeTab === 'newRequest' ? 'active' : ''}`}
            onClick={() => setActiveTab('newRequest')}
            aria-current={activeTab === 'newRequest' ? 'page' : undefined}
        >
            Nova Requisição de Mudança
        </button>
        <button
            className={`tab-button ${activeTab === 'myRequests' ? 'active' : ''}`}
            onClick={() => setActiveTab('myRequests')}
            aria-current={activeTab === 'myRequests' ? 'page' : undefined}
        >
            Controle das Minhas Solicitações
        </button>
        <button
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
            aria-current={activeTab === 'analysis' ? 'page' : undefined}
        >
            Controle Governança
        </button>
    </nav>
);

// Authentication Page
const AuthPage = ({ onLogin, onRegister, users }) => {
    const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'recover'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleAuth = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!validateEmail(email)) {
            setError('Por favor, insira um e-mail válido.');
            return;
        }

        if (authMode === 'recover') {
            // Simulate recovery
            setTimeout(() => {
                setSuccessMessage(`Um link para redefinir a senha foi enviado para ${email}.`);
            }, 500);
            return;
        }

        if (authMode === 'login') {
            const success = onLogin(email, password);
            if (!success) {
                setError('E-mail ou senha inválidos.');
            }
        } else if (authMode === 'register') { // Register mode
            if (!name.trim()) {
                setError('O campo Nome é obrigatório.');
                return;
            }
            if (password.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
            const success = onRegister(name, email, password);
            if (!success) {
                setError('Este e-mail já está cadastrado.');
            }
        }
    };

    const getTitle = () => {
        switch (authMode) {
            case 'login': return 'Acessar o Painel';
            case 'register': return 'Criar Nova Conta';
            case 'recover': return 'Recuperar Senha';
            default: return '';
        }
    };

    const getSubmitButtonText = () => {
        switch (authMode) {
            case 'login': return 'Entrar';
            case 'register': return 'Registrar';
            case 'recover': return 'Enviar Link';
            default: return '';
        }
    };

    const switchTo = (mode) => {
        setAuthMode(mode);
        setError('');
        setSuccessMessage('');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <SipalLogo width={150} />
                </div>
                <h2>{getTitle()}</h2>
                {error && <p className="auth-error">{error}</p>}
                {successMessage && <p className="auth-success" style={{backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', padding: '0.75rem', borderRadius: '5px', textAlign: 'center', marginBottom: '1rem'}}>{successMessage}</p>}
                
                <form className="auth-form" onSubmit={handleAuth}>
                    {authMode === 'register' && (
                        <div className="form-field">
                            <label htmlFor="name">Nome Completo</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                    )}
                    
                    <div className="form-field">
                        <label htmlFor="email">E-mail</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    {authMode !== 'recover' && (
                        <div className="form-field">
                            <label htmlFor="password">Senha</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            {authMode === 'login' && (
                                <button 
                                    type="button" 
                                    className="forgot-password-link"
                                    onClick={() => switchTo('recover')}
                                >
                                    Esqueci minha senha
                                </button>
                            )}
                        </div>
                    )}

                    {authMode === 'register' && (
                         <div className="form-field">
                            <label htmlFor="confirmPassword">Confirmar Senha</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                    )}
                    
                    <button type="submit" className="submit-btn auth-btn">{getSubmitButtonText()}</button>
                </form>
                
                <div className="auth-toggle">
                    {authMode === 'login' && (
                        <button onClick={() => switchTo('register')}>
                            Não tem uma conta? Registre-se
                        </button>
                    )}
                    {(authMode === 'register' || authMode === 'recover') && (
                        <button onClick={() => switchTo('login')}>
                            {authMode === 'recover' ? 'Voltar para o Login' : 'Já tem uma conta? Faça login'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


const RequestList = ({ requests, kanbanStatuses = {} }) => (
    <div className="request-list">
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Título da Mudança</th>
                    <th>Líder</th>
                    <th>Classificação</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {requests.map(req => {
                    const statusClass = req.status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const statusText = kanbanStatuses[req.status] || req.status;
                    return (
                        <tr key={req.id}>
                            <td>{req.id}</td>
                            <td>{req.title}</td>
                            <td>{req.leader}</td>
                            <td>{req.classification}</td>
                            <td><span className={`status-badge status-${statusClass}`}>{statusText}</span></td>
                        </tr>
                    );
                })}
                 {requests.length === 0 && (
                    <tr>
                        <td colSpan={5} style={{textAlign: 'center'}}>Nenhuma requisição encontrada.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);


// Home Page Content
const HomePage = ({ requests, setActiveTab, kanbanStatuses }) => (
    <>
    <div className="card">
        <h2>🚀 CAB – Change Advisory Board</h2>
        <p className="subtitle">Governança das mudanças para uma operação estável e estratégica.</p>
        <p>O CAB (Change Advisory Board), ou Comitê de Avaliação de Mudanças, é uma estrutura de governança que visa avaliar, aprovar e acompanhar mudanças no ambiente de tecnologia, garantindo que alterações sejam realizadas com segurança, alinhamento e previsibilidade.</p>
        <p>Para iniciar um novo processo, clique no botão abaixo. Para acompanhar o andamento das suas solicitações, veja a lista de requisições recentes.</p>
        <div className="home-actions">
            <button className="submit-btn" onClick={() => setActiveTab('newRequest')}>+ Nova Requisição de Mudança</button>
        </div>
    </div>
    <div className="card">
        <div className="request-list-header">
            <h2>Requisições de Mudança Recentes</h2>
            <button className="submit-btn" onClick={() => setActiveTab('analysis')}>Ver Todas as Requisições</button>
        </div>
        <RequestList requests={requests.slice(0, 5)} kanbanStatuses={kanbanStatuses} />
    </div>
    </>
);

const Spinner = () => (
    <div className="spinner-container" aria-label="Carregando análise">
        <div className="spinner"></div>
    </div>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
        <polyline points="16 6 12 2 8 6"></polyline>
        <line x1="12" y1="2" x2="12" y2="15"></line>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

const MyRequestsPage = ({ requests, currentUser, kanbanStatuses, drafts, onContinueDraft, onDeleteDraft, onCreateFromCopy, onAdminNewRequest }) => {
    const myRequests = Array.isArray(requests)
        ? requests.filter(req => req.solicitanteEmail === currentUser.email)
        : [];
        
    const [isAdmModalOpen, setIsAdmModalOpen] = useState(false);
    const [admPassword, setAdmPassword] = useState('');
    const [admError, setAdmError] = useState('');

    const handleAdminAccess = () => {
        if (admPassword === 'PMO@2025') {
            setAdmPassword('');
            setAdmError('');
            setIsAdmModalOpen(false);
            onAdminNewRequest();
        } else {
            setAdmError('Senha incorreta. Tente novamente.');
        }
    };

    const handleDownloadFullRequestPdf = (request) => {
        generateAndSavePdf(request.formData, request.id);
    };

    return (
        <div className="my-requests-page">
            <div className="card">
                <div className="request-list-header">
                    <h2>Controle das Minhas Solicitações</h2>
                </div>
                <p>Visualize e gerencie todas as requisições de mudança que você submeteu, continue rascunhos salvos ou baixe um relatório em PDF para cada solicitação enviada.</p>
            </div>
            
            <div className="card">
                <div className="request-list-header">
                    <h3>Rascunhos</h3>
                    <button onClick={() => setIsAdmModalOpen(true)} className="admin-access-btn">ADM</button>
                </div>
                <div className="request-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Título do Rascunho</th>
                                <th>Salvo em</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drafts && drafts.length > 0 ? drafts.map(draft => (
                                <tr key={draft.id}>
                                    <td>{draft.title}</td>
                                    <td>{new Date(draft.savedAt).toLocaleString('pt-BR')}</td>
                                    <td className="actions-cell">
                                        <button onClick={() => onContinueDraft(draft.id)} className="btn-continue-draft" title="Continuar Preenchimento">
                                            <EditIcon />
                                            Continuar
                                        </button>
                                        <button onClick={() => onDeleteDraft(draft.id)} className="action-button remove-row-btn" title="Excluir Rascunho" style={{ marginLeft: '10px' }}>
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} style={{textAlign: 'center'}}>Nenhum rascunho salvo.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                 <h3>Solicitações Enviadas</h3>
                <div className="request-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Nº Acompanhamento</th>
                                <th>Título da Solicitação</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myRequests.length > 0 ? myRequests.map(req => {
                                const statusClass = req.status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                const statusText = kanbanStatuses[req.status] || req.status;
                                return (
                                    <tr key={req.id}>
                                        <td>{req.id}</td>
                                        <td>{req.title}</td>
                                        <td><span className={`status-badge status-${statusClass}`}>{statusText}</span></td>
                                        <td className="actions-cell">
                                            <button 
                                                onClick={() => handleDownloadFullRequestPdf(req)} 
                                                className="action-button download-btn" 
                                                title="Baixar PDF da Requisição Completa"
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                <DownloadIcon />
                                            </button>
                                            <button
                                                onClick={() => onCreateFromCopy(req)}
                                                className="btn-copy-request"
                                                title="Criar nova requisição baseada nesta"
                                            >
                                                <CopyIcon />
                                                Criar com Cópia
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'center'}}>Nenhuma requisição encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal
                isOpen={isAdmModalOpen}
                onClose={() => setIsAdmModalOpen(false)}
                title="Acesso Administrativo"
                footer={
                    <>
                        <button onClick={() => setIsAdmModalOpen(false)} className="nav-button secondary">Cancelar</button>
                        <button onClick={handleAdminAccess} className="submit-btn">Acessar</button>
                    </>
                }
            >
                <p>Digite a senha para criar uma nova requisição limpa, descartando qualquer rascunho existente.</p>
                <div className="form-field" style={{marginTop: '1.5rem'}}>
                    <label htmlFor="adm-password-myreq">Senha</label>
                    <input
                        type="password"
                        id="adm-password-myreq"
                        value={admPassword}
                        onChange={(e) => { setAdmPassword(e.target.value); setAdmError(''); }}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                        autoFocus
                    />
                    {admError && <p className="auth-error" style={{marginTop: '1rem', padding: '0.5rem'}}>{admError}</p>}
                </div>
            </Modal>
        </div>
    );
};

const AnalysisPage = ({ requests, onAdminNewRequest }) => {
    const [isAdmModalOpen, setIsAdmModalOpen] = useState(false);
    const [admPassword, setAdmPassword] = useState('');
    const [admError, setAdmError] = useState('');

    const handleAdminAccess = () => {
        if (admPassword === 'PMO@2025') {
            setAdmPassword('');
            setAdmError('');
            setIsAdmModalOpen(false);
            onAdminNewRequest();
        } else {
            setAdmError('Senha incorreta. Tente novamente.');
        }
    };
    
    const handleDownloadFullRequestPdf = (request) => {
        generateAndSavePdf(request.formData, request.id);
    };

    const escapeCsvCell = (cellData) => {
        if (cellData === null || cellData === undefined) {
            return '';
        }
        const stringData = String(cellData);
        // If the data contains a comma, double quote, or newline, wrap it in double quotes.
        if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
            // Escape inner double quotes by doubling them
            const escapedData = stringData.replace(/"/g, '""');
            return `"${escapedData}"`;
        }
        return stringData;
    };

    const handleExportToExcel = () => {
        if (!Array.isArray(requests) || requests.length === 0) {
            alert('Nenhuma requisição para exportar.');
            return;
        }

        const headers = [
            'Nº Acompanhamento',
            'Título da Solicitação',
            'Solicitante (E-mail)'
        ];

        const csvRows = requests.map(req => {
            const row = [
                req.id,
                req.title,
                (req as any).solicitanteEmail || req.formData?.informacoesGerais?.solicitante || 'N/A'
            ];
            return row.map(escapeCsvCell).join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'CAB_Solicitacoes.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="analysis-page">
            <div className="card">
                <div className="request-list-header">
                    <h2>Controle Governança</h2>
                    <div className="header-actions">
                        <button onClick={() => setIsAdmModalOpen(true)} className="admin-access-btn">ADM</button>
                        <button 
                            onClick={handleExportToExcel} 
                            className="submit-btn" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <DownloadIcon />
                            Exportar para Excel
                        </button>
                    </div>
                </div>
                <p>Visualize e gerencie todas as requisições de mudança submetidas. Você pode baixar um relatório em PDF para cada solicitação.</p>
            </div>
            
            <div className="card">
                <div className="request-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Nº Acompanhamento</th>
                                <th>Título da Solicitação</th>
                                <th>Solicitante</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(requests) && requests.length > 0 ? requests.map(req => (
                                req && (
                                    <tr key={req.id}>
                                        <td>{req.id}</td>
                                        <td>{req.title}</td>
                                        <td>{req.formData?.informacoesGerais?.solicitante || 'N/A'}</td>
                                        <td style={{textAlign: 'center'}}>
                                            <button 
                                                onClick={() => handleDownloadFullRequestPdf(req)} 
                                                className="action-button download-btn" 
                                                title="Baixar PDF da Requisição Completa"
                                            >
                                                <DownloadIcon />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )) : (
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'center'}}>Nenhuma requisição encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal
                isOpen={isAdmModalOpen}
                onClose={() => setIsAdmModalOpen(false)}
                title="Acesso Administrativo"
                footer={
                    <>
                        <button onClick={() => setIsAdmModalOpen(false)} className="nav-button secondary">Cancelar</button>
                        <button onClick={handleAdminAccess} className="submit-btn">Acessar</button>
                    </>
                }
            >
                <p>Digite a senha para criar uma nova requisição limpa, descartando qualquer rascunho existente.</p>
                <div className="form-field" style={{marginTop: '1.5rem'}}>
                    <label htmlFor="adm-password">Senha</label>
                    <input
                        type="password"
                        id="adm-password"
                        value={admPassword}
                        onChange={(e) => { setAdmPassword(e.target.value); setAdmError(''); }}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                        autoFocus
                    />
                    {admError && <p className="auth-error" style={{marginTop: '1rem', padding: '0.5rem'}}>{admError}</p>}
                </div>
            </Modal>
        </div>
    );
};


const WIZARD_STORAGE_KEY = 'cab-form-in-progress';

const checklistItems = [
    { scope: 'Análise de Impacto', question: 'Foi realizada uma análise de impacto detalhada, incluindo impacto em outros sistemas e serviços?' },
    { scope: 'Testes e Validação', question: 'A mudança foi testada em ambiente de homologação com dados representativos da produção?' },
    { scope: 'Testes e Validação', question: 'Existe um plano para validar os critérios de sucesso após a implantação?' },
    { scope: 'Acessos e Segurança', question: 'Os acessos aos ambiente de Homologação e Produção foram liberados para a equipe de implementação da mudança?' },
    { scope: 'Monitoramento', question: 'O plano de monitoramento foi testado em ambiente de homologação?' },
    { scope: 'Documentação', question: 'O desenho macro da arquitetura (linguagem utilizada, banco de dados, integrações, etc.) foi divulgado para a equipe do CAB?' },
    { scope: 'Documentação', question: 'O plano contempla como o time identifica os itens publicados em produção?' }
];

const checklistSAPItems = [
    { id: 'SAP01', scope: 'Governança', question: 'O request foi devidamente classificado (Workbench, Customizing, Transport of Copies, Nota SAP/Support Package) e está documentado no Plano de Mudança?' },
    { id: 'SAP02', scope: 'Governança', question: 'O request foi testado em ambiente de homologação com dados representativos da produção antes do transporte?' },
    { id: 'SAP03', scope: 'Governança', question: 'O plano de rollback contempla reimportação de requests anteriores ou restauração de backup validado em ambiente de QA?' },
    { id: 'SAP04', scope: 'Governança', question: 'O tempo estimado de rollback foi validado em ambiente controlado e documentado no Plano de Mudança?' },
    { id: 'SAP05', scope: 'Arquitetura', question: 'Os objetos transportados foram comparados com o catálogo de objetos do ambiente produtivo para evitar sobrescrita indevida?' },
    { id: 'SAP06', scope: 'Arquitetura', question: 'Existe validação formal de que o request não contém objetos não relacionados à mudança (ex.: código não autorizado)?' },
    { id: 'SAP07', scope: 'Segurança', question: 'A segregação de funções foi respeitada (desenvolvedor ≠ aprovador ≠ importador de requests)?' },
    { id: 'SAP08', scope: 'Segurança', question: 'Existe controle de dual control para importação em Produção (ex.: aprovação via STMS_QA antes de liberação final)?' },
    { id: 'SAP09', scope: 'Segurança', question: 'Foi realizada validação de segurança SAP nos requests (checagem de objetos relacionados a perfis/autorização)?' },
    { id: 'SAP10', scope: 'Performance', question: 'Os requests foram revisados quanto a impactos de performance (queries, jobs ou dumps ABAP potenciais)?' },
    { id: 'SAP11', scope: 'Governança', question: 'Houve validação de que não existem transportes pendentes em Produção que possam gerar conflitos com o novo request?' },
    { id: 'SAP12', scope: 'Governança', question: 'Existe transportes em aberto relacionadas ao mesmo objetivo de transporte para as requests a serem transportadas?' }
];

const servicosData = {
  'Requisições': [
    "Configurações de visualização", "Acesso Sites", "Acesso VPN", "Alteração de workflow",
    "Banco de dados", "E-mail", "Empréstimo de Equipamentos", "Impressora", "Instalação de Software",
    "Manutenção preventiva", "Mudança de Layout", "Novo acesso de usuário", "Novos Equipamentos",
    "Pasta de rede", "Reset de senha", "SAE - Solicitação de acesso e equipamentos (Novos colaboradores)",
    "Software"
  ],
  'Serviços': ["SAP"],
  'Incidentes / Falhas': [
    "Celulares", "Desktop", "Falha de acesso a sistema", "Impressora", "Internet", "Notebooks",
    "Periféricos", "Rede", "Segurança da Informação", "Servidores", "Sistemas", "Telecomunicação", "SAP"
  ],
  'Melhorias': ["Nova funcionalidade / Melhoria"]
};

const sistemasAfetadosData = {
    'Sistemas': [
      "ABACUS", "ADP", "Agrotis", "API Pass", "Apollo (desabilitado)", "Active Directory",
      "Agroboard", "Ariba", "Atua", "Central de Cadastros 4MDG", "BI", "Banco de dados",
      "CPJ", "Campos Dealer", "Campus Dealer", "CLICQ", "Chat Seguro", "CloudFlare",
      "Cotações ARIBA", "Crachá", "DFE", "DVR (Intelbras)", "Dynamo Peças / DPMax",
      "Dynamo Vendas / Dealer Prime", "E-mail", "Finnet", "Finet (desabilitado)",
      "Fleetboard", "GO Sistemas", "Google WorkSpace", "Guepardo", "Infra", "Jira",
      "Junsoft", "Legado COBOL", "Linx", "LocaWeb", "Maxicon", "Merx", "Next IP",
      "Outros", "PayTrack", "Portal AGCO", "Portal MBB", "QIVE", "Protheus", "ProDoc",
      "Pulsus", "RM", "RM Labore", "SAP", "SEFAZ", "Sênior", "SGI", "Salesforce",
      "Secullum", "Servidores", "Shapeness", "Sharepoint", "Simer", "Sistema Coletor",
      "Sistema Oficina/Posto", "Solution", "Strada", "T-Cloud", "TOTVs Monitor",
      "Teams", "Trizy", "UNIFI", "Umbler", "V2500", "Vendabem", "Via Nuvem", "WK",
      "Xentry", "Zeev"
    ]
  };

const frentesSAPData = {
  'Frentes SAP': [
    "Integrações - CPI", "Manufatura-Tiroleza", "Logística - TM", "Originação - CM", "Originação - ACM",
    "Comercial - SD", "Controladoria - CO", "Suprimentos - MM", "Financeiro - TRM", "Ariba - MM",
    "Guepardo", "Financeiro -FI-AP/AR", "Maxicon", "Financeiro-FI-AA/GL", "Trizzy", "Agrotis",
    "Manufatura - QM", "Manufatura - PP", "Manufatura - PM"
  ]
};

interface Anexo {
    name: string;
    size: number;
    type: string;
}

const initialFormData = {
    informacoesGerais: {
        liderMudanca: '', solicitante: '', liderProduto: '', dataMudanca: '', motivoMudanca: '',
        impactoNaoRealizar: '', classificacao: 'Padrão', 
        servicosAfetados: [] as string[],
        sistemasAfetados: [] as string[], indisponibilidade: 'Não', indisponibilidadeInicio: '', indisponibilidadeFim: '',
        restricoesMudanca: '',
        periodoMaximoInterrupcao: '', referenteSAP: 'Não',
        frentesSAP: [] as string[],
    },
    checklist: checklistItems.map(item => ({ ...item, answer: '', docLink: '', justification: '' })),
    checklistSAP: checklistSAPItems.map(item => ({ ...item, answer: '', docLink: '', justification: '', observacao: '' })),
    planoImplantacao: [] as any[],
    mapaTransporte: [] as any[],
    planoRetorno: [] as any[],
    planoComunicacao: [] as any[],
    comunicacaoChecklist: {
        partesEnvolvidasValidaram: '',
        processoAcompanhamentoComunicado: '',
        comunicacaoEventoRetorno: '',
        passoAPassoAplicacao: '',
        tabelaContatosPreenchida: '',
        pontosFocaisInformados: '',
    },
    planoRiscos: [] as any[],
    riscosGerais: {
        planoRetornoClaro: '',
        stakeholdersConsultados: '',
    },
    cadernoTestes: [] as any[],
    segurancaAcessos: {
        perfis: [] as any[],
    },
    contatos: [] as any[],
    anexos: [] as Anexo[],
};

// Tooltip Component
const Tooltip = ({ text, children }: { text: string; children?: React.ReactNode }) => (
    <div className="tooltip-container">
        {children || <HelpIcon />}
        <span className="tooltip-text">{text}</span>
    </div>
);

const HelpIcon = () => (
    <span className="help-icon">?</span>
);

const ExpandIcon = ({ isExpanded }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease-in-out' }}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);

const BlockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
);


const newId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// MultiSelect Component
const MultiSelect = ({ optionsData, selected, onChange, placeholder, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        const currentSelected = Array.isArray(selected) ? selected : [];
        const newSelected = currentSelected.includes(option)
            ? currentSelected.filter(item => item !== option)
            : [...currentSelected, option];
        onChange(newSelected);
    };
    
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const filteredOptions = Object.entries(optionsData).reduce((acc, [category, options]) => {
        const filtered = Array.isArray(options) ? options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase())) : [];
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {});
    
    const isCategoryExpanded = (category) => {
        if (searchTerm) return true;
        return !!expandedCategories[category];
    };

    return (
        <div className="multi-select-container" ref={ref}>
            <div className={`multi-select-input-area ${isOpen ? 'open' : ''} ${className}`} onClick={() => setIsOpen(!isOpen)}>
                <div className="multi-select-tags">
                    {Array.isArray(selected) && selected.length > 0 ? (
                        selected.map(item => (
                            <span key={item} className="multi-select-tag">
                                {item}
                                <button onClick={(e) => { e.stopPropagation(); handleSelect(item); }}>&times;</button>
                            </span>
                        ))
                    ) : (
                        <span className="multi-select-placeholder">{placeholder}</span>
                    )}
                </div>
                <div className="multi-select-arrow">▼</div>
            </div>
            {isOpen && (
                <div className="multi-select-dropdown">
                    <div className="multi-select-search">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="multi-select-options-container">
                        {Object.entries(filteredOptions).map(([category, options]) => (
                            <div key={category} className="multi-select-category-group">
                                <button type="button" className="multi-select-category-header" onClick={() => toggleCategory(category)}>
                                    <span>{category}</span>
                                    <ExpandIcon isExpanded={isCategoryExpanded(category)} />
                                </button>
                                {isCategoryExpanded(category) && (
                                     <div className="multi-select-options-list">
                                        {Array.isArray(options) && options.map(option => (
                                            <div key={option} className="multi-select-option-item" onClick={() => handleSelect(option)}>
                                                <input type="checkbox" checked={(Array.isArray(selected) ? selected : []).includes(option)} readOnly />
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {Object.keys(filteredOptions).length === 0 && <div className="multi-select-no-results">Nenhum resultado encontrado.</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const WizardProgressBar = ({ currentStep, formData, completedSteps, isCurrentStepValid, onStepClick }) => {
    const visibleStepIndexes = useMemo(() => {
        if (formData.informacoesGerais.referenteSAP === 'Sim') {
            return [0, 2, 10, 11, 12];
        } else {
            return steps.map((_, i) => i).filter(i => i !== 2 && i !== 10);
        }
    }, [formData.informacoesGerais.referenteSAP]);

    return (
        <div className="wizard-progress-bar">
            {visibleStepIndexes.map((stepIndex, index) => {
                 // Skip the final step (Success page) in the progress bar visualization
                 if (stepIndex === steps.length - 1) return null;

                 const isActive = stepIndex === currentStep;
                 const isCompleted = !!completedSteps[stepIndex];

                 return (
                    <div 
                        key={stepIndex} 
                        className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        onClick={() => onStepClick(stepIndex)}
                    >
                        <div className="step-indicator">
                            {isCompleted ? <CheckIcon /> : (index + 1)}
                        </div>
                        <span className="step-label">{steps[stepIndex]}</span>
                    </div>
                 );
            })}
        </div>
    );
};

// Main Wizard Component
const NewRequestPage = ({ addRequest, currentUser, onSaveDraft, onAutoSaveDraft }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});
    const [validationErrors, setValidationErrors] = useState([]);
    const [completedSteps, setCompletedSteps] = useState({});
    
    const [submittedRequestId, setSubmittedRequestId] = useState(null);
    const [submittedRequestTitle, setSubmittedRequestTitle] = useState('');
    const [mailtoLink, setMailtoLink] = useState('');

    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const autoSaveTimerRef = useRef(null);
    const statusClearTimerRef = useRef(null);
    
    const [formData, setFormData] = useState<typeof initialFormData>(() => {
        const getInitialState = () => {
            const newForm = JSON.parse(JSON.stringify(initialFormData));
            if (currentUser?.name) {
                newForm.informacoesGerais.solicitante = currentUser.name;
            }
            return newForm;
        };

        try {
            const savedData = localStorage.getItem(WIZARD_STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const dataToLoad = parsed.formData || parsed;

                const merged = { ...initialFormData, ...dataToLoad };
                merged.informacoesGerais = { ...initialFormData.informacoesGerais, ...(dataToLoad.informacoesGerais || {}) };
                merged.riscosGerais = { ...initialFormData.riscosGerais, ...(dataToLoad.riscosGerais || {}) };
                merged.comunicacaoChecklist = { ...initialFormData.comunicacaoChecklist, ...(dataToLoad.comunicacaoChecklist || {}) };
                merged.segurancaAcessos = { ...initialFormData.segurancaAcessos, ...(dataToLoad.segurancaAcessos || {}) };
                
                merged.checklist = dataToLoad.checklist || initialFormData.checklist;
                merged.checklistSAP = dataToLoad.checklistSAP || initialFormData.checklistSAP;
                
                merged.informacoesGerais.solicitante = currentUser.name;
                return merged;
            }
        } catch (error) {
            console.error("Failed to load draft from localStorage, resetting form.", error);
            localStorage.removeItem(WIZARD_STORAGE_KEY);
        }

        return getInitialState();
    });
    
    // Effect to set the initial draft ID after component mounts
    useEffect(() => {
        try {
            const savedData = localStorage.getItem(WIZARD_STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.draftId) {
                    setCurrentDraftId(parsed.draftId);
                }
            }
        } catch (e) { console.error("Could not parse draftId on mount", e); }
    }, []);

    // Effect for auto-saving
    useEffect(() => {
        // Cleanup previous timers
        clearInterval(autoSaveTimerRef.current);
        clearTimeout(statusClearTimerRef.current);

        // Set new interval
        autoSaveTimerRef.current = setInterval(() => {
            if (formData.informacoesGerais.motivoMudanca.trim()) {
                setAutoSaveStatus('Salvando rascunho...');
                
                // Call the auto-save prop which returns the ID
                const newDraftId = onAutoSaveDraft(formData, currentDraftId);
                setCurrentDraftId(newDraftId);
                
                setAutoSaveStatus('Rascunho salvo automaticamente!');
                statusClearTimerRef.current = setTimeout(() => setAutoSaveStatus(''), 5000);
            }
        }, 120000); // 2 minutes

        // Cleanup on unmount or when dependencies change
        return () => {
            clearInterval(autoSaveTimerRef.current);
            clearTimeout(statusClearTimerRef.current);
        };
    }, [formData, currentDraftId, onAutoSaveDraft]);

    // Effect for save to localStorage on every change
    useEffect(() => {
        try {
            // Now we store the object structure always
            const dataToStore = { formData, draftId: currentDraftId };
            localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(dataToStore));
        } catch (error) {
            console.error("Failed to save form data to localStorage", error);
        }
    }, [formData, currentDraftId]);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    const minDate = `${yyyy}-${mm}-${dd}`;
    const minDateTime = `${minDate}T00:00`;

    const formRef = useRef<HTMLFormElement>(null);
    
    const visibleStepIndexes = useMemo(() => {
        if (formData.informacoesGerais.referenteSAP === 'Sim') {
            // When the request is for SAP, show only the essential steps:
            // General Info, Transport Map, SAP Checklist, and final steps.
            return [0, 2, 10, 11, 12];
        } else {
            // Standard workflow for non-SAP requests, hiding SAP-specific steps.
            return steps.map((_, i) => i).filter(i => i !== 2 && i !== 10);
        }
    }, [formData.informacoesGerais.referenteSAP]);

    const validateStep = (stepIndex) => {
        const errors = [];
        const { informacoesGerais, checklist, checklistSAP, planoImplantacao, mapaTransporte, cadernoTestes, planoComunicacao, planoRetorno, planoRiscos, segurancaAcessos, contatos, comunicacaoChecklist, riscosGerais } = formData;
    
        switch (stepIndex) {
            case 0: // Informações Gerais
                if (!informacoesGerais.liderMudanca.trim()) errors.push({ field: 'informacoesGerais_liderMudanca', message: 'O campo "Líder da Mudança" é obrigatório.' });
                if (!informacoesGerais.solicitante.trim()) errors.push({ field: 'informacoesGerais_solicitante', message: 'O campo "Solicitante" é obrigatório.' });
                if (!informacoesGerais.dataMudanca) errors.push({ field: 'informacoesGerais_dataMudanca', message: 'O campo "Data da Mudança" é obrigatória.' });
                if (!informacoesGerais.motivoMudanca.trim()) errors.push({ field: 'informacoesGerais_motivoMudanca', message: 'O campo "Motivo da Mudança" é obrigatório.' });
                if (informacoesGerais.servicosAfetados.length === 0) errors.push({ field: 'informacoesGerais_servicosAfetados', message: 'Selecione ao menos um "Serviço Afetado".' });
                if (informacoesGerais.sistemasAfetados.length === 0) errors.push({ field: 'informacoesGerais_sistemasAfetados', message: 'Selecione ao menos um "Sistema Afetado".' });
                if (informacoesGerais.indisponibilidade === 'Sim') {
                    if (!informacoesGerais.indisponibilidadeInicio) errors.push({ field: 'informacoesGerais_indisponibilidadeInicio', message: 'O "Início da Indisponibilidade" é obrigatório.' });
                    if (!informacoesGerais.indisponibilidadeFim) errors.push({ field: 'informacoesGerais_indisponibilidadeFim', message: 'O "Fim da Indisponibilidade" é obrigatório.' });
                }
                if (informacoesGerais.referenteSAP === 'Sim' && informacoesGerais.frentesSAP.length === 0) {
                    errors.push({ field: 'informacoesGerais_frentesSAP', message: 'Selecione ao menos uma "Frente SAP".' });
                }
                break;
            case 1: // Plano de Implantação
                if (planoImplantacao.length === 0) errors.push({ table: 'planoImplantacao', message: 'Adicione ao menos uma atividade ao Plano de Implantação.' });
                planoImplantacao.forEach((item, index) => {
                    if (!item.nome?.trim()) errors.push({ field: `planoImplantacao_${index}_nome`, message: `Atividade #${index + 1}: Nome é obrigatório.` });
                    if (!item.responsavel?.trim()) errors.push({ field: `planoImplantacao_${index}_responsavel`, message: `Atividade #${index + 1}: Responsável é obrigatório.` });
                    if (!item.dataPlanejada) errors.push({ field: `planoImplantacao_${index}_dataPlanejada`, message: `Atividade #${index + 1}: Data Planejada é obrigatória.` });
                });
                break;
            case 2: // Mapa de Transporte (SAP only)
                if (informacoesGerais.referenteSAP === 'Sim') {
                    if (mapaTransporte.length === 0) errors.push({ table: 'mapaTransporte', message: 'Adicione ao menos uma request ao Mapa de Transporte.' });
                     mapaTransporte.forEach((item, index) => {
                        if (!item.request?.trim()) errors.push({ field: `mapaTransporte_${index}_request`, message: `Request #${index + 1}: ID da Request é obrigatório.` });
                        if (!item.objetivoRequest?.trim()) errors.push({ field: `mapaTransporte_${index}_objetivoRequest`, message: `Request #${index + 1}: Objetivo é obrigatório.` });
                    });
                }
                break;
             case 3: // Caderno de Testes
                if (cadernoTestes.length === 0) errors.push({ table: 'cadernoTestes', message: 'Adicione ao menos um item ao Caderno de Testes.' });
                 cadernoTestes.forEach((item, index) => {
                    if (!item.nome?.trim()) errors.push({ field: `cadernoTestes_${index}_nome`, message: `Teste #${index + 1}: Nome é obrigatório.` });
                    if (!item.responsavel?.trim()) errors.push({ field: `cadernoTestes_${index}_responsavel`, message: `Teste #${index + 1}: Responsável é obrigatório.` });
                });
                break;
            case 4: // Plano de Retorno
                if (planoRetorno.length === 0) errors.push({ table: 'planoRetorno', message: 'Adicione ao menos uma atividade ao Plano de Retorno.' });
                planoRetorno.forEach((item, index) => {
                    if (!item.descricao?.trim()) errors.push({ field: `planoRetorno_${index}_descricao`, message: `Atividade #${index + 1}: Descrição é obrigatória.` });
                    if (!item.responsavel?.trim()) errors.push({ field: `planoRetorno_${index}_responsavel`, message: `Atividade #${index + 1}: Responsável é obrigatório.` });
                });
                break;
            case 5: // Plano de Comunicação
                if (!comunicacaoChecklist.partesEnvolvidasValidaram) errors.push({ field: 'comunicacaoChecklist_partesEnvolvidasValidaram', message: 'Responda à pergunta: Partes envolvidas validaram o plano?' });
                if (!comunicacaoChecklist.processoAcompanhamentoComunicado) errors.push({ field: 'comunicacaoChecklist_processoAcompanhamentoComunicado', message: 'Responda à pergunta: Processo de acompanhamento comunicado?' });
                if (!comunicacaoChecklist.tabelaContatosPreenchida) errors.push({ field: 'comunicacaoChecklist_tabelaContatosPreenchida', message: 'Responda à pergunta: Tabela de contatos preenchida?' });
                break;
            case 6: // Risco de Mudança
                 if (!riscosGerais.planoRetornoClaro) errors.push({ field: 'riscosGerais_planoRetornoClaro', message: 'Responda à pergunta: Plano de implantação claro sobre riscos/gatilhos?' });
                 if (!riscosGerais.stakeholdersConsultados) errors.push({ field: 'riscosGerais_stakeholdersConsultados', message: 'Responda à pergunta: Stakeholders consultados sobre riscos?' });
                break;
            case 7: // Segurança e Acessos
                 if (segurancaAcessos.perfis.length === 0) errors.push({ table: 'segurancaAcessos', message: 'Adicione ao menos um perfil de acesso.' });
                 break;
            case 8: // Contatos
                if (contatos.length === 0) errors.push({ table: 'contatos', message: 'Adicione ao menos um contato.' });
                break;
            case 9: // Checklist
                checklist.forEach((item, index) => {
                    if (!item.answer) errors.push({ field: `checklist_${index}`, message: `Checklist: Responda à pergunta "${item.question}"` });
                });
                break;
             case 10: // Checklist SAP
                 if (informacoesGerais.referenteSAP === 'Sim') {
                    checklistSAP.forEach((item, index) => {
                        if (!item.answer) errors.push({ field: `checklistSAP_${index}`, message: `Checklist SAP: Responda à pergunta "${item.question}"` });
                    });
                }
                break;
            case 11: // Anexos
                // No validation needed for attachments
                break;
        }
        
        setCompletedSteps(prev => ({...prev, [stepIndex]: errors.length === 0}));
        return errors;
    };

    const handleNext = () => {
        validateStep(currentStep);
        
        const currentIndexInVisible = visibleStepIndexes.indexOf(currentStep);
        if (currentIndexInVisible !== -1 && currentIndexInVisible < visibleStepIndexes.length - 1) {
            const nextStep = visibleStepIndexes[currentIndexInVisible + 1];
            setCurrentStep(nextStep);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        validateStep(currentStep);
    
        const currentIndexInVisible = visibleStepIndexes.indexOf(currentStep);
        if (currentIndexInVisible > 0) {
            const prevStep = visibleStepIndexes[currentIndexInVisible - 1];
            setCurrentStep(prevStep);
            window.scrollTo(0, 0);
        }
    };

    const handleGoToStep = (stepIndex: number) => {
        if (stepIndex === currentStep) return;
        // Validate the current step before leaving it
        validateStep(currentStep);
        setCurrentStep(stepIndex);
        window.scrollTo(0, 0);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const [section, ...fieldParts] = name.split('_');
        const field = fieldParts.join('_');
        
        setFormData(prev => {
            const newState = { ...prev };
            if (type === 'checkbox') {
                newState[section][field] = checked;
            } else {
                newState[section][field] = value;
            }
            return newState;
        });
    };
    
     const handleDynamicTableChange = (section, index, field, value) => {
        setFormData(prev => {
            if (section === 'segurancaAcessos.perfis') {
                const newPerfis = [...prev.segurancaAcessos.perfis];
                newPerfis[index] = { ...newPerfis[index], [field]: value };
                return {
                    ...prev,
                    segurancaAcessos: { ...prev.segurancaAcessos, perfis: newPerfis }
                };
            }
            // This part handles flat arrays
            const newSectionData = [...prev[section]];
            newSectionData[index] = { ...newSectionData[index], [field]: value };
            return { ...prev, [section]: newSectionData };
        });
    };

    const addRow = (section, defaultRow) => {
        setFormData(prev => {
            if (section === 'segurancaAcessos.perfis') {
                const newPerfis = [...prev.segurancaAcessos.perfis, { ...defaultRow, id: newId() }];
                return {
                    ...prev,
                    segurancaAcessos: { ...prev.segurancaAcessos, perfis: newPerfis }
                };
            }
            return {
                ...prev,
                [section]: [...prev[section], { ...defaultRow, id: newId() }]
            };
        });
    };
    
    const removeRow = (section, index) => {
        setFormData(prev => {
            if (section === 'segurancaAcessos.perfis') {
                const newPerfis = prev.segurancaAcessos.perfis.filter((_, i) => i !== index);
                return {
                    ...prev,
                    segurancaAcessos: { ...prev.segurancaAcessos, perfis: newPerfis }
                };
            }
            return {
                ...prev,
                [section]: prev[section].filter((_, i) => i !== index)
            };
        });
    };
    
    const handleChecklistChange = (checklistType, index, field, value) => {
        setFormData(prev => {
            const newChecklist = [...prev[checklistType]];
            newChecklist[index] = { ...newChecklist[index], [field]: value };
            return { ...prev, [checklistType]: newChecklist };
        });
    };

    const handleFileChange = (e) => {
        const maxAttachments = 10;
        const currentAttachmentCount = formData.anexos.length;
        const remainingSlots = maxAttachments - currentAttachmentCount;

        const files = Array.from(e.target.files as FileList);

        if (files.length === 0) {
            e.target.value = '';
            return;
        }

        if (remainingSlots <= 0) {
            alert(`Você já atingiu o limite máximo de ${maxAttachments} anexos.`);
            e.target.value = ''; // Clear the file input
            return;
        }

        const filesToAdd = files.slice(0, remainingSlots);

        if (files.length > remainingSlots) {
            alert(`Você pode anexar no máximo ${maxAttachments} documentos. Apenas os ${remainingSlots} primeiros arquivos foram adicionados.`);
        }

        const newAnexos: Anexo[] = filesToAdd.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
        }));

        if (newAnexos.length > 0) {
            setFormData(prev => ({ ...prev, anexos: [...prev.anexos, ...newAnexos] }));
        }
        e.target.value = ''; // Clear the file input to allow re-selecting same file
    };

    const removeAnexo = (index) => {
        setFormData(prev => ({
            ...prev,
            anexos: prev.anexos.filter((_, i) => i !== index)
        }));
    };

    const handleManualSaveDraft = () => {
        if (!formData.informacoesGerais.motivoMudanca.trim()) {
            alert("Por favor, preencha o 'Motivo da Mudança' para que o rascunho possa ser identificado.");
            return;
        }
        onSaveDraft(formData, currentDraftId);
    };

    const handleSubmit = () => {
        let allErrors = [];
        // Iterate over visible steps to validate, excluding the last two (summary and attachments).
        const stepsToValidate = visibleStepIndexes.filter(i => i < steps.length - 2);
        for (const stepIndex of stepsToValidate) {
            allErrors.push(...validateStep(stepIndex));
        }

        setValidationErrors(allErrors);

        if (allErrors.length > 0) {
            window.scrollTo(0, 0);
            return;
        }

        const requestTitle = formData.informacoesGerais.motivoMudanca;
        const newId = addRequest(formData, currentDraftId);

        // Generate email content for the confirmation screen
        const emailTo = 'cab@sipal.com.br';
        const classification = formData.informacoesGerais.classificacao.toUpperCase();
        const subject = `[CAB] ${classification} - Nova RDM: ${newId} - ${requestTitle}`;
        const bodyParts = [
            `Uma nova requisição de mudança foi submetida para avaliação do CAB.`,
            ``,
            `Detalhes da Requisição:`,
            `--------------------------------------------------`,
            `Nº da Requisição: ${newId}`,
            `Título/Motivo: ${requestTitle}`,
            `Solicitante: ${currentUser.name} (${currentUser.email})`,
            `Líder da Mudança: ${formData.informacoesGerais.liderMudanca}`,
            `Data da Mudança: ${formData.informacoesGerais.dataMudanca ? new Date(formData.informacoesGerais.dataMudanca + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}`,
            `Classificação: ${formData.informacoesGerais.classificacao}`,
            `Haverá Indisponibilidade: ${formData.informacoesGerais.indisponibilidade}`,
            `--------------------------------------------------`,
            ``,
            `Para uma análise completa, por favor, acesse o painel do CAB.`
        ];
        const body = bodyParts.join('\n');
        
        setMailtoLink(`mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        
        setSubmittedRequestId(newId);
        setSubmittedRequestTitle(requestTitle);
        localStorage.removeItem(WIZARD_STORAGE_KEY);
        setCurrentDraftId(null);
        setCurrentStep(steps.length - 1); // Go to final confirmation step
    };

    const toggleScope = (scope) => {
        setExpandedScopes(prev => ({ ...prev, [scope]: !prev[scope] }));
    };
    
    // Group checklist items by scope
    const groupedChecklist = checklistItems.reduce((acc, item) => {
        (acc[item.scope] = acc[item.scope] || []).push(item);
        return acc;
    }, {});
    
    const groupedChecklistSAP = checklistSAPItems.reduce((acc, item) => {
        (acc[item.scope] = acc[item.scope] || []).push(item);
        return acc;
    }, {});
    
    const renderChecklistGroup = (group, checklistType) => {
        const isCompleted = group.every(item => {
            const currentItem = formData[checklistType].find(i => i.question === item.question);
            return currentItem && !!currentItem.answer;
        });

        return (
             <div key={group[0].scope} className="accordion-item">
                <button type="button" className={`accordion-header ${isCompleted ? 'completed' : ''}`} onClick={() => toggleScope(group[0].scope)}>
                    <span className="accordion-title-wrapper">
                        {isCompleted && <span className="scope-check-icon" title="Escopo concluído"><CheckIcon /></span>}
                        {group[0].scope}
                    </span>
                    <ExpandIcon isExpanded={!!expandedScopes[group[0].scope]} />
                </button>
                {expandedScopes[group[0].scope] && (
                    <div className="accordion-content">
                        {group.map(item => {
                            const originalIndex = formData[checklistType].findIndex(i => i.question === item.question);
                            const currentItem = formData[checklistType][originalIndex];
                            
                            const isError = validationErrors.some(e => e.field === `${checklistType}_${originalIndex}`);

                            return (
                                <div key={originalIndex} className={`checklist-question-container ${isError ? 'validation-error-section' : ''}`}>
                                    <p className="checklist-question-text">
                                      {item.id && <span className="checklist-question-id">{item.id}</span>}
                                      {item.question}
                                    </p>
                                    <div className="checklist-answer-buttons">
                                        {['Sim', 'Não', 'N/A'].map(ans => (
                                            <button
                                                type="button"
                                                key={ans}
                                                className={`checklist-answer-btn ${ans.toLowerCase().replace('/', '')} ${currentItem.answer === ans ? 'selected' : ''}`}
                                                onClick={() => handleChecklistChange(checklistType, originalIndex, 'answer', ans)}
                                            >
                                                {ans === 'Sim' && <CheckIcon />}
                                                {ans === 'Não' && <AlertIcon />}
                                                {ans === 'N/A' && <BlockIcon />}
                                                {ans}
                                            </button>
                                        ))}
                                    </div>
                                    {currentItem.answer === 'Não' && (
                                         <div className="form-field full-width justification-field">
                                            <label htmlFor={`justification_${checklistType}_${originalIndex}`}>Justificativa (obrigatório para "Não")</label>
                                            <textarea
                                                id={`justification_${checklistType}_${originalIndex}`}
                                                value={currentItem.justification || ''}
                                                onChange={(e) => handleChecklistChange(checklistType, originalIndex, 'justification', e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {checklistType === 'checklistSAP' && (
                                        <>
                                            <div className="form-field full-width" style={{marginTop: '1rem'}}>
                                                <label htmlFor={`docLink_${checklistType}_${originalIndex}`}>Link para Evidências</label>
                                                <input
                                                    type="url"
                                                    id={`docLink_${checklistType}_${originalIndex}`}
                                                    placeholder="https://exemplo.com/documento"
                                                    value={currentItem.docLink || ''}
                                                    onChange={(e) => handleChecklistChange(checklistType, originalIndex, 'docLink', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-field full-width" style={{marginTop: '1rem'}}>
                                                <label htmlFor={`observacao_${checklistType}_${originalIndex}`}>Observação</label>
                                                <textarea
                                                    id={`observacao_${checklistType}_${originalIndex}`}
                                                    value={currentItem.observacao || ''}
                                                    onChange={(e) => handleChecklistChange(checklistType, originalIndex, 'observacao', e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const isCurrentStepValid = validationErrors.length === 0;

    const maxAttachments = 10;
    const attachmentsCount = formData.anexos.length;
    const canUpload = attachmentsCount < maxAttachments;

    return (
        <div className="card">
            <div className="wizard-header-section">
                <h2 className="wizard-title">Nova Requisição de Mudança</h2>
            </div>
            <WizardProgressBar 
                currentStep={currentStep} 
                formData={formData} 
                completedSteps={completedSteps} 
                isCurrentStepValid={isCurrentStepValid} 
                onStepClick={handleGoToStep}
            />
            
            <form ref={formRef} className="wizard-form" noValidate>
                 {validationErrors.length > 0 && (
                    <div className="error-message-box">
                       <div className="error-box-header">
                         <AlertIcon />
                         <p>Por favor, corrija os seguintes erros:</p>
                       </div>
                        <ul>
                            {validationErrors.map((error, i) => (
                                <li key={i}>{error.message}</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {currentStep === 0 && (
                    <div className="step-content">
                        <h2>{steps[0]}</h2>
                        <div className={`card-like-section ${formData.informacoesGerais.referenteSAP ? 'answered' : ''}`}>
                            <fieldset>
                                <legend>Mudança SAP</legend>
                                <p className="fieldset-description">Esta mudança é referente ao SAP?</p>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input type="radio" name="informacoesGerais_referenteSAP" value="Sim" checked={formData.informacoesGerais.referenteSAP === 'Sim'} onChange={handleChange} />
                                        Sim
                                    </label>
                                    <label className="radio-label">
                                        <input type="radio" name="informacoesGerais_referenteSAP" value="Não" checked={formData.informacoesGerais.referenteSAP === 'Não'} onChange={handleChange} />
                                        Não
                                    </label>
                                </div>
                                {formData.informacoesGerais.referenteSAP === 'Sim' && (
                                    <div className="conditional-fields">
                                         <div className="form-field full-width">
                                            <label htmlFor="informacoesGerais_frentesSAP">Frentes SAP</label>
                                            <MultiSelect
                                                optionsData={frentesSAPData}
                                                selected={formData.informacoesGerais.frentesSAP}
                                                onChange={(selected) => handleChange({ target: { name: 'informacoesGerais_frentesSAP', value: selected } })}
                                                placeholder="Selecione as frentes..."
                                                className={validationErrors.some(e => e.field === 'informacoesGerais_frentesSAP') ? 'validation-error-field' : ''}
                                            />
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                        </div>
                        <div className="form-grid">
                            <div className="form-field">
                                <label htmlFor="informacoesGerais_liderMudanca">
                                    Líder da Mudança
                                    <Tooltip text="Responsável por liderar a execução da mudança." />
                                </label>
                                <input type="text" id="informacoesGerais_liderMudanca" name="informacoesGerais_liderMudanca" value={formData.informacoesGerais.liderMudanca} onChange={handleChange} className={validationErrors.some(e => e.field === 'informacoesGerais_liderMudanca') ? 'validation-error-field' : ''} />
                            </div>
                             <div className="form-field">
                                <label htmlFor="informacoesGerais_solicitante">
                                    Solicitante
                                </label>
                                <input type="text" id="informacoesGerais_solicitante" name="informacoesGerais_solicitante" value={formData.informacoesGerais.solicitante} readOnly className="read-only-field" />
                            </div>
                            <div className="form-field">
                                <label htmlFor="informacoesGerais_liderProduto">Líder do Produto (se aplicável)</label>
                                <input type="text" id="informacoesGerais_liderProduto" name="informacoesGerais_liderProduto" value={formData.informacoesGerais.liderProduto} onChange={handleChange} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="informacoesGerais_dataMudanca">Data da Mudança</label>
                                <input type="date" id="informacoesGerais_dataMudanca" name="informacoesGerais_dataMudanca" value={formData.informacoesGerais.dataMudanca} onChange={handleChange} min={minDate} className={validationErrors.some(e => e.field === 'informacoesGerais_dataMudanca') ? 'validation-error-field' : ''} />
                            </div>
                            <div className="form-field full-width">
                                <label htmlFor="informacoesGerais_motivoMudanca">Motivo da Mudança</label>
                                <textarea id="informacoesGerais_motivoMudanca" name="informacoesGerais_motivoMudanca" value={formData.informacoesGerais.motivoMudanca} onChange={handleChange} className={validationErrors.some(e => e.field === 'informacoesGerais_motivoMudanca') ? 'validation-error-field' : ''}></textarea>
                            </div>
                             <div className="form-field full-width">
                                <label htmlFor="informacoesGerais_impactoNaoRealizar">Qual o impacto de NÃO realizar a mudança?</label>
                                <textarea id="informacoesGerais_impactoNaoRealizar" name="informacoesGerais_impactoNaoRealizar" value={formData.informacoesGerais.impactoNaoRealizar} onChange={handleChange} ></textarea>
                            </div>
                            <div className="form-field">
                                <label htmlFor="informacoesGerais_classificacao">Classificação</label>
                                <select id="informacoesGerais_classificacao" name="informacoesGerais_classificacao" value={formData.informacoesGerais.classificacao} onChange={handleChange}>
                                    <option>Padrão</option>
                                    <option>Emergencial</option>
                                    <option>Planejada</option>
                                </select>
                            </div>
                             <div className="form-field">
                                <label htmlFor="informacoesGerais_restricoesMudanca">Existem restrições para a realização da mudança?</label>
                                <input type="text" id="informacoesGerais_restricoesMudanca" name="informacoesGerais_restricoesMudanca" value={formData.informacoesGerais.restricoesMudanca} onChange={handleChange} />
                            </div>
                            <div className="form-field full-width">
                                <label htmlFor="informacoesGerais_servicosAfetados">Serviços Afetados</label>
                                <MultiSelect
                                    optionsData={servicosData}
                                    selected={formData.informacoesGerais.servicosAfetados}
                                    onChange={(selected) => handleChange({ target: { name: 'informacoesGerais_servicosAfetados', value: selected } })}
                                    placeholder="Selecione os serviços..."
                                    className={validationErrors.some(e => e.field === 'informacoesGerais_servicosAfetados') ? 'validation-error-field' : ''}
                                />
                            </div>
                            <div className="form-field full-width">
                                <label htmlFor="informacoesGerais_sistemasAfetados">Sistemas Afetados</label>
                                <MultiSelect
                                    optionsData={sistemasAfetadosData}
                                    selected={formData.informacoesGerais.sistemasAfetados}
                                    onChange={(selected) => handleChange({ target: { name: 'informacoesGerais_sistemasAfetados', value: selected } })}
                                    placeholder="Selecione os sistemas..."
                                    className={validationErrors.some(e => e.field === 'informacoesGerais_sistemasAfetados') ? 'validation-error-field' : ''}
                                />
                            </div>
                        </div>

                        <div className={`card-like-section ${formData.informacoesGerais.indisponibilidade ? 'answered' : ''}`}>
                            <fieldset>
                                <legend>Indisponibilidade de Serviço</legend>
                                <p className="fieldset-description">Haverá indisponibilidade de algum serviço durante a mudança?</p>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input type="radio" name="informacoesGerais_indisponibilidade" value="Sim" checked={formData.informacoesGerais.indisponibilidade === 'Sim'} onChange={handleChange} />
                                        Sim
                                    </label>
                                    <label className="radio-label">
                                        <input type="radio" name="informacoesGerais_indisponibilidade" value="Não" checked={formData.informacoesGerais.indisponibilidade === 'Não'} onChange={handleChange} />
                                        Não
                                    </label>
                                </div>
                                {formData.informacoesGerais.indisponibilidade === 'Sim' && (
                                    <div className="conditional-fields form-grid">
                                        <div className="form-field">
                                            <label htmlFor="informacoesGerais_indisponibilidadeInicio">Início da Indisponibilidade</label>
                                            <input type="datetime-local" id="informacoesGerais_indisponibilidadeInicio" name="informacoesGerais_indisponibilidadeInicio" value={formData.informacoesGerais.indisponibilidadeInicio} onChange={handleChange} min={minDateTime} className={validationErrors.some(e => e.field === 'informacoesGerais_indisponibilidadeInicio') ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="informacoesGerais_indisponibilidadeFim">Fim da Indisponibilidade</label>
                                            <input type="datetime-local" id="informacoesGerais_indisponibilidadeFim" name="informacoesGerais_indisponibilidadeFim" value={formData.informacoesGerais.indisponibilidadeFim} onChange={handleChange} min={formData.informacoesGerais.indisponibilidadeInicio || minDateTime} className={validationErrors.some(e => e.field === 'informacoesGerais_indisponibilidadeFim') ? 'validation-error-field' : ''} />
                                        </div>
                                         <div className="form-field">
                                            <label htmlFor="informacoesGerais_periodoMaximoInterrupcao">Período Máximo de Interrupção (minutos)</label>
                                            <input type="number" id="informacoesGerais_periodoMaximoInterrupcao" name="informacoesGerais_periodoMaximoInterrupcao" value={formData.informacoesGerais.periodoMaximoInterrupcao} onChange={handleChange} placeholder="Ex: 60" />
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                        </div>
                    </div>
                )}
                
                {currentStep === 1 && (
                    <div className="step-content">
                        <h2>
                            {steps[1]}
                            <Tooltip text="Detalhe todas as atividades necessárias para a implantação da mudança, desde a preparação até a finalização." />
                        </h2>
                        {validationErrors.some(e => e.table === 'planoImplantacao') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'planoImplantacao')?.message}
                            </p>
                        )}
                        <div className="implementation-plan-list">
                            {formData.planoImplantacao.length > 0 ? (
                                formData.planoImplantacao.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Atividade #{index + 1}: {item.nome || 'Nova Atividade'}</h4>
                                            <button
                                                type="button"
                                                onClick={() => removeRow('planoImplantacao', index)}
                                                className="action-button remove-row-btn"
                                                title="Remover Atividade"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field full-width">
                                                <label htmlFor={`planoImplantacao_${index}_nome`}>
                                                    Nome da Atividade
                                                    <Tooltip text="Nome claro e objetivo para a atividade." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`planoImplantacao_${index}_nome`}
                                                    value={item.nome || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'nome', e.target.value)}
                                                    className={validationErrors.some(e => e.field === `planoImplantacao_${index}_nome`) ? 'validation-error-field' : ''}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_etapa`}>
                                                    Etapa
                                                    <Tooltip text="Fase da implantação (ex: Pré-implantação, Execução, Pós-implantação)." />
                                                </label>
                                                <select
                                                    id={`planoImplantacao_${index}_etapa`}
                                                    value={item.etapa || 'Pré Implantação'}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'etapa', e.target.value)}
                                                >
                                                    <option>Pré Implantação</option>
                                                    <option>Implantação</option>
                                                    <option>Pós Implantação</option>
                                                </select>
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_status`}>
                                                    Status
                                                    <Tooltip text="Status atual da atividade." />
                                                </label>
                                                <input type="text" id={`planoImplantacao_${index}_status`} value={item.status || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'status', e.target.value)} />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_dataPlanejada`}>
                                                    Data Planejada
                                                    <Tooltip text="Data em que a atividade deve ser executada." />
                                                </label>
                                                <input
                                                    type="date"
                                                    placeholder="dd/mm/aaaa"
                                                    id={`planoImplantacao_${index}_dataPlanejada`}
                                                    min={minDate}
                                                    value={item.dataPlanejada || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'dataPlanejada', e.target.value)}
                                                    className={validationErrors.some(e => e.field === `planoImplantacao_${index}_dataPlanejada`) ? 'validation-error-field' : ''}
                                                />
                                            </div>
                                            
                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_horaPlanejada`}>
                                                    Hora Planejada
                                                    <Tooltip text="Horário planejado para a execução." />
                                                </label>
                                                <input
                                                    type="time"
                                                    id={`planoImplantacao_${index}_horaPlanejada`}
                                                    value={item.horaPlanejada || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'horaPlanejada', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field full-width">
                                                <label htmlFor={`planoImplantacao_${index}_descricao`}>
                                                    Descrição
                                                    <Tooltip text="Descrição detalhada dos passos a serem executados na atividade." />
                                                </label>
                                                <textarea
                                                    id={`planoImplantacao_${index}_descricao`}
                                                    value={item.descricao || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'descricao', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_responsavel`}>
                                                    Responsável
                                                    <Tooltip text="Pessoa ou equipe responsável pela execução." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`planoImplantacao_${index}_responsavel`}
                                                    value={item.responsavel || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'responsavel', e.target.value)}
                                                    className={validationErrors.some(e => e.field === `planoImplantacao_${index}_responsavel`) ? 'validation-error-field' : ''}
                                                />
                                            </div>
                                            
                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_departamento`}>
                                                    Departamento
                                                    <Tooltip text="Departamento do responsável." />
                                                </label>
                                                <input type="text" id={`planoImplantacao_${index}_departamento`} value={item.departamento || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'departamento', e.target.value)} />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_itemConfiguracao`}>
                                                    Item de Configuração
                                                    <Tooltip text="Ativo ou componente de infraestrutura afetado (ex: Servidor, Aplicação)." />
                                                </label>
                                                <input type="text" id={`planoImplantacao_${index}_itemConfiguracao`} value={item.itemConfiguracao || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'itemConfiguracao', e.target.value)} />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`planoImplantacao_${index}_tempoExecucao`}>
                                                    Tempo de Execução
                                                    <Tooltip text="Tempo estimado para a conclusão da atividade (formato HH:MM)." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`planoImplantacao_${index}_tempoExecucao`}
                                                    placeholder="Ex: 01:15"
                                                    value={item.tempoExecucao || ''}
                                                    onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'tempoExecucao', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-message">Nenhuma atividade adicionada.</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => addRow('planoImplantacao', { nome: '', etapa: 'Pré Implantação', status: '', dataPlanejada: '', horaPlanejada: '', descricao: '', responsavel: '', departamento: '', itemConfiguracao: '', tempoExecucao: '' })}
                            className="submit-btn add-row-btn"
                        >
                            + Adicionar Atividade
                        </button>
                    </div>
                )}

                {currentStep === 2 && formData.informacoesGerais.referenteSAP === 'Sim' && (
                     <div className="step-content">
                        <h2>{steps[2]}</h2>
                        {validationErrors.some(e => e.table === 'mapaTransporte') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'mapaTransporte')?.message}
                            </p>
                        )}
                         <div className="implementation-plan-list">
                            {formData.mapaTransporte.length > 0 ? (
                                formData.mapaTransporte.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Request #{index + 1}: {item.request || 'Nova Request'}</h4>
                                            <button onClick={() => removeRow('mapaTransporte', index)} className="action-button remove-row-btn" title="Remover Request"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>ID da Request</label>
                                                <input type="text" value={item.request || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'request', e.target.value)} className={validationErrors.some(e => e.field === `mapaTransporte_${index}_request`) ? 'validation-error-field' : ''} />
                                            </div>
                                            <div className="form-field">
                                                <label>Sequenciamento</label>
                                                <input type="text" value={item.sequenciamento || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'sequenciamento', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Tipo Request</label>
                                                <select value={item.tipoRequest || 'Workbench'} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipoRequest', e.target.value)}>
                                                    <option>Workbench</option><option>Customizing</option><option>Transport of Copies</option><option>Nota SAP/Support Package</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Objetivo</label>
                                                <input type="text" value={item.objetivoRequest || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'objetivoRequest', e.target.value)} className={validationErrors.some(e => e.field === `mapaTransporte_${index}_objetivoRequest`) ? 'validation-error-field' : ''} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Descrição Técnica</label>
                                                <textarea value={item.descricaoTecnica || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'descricaoTecnica', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Tipo</label>
                                                <select value={item.tipo || 'Normal'} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipo', e.target.value)}>
                                                    <option>Normal</option><option>Normal c/ Erro</option><option>Crítica</option><option>Crítica c/ Erro</option><option>Emergencial</option>
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Nº CALM/Jira</label>
                                                <input type="text" value={item.numeroCALM || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'numeroCALM', e.target.value)} />
                                            </div>
                                             <div className="form-field">
                                                <label>GO - SIPAL</label>
                                                <input type="text" value={item.goSipal || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'goSipal', e.target.value)} />
                                            </div>
                                             <div className="form-field">
                                                <label>Status</label>
                                                <select value={item.status || 'Liberado para Transporte'} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'status', e.target.value)}>
                                                    <option>Liberado para Transporte</option><option>Aguardando Aprovação</option><option>Transportado</option><option>Com Erro</option>
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Data Criação</label>
                                                <input type="date" value={item.dataCriacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'dataCriacao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Resp. Criação</label>
                                                <input type="text" value={item.responsavelCriacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'responsavelCriacao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Resp. Importação</label>
                                                <input type="text" value={item.responsavelImportacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'responsavelImportacao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Solicitante</label>
                                                <input type="text" value={item.solicitante || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'solicitante', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Link Evid. Teste</label>
                                                <input type="text" value={item.evidenciaTeste || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'evidenciaTeste', e.target.value)} />
                                            </div>
                                             <div className="form-field full-width">
                                                <label>Plano Rollback</label>
                                                <textarea value={item.planoRollback || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'planoRollback', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Observações</label>
                                                <textarea value={item.observacoes || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'observacoes', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhuma request adicionada.</p>}
                        </div>
                        <button type="button" onClick={() => addRow('mapaTransporte', { request: '', sequenciamento: '', tipoRequest: 'Workbench', objetivoRequest: '', descricaoTecnica: '', tipo: 'Normal', numeroCALM: '', goSipal: '', status: 'Liberado para Transporte', dataCriacao: '', responsavelCriacao: '', responsavelImportacao: '', solicitante: '', evidenciaTeste: '', planoRollback: '', observacoes: '' })} className="submit-btn add-row-btn">+ Adicionar Request</button>
                    </div>
                )}
                
                {currentStep === 3 && (
                    <div className="step-content">
                        <h2>
                            {steps[3]}
                            <Tooltip text="Descreva os casos de teste para validar a mudança." />
                        </h2>
                        {validationErrors.some(e => e.table === 'cadernoTestes') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'cadernoTestes')?.message}
                            </p>
                        )}
                        <div className="implementation-plan-list">
                             {formData.cadernoTestes.length > 0 ? (
                                formData.cadernoTestes.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Teste #{index + 1}: {item.nome || 'Novo Teste'}</h4>
                                            <button
                                                type="button"
                                                onClick={() => removeRow('cadernoTestes', index)}
                                                className="action-button remove-row-btn"
                                                title="Remover Teste"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field full-width">
                                                <label htmlFor={`cadernoTestes_${index}_nome`}>
                                                    Nome do Teste
                                                    <Tooltip text="Nome descritivo do caso de teste." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`cadernoTestes_${index}_nome`}
                                                    value={item.nome || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'nome', e.target.value)}
                                                    className={validationErrors.some(e => e.field === `cadernoTestes_${index}_nome`) ? 'validation-error-field' : ''}
                                                />
                                            </div>
                                            
                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_plano`}>
                                                    Plano
                                                    <Tooltip text="Plano de teste associado." />
                                                </label>
                                                 <select
                                                    id={`cadernoTestes_${index}_plano`}
                                                    value={item.plano || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'plano', e.target.value)}
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option>Funcional</option>
                                                    <option>Não Funcional</option>
                                                    <option>Regressivo</option>
                                                    <option>UAT (User Acceptance Testing)</option>
                                                </select>
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_tipoTeste`}>
                                                    Tipo de Teste
                                                    <Tooltip text="Categoria do teste." />
                                                </label>
                                                <select
                                                    id={`cadernoTestes_${index}_tipoTeste`}
                                                    value={item.tipoTeste || 'TU - Teste Unitário'}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'tipoTeste', e.target.value)}
                                                >
                                                    <option>TU - Teste Unitário</option>
                                                    <option>TI - Teste Integrado</option>
                                                    <option>TH - Teste de Homologação</option>
                                                    <option>TR - Teste Regressivo</option>
                                                    <option>TS - Teste de Segurança</option>
                                                    <option>TP - Teste de Performance</option>
                                                </select>
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_dataPlanejada`}>
                                                    Data Planejada
                                                    <Tooltip text="Data prevista para execução do teste." />
                                                </label>
                                                <input
                                                    type="date"
                                                    id={`cadernoTestes_${index}_dataPlanejada`}
                                                    min={minDate}
                                                    value={item.dataPlanejada || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'dataPlanejada', e.target.value)}
                                                />
                                            </div>
                                            
                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_horaPlanejada`}>
                                                    Hora Planejada
                                                    <Tooltip text="Horário previsto." />
                                                </label>
                                                <input
                                                    type="time"
                                                    id={`cadernoTestes_${index}_horaPlanejada`}
                                                    value={item.horaPlanejada || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'horaPlanejada', e.target.value)}
                                                />
                                            </div>
                                            
                                            <div className="form-field full-width">
                                                <label htmlFor={`cadernoTestes_${index}_atividade`}>
                                                    Atividade de Teste
                                                    <Tooltip text="Passos ou descrição detalhada do teste a ser realizado." />
                                                </label>
                                                <textarea
                                                    id={`cadernoTestes_${index}_atividade`}
                                                    value={item.atividade || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'atividade', e.target.value)}
                                                />
                                            </div>
                                            
                                            <div className="form-field full-width">
                                                <label htmlFor={`cadernoTestes_${index}_linkTeste`}>
                                                    Link do Teste
                                                    <Tooltip text="Link para evidência, script ou ferramenta de teste." />
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Cole o link para a evidência do teste"
                                                    id={`cadernoTestes_${index}_linkTeste`}
                                                    value={item.linkTeste || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'linkTeste', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_predecessora`}>
                                                    Predecessora
                                                    <Tooltip text="Atividade ou teste que deve ser concluído antes deste." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`cadernoTestes_${index}_predecessora`}
                                                    value={item.predecessora || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'predecessora', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_responsavel`}>
                                                    Responsável
                                                    <Tooltip text="Quem executará o teste." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`cadernoTestes_${index}_responsavel`}
                                                    value={item.responsavel || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'responsavel', e.target.value)}
                                                    className={validationErrors.some(e => e.field === `cadernoTestes_${index}_responsavel`) ? 'validation-error-field' : ''}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_departamento`}>
                                                    Departamento
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`cadernoTestes_${index}_departamento`}
                                                    value={item.departamento || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'departamento', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_itemConfiguracao`}>
                                                    Item de Configuração
                                                    <Tooltip text="Sistema ou módulo testado." />
                                                </label>
                                                <input
                                                    type="text"
                                                    id={`cadernoTestes_${index}_itemConfiguracao`}
                                                    value={item.itemConfiguracao || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'itemConfiguracao', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor={`cadernoTestes_${index}_tempoExecucao`}>
                                                    Tempo de Execução
                                                    <Tooltip text="Duração estimada (HH:MM)." />
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: 02:30"
                                                    id={`cadernoTestes_${index}_tempoExecucao`}
                                                    value={item.tempoExecucao || ''}
                                                    onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'tempoExecucao', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-message">Nenhum teste adicionado.</p>
                            )}
                        </div>
                        <button
                            type="button"
                             onClick={() => addRow('cadernoTestes', { nome: '', plano: '', tipoTeste: 'TU - Teste Unitário', dataPlanejada: '', horaPlanejada: '', atividade: '', linkTeste: '', predecessora: '', responsavel: '', departamento: '', itemConfiguracao: '', tempoExecucao: '' })}
                            className="submit-btn add-row-btn"
                        >
                            + Adicionar Teste
                        </button>
                    </div>
                )}
                
                {currentStep === 4 && (
                    <div className="step-content">
                        <h2>{steps[4]}</h2>
                        {validationErrors.some(e => e.table === 'planoRetorno') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'planoRetorno')?.message}
                            </p>
                        )}
                         <div className="implementation-plan-list">
                            {formData.planoRetorno.length > 0 ? (
                                formData.planoRetorno.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Atividade #{index + 1}</h4>
                                            <button onClick={() => removeRow('planoRetorno', index)} className="action-button remove-row-btn" title="Remover Atividade"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>Data Planejada</label>
                                                <input type="date" value={item.dataPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'dataPlanejada', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Hora Planejada</label>
                                                <input type="time" value={item.horaPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'horaPlanejada', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Status</label>
                                                <select value={item.status || 'Não iniciado'} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'status', e.target.value)}>
                                                    <option>Não iniciado</option><option>Em andamento</option><option>Concluído</option><option>Com problema</option>
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Data Realizada</label>
                                                <input type="date" value={item.dataRealizada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'dataRealizada', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Hora Realizada</label>
                                                <input type="time" value={item.horaRealizada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'horaRealizada', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Tipo</label>
                                                <select value={item.tipo || 'Manual'} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'tipo', e.target.value)}>
                                                    <option>Automático</option><option>Manual</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Descrição</label>
                                                <textarea value={item.descricao || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'descricao', e.target.value)} className={validationErrors.some(e => e.field === `planoRetorno_${index}_descricao`) ? 'validation-error-field' : ''} />
                                            </div>
                                            <div className="form-field">
                                                <label>Predecessora</label>
                                                <input type="text" value={item.predecessora || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'predecessora', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Responsável</label>
                                                <input type="text" value={item.responsavel || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'responsavel', e.target.value)} className={validationErrors.some(e => e.field === `planoRetorno_${index}_responsavel`) ? 'validation-error-field' : ''} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Observação</label>
                                                <textarea value={item.observacao || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'observacao', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhuma atividade adicionada.</p>}
                        </div>
                        <button type="button" onClick={() => addRow('planoRetorno', { dataPlanejada: '', horaPlanejada: '', status: 'Não iniciado', dataRealizada: '', horaRealizada: '', tipo: 'Manual', descricao: '', predecessora: '', responsavel: '', observacao: '' })} className="submit-btn add-row-btn">+ Adicionar Atividade</button>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="step-content">
                         <h2>{steps[5]}</h2>
                         <div className="card-like-section">
                             <div className="form-grid">
                                <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_partesEnvolvidasValidaram">Partes envolvidas validaram o plano?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_partesEnvolvidasValidaram" value="Sim" checked={formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_partesEnvolvidasValidaram" value="Não" checked={formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_processoAcompanhamentoComunicado">Processo de acompanhamento comunicado?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_processoAcompanhamentoComunicado" value="Sim" checked={formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_processoAcompanhamentoComunicado" value="Não" checked={formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_comunicacaoEventoRetorno">Comunicação de retorno contemplada?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_comunicacaoEventoRetorno" value="Sim" checked={formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_comunicacaoEventoRetorno" value="Não" checked={formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_passoAPassoAplicacao">Passo a passo para aplicação existe?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_passoAPassoAplicacao" value="Sim" checked={formData.comunicacaoChecklist.passoAPassoAplicacao === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_passoAPassoAplicacao" value="Não" checked={formData.comunicacaoChecklist.passoAPassoAplicacao === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                 <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_tabelaContatosPreenchida">Tabela de contatos preenchida?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_tabelaContatosPreenchida" value="Sim" checked={formData.comunicacaoChecklist.tabelaContatosPreenchida === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_tabelaContatosPreenchida" value="Não" checked={formData.comunicacaoChecklist.tabelaContatosPreenchida === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="comunicacaoChecklist_pontosFocaisInformados">Pontos focais informados?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_pontosFocaisInformados" value="Sim" checked={formData.comunicacaoChecklist.pontosFocaisInformados === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="comunicacaoChecklist_pontosFocaisInformados" value="Não" checked={formData.comunicacaoChecklist.pontosFocaisInformados === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                             </div>
                         </div>
                         
                         <h3>Detalhamento da Comunicação</h3>
                          <div className="implementation-plan-list">
                             {formData.planoComunicacao.length > 0 ? (
                                formData.planoComunicacao.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Item #{index + 1}</h4>
                                            <button onClick={() => removeRow('planoComunicacao', index)} className="action-button remove-row-btn"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>Data</label>
                                                <input type="date" value={item.data || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'data', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Hora</label>
                                                <input type="time" value={item.hora || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'hora', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Status</label>
                                                <input type="text" value={item.status || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'status', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Meio</label>
                                                <select value={item.meio || 'E-mail'} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'meio', e.target.value)}>
                                                    <option>E-mail</option><option>Teams</option><option>Telefone</option><option>Reunião</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Atividade/Público</label>
                                                <input type="text" value={item.atividade || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'atividade', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Responsável</label>
                                                <input type="text" value={item.responsavel || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'responsavel', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Contato Escalonamento</label>
                                                <input type="text" value={item.contatoEscalonamento || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'contatoEscalonamento', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Observação</label>
                                                <textarea value={item.observacao || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'observacao', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhuma comunicação adicionada.</p>}
                         </div>
                         <button type="button" onClick={() => addRow('planoComunicacao', { data: '', hora: '', status: '', meio: 'E-mail', atividade: '', responsavel: '', contatoEscalonamento: '', observacao: '' })} className="submit-btn add-row-btn">+ Adicionar Comunicação</button>
                    </div>
                )}

                {currentStep === 6 && (
                    <div className="step-content">
                        <h2>{steps[6]}</h2>
                        <div className="card-like-section">
                            <div className="form-grid">
                                <div className="form-field">
                                    <label htmlFor="riscosGerais_planoRetornoClaro">Plano de implantação claro sobre riscos/gatilhos?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="riscosGerais_planoRetornoClaro" value="Sim" checked={formData.riscosGerais.planoRetornoClaro === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="riscosGerais_planoRetornoClaro" value="Não" checked={formData.riscosGerais.planoRetornoClaro === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="riscosGerais_stakeholdersConsultados">Stakeholders consultados sobre riscos?</label>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="riscosGerais_stakeholdersConsultados" value="Sim" checked={formData.riscosGerais.stakeholdersConsultados === 'Sim'} onChange={handleChange} /> Sim</label>
                                        <label className="radio-label"><input type="radio" name="riscosGerais_stakeholdersConsultados" value="Não" checked={formData.riscosGerais.stakeholdersConsultados === 'Não'} onChange={handleChange} /> Não</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3>Detalhamento dos Riscos</h3>
                        <div className="implementation-plan-list">
                             {formData.planoRiscos.length > 0 ? (
                                formData.planoRiscos.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Risco #{index + 1}</h4>
                                            <button onClick={() => removeRow('planoRiscos', index)} className="action-button remove-row-btn"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>Tipo Risco</label>
                                                <select value={item.tipoRisco || 'Técnico'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'tipoRisco', e.target.value)}>
                                                    <option>Técnico</option><option>Negócio</option><option>Externo</option><option>Organizacional</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Risco</label>
                                                <input type="text" value={item.risco || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'risco', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Estratégia</label>
                                                <select value={item.estrategia || 'Mitigar'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'estrategia', e.target.value)}>
                                                    <option>Mitigar</option><option>Aceitar</option><option>Transferir</option><option>Evitar</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Ação</label>
                                                <textarea value={item.acao || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'acao', e.target.value)} />
                                            </div>
                                             <div className="form-field">
                                                <label>Impacto</label>
                                                <select value={item.impacto || 'Médio'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'impacto', e.target.value)}>
                                                    <option>Baixo</option><option>Médio</option><option>Alto</option><option>Crítico</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Mitigação</label>
                                                <textarea value={item.mitigacao || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'mitigacao', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhum risco adicionado.</p>}
                        </div>
                        <button type="button" onClick={() => addRow('planoRiscos', { tipoRisco: 'Técnico', risco: '', estrategia: 'Mitigar', acao: '', impacto: 'Médio', mitigacao: '' })} className="submit-btn add-row-btn">+ Adicionar Risco</button>
                    </div>
                )}

                {currentStep === 7 && (
                    <div className="step-content">
                        <h2>{steps[7]}</h2>
                        {validationErrors.some(e => e.table === 'segurancaAcessos') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'segurancaAcessos')?.message}
                            </p>
                        )}
                        <div className="implementation-plan-list">
                             {formData.segurancaAcessos.perfis.length > 0 ? (
                                formData.segurancaAcessos.perfis.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Perfil #{index + 1}</h4>
                                            <button onClick={() => removeRow('segurancaAcessos.perfis', index)} className="action-button remove-row-btn"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>Nível de acesso</label>
                                                <select value={item.nivelAcesso || 'Usuário'} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'nivelAcesso', e.target.value)}>
                                                    <option>Usuário</option><option>Administrador</option><option>Desenvolvedor</option><option>Somente Leitura</option>
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Plataforma</label>
                                                <input type="text" value={item.plataforma || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'plataforma', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Ambiente</label>
                                                <select value={item.ambiente || 'Produção'} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'ambiente', e.target.value)}>
                                                    <option>Produção</option><option>Homologação</option><option>Desenvolvimento</option>
                                                </select>
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Grupos de acesso</label>
                                                <input type="text" value={item.gruposAcesso || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'gruposAcesso', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Item de Configuração</label>
                                                <input type="text" value={item.itemConfiguracao || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'itemConfiguracao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Área de Negócio</label>
                                                <input type="text" value={item.areaNegocio || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'areaNegocio', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Usuários</label>
                                                <input type="text" value={item.usuarios || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'usuarios', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Login de acesso</label>
                                                <input type="text" value={item.loginAcesso || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'loginAcesso', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Justificativa</label>
                                                <input type="text" value={item.justificativa || ''} onChange={(e) => handleDynamicTableChange('segurancaAcessos.perfis', index, 'justificativa', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhum perfil de acesso adicionado.</p>}
                        </div>
                        <button type="button" onClick={() => addRow('segurancaAcessos.perfis', { nivelAcesso: 'Usuário', plataforma: '', ambiente: 'Produção', gruposAcesso: '', itemConfiguracao: '', areaNegocio: '', usuarios: '', loginAcesso: '', justificativa: '' })} className="submit-btn add-row-btn">+ Adicionar Perfil</button>
                    </div>
                )}

                {currentStep === 8 && (
                    <div className="step-content">
                        <h2>{steps[8]}</h2>
                        {validationErrors.some(e => e.table === 'contatos') && (
                            <p className="table-error-message">
                                <AlertIcon /> {validationErrors.find(e => e.table === 'contatos')?.message}
                            </p>
                        )}
                        <div className="implementation-plan-list">
                             {formData.contatos.length > 0 ? (
                                formData.contatos.map((item, index) => (
                                    <div key={item.id || index} className="implementation-card">
                                        <div className="implementation-card-header">
                                            <h4>Contato #{index + 1}</h4>
                                            <button onClick={() => removeRow('contatos', index)} className="action-button remove-row-btn"><TrashIcon /></button>
                                        </div>
                                        <div className="form-grid implementation-card-grid">
                                            <div className="form-field">
                                                <label>Nome</label>
                                                <input type="text" value={item.nome || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'nome', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Cargo</label>
                                                <input type="text" value={item.cargo || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'cargo', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>E-mail</label>
                                                <input type="email" value={item.email || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'email', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Telefones</label>
                                                <input type="text" value={item.telefones || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'telefones', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Comunicação</label>
                                                <input type="text" value={item.comunicacao || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'comunicacao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Local de Atuação</label>
                                                <input type="text" value={item.localAtuacao || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'localAtuacao', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Líder Imediato</label>
                                                <input type="text" value={item.liderImediato || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'liderImediato', e.target.value)} />
                                            </div>
                                             <div className="form-field">
                                                <label>E-mail Líder</label>
                                                <input type="email" value={item.emailLiderImediato || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'emailLiderImediato', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Unidade/Filial</label>
                                                <input type="text" value={item.unidadeFilial || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'unidadeFilial', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Área</label>
                                                <input type="text" value={item.area || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'area', e.target.value)} />
                                            </div>
                                            <div className="form-field">
                                                <label>Gestor da Área</label>
                                                <input type="text" value={item.gestorArea || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'gestorArea', e.target.value)} />
                                            </div>
                                            <div className="form-field full-width">
                                                <label>Comunicação Envolvida</label>
                                                <input type="text" value={item.comunicacaoEnvolvida || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'comunicacaoEnvolvida', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="empty-state-message">Nenhum contato adicionado.</p>}
                        </div>
                        <button type="button" onClick={() => addRow('contatos', { nome: '', cargo: '', email: '', telefones: '', comunicacao: '', localAtuacao: '', liderImediato: '', emailLiderImediato: '', unidadeFilial: '', area: '', gestorArea: '', comunicacaoEnvolvida: '' })} className="submit-btn add-row-btn">+ Adicionar Contato</button>
                    </div>
                )}

                {currentStep === 9 && (
                    <div className="step-content">
                         <h2>{steps[9]}</h2>
                         <div className="accordion">
                             {Object.entries(groupedChecklist).map(([scope, items]) => 
                                 renderChecklistGroup(items, 'checklist')
                             )}
                         </div>
                    </div>
                )}

                {currentStep === 10 && formData.informacoesGerais.referenteSAP === 'Sim' && (
                    <div className="step-content">
                        <h2>{steps[10]}</h2>
                         <div className="accordion">
                             {Object.entries(groupedChecklistSAP).map(([scope, items]) => 
                                 renderChecklistGroup(items, 'checklistSAP')
                             )}
                         </div>
                    </div>
                )}

                {currentStep === 11 && (
                    <div className="step-content">
                        <h2>{steps[11]}</h2>
                        <div className="card-like-section">
                            <label className="file-input-label">
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={handleFileChange} 
                                    style={{ display: 'none' }} 
                                    disabled={!canUpload}
                                />
                                {canUpload ? (
                                    <>
                                        <span style={{fontSize: '2rem', display: 'block', marginBottom: '0.5rem'}}>☁️</span>
                                        <span>Clique para selecionar arquivos ou arraste-os aqui</span>
                                        <span style={{display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.5rem'}}>Max: 10 arquivos</span>
                                    </>
                                ) : (
                                    <span>Limite de anexos atingido.</span>
                                )}
                            </label>
                            
                            {formData.anexos.length > 0 && (
                                <ul className="file-list">
                                    {formData.anexos.map((file, index) => (
                                        <li key={index}>
                                            <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                                            <button type="button" onClick={() => removeAnexo(index)} className="action-button remove-row-btn">&times;</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {currentStep === steps.length - 1 && submittedRequestId && (
                    <div className="step-content success-message">
                        <div style={{textAlign: 'center', padding: '2rem'}}>
                            <div style={{fontSize: '4rem', color: 'var(--status-approved)', marginBottom: '1rem'}}>✓</div>
                            <h2>Requisição Submetida com Sucesso!</h2>
                            <p style={{fontSize: '1.2rem', margin: '1rem 0'}}>
                                O ID da sua requisição é: <strong>{submittedRequestId}</strong>
                            </p>
                            <p>Para finalizar o processo, clique no botão abaixo para gerar o e-mail de solicitação para o CAB.</p>
                            
                            <div style={{margin: '2rem 0', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                                <a href={mailtoLink} className="submit-btn" style={{textDecoration: 'none', display: 'inline-block'}}>
                                    📧 Enviar E-mail para o CAB
                                </a>
                            </div>
                            
                            <div style={{marginTop: '2rem', borderTop: '1px solid var(--sipal-gray)', paddingTop: '1rem'}}>
                                <button 
                                    type="button"
                                    className="nav-button secondary" 
                                    onClick={() => window.location.reload()}
                                >
                                    Voltar ao Início
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Footer - Sticky */}
                {(!submittedRequestId) && (
                    <div className="wizard-nav-sticky">
                         <div>
                            <span style={{fontSize: '0.9rem', color: 'var(--sipal-teal)', fontWeight: '600'}}>
                                {autoSaveStatus}
                            </span>
                            <button 
                                type="button" 
                                onClick={handleManualSaveDraft} 
                                className="nav-button secondary" 
                                style={{ marginLeft: '1rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                            >
                                Salvar Rascunho
                            </button>
                         </div>
                        <div className="main-nav-buttons">
                            <button type="button" onClick={handleBack} className="nav-button secondary" disabled={currentStep === 0}>Voltar</button>
                            {currentStep === visibleStepIndexes[visibleStepIndexes.length - 2] ? (
                                <button type="button" onClick={handleSubmit} className="submit-btn">Finalizar e Enviar</button>
                            ) : (
                                <button type="button" onClick={handleNext} className="nav-button">Próximo</button>
                            )}
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [requests, setRequests] = useState([]);
    const [drafts, setDrafts] = useState([]);
    
    // Kanban status simulation
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
        // Load requests from localStorage
        const storedRequests = localStorage.getItem('cab-requests');
        if (storedRequests) {
            setRequests(JSON.parse(storedRequests));
        }
        
        // Load drafts
        const storedDrafts = localStorage.getItem('cab-drafts');
        if (storedDrafts) {
            setDrafts(JSON.parse(storedDrafts));
        }
        
        // Check if user is logged in
        const storedUser = sessionStorage.getItem('cab-user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogin = (email, password) => {
        // Simple mock login
        if (password === '123456') {
            const userData = { name: 'Usuário Teste', email };
            setUser(userData);
            sessionStorage.setItem('cab-user', JSON.stringify(userData));
            return true;
        }
        return false;
    };
    
    const handleRegister = (name, email, password) => {
        const userData = { name, email };
        setUser(userData);
        sessionStorage.setItem('cab-user', JSON.stringify(userData));
        return true;
    };

    const handleLogout = () => {
        setUser(null);
        sessionStorage.removeItem('cab-user');
        setActiveTab('home');
    };

    const addRequest = (formData, draftIdToDelete = null) => {
        const classificationMap = {
            'Emergencial': 'EMG',
            'Planejada': 'PLN',
            'Padrão': 'PRD'
        };

        const classification = formData.informacoesGerais.classificacao;
        const typeCode = classificationMap[classification] || 'PRD';
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}${month}${day}`;
        
        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random number

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
        
        if (draftIdToDelete) {
            deleteDraft(draftIdToDelete);
        }
        
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
        
        // If deleting current active draft from localStorage form state
        const currentFormState = localStorage.getItem(WIZARD_STORAGE_KEY);
        if (currentFormState) {
            const parsed = JSON.parse(currentFormState);
            if (parsed.draftId === draftId) {
                localStorage.removeItem(WIZARD_STORAGE_KEY);
            }
        }
    };

    const continueDraft = (draftId) => {
        const draft = drafts.find(d => d.id === draftId);
        if (draft) {
            localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ formData: draft.formData, draftId: draft.id }));
            setActiveTab('newRequest');
        }
    };
    
    const createFromCopy = (request) => {
        const copiedData = JSON.parse(JSON.stringify(request.formData));
        
        // Reset specific fields for a new copy (Dates)
        copiedData.informacoesGerais.dataMudanca = '';
        copiedData.informacoesGerais.indisponibilidadeInicio = '';
        copiedData.informacoesGerais.indisponibilidadeFim = '';
        
        // Reset requested sections (Transport Map, Checklists)
        copiedData.mapaTransporte = []; // Clear Transport Map

        // Reset Checklist (Standard) - Reset answers to initial state but keep questions
        copiedData.checklist = initialFormData.checklist.map(item => ({ 
            ...item, 
            answer: '', 
            docLink: '', 
            justification: '' 
        }));

        // Reset Checklist (SAP) - Reset answers to initial state but keep questions
        copiedData.checklistSAP = initialFormData.checklistSAP.map(item => ({ 
            ...item, 
            answer: '', 
            docLink: '', 
            justification: '', 
            observacao: '' 
        }));
        
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ formData: copiedData, draftId: null }));
        setActiveTab('newRequest');
        // Refresh not needed if component remounts on tab switch, but safer if activeTab doesn't change
        // Since we are likely already on 'myRequests', switching to 'newRequest' is a change.
    };

    const handleAdminNewRequest = () => {
        localStorage.removeItem(WIZARD_STORAGE_KEY);
        setActiveTab('newRequest');
        window.location.reload();
    };

    if (!user) {
        return <AuthPage onLogin={handleLogin} onRegister={handleRegister} users={[]} />;
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
                        onCreateFromCopy={createFromCopy}
                        onAdminNewRequest={handleAdminNewRequest}
                    />
                )}
                {activeTab === 'analysis' && (
                    <AnalysisPage requests={requests} onAdminNewRequest={handleAdminNewRequest} />
                )}
            </main>
        </>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}