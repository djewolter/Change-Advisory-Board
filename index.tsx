
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';

// As per the brand guide, page 10
const sipalBlue = '#012169';
const sipalTeal = '#008479';

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
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
            aria-current={activeTab === 'analysis' ? 'page' : undefined}
        >
            Controle de Solicitações
        </button>
    </nav>
);

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
                {/* FIX: Add Array.isArray check to ensure requests is an array before calling .map(), preventing runtime errors if it is not an array (e.g. due to corrupted data from localStorage). */}
                {/* FIX: Add a check for 'req' being truthy to prevent errors if the array contains null/undefined entries. */}
                {Array.isArray(requests) && requests.length > 0 ? requests.map(req => (
                    req && (
                        <tr key={req.id}>
                            <td>{req.id}</td>
                            <td>{req.title}</td>
                            <td>{req.leader}</td>
                            <td>{req.classification}</td>
                            <td><span className={`status-badge status-${req.status.toLowerCase()}`}>{kanbanStatuses[req.status] || req.status}</span></td>
                        </tr>
                    )
                )) : (
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
        {/* FIX: Ensure `requests` is an array before slicing and passing to RequestList. */}
        <RequestList requests={(Array.isArray(requests) ? requests : []).slice(0, 5)} kanbanStatuses={kanbanStatuses} />
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

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
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

const AnalysisPage = ({ requests }) => {
    const steps = [
        "Informações Gerais", "Plano de Implantação", "Mapa de Transporte", "Caderno de Testes", 
        "Plano de Retorno", "Plano de Comunicação", "Risco de Mudança", "Segurança e Acessos", 
        "Contatos", "Checklist", "Checklist SAP", "Anexos e Envio", "Análise e Finalização"
    ];

    const handleDownloadFullRequestPdf = (request) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        
        const { formData } = request;

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
        doc.text(`Requisição de Mudança - ${request.id}`, pageWidth / 2, y, { align: 'center' });
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
                // Store original color to reset it later
                const originalColor = doc.getTextColor();
                doc.setTextColor(0, 0, 255); // Blue color for links
                doc.text(valueLines, valueColX, y);
                doc.setTextColor(originalColor);
            } else {
                doc.text(valueLines, valueColX, y);
            }
        
            if (isLink) {
                // Add the invisible link area over the text.
                const textMetrics = doc.getTextDimensions('T');
                const topOfTextBlock = y - textMetrics.h; // Approximate top of the text block
                const totalTextBlockHeight = valueLines.length * lineHeight; // Total height
                
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
                    if (col.key === 'id') return; // Skip ID if it's just index
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
    
        doc.save(`${request.id}_${informacoesGerais.liderMudanca.replace(/\s/g, '_')}_${informacoesGerais.dataMudanca}.pdf`);
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
                    <h2>Controle de Solicitações</h2>
                    <button 
                        onClick={handleExportToExcel} 
                        className="submit-btn" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <DownloadIcon />
                        Exportar para Excel
                    </button>
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
        </div>
    );
};


const WIZARD_STORAGE_KEY = 'cab-form-in-progress';
const steps = [
    "Informações Gerais", "Plano de Implantação", "Mapa de Transporte", "Caderno de Testes", 
    "Plano de Retorno", "Plano de Comunicação", "Risco de Mudança", "Segurança e Acessos", 
    "Contatos", "Checklist", "Checklist SAP", "Anexos e Envio", "Análise e Finalização"
];

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
        partesEnvolvidasValidaramJustification: '',
        processoAcompanhamentoComunicado: '',
        processoAcompanhamentoComunicadoJustification: '',
        comunicacaoEventoRetorno: '',
        comunicacaoEventoRetornoJustification: '',
        passoAPassoAplicacao: '',
        passoAPassoAplicacaoJustification: '',
        tabelaContatosPreenchida: '',
        tabelaContatosPreenchidaJustification: '',
        pontosFocaisInformados: '',
        pontosFocaisInformadosJustification: '',
    },
    planoRiscos: [] as any[],
    riscosGerais: {
        planoRetornoClaro: '',
        planoRetornoClaroJustification: '',
        stakeholdersConsultados: '',
        stakeholdersConsultadosJustification: '',
    },
    cadernoTestes: [] as any[],
    segurancaAcessos: {
        perfis: [] as any[],
    },
    contatos: [] as any[],
    anexos: [] as Anexo[],
};

// FIX: Add explicit types for props and make `children` optional to resolve TypeScript errors.
// This handles cases where the component might be used without children or there are type inference issues.
// Tooltip Component
const Tooltip = ({ text, children }: { text: string; children?: React.ReactNode }) => (
    <div className="tooltip-container">
        {children}
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
        // FIX: Ensure 'selected' is an array before using array methods to prevent runtime errors.
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
        // FIX: Ensure options is an array before filtering.
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
                    {/* FIX: Ensure 'selected' is an array before calling .map() to prevent runtime errors. */}
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
                                        {/* FIX: Ensure options is an array before mapping. */}
                                        {Array.isArray(options) && options.map(option => (
                                            <div key={option} className="multi-select-option-item" onClick={() => handleSelect(option)}>
                                                {/* FIX: Ensure 'selected' is an array before calling .includes() to prevent runtime errors. */}
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


// Main Wizard Component
const NewRequestPage = ({ addRequest, currentUser }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});
    const [validationErrors, setValidationErrors] = useState([]);
    const [completedSteps, setCompletedSteps] = useState({});
    
    const [isBypassModalOpen, setIsBypassModalOpen] = useState(false);
    const [bypassPassword, setBypassPassword] = useState('');
    const [bypassError, setBypassError] = useState('');
    const [isValidationBypassed, setIsValidationBypassed] = useState(false);
    
    const [formData, setFormData] = useState<typeof initialFormData>(() => {
        const getInitialState = () => {
            const newForm = JSON.parse(JSON.stringify(initialFormData)); // Deep copy
            if (currentUser?.name) {
                newForm.informacoesGerais.solicitante = currentUser.name;
            }
            return newForm;
        };

        try {
            const savedData = localStorage.getItem(WIZARD_STORAGE_KEY);
            if (!savedData) {
                return getInitialState();
            }

            const parsed = JSON.parse(savedData);
            if (typeof parsed !== 'object' || parsed === null) {
                return getInitialState();
            }
            
            const baseState = getInitialState();

            const merged = {
                ...baseState,
                ...parsed,
                informacoesGerais: { ...baseState.informacoesGerais, ...(parsed.informacoesGerais || {}) },
                riscosGerais: { ...baseState.riscosGerais, ...(parsed.riscosGerais || {}) },
                comunicacaoChecklist: { ...baseState.comunicacaoChecklist, ...(parsed.comunicacaoChecklist || {}) },
                segurancaAcessos: { ...baseState.segurancaAcessos, ...(parsed.segurancaAcessos || {}) },
            };

            const arrayKeys: (keyof typeof initialFormData)[] = [
                'planoImplantacao', 'mapaTransporte', 'planoRetorno', 'planoComunicacao', 'planoRiscos',
                'cadernoTestes', 'contatos', 'anexos', 'checklist', 'checklistSAP'
            ];

            arrayKeys.forEach(key => {
                if (!Array.isArray(merged[key])) {
                    merged[key] = initialFormData[key];
                }
            });

            if (!Array.isArray(merged.informacoesGerais.servicosAfetados)) merged.informacoesGerais.servicosAfetados = [];
            if (!Array.isArray(merged.informacoesGerais.sistemasAfetados)) merged.informacoesGerais.sistemasAfetados = [];
            if (!Array.isArray(merged.informacoesGerais.frentesSAP)) merged.informacoesGerais.frentesSAP = [];
            if (!Array.isArray(merged.segurancaAcessos.perfis)) merged.segurancaAcessos.perfis = [];
            
            return merged;

        } catch (error) {
            console.error("Failed to parse form data from localStorage, resetting form.", error);
            localStorage.removeItem(WIZARD_STORAGE_KEY);
            return getInitialState();
        }
    });
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    const minDate = `${yyyy}-${mm}-${dd}`;
    const minDateTime = `${minDate}T00:00`;

    useEffect(() => {
        try {
            localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(formData));
        } catch (error) {
            console.error("Failed to save form data to localStorage", error);
        }
    }, [formData]);

    const formRef = useRef<HTMLFormElement>(null);

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
                if (informacoesGerais.referenteSAP === 'Sim') {
                    if (informacoesGerais.frentesSAP.length === 0) errors.push({ field: 'informacoesGerais_frentesSAP', message: 'Selecione ao menos uma "Frente SAP".' });
                }
                break;
            case 1: // Plano de Implantação
                if (planoImplantacao.length === 0) { errors.push({ field: 'planoImplantacao_empty', message: 'Adicione pelo menos uma atividade ao "Plano de Implantação".' }); }
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(planoImplantacao) && planoImplantacao.forEach((row, index) => {
                    if (!row.descricao?.trim()) errors.push({ field: `planoImplantacao_${index}_descricao`, message: `A "Descrição" da atividade #${index + 1} no Plano de Implantação é obrigatória.` });
                    if (!row.responsavel?.trim()) errors.push({ field: `planoImplantacao_${index}_responsavel`, message: `O "Responsável" da atividade #${index + 1} no Plano de Implantação é obrigatório.` });
                });
                break;
            case 2: // Mapa de Transporte
                 if (informacoesGerais.referenteSAP === 'Sim' && mapaTransporte.length === 0) {
                    errors.push({ field: 'mapaTransporte_empty', message: 'Adicione pelo menos uma request ao "Mapa de Transporte".' });
                }
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(mapaTransporte) && mapaTransporte.forEach((row, index) => {
                    if (!row.request?.trim()) errors.push({ field: `mapaTransporte_${index}_request`, message: `O "ID da Request" #${index + 1} é obrigatório.` });
                    if (!row.objetivoRequest?.trim()) errors.push({ field: `mapaTransporte_${index}_objetivoRequest`, message: `O "Objetivo da Request" #${index + 1} é obrigatório.` });
                    if (!row.responsavelCriacao?.trim()) errors.push({ field: `mapaTransporte_${index}_responsavelCriacao`, message: `O "Responsável pela Criação" da request #${index + 1} é obrigatório.` });
                    if (!row.responsavelImportacao?.trim()) errors.push({ field: `mapaTransporte_${index}_responsavelImportacao`, message: `O "Responsável pela Importação" da request #${index + 1} é obrigatório.` });
                });
                break;
            case 3: // Caderno de Testes
                if (cadernoTestes.length === 0) { errors.push({ field: 'cadernoTestes_empty', message: 'Adicione pelo menos um caso de teste ao "Caderno de Testes".' }); }
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(cadernoTestes) && cadernoTestes.forEach((row, index) => {
                    if (!row.atividade?.trim()) errors.push({ field: `cadernoTestes_${index}_atividade`, message: `A "Atividade" do teste #${index + 1} é obrigatória.` });
                    if (!row.responsavel?.trim()) errors.push({ field: `cadernoTestes_${index}_responsavel`, message: `O "Responsável" do teste #${index + 1} é obrigatório.` });
                });
                break;
            case 4: // Plano de Retorno
                if (planoRetorno.length === 0) { errors.push({ field: 'planoRetorno_empty', message: 'Adicione pelo menos uma etapa ao "Plano de Retorno".' }); }
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(planoRetorno) && planoRetorno.forEach((row, index) => {
                    if (!row.descricao?.trim()) errors.push({ field: `planoRetorno_${index}_descricao`, message: `A "Descrição" da etapa de retorno #${index + 1} é obrigatória.` });
                    if (!row.responsavel?.trim()) errors.push({ field: `planoRetorno_${index}_responsavel`, message: `O "Responsável" da etapa de retorno #${index + 1} é obrigatório.` });
                });
                break;
            case 5: // Plano de Comunicação
                if (!comunicacaoChecklist.partesEnvolvidasValidaram) errors.push({ field: `comunicacaoChecklist_partesEnvolvidasValidaram`, message: `A pergunta 1 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.partesEnvolvidasValidaram === 'Não' || comunicacaoChecklist.partesEnvolvidasValidaram === 'N/A') && !comunicacaoChecklist.partesEnvolvidasValidaramJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_partesEnvolvidasValidaramJustification`, message: `A pergunta 1 do Plano de Comunicação requer uma justificativa.` });
                }

                if (!comunicacaoChecklist.processoAcompanhamentoComunicado) errors.push({ field: `comunicacaoChecklist_processoAcompanhamentoComunicado`, message: `A pergunta 2 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.processoAcompanhamentoComunicado === 'Não' || comunicacaoChecklist.processoAcompanhamentoComunicado === 'N/A') && !comunicacaoChecklist.processoAcompanhamentoComunicadoJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_processoAcompanhamentoComunicadoJustification`, message: `A pergunta 2 do Plano de Comunicação requer uma justificativa.` });
                }
                
                if (!comunicacaoChecklist.comunicacaoEventoRetorno) errors.push({ field: `comunicacaoChecklist_comunicacaoEventoRetorno`, message: `A pergunta 3 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.comunicacaoEventoRetorno === 'Não' || comunicacaoChecklist.comunicacaoEventoRetorno === 'N/A') && !comunicacaoChecklist.comunicacaoEventoRetornoJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_comunicacaoEventoRetornoJustification`, message: `A pergunta 3 do Plano de Comunicação requer uma justificativa.` });
                }
                
                if (!comunicacaoChecklist.passoAPassoAplicacao) errors.push({ field: `comunicacaoChecklist_passoAPassoAplicacao`, message: `A pergunta 4 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.passoAPassoAplicacao === 'Não' || comunicacaoChecklist.passoAPassoAplicacao === 'N/A') && !comunicacaoChecklist.passoAPassoAplicacaoJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_passoAPassoAplicacaoJustification`, message: `A pergunta 4 do Plano de Comunicação requer uma justificativa.` });
                }
                
                if (!comunicacaoChecklist.tabelaContatosPreenchida) errors.push({ field: `comunicacaoChecklist_tabelaContatosPreenchida`, message: `A pergunta 5 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.tabelaContatosPreenchida === 'Não' || comunicacaoChecklist.tabelaContatosPreenchida === 'N/A') && !comunicacaoChecklist.tabelaContatosPreenchidaJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_tabelaContatosPreenchidaJustification`, message: `A pergunta 5 do Plano de Comunicação requer uma justificativa.` });
                }

                if (!comunicacaoChecklist.pontosFocaisInformados) errors.push({ field: `comunicacaoChecklist_pontosFocaisInformados`, message: `A pergunta 6 do Plano de Comunicação precisa de uma resposta.` });
                else if ((comunicacaoChecklist.pontosFocaisInformados === 'Não' || comunicacaoChecklist.pontosFocaisInformados === 'N/A') && !comunicacaoChecklist.pontosFocaisInformadosJustification?.trim()) {
                    errors.push({ field: `comunicacaoChecklist_pontosFocaisInformadosJustification`, message: `A pergunta 6 do Plano de Comunicação requer uma justificativa.` });
                }

                if (planoComunicacao.length === 0) { errors.push({ field: 'planoComunicacao_empty', message: 'Adicione pelo menos um item ao "Plano de Comunicação".' }); }
                Array.isArray(planoComunicacao) && planoComunicacao.forEach((row, index) => {
                    if (!row.atividade?.trim()) errors.push({ field: `planoComunicacao_${index}_atividade`, message: `A "Atividade/Público" da comunicação #${index + 1} é obrigatória.` });
                    if (!row.responsavel?.trim()) errors.push({ field: `planoComunicacao_${index}_responsavel`, message: `O "Responsável" da comunicação #${index + 1} é obrigatória.` });
                });
                break;
            case 6: // Risco de Mudança
                if (!riscosGerais.planoRetornoClaro) errors.push({ field: `riscosGerais_planoRetornoClaro`, message: `A pergunta 1 de Risco de Mudança precisa de uma resposta.` });
                else if ((riscosGerais.planoRetornoClaro === 'Não' || riscosGerais.planoRetornoClaro === 'N/A') && !riscosGerais.planoRetornoClaroJustification?.trim()) {
                    errors.push({ field: `riscosGerais_planoRetornoClaroJustification`, message: `A pergunta 1 de Risco de Mudança requer uma justificativa.` });
                }
                
                if (!riscosGerais.stakeholdersConsultados) errors.push({ field: `riscosGerais_stakeholdersConsultados`, message: `A pergunta 2 de Risco de Mudança precisa de uma resposta.` });
                else if ((riscosGerais.stakeholdersConsultados === 'Não' || riscosGerais.stakeholdersConsultados === 'N/A') && !riscosGerais.stakeholdersConsultadosJustification?.trim()) {
                    errors.push({ field: `riscosGerais_stakeholdersConsultadosJustification`, message: `A pergunta 2 de Risco de Mudança requer uma justificativa.` });
                }

                if (planoRiscos.length === 0) { errors.push({ field: 'planoRiscos_empty', message: 'Adicione pelo menos um risco ao "Risco de Mudança".' }); }
                Array.isArray(planoRiscos) && planoRiscos.forEach((row, index) => {
                    if (!row.risco?.trim()) errors.push({ field: `planoRiscos_${index}_risco`, message: `A descrição do "Risco" #${index + 1} é obrigatória.` });
                    if (!row.acao?.trim()) errors.push({ field: `planoRiscos_${index}_acao`, message: `A "Ação" para o risco #${index + 1} é obrigatória.` });
                });
                break;
            case 7: // Segurança e Acessos
                if (segurancaAcessos.perfis.length === 0) {
                    errors.push({ field: 'segurancaAcessos_empty', message: 'Adicione pelo menos um perfil de acesso.' });
                }
                Array.isArray(segurancaAcessos.perfis) && segurancaAcessos.perfis.forEach((row, index) => {
                    if (!row.nivelAcesso?.trim()) errors.push({ field: `segurancaAcessos_${index}_nivelAcesso`, message: `O "Nível de acesso" do perfil #${index + 1} é obrigatório.` });
                    if (!row.justificativa?.trim()) errors.push({ field: `segurancaAcessos_${index}_justificativa`, message: `A "Justificativa" do perfil #${index + 1} é obrigatória.` });
                });
                break;
            case 8: // Contatos
                if (contatos.length === 0) { errors.push({ field: 'contatos_empty', message: 'Adicione pelo menos um contato de escalonamento.' }); }
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(contatos) && contatos.forEach((row, index) => {
                    if (!row.nome?.trim()) errors.push({ field: `contatos_${index}_nome`, message: `O "Nome" do contato #${index + 1} é obrigatório.` });
                    if (!row.email?.trim()) errors.push({ field: `contatos_${index}_email`, message: `O "E-mail" para o contato #${index + 1} é obrigatório.` });
                });
                break;
            case 9: // Checklist
                // FIX: Add Array.isArray check to safely call forEach.
                Array.isArray(checklist) && checklist.forEach((item, index) => {
                    if (!item.answer) {
                        errors.push({ field: `checklist_${index}_answer`, message: `A pergunta sobre "${item.scope}" precisa de uma resposta.` });
                    } else if ((item.answer === 'Não' || item.answer === 'N/A') && !item.justification.trim()) {
                        errors.push({ field: `checklist_${index}_justification`, message: `A pergunta sobre "${item.scope}" requer uma justificativa.` });
                    }
                });
                break;
            case 10: // Checklist SAP
                if (informacoesGerais.referenteSAP === 'Sim') {
                    // FIX: Add Array.isArray check to safely call forEach.
                    const items = formData.checklistSAP;
                    if (Array.isArray(items)) {
                        items.forEach((item, index) => {
                            if (!item.answer) {
                                errors.push({ field: `checklistSAP_${index}_answer`, message: `A pergunta SAP sobre "${item.scope}" precisa de uma resposta.` });
                            } else if ((item.answer === 'Não' || item.answer === 'N/A') && !item.justification.trim()) {
                                errors.push({ field: `checklistSAP_${index}_justification`, message: `A pergunta SAP sobre "${item.scope}" requer uma justificativa.` });
                            }
                        });
                    }
                }
                break;
        }
    
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleNext = () => {
        if (isValidationBypassed) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
            window.scrollTo(0, 0);
            return;
        }

        // Se a etapa atual for SAP e não for aplicável, pula para a próxima
        if (currentStep === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
            setCompletedSteps(prev => ({ ...prev, [currentStep]: true }));
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
            window.scrollTo(0, 0);
            return;
        }

        if (validateStep(currentStep)) {
            setCompletedSteps(prev => ({ ...prev, [currentStep]: true }));
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
             window.scrollTo(0, 0);
        } else {
            setCompletedSteps(prev => ({ ...prev, [currentStep]: false }));
            formRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        setValidationErrors([]); // Clear errors when going back
        let prevStep = currentStep - 1;
        // Se a etapa anterior for a do checklist SAP e não for aplicável, pule-a
        if (prevStep === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
            prevStep--;
        }
        setCurrentStep(Math.max(prevStep, 0));
        window.scrollTo(0, 0);
    };
    
    const goToStep = (stepIndex) => {
        // Se tentando pular para o checklist SAP e não for aplicável, não faz nada
        if (stepIndex === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
            return;
        }
        
        if (isValidationBypassed && stepIndex > currentStep) {
            setCurrentStep(stepIndex);
            return;
        }

        if (stepIndex > currentStep) {
            let allStepsValid = true;
            for (let i = currentStep; i < stepIndex; i++) {
                 // Pula a validação do Checklist SAP se não for referente ao SAP
                if (i === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
                    continue;
                }
                if (!validateStep(i)) {
                    allStepsValid = false;
                    setCurrentStep(i); // Stay on the first invalid step
                    break;
                }
            }
            if(allStepsValid) setCurrentStep(stepIndex);
        } else {
             setCurrentStep(stepIndex);
        }
    }

    const handleChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };
    
    const handleDynamicTableChange = (section: keyof typeof initialFormData, index: number, field: string, value: any) => {
        let finalValue = value;
        if (field === 'tempoExecucao' || field === 'tempoEstimado') {
            finalValue = String(value).replace(/[^0-9:]/g, '');
        }

        setFormData(prev => {
            const sectionData = prev[section];
            if(Array.isArray(sectionData)) {
                const newTable = [...sectionData];
                newTable[index] = { ...newTable[index], [field]: finalValue };
                return { ...prev, [section]: newTable };
            }
            return prev;
        });
    };

    const addTableRow = (section: keyof typeof initialFormData, newRowObject: any) => {
        setFormData(prev => {
            const sectionData = prev[section];
            if (Array.isArray(sectionData)) {
                return {
                    ...prev,
                    [section]: [...sectionData, { ...newRowObject, tempId: newId() }]
                };
            }
            return prev;
        });
    };

    // FIX: Added Array.isArray check to prevent calling .filter on non-array state.
    const removeTableRow = (section: keyof typeof initialFormData, index: number) => {
        setFormData(prev => {
            const sectionData = prev[section];
            if (Array.isArray(sectionData)) {
                return {
                    ...prev,
                    [section]: sectionData.filter((_, i) => i !== index)
                };
            }
            return prev;
        });
    };
    
    const handleSegurancaPerfisChange = (index, field, value) => {
        setFormData(prev => {
            // FIX: Ensure that 'perfis' is an array and handle potential undefined parent object.
            const currentPerfis = Array.isArray(prev.segurancaAcessos?.perfis) ? prev.segurancaAcessos.perfis : [];
            const newPerfis = [...currentPerfis];
            newPerfis[index] = { ...(newPerfis[index] || {}), [field]: value };
            return { ...prev, segurancaAcessos: { ...prev.segurancaAcessos, perfis: newPerfis } };
        });
    };
    
    const addSegurancaPerfil = (newRowObject) => {
        setFormData(prev => ({
            ...prev,
            // FIX: Ensure that 'perfis' is an array before spreading and handle potential undefined parent object.
            segurancaAcessos: { ...prev.segurancaAcessos, perfis: [...(Array.isArray(prev.segurancaAcessos?.perfis) ? prev.segurancaAcessos.perfis : []), { ...newRowObject, tempId: newId() }] }
        }));
    };
    
    // FIX: Added an Array.isArray check and optional chaining to safely filter security profiles.
    const removeSegurancaPerfil = (index) => {
        setFormData(prev => ({
            ...prev,
            segurancaAcessos: { ...prev.segurancaAcessos, perfis: (Array.isArray(prev.segurancaAcessos?.perfis) ? prev.segurancaAcessos.perfis : []).filter((_, i) => i !== index) }
        }));
    };

    const handleChecklistChange = (checklistKey: 'checklist' | 'checklistSAP', index: number, field: string, value: string) => {
        setFormData(prev => {
           const newChecklist = [...prev[checklistKey]];
           newChecklist[index] = { ...newChecklist[index], [field]: value };
           return { ...prev, [checklistKey]: newChecklist };
        });
    };

    const handleAnexosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputFiles = e.target.files;
        if (!inputFiles) return;
    
        const newFiles: Anexo[] = [];
        for (let i = 0; i < inputFiles.length; i++) {
            const file = inputFiles[i];
            if (file) {
                newFiles.push({ name: file.name, size: file.size, type: file.type });
            }
        }
        // FIX: Ensure that 'anexos' is an array before spreading to prevent runtime errors, especially with corrupted data.
        setFormData(prev => ({...prev, anexos: [...(Array.isArray(prev.anexos) ? prev.anexos : []), ...newFiles]}));
    };

    const removeAnexo = (index: number) => {
        // FIX: Ensure that 'anexos' is an array before filtering to prevent runtime errors.
        setFormData(prev => ({ ...prev, anexos: (Array.isArray(prev.anexos) ? prev.anexos : []).filter((_, i) => i !== index) }));
    };

    const handleSubmit = () => {
        if (!isValidationBypassed) {
            for (let i = 0; i < steps.length -1; i++) {
                // Pula validação do checklist SAP se não for aplicável
                if (i === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
                    continue;
                }
                if(!validateStep(i)) {
                    setCurrentStep(i);
                    alert(`Existem erros na etapa "${steps[i]}". Por favor, corrija-os antes de enviar.`);
                    return;
                }
            }
        }
        
        const confirmationMessage = isValidationBypassed 
            ? "Você está enviando a requisição em Modo Admin, que pode conter dados incompletos. Deseja continuar?"
            : "Todos os dados parecem corretos. Deseja enviar a requisição?";

        if (window.confirm(confirmationMessage)) {
            addRequest(formData, currentUser);
            localStorage.removeItem(WIZARD_STORAGE_KEY);
            // Reset form state after submission
            const newForm = { ...initialFormData };
            if (currentUser?.name) {
                newForm.informacoesGerais.solicitante = currentUser.name;
            }
            setFormData(newForm);
            setCurrentStep(0);
            setCompletedSteps({});
            setIsValidationBypassed(false);
        }
    };
    
    const handleBypassSubmit = () => {
        if (bypassPassword === 'PMO@2025') {
            setIsValidationBypassed(true);
            setIsBypassModalOpen(false);
            setBypassPassword('');
            setBypassError('');
        } else {
            setBypassError('Senha incorreta.');
        }
    };

    const handleGenerateFullPdf = () => {
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
        doc.text('Documento de Requisição de Mudança', pageWidth / 2, y, { align: 'center' });
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
                // Store original color to reset it later
                const originalColor = doc.getTextColor();
                doc.setTextColor(0, 0, 255); // Blue color for links
                doc.text(valueLines, valueColX, y);
                doc.setTextColor(originalColor);
            } else {
                doc.text(valueLines, valueColX, y);
            }
        
            if (isLink) {
                // Add the invisible link area over the text.
                const textMetrics = doc.getTextDimensions('T');
                const topOfTextBlock = y - textMetrics.h; // Approximate top of the text block
                const totalTextBlockHeight = valueLines.length * lineHeight; // Total height
                
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
                    if (col.key === 'id') return; // Skip ID if it's just index
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
    
        doc.save(`RDM_${informacoesGerais.liderMudanca.replace(/\s/g, '_')}_${informacoesGerais.dataMudanca}.pdf`);
    };

    const isFieldInvalid = (fieldName) => validationErrors.some(err => err.field === fieldName);

    const renderStepContent = () => {
        const DynamicTable = ({ title, section, data, columns, newRowObject, onAdd, onRemove, onChange, tableErrorField }: {
            title: React.ReactNode;
            section: keyof typeof initialFormData;
            data: any[];
            columns: { key: string; label: string; type?: string; options?: string[], placeholder?: string }[];
            newRowObject: any;
            onAdd: (section: keyof typeof initialFormData, newRowObject: any) => void;
            onRemove: (section: keyof typeof initialFormData, index: number) => void;
            onChange: (section: keyof typeof initialFormData, index: number, field: string, value: any) => void;
            tableErrorField: string;
        }) => (
            <>
                <h3>{title}</h3>
                {isFieldInvalid(tableErrorField) && <p className="table-error-message">{(validationErrors.find(e => e.field === tableErrorField) as any).message}</p>}
                <div className="dynamic-table">
                    <table>
                        <thead>
                            <tr>
                                {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                                {Array.isArray(columns) && columns.map(col => <th key={col.key}>{col.label}</th>)}
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                            {Array.isArray(data) && data.length > 0 ? data.map((row, index) => (
                                <tr key={row.tempId || index}>
                                    {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                                    {Array.isArray(columns) && columns.map(col => (
                                        <td key={col.key}>
                                            {col.key === 'id' ? (
                                                <span>{index + 1}</span>
                                            ) : col.type === 'select' ? (
                                                <select value={row[col.key] || ''} onChange={(e) => onChange(section, index, col.key, e.target.value)} className={isFieldInvalid(`${section}_${index}_${col.key}`) ? 'validation-error-field' : ''}>
                                                    {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                                                    {Array.isArray(col.options) && col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <input type={col.type || 'text'} value={row[col.key] || ''} onChange={(e) => onChange(section, index, col.key, e.target.value)} className={isFieldInvalid(`${section}_${index}_${col.key}`) ? 'validation-error-field' : ''} placeholder={col.placeholder || ''}/>
                                            )}
                                        </td>
                                    ))}
                                    <td className="action-cell">
                                        <button type="button" className="action-button remove-row-btn" onClick={() => onRemove(section, index)}><TrashIcon /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    {/* FIX: Add Array.isArray check to prevent accessing .length on non-array state. */}
                                    <td colSpan={(Array.isArray(columns) ? columns.length : 0) + 1} style={{textAlign: 'center', padding: '1rem'}}>Nenhum item adicionado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <button type="button" className="nav-button add-row-btn" onClick={() => onAdd(section, newRowObject)}>+ Adicionar Linha</button>
            </>
        );

        switch (currentStep) {
            case 0: // Informações Gerais
                return (
                    <div className="step-content">
                        <h3>{steps[0]}</h3>
                        <div className="form-grid">
                             <div className={`form-field full-width card-like-section ${formData.informacoesGerais.referenteSAP === 'Sim' ? 'answered' : ''}`}>
                                <label className="fieldset-description">A demanda é referente ao SAP?
                                    <Tooltip text="Marque 'Sim' se a mudança envolve qualquer alteração, configuração ou transporte de request no ambiente SAP. Isso habilitará etapas adicionais no formulário.">
                                        <HelpIcon />
                                    </Tooltip>
                                </label>
                                <div className="radio-group">
                                    <label className="radio-label"><input type="radio" name="referenteSAP" value="Sim" checked={formData.informacoesGerais.referenteSAP === 'Sim'} onChange={(e) => handleChange('informacoesGerais', 'referenteSAP', e.target.value)} /> Sim</label>
                                    <label className="radio-label"><input type="radio" name="referenteSAP" value="Não" checked={formData.informacoesGerais.referenteSAP === 'Não'} onChange={(e) => handleChange('informacoesGerais', 'referenteSAP', e.target.value)} /> Não</label>
                                </div>
                                {formData.informacoesGerais.referenteSAP === 'Sim' && (
                                    <div className="conditional-fields form-grid">
                                        <div className="form-field full-width">
                                            <label>Frentes SAP
                                                <Tooltip text="Selecione as frentes SAP impactadas pela mudança. Múltiplas frentes podem ser selecionadas.">
                                                    <HelpIcon />
                                                </Tooltip>
                                            </label>
                                            <MultiSelect
                                                optionsData={frentesSAPData}
                                                selected={formData.informacoesGerais.frentesSAP}
                                                onChange={(selected) => handleChange('informacoesGerais', 'frentesSAP', selected)}
                                                placeholder="Selecione uma ou mais frentes"
                                                className={isFieldInvalid('informacoesGerais_frentesSAP') ? 'validation-error-field' : ''}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="form-field"><label>Líder da Mudança<Tooltip text="Pessoa responsável por liderar a execução e o sucesso da mudança. Geralmente um coordenador ou gerente técnico."><HelpIcon /></Tooltip></label><input type="text" value={formData.informacoesGerais.liderMudanca} onChange={(e) => handleChange('informacoesGerais', 'liderMudanca', e.target.value)} className={isFieldInvalid('informacoesGerais_liderMudanca') ? 'validation-error-field' : ''} /></div>
                            <div className="form-field"><label>Solicitante<Tooltip text="Nome do colaborador que está abrindo a requisição de mudança. Este campo é preenchido automaticamente com base no seu login."><HelpIcon /></Tooltip></label><input type="text" value={formData.informacoesGerais.solicitante} readOnly className={isFieldInvalid('informacoesGerais_solicitante') ? 'validation-error-field' : ''} /></div>
                            <div className="form-field"><label>Líder do Produto<Tooltip text="Product Owner (PO) ou responsável pela área de negócio que validou a necessidade e o escopo da mudança."><HelpIcon /></Tooltip></label><input type="text" value={formData.informacoesGerais.liderProduto} onChange={(e) => handleChange('informacoesGerais', 'liderProduto', e.target.value)} /></div>
                            <div className="form-field"><label>Data da Mudança<Tooltip text="Data planejada para a execução da mudança em produção. A data deve ser futura."><HelpIcon /></Tooltip></label><input type="date" value={formData.informacoesGerais.dataMudanca} onChange={(e) => handleChange('informacoesGerais', 'dataMudanca', e.target.value)} className={isFieldInvalid('informacoesGerais_dataMudanca') ? 'validation-error-field' : ''} min={minDate} /></div>

                            <div className="form-field full-width"><label>Motivo da Mudança<Tooltip text="Descreva de forma clara e objetiva o porquê desta mudança ser necessária. Qual problema ela resolve ou qual benefício ela trará?"><HelpIcon /></Tooltip></label><textarea value={formData.informacoesGerais.motivoMudanca} onChange={(e) => handleChange('informacoesGerais', 'motivoMudanca', e.target.value)} className={isFieldInvalid('informacoesGerais_motivoMudanca') ? 'validation-error-field' : ''} /></div>
                            <div className="form-field full-width"><label>Impacto de Não Realizar<Tooltip text="Quais são as consequências negativas ou perda de oportunidade se esta mudança não for implementada?"><HelpIcon /></Tooltip></label><textarea value={formData.informacoesGerais.impactoNaoRealizar} onChange={(e) => handleChange('informacoesGerais', 'impactoNaoRealizar', e.target.value)} /></div>

                            <div className="form-field"><label>Classificação<Tooltip text={`PADRÃO: Específica apenas para ações de baixo impacto e atuação limitada e controlada.
PLANEJADA: Mudança com possibilidade de ser executada em uma janela determinada.
EMERGENCIAL: Mudança com necessidade de execução imediata.`}><HelpIcon /></Tooltip></label><select value={formData.informacoesGerais.classificacao} onChange={(e) => handleChange('informacoesGerais', 'classificacao', e.target.value)}><option>Padrão</option><option>Planejada</option><option>Emergencial</option></select></div>
                            <div className="form-field full-width"><label>Serviços Afetados<Tooltip text="Selecione todos os serviços de TI que serão diretamente ou indiretamente impactados pela mudança (ex: E-mail, Acesso VPN, SAP)."><HelpIcon /></Tooltip></label>
                                <MultiSelect 
                                    optionsData={servicosData}
                                    selected={formData.informacoesGerais.servicosAfetados}
                                    onChange={(selected) => handleChange('informacoesGerais', 'servicosAfetados', selected)}
                                    placeholder="Selecione um ou mais serviços"
                                    className={isFieldInvalid('informacoesGerais_servicosAfetados') ? 'validation-error-field' : ''}
                                />
                            </div>
                            <div className="form-field full-width"><label>Sistemas Afetados<Tooltip text="Selecione todos os sistemas ou aplicações que sofrerão alterações ou poderão ser impactados (ex: Protheus, Salesforce, Active Directory)."><HelpIcon /></Tooltip></label>
                                <MultiSelect 
                                    optionsData={sistemasAfetadosData}
                                    selected={formData.informacoesGerais.sistemasAfetados}
                                    onChange={(selected) => handleChange('informacoesGerais', 'sistemasAfetados', selected)}
                                    placeholder="Selecione um ou mais sistemas"
                                    className={isFieldInvalid('informacoesGerais_sistemasAfetados') ? 'validation-error-field' : ''}
                                />
                            </div>
                           
                            <div className={`form-field full-width card-like-section ${formData.informacoesGerais.indisponibilidade !== 'Não' ? 'answered' : ''}`}>
                                <fieldset>
                                    <legend>Haverá indisponibilidade de sistema?<Tooltip text="Informe se a mudança causará alguma interrupção, total ou parcial, nos serviços ou sistemas para os usuários finais."><HelpIcon /></Tooltip></legend>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="indisponibilidade" value="Sim, total" checked={formData.informacoesGerais.indisponibilidade === 'Sim, total'} onChange={(e) => handleChange('informacoesGerais', 'indisponibilidade', e.target.value)} /> Sim, total</label>
                                        <label className="radio-label"><input type="radio" name="indisponibilidade" value="Sim, parcial" checked={formData.informacoesGerais.indisponibilidade === 'Sim, parcial'} onChange={(e) => handleChange('informacoesGerais', 'indisponibilidade', e.target.value)} /> Sim, parcial</label>
                                        <label className="radio-label"><input type="radio" name="indisponibilidade" value="Não" checked={formData.informacoesGerais.indisponibilidade === 'Não'} onChange={(e) => handleChange('informacoesGerais', 'indisponibilidade', e.target.value)} /> Não</label>
                                    </div>
                                    {formData.informacoesGerais.indisponibilidade !== 'Não' && (
                                        <div className="conditional-fields form-grid">
                                            <div className="form-field"><label>Início da Indisponibilidade<Tooltip text="Data e hora exatas de quando a indisponibilidade começará."><HelpIcon /></Tooltip></label><input type="datetime-local" value={formData.informacoesGerais.indisponibilidadeInicio} onChange={(e) => handleChange('informacoesGerais', 'indisponibilidadeInicio', e.target.value)} min={minDateTime} /></div>
                                            <div className="form-field"><label>Fim da Indisponibilidade<Tooltip text="Data e hora exatas de quando a indisponibilidade está planejada para terminar."><HelpIcon /></Tooltip></label><input type="datetime-local" value={formData.informacoesGerais.indisponibilidadeFim} onChange={(e) => handleChange('informacoesGerais', 'indisponibilidadeFim', e.target.value)} min={formData.informacoesGerais.indisponibilidadeInicio || minDateTime} /></div>
                                            <div className="form-field full-width"><label>Período Máximo de Interrupção<Tooltip text="Informe a duração máxima esperada para a interrupção do serviço (ex: 2 horas, 30 minutos)."><HelpIcon /></Tooltip></label><input type="text" value={formData.informacoesGerais.periodoMaximoInterrupcao} onChange={(e) => handleChange('informacoesGerais', 'periodoMaximoInterrupcao', e.target.value)} placeholder="Ex: 4 horas"/></div>
                                        </div>
                                    )}
                                </fieldset>
                            </div>

                            <div className="form-field full-width"><label>Restrições para a Mudança<Tooltip text="Liste quaisquer pré-requisitos, dependências ou limitações que devem ser consideradas antes ou durante a execução da mudança (ex: horário específico, necessidade de backup)."><HelpIcon /></Tooltip></label><textarea value={formData.informacoesGerais.restricoesMudanca} onChange={(e) => handleChange('informacoesGerais', 'restricoesMudanca', e.target.value)} /></div>
                        </div>
                    </div>
                );
            case 1: // Plano de Implantação
                return (
                    <div className="step-content">
                        <h3>
                            {steps[1]}
                            <Tooltip text="Detalhe cada atividade necessária para implementar a mudança, desde a preparação até a validação pós-implantação. Seja específico sobre o responsável, datas e tempos de execução.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('planoImplantacao_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'planoImplantacao_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Ensure 'formData.planoImplantacao' is an array before calling .map() to prevent runtime errors from potentially corrupted data. */}
                            {Array.isArray(formData.planoImplantacao) && formData.planoImplantacao.length > 0 ? formData.planoImplantacao.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Atividade #{index + 1}: {item.nome || 'Nova Atividade'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('planoImplantacao', index)}
                                            aria-label={`Remover atividade ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field full-width">
                                            <label>Nome da Atividade<Tooltip text="Nome descritivo para a tarefa a ser executada."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.nome || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'nome', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Etapa<Tooltip text="Fase da mudança em que a atividade ocorre (antes, durante ou depois)."><HelpIcon /></Tooltip></label>
                                            <select value={item.etapa || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'etapa', e.target.value)}>
                                                <option value="Pré Implantação">Pré Implantação</option>
                                                <option value="Implantação">Implantação</option>
                                                <option value="Pós Implantação">Pós Implantação</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Status<Tooltip text="Status atual da atividade (ex: Não iniciado, Em andamento, Concluído)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.status || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'status', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Data Planejada<Tooltip text="Data em que a atividade está agendada para ser executada."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={item.dataPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'dataPlanejada', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Hora Planejada<Tooltip text="Horário em que a atividade está agendada para ser executada."><HelpIcon /></Tooltip></label>
                                            <input type="time" value={item.horaPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'horaPlanejada', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Descrição<Tooltip text="Detalhes sobre o que precisa ser feito nesta atividade."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.descricao || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'descricao', e.target.value)} className={isFieldInvalid(`planoImplantacao_${index}_descricao`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável<Tooltip text="Nome da pessoa ou equipe responsável pela execução."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.responsavel || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'responsavel', e.target.value)} className={isFieldInvalid(`planoImplantacao_${index}_responsavel`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Departamento<Tooltip text="Departamento do responsável."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.departamento || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'departamento', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Item de Configuração<Tooltip text="Ativo ou componente de TI afetado ou utilizado (ex: Servidor X, Sistema Y)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.itemConfiguracao || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'itemConfiguracao', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Tempo de Execução<Tooltip text="Duração estimada para completar a atividade (formato HH:MM)."><HelpIcon /></Tooltip></label>
                                            <input type="text" placeholder="Ex: 01:15" value={item.tempoExecucao || ''} onChange={(e) => handleDynamicTableChange('planoImplantacao', index, 'tempoExecucao', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhuma atividade de implantação adicionada.</p>
                                    <p>Clique no botão abaixo para detalhar o plano.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('planoImplantacao', { 
                                nome: '',
                                etapa: 'Pré Implantação', dataPlanejada: '', horaPlanejada: '', status: '', 
                                descricao: '', responsavel: '', departamento: '', itemConfiguracao: '', tempoExecucao: '' 
                            })}
                        >
                            + Adicionar Atividade
                        </button>
                    </div>
                );
            case 2: // Mapa de Transporte
                return (
                    <div className="step-content">
                        <h3>
                            {steps[2]}
                            <Tooltip text="Liste todas as requests (transportes) SAP que serão importadas para o ambiente de produção. Inclua a sequência correta de importação, o responsável e o objetivo de cada request.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('mapaTransporte_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'mapaTransporte_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Added an Array.isArray check to ensure formData.mapaTransporte is an array before calling .map(), preventing runtime errors if the data from localStorage is not an array. */}
                            {Array.isArray(formData.mapaTransporte) && formData.mapaTransporte.length > 0 ? formData.mapaTransporte.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Request #{index + 1}: {item.request || 'Nova Request'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('mapaTransporte', index)}
                                            aria-label={`Remover request ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field full-width">
                                            <label>ID da Request<Tooltip text="Identificador único da request no sistema SAP (ex: DEVK912345)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.request || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'request', e.target.value)} className={isFieldInvalid(`mapaTransporte_${index}_request`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Sequenciamento<Tooltip text="Ordem numérica em que a request deve ser importada."><HelpIcon /></Tooltip></label>
                                            <input type="text" placeholder="Ex: 1" value={item.sequenciamento || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'sequenciamento', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Tipo da Request<Tooltip text="Classificação da request quanto à sua criticidade ou propósito."><HelpIcon /></Tooltip></label>
                                            <select value={item.tipoRequest || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipoRequest', e.target.value)}>
                                                <option value="">Selecione...</option>
                                                <option value="Normal">Normal</option>
                                                <option value="Urgente">Urgente</option>
                                                <option value="Projeto">Projeto</option>
                                            </select>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Objetivo da Request<Tooltip text="Breve descrição da finalidade desta request."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.objetivoRequest || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'objetivoRequest', e.target.value)} className={isFieldInvalid(`mapaTransporte_${index}_objetivoRequest`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Descrição Técnica<Tooltip text="Detalhes técnicos sobre os objetos contidos na request."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.descricaoTecnica || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'descricaoTecnica', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Tipo
                                                <Tooltip text="Tipo de objeto SAP. A escolha correta ajuda na governança e no sequenciamento.">
                                                    <HelpIcon />
                                                </Tooltip>
                                            </label>
                                            <div className="radio-group-vertical">
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={`mapaTransporte_tipo_${index}`}
                                                        value="Workbench"
                                                        checked={item.tipo === 'Workbench'}
                                                        onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipo', e.target.value)}
                                                    />
                                                    <span style={{ flexGrow: 1 }}>Workbench</span>
                                                    <Tooltip text="Alterações em objetos de desenvolvimento (ABAP, classes, funções, relatórios).">
                                                        <HelpIcon />
                                                    </Tooltip>
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={`mapaTransporte_tipo_${index}`}
                                                        value="Customizing"
                                                        checked={item.tipo === 'Customizing'}
                                                        onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipo', e.target.value)}
                                                    />
                                                    <span style={{ flexGrow: 1 }}>Customizing</span>
                                                    <Tooltip text="Alterações de configuração de módulos (MM, SD, FI, CO etc.). Dependem do mandante (client-dependent).">
                                                        <HelpIcon />
                                                    </Tooltip>
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={`mapaTransporte_tipo_${index}`}
                                                        value="Nota SAP"
                                                        checked={item.tipo === 'Nota SAP'}
                                                        onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipo', e.target.value)}
                                                    />
                                                    <span style={{ flexGrow: 1 }}>Nota SAP</span>
                                                    <Tooltip text="Pacotes oficiais da SAP para correção de falhas, melhorias ou atualização de versão.">
                                                        <HelpIcon />
                                                    </Tooltip>
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={`mapaTransporte_tipo_${index}`}
                                                        value="TOC"
                                                        checked={item.tipo === 'TOC'}
                                                        onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'tipo', e.target.value)}
                                                    />
                                                    <span style={{ flexGrow: 1 }}>TOC (Transport of Copies)</span>
                                                    <Tooltip text="Requests temporários usados para testes em ambientes específicos.">
                                                        <HelpIcon />
                                                    </Tooltip>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Número CALM/ Jira<Tooltip text="ID da tarefa ou história no SAP CALM ou Jira associada."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.numeroCALM || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'numeroCALM', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>GO - SIPAL<Tooltip text="Número do GO (Gerenciamento de Ocorrências) interno da Sipal, se aplicável."><HelpIcon /></Tooltip></label>
                                            <input type="number" value={item.goSipal || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'goSipal', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Status<Tooltip text="Status atual da request (ex: Liberada para QA, Aprovada para PRD)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.status || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'status', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Data de Criação<Tooltip text="Data em que a request foi criada no ambiente de desenvolvimento."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={item.dataCriacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'dataCriacao', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável pela Criação<Tooltip text="Desenvolvedor ou consultor que criou a request."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.responsavelCriacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'responsavelCriacao', e.target.value)} className={isFieldInvalid(`mapaTransporte_${index}_responsavelCriacao`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável pela Importação<Tooltip text="Profissional (geralmente Basis) que importará a request em produção."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.responsavelImportacao || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'responsavelImportacao', e.target.value)} className={isFieldInvalid(`mapaTransporte_${index}_responsavelImportacao`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Solicitante<Tooltip text="Pessoa que solicitou a criação da request."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.solicitante || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'solicitante', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Evidência de Teste<Tooltip text="Link para o documento ou local com as evidências de que a request foi testada com sucesso."><HelpIcon /></Tooltip></label>
                                            <input type="url" placeholder="Link para evidência" value={item.evidenciaTeste || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'evidenciaTeste', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Plano de Rollback Vinculado<Tooltip text="Identificação do plano ou request de rollback, se houver um específico para esta."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.planoRollback || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'planoRollback', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Observações<Tooltip text="Informações adicionais relevantes sobre a request."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.observacoes || ''} onChange={(e) => handleDynamicTableChange('mapaTransporte', index, 'observacoes', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhuma request de transporte adicionada.</p>
                                    <p>Clique no botão abaixo para detalhar o mapa de transporte.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('mapaTransporte', { 
                                request: '', sequenciamento: '', tipoRequest: '', objetivoRequest: '', descricaoTecnica: '',
                                tipo: 'Workbench', numeroCALM: '', goSipal: '', status: '', dataCriacao: '', 
                                responsavelCriacao: '', responsavelImportacao: '', solicitante: currentUser?.name || '', evidenciaTeste: '',
                                planoRollback: '', observacoes: ''
                            })}
                        >
                            + Adicionar Request
                        </button>
                    </div>
                );
            case 3: // Caderno de Testes
                return (
                    <div className="step-content">
                        <h3>
                            {steps[3]}
                            <Tooltip text="Documente todos os testes que foram ou serão executados para validar a mudança. Inclua testes unitários, integrados e de regressão, com seus respectivos responsáveis e evidências.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('cadernoTestes_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'cadernoTestes_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                             {/* FIX: Add Array.isArray check to prevent runtime errors on corrupted data from localStorage. */}
                            {Array.isArray(formData.cadernoTestes) && formData.cadernoTestes.length > 0 ? formData.cadernoTestes.map((test, index) => (
                                <div key={test.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Teste #{index + 1}: {test.nome || 'Novo Teste'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('cadernoTestes', index)}
                                            aria-label={`Remover teste ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field full-width">
                                            <label>Nome do Teste<Tooltip text="Título claro e conciso para o cenário de teste."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={test.nome || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'nome', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Plano<Tooltip text="Indica se este teste valida a implementação da mudança ou o plano de retorno (rollback)."><HelpIcon /></Tooltip></label>
                                            <select value={test.plano || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'plano', e.target.value)}>
                                                <option value="">Selecione...</option>
                                                <option value="implementação">Implementação</option>
                                                <option value="retorno">Retorno</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Tipo de Teste<Tooltip text="Categoria do teste (Unitário, Integrado, Regressivo, etc.)."><HelpIcon /></Tooltip></label>
                                            <select value={test.tipoTeste || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'tipoTeste', e.target.value)}>
                                                <option value="">Selecione...</option>
                                                <option value="TU">TU - Teste Unitário</option>
                                                <option value="TI">TI - Teste Integrado</option>
                                                <option value="TK">TK - Smoke Teste</option>
                                                <option value="TR">TR - Teste Regressivo</option>
                                                <option value="TP">TP - Teste de Performance</option>
                                                <option value="TS">TS - Teste de Segurança</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Data Planejada<Tooltip text="Data agendada para a execução do teste."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={test.dataPlanejada || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'dataPlanejada', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Hora Planejada<Tooltip text="Hora agendada para a execução do teste."><HelpIcon /></Tooltip></label>
                                            <input type="time" value={test.horaPlanejada || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'horaPlanejada', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Atividade de Teste<Tooltip text="Descrição passo a passo de como executar o teste e qual o resultado esperado."><HelpIcon /></Tooltip></label>
                                            <textarea value={test.atividade || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'atividade', e.target.value)} className={isFieldInvalid(`cadernoTestes_${index}_atividade`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Link do Teste<Tooltip text="URL para a ferramenta de teste, evidência em vídeo ou documento de resultados."><HelpIcon /></Tooltip></label>
                                            <input type="url" placeholder="Cole o link para a evidência do teste" value={test.linkTeste || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'linkTeste', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Predecessora<Tooltip text="ID de outra atividade ou teste que deve ser concluído antes deste."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={test.predecessora || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'predecessora', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável<Tooltip text="Pessoa ou equipe responsável por executar o teste."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={test.responsavel || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'responsavel', e.target.value)} className={isFieldInvalid(`cadernoTestes_${index}_responsavel`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Departamento<Tooltip text="Departamento do responsável pelo teste."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={test.departamento || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'departamento', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Item de Configuração<Tooltip text="Sistema, componente ou ativo de TI que será testado."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={test.itemConfiguracao || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'itemConfiguracao', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Tempo de Execução<Tooltip text="Duração estimada para a execução completa do teste."><HelpIcon /></Tooltip></label>
                                            <input type="text" placeholder="Ex: 02:30" value={test.tempoExecucao || ''} onChange={(e) => handleDynamicTableChange('cadernoTestes', index, 'tempoExecucao', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhum caso de teste adicionado.</p>
                                    <p>Clique no botão abaixo para começar a adicionar os testes planejados.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('cadernoTestes', {
                                nome: '',
                                plano: '', dataPlanejada: '', horaPlanejada: '', tipoTeste: 'TU',
                                atividade: '', predecessora: '', responsavel: '', departamento: '',
                                itemConfiguracao: '', tempoExecucao: '', linkTeste: ''
                            })}
                        >
                            + Adicionar Caso de Teste
                        </button>
                    </div>
                );
            case 4: // Plano de Retorno
                return (
                    <div className="step-content">
                        <h3>
                            {steps[4]} (Rollback)
                            <Tooltip text="Descreva o plano de contingência caso a mudança falhe. Detalhe os passos para reverter as alterações e restaurar o ambiente ao estado anterior, minimizando o impacto.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('planoRetorno_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'planoRetorno_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Added Array.isArray check to prevent runtime error when mapping over `formData.planoRetorno`. */}
                            {Array.isArray(formData.planoRetorno) && formData.planoRetorno.length > 0 ? formData.planoRetorno.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Etapa de Retorno #{index + 1}: {item.descricao?.substring(0, 30) || 'Nova Etapa'}{item.descricao?.length > 30 ? '...' : ''}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('planoRetorno', index)}
                                            aria-label={`Remover etapa de retorno ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Data Planejada<Tooltip text="Data prevista para a execução desta etapa de retorno, se necessária."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={item.dataPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'dataPlanejada', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Hora Planejada<Tooltip text="Hora prevista para a execução desta etapa de retorno."><HelpIcon /></Tooltip></label>
                                            <input type="time" value={item.horaPlanejada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'horaPlanejada', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Status<Tooltip text="Status da atividade de retorno (ex: Não iniciado, Concluído)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.status || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'status', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Data Realizada<Tooltip text="Data em que a etapa foi efetivamente executada (preencher se o rollback for acionado)."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={item.dataRealizada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'dataRealizada', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Hora Realizada<Tooltip text="Hora em que a etapa foi efetivamente executada."><HelpIcon /></Tooltip></label>
                                            <input type="time" value={item.horaRealizada || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'horaRealizada', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Tipo<Tooltip text="Natureza da etapa de rollback (Técnica: envolve sistemas; Operacional: envolve processos manuais)."><HelpIcon /></Tooltip></label>
                                            <select value={item.tipo || 'Técnico'} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'tipo', e.target.value)}>
                                                <option value="Técnico">Técnico</option>
                                                <option value="Operacional">Operacional</option>
                                            </select>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Descrição<Tooltip text="Detalhes sobre a ação a ser executada para reverter parte da mudança."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.descricao || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'descricao', e.target.value)} className={isFieldInvalid(`planoRetorno_${index}_descricao`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Predecessora<Tooltip text="ID de outra etapa de retorno que deve ser concluída antes desta."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.predecessora || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'predecessora', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável<Tooltip text="Pessoa ou equipe encarregada de executar esta etapa do rollback."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.responsavel || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'responsavel', e.target.value)} className={isFieldInvalid(`planoRetorno_${index}_responsavel`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Observação<Tooltip text="Qualquer informação adicional importante sobre esta etapa."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.observacao || ''} onChange={(e) => handleDynamicTableChange('planoRetorno', index, 'observacao', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhuma etapa de retorno (rollback) adicionada.</p>
                                    <p>Clique no botão abaixo para detalhar o plano.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('planoRetorno', { 
                                dataPlanejada: '', horaPlanejada: '', status: '', dataRealizada: '', horaRealizada: '',
                                tipo: 'Técnico', descricao: '', predecessora: '', responsavel: '', observacao: ''
                            })}
                        >
                            + Adicionar Etapa de Retorno
                        </button>
                    </div>
                );
            case 5: // Plano de Comunicação
                return (
                    <div className="step-content">
                        <h3>{steps[5]}</h3>

                        <div className="checklist-question-container">
                            <p className="checklist-question-text">1) Todas as partes envolvidas validaram o plano de implantação?</p>
                            <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'partesEnvolvidasValidaram', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'partesEnvolvidasValidaram', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'partesEnvolvidasValidaram', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                            {(formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'Não' || formData.comunicacaoChecklist.partesEnvolvidasValidaram === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.partesEnvolvidasValidaramJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'partesEnvolvidasValidaramJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_partesEnvolvidasValidaramJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="checklist-question-container">
                            <p className="checklist-question-text">2) O processo de acompanhamento após implantação da solução foi comunicado para a equipe de sustentação?</p>
                             <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'processoAcompanhamentoComunicado', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'processoAcompanhamentoComunicado', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'processoAcompanhamentoComunicado', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                             {(formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'Não' || formData.comunicacaoChecklist.processoAcompanhamentoComunicado === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.processoAcompanhamentoComunicadoJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'processoAcompanhamentoComunicadoJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_processoAcompanhamentoComunicadoJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="checklist-question-container">
                            <p className="checklist-question-text">3) O plano de comunicação contempla comunicação antes e após evento de retorno do ambiente?</p>
                            <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'comunicacaoEventoRetorno', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'comunicacaoEventoRetorno', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'comunicacaoEventoRetorno', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                            {(formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'Não' || formData.comunicacaoChecklist.comunicacaoEventoRetorno === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.comunicacaoEventoRetornoJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'comunicacaoEventoRetornoJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_comunicacaoEventoRetornoJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="checklist-question-container">
                            <p className="checklist-question-text">4) Existe no plano de implantação um passo a passo para aplicação de versão do software?</p>
                            <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.passoAPassoAplicacao === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'passoAPassoAplicacao', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.passoAPassoAplicacao === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'passoAPassoAplicacao', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.passoAPassoAplicacao === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'passoAPassoAplicacao', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                             {(formData.comunicacaoChecklist.passoAPassoAplicacao === 'Não' || formData.comunicacaoChecklist.passoAPassoAplicacao === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.passoAPassoAplicacaoJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'passoAPassoAplicacaoJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_passoAPassoAplicacaoJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="checklist-question-container">
                             <p className="checklist-question-text">5) A tabela de contatos com matriz de escalonamento foi preenchida?</p>
                            <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.tabelaContatosPreenchida === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'tabelaContatosPreenchida', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.tabelaContatosPreenchida === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'tabelaContatosPreenchida', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.tabelaContatosPreenchida === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'tabelaContatosPreenchida', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                            {(formData.comunicacaoChecklist.tabelaContatosPreenchida === 'Não' || formData.comunicacaoChecklist.tabelaContatosPreenchida === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.tabelaContatosPreenchidaJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'tabelaContatosPreenchidaJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_tabelaContatosPreenchidaJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="checklist-question-container" style={{ marginBottom: '2rem' }}>
                            <p className="checklist-question-text">6) Os pontos focais e Key Users foram informados sobre os detalhes da mudança incluindo etapas que deverão participar?</p>
                             <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.comunicacaoChecklist.pontosFocaisInformados === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'pontosFocaisInformados', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.comunicacaoChecklist.pontosFocaisInformados === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'pontosFocaisInformados', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.comunicacaoChecklist.pontosFocaisInformados === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('comunicacaoChecklist', 'pontosFocaisInformados', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                            {(formData.comunicacaoChecklist.pontosFocaisInformados === 'Não' || formData.comunicacaoChecklist.pontosFocaisInformados === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.comunicacaoChecklist.pontosFocaisInformadosJustification}
                                            onChange={e => handleChange('comunicacaoChecklist', 'pontosFocaisInformadosJustification', e.target.value)}
                                            className={isFieldInvalid(`comunicacaoChecklist_pontosFocaisInformadosJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <h3 style={{ borderTop: '1px solid var(--sipal-gray)', paddingTop: '2rem' }}>
                            Detalhamento da Comunicação
                            <Tooltip text="Liste todas as comunicações planejadas antes, durante e após a mudança. Especifique o público, o meio e o responsável por cada comunicação.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('planoComunicacao_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'planoComunicacao_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Add Array.isArray check to prevent runtime errors on corrupted data from localStorage. */}
                            {Array.isArray(formData.planoComunicacao) && formData.planoComunicacao.length > 0 ? formData.planoComunicacao.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Comunicação #{index + 1}: {item.atividade || 'Nova Comunicação'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('planoComunicacao', index)}
                                            aria-label={`Remover comunicação ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Data<Tooltip text="Data agendada para o envio da comunicação."><HelpIcon /></Tooltip></label>
                                            <input type="date" value={item.data || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'data', e.target.value)} min={minDate} />
                                        </div>
                                        <div className="form-field">
                                            <label>Hora<Tooltip text="Hora agendada para o envio da comunicação."><HelpIcon /></Tooltip></label>
                                            <input type="time" value={item.hora || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'hora', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Status<Tooltip text="Status atual da comunicação (ex: A enviar, Enviada)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.status || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'status', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Meio<Tooltip text="Canal que será utilizado para a comunicação (E-mail, WhatsApp, etc.)."><HelpIcon /></Tooltip></label>
                                            <select value={item.meio || 'E-mail'} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'meio', e.target.value)}>
                                                <option value="E-mail">E-mail</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                                <option value="Teams">Teams</option>
                                                <option value="Telefone">Telefone</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Atividade/Público<Tooltip text="Descreva a comunicação a ser feita e para quem ela se destina (ex: 'Comunicado de indisponibilidade para todos os usuários')."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.atividade || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'atividade', e.target.value)} className={isFieldInvalid(`planoComunicacao_${index}_atividade`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Responsável<Tooltip text="Pessoa responsável por enviar a comunicação."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.responsavel || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'responsavel', e.target.value)} className={isFieldInvalid(`planoComunicacao_${index}_responsavel`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Contato de Escalonamento<Tooltip text="Pessoa a ser contatada caso haja problemas com esta comunicação."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={item.contatoEscalonamento || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'contatoEscalonamento', e.target.value)} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Observação<Tooltip text="Informações adicionais relevantes."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.observacao || ''} onChange={(e) => handleDynamicTableChange('planoComunicacao', index, 'observacao', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhum item de comunicação adicionado.</p>
                                    <p>Clique no botão abaixo para detalhar o plano de comunicação.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('planoComunicacao', { 
                                data: '', hora: '', status: '', meio: 'E-mail', 
                                atividade: '', responsavel: '', contatoEscalonamento: '', observacao: ''
                            })}
                        >
                            + Adicionar Comunicação
                        </button>
                    </div>
                );
            case 6: // Risco de Mudança
                return (
                    <div className="step-content">
                        <h3>{steps[6]}</h3>

                         <div className="checklist-question-container">
                            <p className="checklist-question-text">1) O plano de implantação explica de forma clara como identificar riscos e qual o gatilho para inicio do plano de retorno?</p>
                             <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.riscosGerais.planoRetornoClaro === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'planoRetornoClaro', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.riscosGerais.planoRetornoClaro === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'planoRetornoClaro', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.riscosGerais.planoRetornoClaro === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'planoRetornoClaro', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                            {(formData.riscosGerais.planoRetornoClaro === 'Não' || formData.riscosGerais.planoRetornoClaro === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.riscosGerais.planoRetornoClaroJustification}
                                            onChange={e => handleChange('riscosGerais', 'planoRetornoClaroJustification', e.target.value)}
                                            className={isFieldInvalid(`riscosGerais_planoRetornoClaroJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="checklist-question-container" style={{ marginBottom: '2rem' }}>
                            <p className="checklist-question-text">2) Todos os stakeholders relevantes foram consultados sobre os riscos e impactos?</p>
                             <div className="checklist-answer-buttons">
                                <button type="button" className={`checklist-answer-btn sim ${formData.riscosGerais.stakeholdersConsultados === 'Sim' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'stakeholdersConsultados', 'Sim')}><CheckIcon /> Sim</button>
                                <button type="button" className={`checklist-answer-btn nao ${formData.riscosGerais.stakeholdersConsultados === 'Não' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'stakeholdersConsultados', 'Não')}><AlertIcon /> Não</button>
                                <button type="button" className={`checklist-answer-btn na ${formData.riscosGerais.stakeholdersConsultados === 'N/A' ? 'selected' : ''}`} onClick={() => handleChange('riscosGerais', 'stakeholdersConsultados', 'N/A')}><BlockIcon /> N/A</button>
                            </div>
                             {(formData.riscosGerais.stakeholdersConsultados === 'Não' || formData.riscosGerais.stakeholdersConsultados === 'N/A') && (
                                <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                    <div className="form-field">
                                        <label>Justificativa / Plano de Ação</label>
                                        <textarea
                                            value={formData.riscosGerais.stakeholdersConsultadosJustification}
                                            onChange={e => handleChange('riscosGerais', 'stakeholdersConsultadosJustification', e.target.value)}
                                            className={isFieldInvalid(`riscosGerais_stakeholdersConsultadosJustification`) ? 'validation-error-field' : ''}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>


                        <h3 style={{ borderTop: '1px solid var(--sipal-gray)', paddingTop: '2rem' }}>
                            Detalhamento dos Riscos
                            <Tooltip text="Identifique e avalie os riscos potenciais associados a esta mudança. Para cada risco, defina uma estratégia e ações concretas de mitigação.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('planoRiscos_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'planoRiscos_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {Array.isArray(formData.planoRiscos) && formData.planoRiscos.length > 0 ? formData.planoRiscos.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Risco #{index + 1}: {item.risco?.substring(0, 30) || 'Novo Risco'}{item.risco?.length > 30 ? '...' : ''}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('planoRiscos', index)}
                                            aria-label={`Remover risco ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>ID</label>
                                            <input type="text" value={index + 1} readOnly disabled className="read-only-id-field" />
                                        </div>
                                        <div className="form-field">
                                            <label>Tipo Risco<Tooltip text="Classifique se o evento incerto é uma 'Ameaça' (impacto negativo) ou uma 'Oportunidade' (impacto positivo)."><HelpIcon /></Tooltip></label>
                                            <select value={item.tipoRisco || 'Ameaça'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'tipoRisco', e.target.value)}>
                                                <option value="Ameaça">Ameaça</option>
                                                <option value="Oportunidade">Oportunidade</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Estratégia<Tooltip text="Como a equipe irá lidar com o risco? 'Aceitar', 'Mitigar' (reduzir impacto/probabilidade), 'Transferir' (passar para terceiros) ou 'Evitar' (mudar o plano para eliminar o risco)."><HelpIcon /></Tooltip></label>
                                            <select value={item.estrategia || 'Mitigar'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'estrategia', e.target.value)}>
                                                <option value="Aceitar">Aceitar</option>
                                                <option value="Mitigar">Mitigar</option>
                                                <option value="Transferir">Transferir</option>
                                                <option value="Evitar">Evitar</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Impacto<Tooltip text="Qual o nível de impacto (de 1 a 5) caso o risco se materialize?"><HelpIcon /></Tooltip></label>
                                            <select value={item.impacto || '3 - Moderado'} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'impacto', e.target.value)}>
                                                <option value="5 - Muito Alto">5 - Muito Alto</option>
                                                <option value="4 - Alto">4 - Alto</option>
                                                <option value="3 - Moderado">3 - Moderado</option>
                                                <option value="2 - Baixo">2 - Baixo</option>
                                                <option value="1 - Muito Baixo">1 - Muito Baixo</option>
                                            </select>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Risco<Tooltip text="Descreva o risco potencial. O que pode dar errado?"><HelpIcon /></Tooltip></label>
                                            <textarea value={item.risco || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'risco', e.target.value)} className={isFieldInvalid(`planoRiscos_${index}_risco`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Ação<Tooltip text="Qual ação concreta será tomada para implementar a estratégia definida?"><HelpIcon /></Tooltip></label>
                                            <textarea value={item.acao || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'acao', e.target.value)} className={isFieldInvalid(`planoRiscos_${index}_acao`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Mitigação<Tooltip text="Descreva as ações de mitigação planejadas para reduzir a probabilidade ou o impacto do risco."><HelpIcon /></Tooltip></label>
                                            <textarea value={item.mitigacao || ''} onChange={(e) => handleDynamicTableChange('planoRiscos', index, 'mitigacao', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhum risco adicionado.</p>
                                    <p>Clique no botão abaixo para detalhar os riscos da mudança.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('planoRiscos', {
                                tipoRisco: 'Ameaça',
                                risco: '',
                                estrategia: 'Mitigar',
                                acao: '',
                                impacto: '3 - Moderado',
                                mitigacao: ''
                            })}
                        >
                            + Adicionar Risco
                        </button>
                    </div>
                );
            case 7: // Segurança e Acessos
                return (
                    <div className="step-content">
                        <h3>
                            {steps[7]}
                            <Tooltip text="Liste todos os perfis de acesso, permissões ou credenciais que precisam ser criados, alterados ou utilizados durante a mudança. Justifique a necessidade de cada um.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('segurancaAcessos_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'segurancaAcessos_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Add Array.isArray check to prevent runtime errors on corrupted data from localStorage. */}
                            {Array.isArray(formData.segurancaAcessos.perfis) && formData.segurancaAcessos.perfis.length > 0 ? formData.segurancaAcessos.perfis.map((perfil, index) => (
                                <div key={perfil.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Perfil de Acesso #{index + 1}: {perfil.nivelAcesso || 'Novo Perfil'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeSegurancaPerfil(index)}
                                            aria-label={`Remover perfil de acesso ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Nível de acesso<Tooltip text="Descreva o nível de permissão necessário (ex: Administrador, Leitura, Escrita)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.nivelAcesso || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'nivelAcesso', e.target.value)} className={isFieldInvalid(`segurancaAcessos_${index}_nivelAcesso`) ? 'validation-error-field' : ''} />
                                        </div>
                                        <div className="form-field">
                                            <label>Plataforma<Tooltip text="Sistema ou plataforma onde o acesso é necessário (ex: SAP, Windows Server, Protheus)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.plataforma || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'plataforma', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Ambiente<Tooltip text="Ambiente específico do acesso (Desenvolvimento, Homologação ou Produção)."><HelpIcon /></Tooltip></label>
                                            <select value={perfil.ambiente || 'Produção'} onChange={(e) => handleSegurancaPerfisChange(index, 'ambiente', e.target.value)}>
                                                <option value="Desenvolvimento">Desenvolvimento</option>
                                                <option value="Homologação">Homologação</option>
                                                <option value="Produção">Produção</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Grupos de acesso<Tooltip text="Nome dos grupos de segurança aos quais o usuário deve ser adicionado (ex: 'G_FINANCEIRO_TOTAL')."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.gruposAcesso || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'gruposAcesso', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Item de Configuração<Tooltip text="Ativo de TI específico que será acessado (ex: Servidor SRV-DB01, Pasta \\SHARE\FIN)."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.itemConfiguracao || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'itemConfiguracao', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label>Área de Negócio<Tooltip text="Departamento ou área da empresa que utilizará o acesso."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.areaNegocio || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'areaNegocio', e.target.value)} />
                                        </div>
                                         <div className="form-field full-width">
                                            <label>Usuários<Tooltip text="Liste os nomes dos usuários que precisarão deste acesso."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.usuarios || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'usuarios', e.target.value)} placeholder="Ex: Nome Sobrenome, Outro Nome..."/>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Login de acesso<Tooltip text="Liste os logins/nomes de usuário correspondentes."><HelpIcon /></Tooltip></label>
                                            <input type="text" value={perfil.loginAcesso || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'loginAcesso', e.target.value)} placeholder="Ex: usuario1, usuario2..."/>
                                        </div>
                                        <div className="form-field full-width">
                                            <label>Justificativa do Acesso<Tooltip text="Explique por que este acesso é necessário para a mudança ou para a operação após a mudança."><HelpIcon /></Tooltip></label>
                                            <textarea value={perfil.justificativa || ''} onChange={(e) => handleSegurancaPerfisChange(index, 'justificativa', e.target.value)} className={isFieldInvalid(`segurancaAcessos_${index}_justificativa`) ? 'validation-error-field' : ''} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhum perfil de acesso adicionado.</p>
                                    <p>Clique no botão abaixo para adicionar os perfis necessários.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addSegurancaPerfil({ 
                                nivelAcesso: '', gruposAcesso: '', ambiente: 'Produção', plataforma: '', 
                                itemConfiguracao: '', justificativa: '', areaNegocio: '', usuarios: '', loginAcesso: '' 
                            })}
                        >
                            + Adicionar Perfil
                        </button>
                    </div>
                );
            case 8: // Contatos
                return (
                    <div className="step-content">
                        <h3>
                            {steps[8]} (Escalonamento)
                            <Tooltip text="Liste as pessoas-chave que devem ser contatadas durante a implementação da mudança, especialmente em caso de problemas (escalonamento).">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        {isFieldInvalid('contatos_empty') && <p className="table-error-message">{(validationErrors.find(e => e.field === 'contatos_empty') as any).message}</p>}
                        
                        <div className="implementation-plan-list">
                            {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                            {Array.isArray(formData.contatos) && formData.contatos.length > 0 ? formData.contatos.map((item, index) => (
                                <div key={item.tempId || index} className="implementation-card">
                                    <div className="implementation-card-header">
                                        <h4>Contato #{index + 1}: {item.nome || 'Novo Contato'}</h4>
                                        <button
                                            type="button"
                                            className="action-button remove-row-btn"
                                            onClick={() => removeTableRow('contatos', index)}
                                            aria-label={`Remover contato ${index + 1}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-field"><label>Nome<Tooltip text="Nome completo do contato."><HelpIcon /></Tooltip></label><input type="text" value={item.nome || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'nome', e.target.value)} className={isFieldInvalid(`contatos_${index}_nome`) ? 'validation-error-field' : ''} /></div>
                                        <div className="form-field"><label>Cargo<Tooltip text="Cargo ou função do contato na empresa."><HelpIcon /></Tooltip></label><input type="text" value={item.cargo || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'cargo', e.target.value)} /></div>
                                        <div className="form-field"><label>E-mail<Tooltip text="E-mail principal do contato."><HelpIcon /></Tooltip></label><input type="email" value={item.email || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'email', e.target.value)} className={isFieldInvalid(`contatos_${index}_email`) ? 'validation-error-field' : ''} /></div>
                                        <div className="form-field"><label>Telefones<Tooltip text="Números de telefone (fixo e celular) para contato rápido."><HelpIcon /></Tooltip></label><input type="text" value={item.telefones || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'telefones', e.target.value)} /></div>
                                        <div className="form-field"><label>Comunicação<Tooltip text="Forma preferencial de comunicação (ex: Teams, WhatsApp)."><HelpIcon /></Tooltip></label><input type="text" value={item.comunicacao || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'comunicacao', e.target.value)} /></div>
                                        <div className="form-field"><label>Local de Atuação<Tooltip text="Cidade, filial ou departamento onde o contato trabalha."><HelpIcon /></Tooltip></label><input type="text" value={item.localAtuacao || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'localAtuacao', e.target.value)} /></div>
                                        <div className="form-field"><label>Líder Imediato<Tooltip text="Nome do gestor direto do contato."><HelpIcon /></Tooltip></label><input type="text" value={item.liderImediato || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'liderImediato', e.target.value)} /></div>
                                        <div className="form-field"><label>E-mail Líder Imediato<Tooltip text="E-mail do gestor direto."><HelpIcon /></Tooltip></label><input type="email" value={item.emailLiderImediato || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'emailLiderImediato', e.target.value)} /></div>
                                        <div className="form-field"><label>Unidade/Filial<Tooltip text="Unidade de negócio ou filial da Sipal."><HelpIcon /></Tooltip></label><input type="text" value={item.unidadeFilial || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'unidadeFilial', e.target.value)} /></div>
                                        <div className="form-field"><label>Área<Tooltip text="Área ou departamento específico."><HelpIcon /></Tooltip></label><input type="text" value={item.area || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'area', e.target.value)} /></div>
                                        <div className="form-field"><label>Gestor da Área<Tooltip text="Nome do gestor da área."><HelpIcon /></Tooltip></label><input type="text" value={item.gestorArea || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'gestorArea', e.target.value)} /></div>
                                        <div className="form-field full-width"><label>Comunicação Envolvida<Tooltip text="Descreva o papel deste contato na comunicação da mudança (ex: 'Ponto focal para o time de vendas')."><HelpIcon /></Tooltip></label><textarea value={item.comunicacaoEnvolvida || ''} onChange={(e) => handleDynamicTableChange('contatos', index, 'comunicacaoEnvolvida', e.target.value)} /></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-message">
                                    <p>Nenhum contato adicionado.</p>
                                    <p>Clique no botão abaixo para adicionar os contatos de escalonamento.</p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="nav-button add-row-btn"
                            onClick={() => addTableRow('contatos', { 
                                nome: '', cargo: '', email: '', telefones: '', comunicacao: '', localAtuacao: '', 
                                liderImediato: '', emailLiderImediato: '', unidadeFilial: '', area: '', 
                                gestorArea: '', comunicacaoEnvolvida: ''
                            })}
                        >
                            + Adicionar Contato
                        </button>
                    </div>
                );
            case 9: // Checklist
// FIX: Added Array.isArray check to prevent calling .reduce on non-array state.
                const groupedChecklist = (Array.isArray(formData.checklist) ? formData.checklist : []).reduce((acc, item) => {
                    (acc[item.scope] = acc[item.scope] || []).push(item);
                    return acc;
                }, {} as Record<string, (typeof initialFormData.checklist)[number][]>);

                 const isScopeComplete = (scope, checklistKey: 'checklist' | 'checklistSAP') => {
                    // FIX: Add Array.isArray check to prevent calling .filter on non-array state.
                    const items = (Array.isArray(formData[checklistKey]) ? formData[checklistKey] : []).filter(item => item.scope === scope);
                    return items.every(item => item.answer && ((item.answer === 'Sim') || (item.answer !== 'Sim' && item.justification.trim() !== '')));
                };

                return (
                    <div className="step-content">
                        <h3>
                            {steps[9]}
                            <Tooltip text="Este checklist de governança ajuda a garantir que os principais pontos de controle foram considerados. Responda a cada item com atenção. Respostas 'Não' ou 'N/A' exigem uma justificativa.">
                                <HelpIcon />
                            </Tooltip>
                        </h3>
                        <p>Responda às seguintes perguntas para garantir que todos os aspectos da mudança foram considerados.</p>
                        <div className="accordion">
                        {Object.entries(groupedChecklist).map(([scope, items], scopeIndex) => (
                            <div className="accordion-item" key={scope}>
                                <button type="button" className={`accordion-header ${isScopeComplete(scope, 'checklist') ? 'completed' : ''}`} onClick={() => setExpandedScopes(prev => ({ ...prev, [scope]: !prev[scope] }))}>
                                    <span className="accordion-title-wrapper">
                                        {isScopeComplete(scope, 'checklist') && <span className="scope-check-icon"><CheckIcon/></span>}
                                        {scope}
                                    </span>
                                    <span className="accordion-icon">
                                        <ExpandIcon isExpanded={!!expandedScopes[scope]} />
                                    </span>
                                </button>
                                {!!expandedScopes[scope] && (
                                    <div className="accordion-content">
                                        {/* FIX: Add Array.isArray check to prevent calling .map on non-array state. */}
                                        {Array.isArray(items) && items.map((item, itemIndex) => {
                                            const globalIndex = formData.checklist.findIndex(ci => ci.question === item.question);
                                            return (
                                                <div key={globalIndex} className={`checklist-question-container ${isFieldInvalid(`checklist_${globalIndex}_answer`) || isFieldInvalid(`checklist_${globalIndex}_justification`) ? 'validation-error-section' : ''}`}>
                                                    <p className="checklist-question-text">{item.question}</p>
                                                    <div className="checklist-answer-buttons">
                                                        <button type="button" className={`checklist-answer-btn sim ${item.answer === 'Sim' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklist', globalIndex, 'answer', 'Sim')}><CheckIcon /> Sim</button>
                                                        <button type="button" className={`checklist-answer-btn nao ${item.answer === 'Não' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklist', globalIndex, 'answer', 'Não')}><AlertIcon /> Não</button>
                                                        <button type="button" className={`checklist-answer-btn na ${item.answer === 'N/A' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklist', globalIndex, 'answer', 'N/A')}><BlockIcon /> N/A</button>
                                                    </div>
                                                    {(item.answer === 'Não' || item.answer === 'N/A') && (
                                                        <div className="conditional-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                                            <div className="form-field">
                                                                <label>Justificativa / Plano de Ação</label>
                                                                <textarea
                                                                    value={item.justification}
                                                                    onChange={e => handleChecklistChange('checklist', globalIndex, 'justification', e.target.value)}
                                                                    className={isFieldInvalid(`checklist_${globalIndex}_justification`) ? 'validation-error-field' : ''}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                    </div>
                );
            case 10: // Checklist SAP
                if (formData.informacoesGerais.referenteSAP !== 'Sim') {
                     return (
                        <div className="step-content empty-state-message">
                            <h3>{steps[10]}</h3>
                            <p>Esta seção não se aplica, pois a requisição não foi marcada como referente ao SAP.</p>
                            <p>Clique em "Próximo" para continuar.</p>
                        </div>
                    );
                }
                const groupedSAPChecklist = (Array.isArray(formData.checklistSAP) ? formData.checklistSAP : []).reduce((acc, item) => {
                    (acc[item.scope] = acc[item.scope] || []).push(item);
                    return acc;
                }, {} as Record<string, (typeof initialFormData.checklistSAP)[number][]>);

                const isSAPScopeComplete = (scope) => {
                    const items = groupedSAPChecklist[scope];
                    if (!items) return true;
                    return items.every(item => item.answer && ((item.answer === 'Sim') || (item.answer !== 'Sim' && item.justification.trim() !== '')));
                };

                return (
                    <div className="step-content">
                        <h3>{steps[10]}</h3>
                        <p>Checklist específico para garantir a integridade e segurança de mudanças no ambiente SAP.</p>
                        <div className="accordion">
                        {Object.entries(groupedSAPChecklist).map(([scope, items]) => (
                            <div className="accordion-item" key={scope}>
                                <button type="button" className={`accordion-header ${isSAPScopeComplete(scope) ? 'completed' : ''}`} onClick={() => setExpandedScopes(prev => ({ ...prev, [`SAP_${scope}`]: !prev[`SAP_${scope}`] }))}>
                                    <span className="accordion-title-wrapper">
                                        {isSAPScopeComplete(scope) && <span className="scope-check-icon"><CheckIcon/></span>}
                                        {scope}
                                    </span>
                                    <span className="accordion-icon">
                                        <ExpandIcon isExpanded={!!expandedScopes[`SAP_${scope}`]} />
                                    </span>
                                </button>
                                {!!expandedScopes[`SAP_${scope}`] && (
                                    <div className="accordion-content">
                                        {/* FIX: Add Array.isArray check to prevent calling .map on non-array state, ensuring robustness against malformed data. */}
                                        {Array.isArray(items) && items.map((item, itemIndex) => {
                                            const globalIndex = formData.checklistSAP.findIndex(ci => ci.question === item.question);
                                            return (
                                                <div key={globalIndex} className={`checklist-question-container ${isFieldInvalid(`checklistSAP_${globalIndex}_answer`) || isFieldInvalid(`checklistSAP_${globalIndex}_justification`) ? 'validation-error-section' : ''}`}>
                                                    <p className="checklist-question-text">
                                                        <span className="checklist-question-id">{item.id}</span>
                                                        {item.question}
                                                    </p>
                                                    <div className="checklist-answer-buttons">
                                                        <button type="button" className={`checklist-answer-btn sim ${item.answer === 'Sim' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklistSAP', globalIndex, 'answer', 'Sim')}><CheckIcon /> Sim</button>
                                                        <button type="button" className={`checklist-answer-btn nao ${item.answer === 'Não' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklistSAP', globalIndex, 'answer', 'Não')}><AlertIcon /> Não</button>
                                                        <button type="button" className={`checklist-answer-btn na ${item.answer === 'N/A' ? 'selected' : ''}`} onClick={() => handleChecklistChange('checklistSAP', globalIndex, 'answer', 'N/A')}><BlockIcon /> N/A</button>
                                                    </div>
                                                    <div className="additional-checklist-fields" style={{paddingTop: '1rem', marginTop: '1rem'}}>
                                                        <div className="form-grid">
                                                            {(item.answer === 'Não' || item.answer === 'N/A') && (
                                                                <div className="form-field full-width">
                                                                    <label>Justificativa de Não Atendimento / Parcial</label>
                                                                    <textarea
                                                                        value={item.justification}
                                                                        onChange={e => handleChecklistChange('checklistSAP', globalIndex, 'justification', e.target.value)}
                                                                        className={isFieldInvalid(`checklistSAP_${globalIndex}_justification`) ? 'validation-error-field' : ''}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="form-field">
                                                                <label>Link das Evidências</label>
                                                                <input
                                                                    type="url"
                                                                    placeholder="Cole o link da evidência"
                                                                    value={item.docLink}
                                                                    onChange={e => handleChecklistChange('checklistSAP', globalIndex, 'docLink', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="form-field">
                                                                <label>Observação</label>
                                                                <textarea
                                                                    value={item.observacao}
                                                                    onChange={e => handleChecklistChange('checklistSAP', globalIndex, 'observacao', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                    </div>
                );
            case 11: // Anexos e Envio
                return (
                    <div className="step-content">
                        <h3>{steps[11]}</h3>
                        <div className="card-like-section">
                            <label className="file-input-label">
                                <strong>Clique para anexar arquivos</strong>
                                <p>Arraste e solte ou selecione os documentos relevantes (planos, diagramas, aprovações, etc.)</p>
                                <input type="file" multiple onChange={handleAnexosChange} style={{ display: 'none' }} />
                            </label>
                            {/* FIX: Add Array.isArray check to ensure formData.anexos is an array before calling .map(), preventing runtime errors if the data from localStorage is not an array. */}
                            {Array.isArray(formData.anexos) && formData.anexos.length > 0 && (
                                <ul className="file-list">
                                {formData.anexos.map((file, index) => (
                                    <li key={index}>
                                        <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                                        <button className="action-button remove-row-btn" onClick={() => removeAnexo(index)}><TrashIcon/></button>
                                    </li>
                                ))}
                                </ul>
                            )}
                        </div>
                    </div>
                );
            case 12: // Análise e Finalização
                return (
                    <div className="step-content">
                        <h3>{steps[12]}</h3>
                        <div className="final-summary-card">
                            <h4>Resumo da Requisição</h4>
                            <p><strong>Título/Motivo:</strong> {formData.informacoesGerais.motivoMudanca || 'Não preenchido'}</p>
                            <p><strong>Líder da Mudança:</strong> {formData.informacoesGerais.liderMudanca || 'Não preenchido'}</p>
                            <p><strong>Solicitante:</strong> {formData.informacoesGerais.solicitante || 'Não preenchido'}</p>
                            <p><strong>Data da Mudança:</strong> {formData.informacoesGerais.dataMudanca ? new Date(formData.informacoesGerais.dataMudanca + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não preenchida'}</p>
                        </div>
                        
                        <div className="card-like-section">
                            <h4 style={{ marginTop: 0 }}>Exportar Requisição</h4>
                            <p>Gere um documento PDF com todos os detalhes desta requisição para seus registros ou para compartilhamento offline.</p>
                            <button type="button" className="submit-btn" onClick={handleGenerateFullPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <DownloadIcon /> Gerar PDF Completo
                            </button>
                        </div>

                        <div className="home-actions" style={{textAlign: 'center', borderTop: 'none', paddingTop: '2rem'}}>
                            <p>Todos os passos foram preenchidos. Revise as informações e clique em "Enviar Requisição" para submeter ao CAB.</p>
                        </div>
                    </div>
                );
            default:
                return <div>Etapa não encontrada.</div>;
        }
    };
    
    return (
        <div className="card">
            <h2>Nova Requisição de Mudança</h2>
            
            <ul className="wizard-progress-bar">
                 {steps.map((step, index) => {
                    // Hide SAP checklist step if not applicable
                    if (index === 10 && formData.informacoesGerais.referenteSAP !== 'Sim') {
                        return null;
                    }
                    return (
                        <li
                            key={index}
                            className={`progress-step ${currentStep === index ? 'active' : ''} ${completedSteps[index] === true ? 'completed' : ''} ${completedSteps[index] === false ? 'error' : ''}`}
                            onClick={() => goToStep(index)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="step-name">{step}</div>
                        </li>
                    );
                })}
            </ul>

            <form className="wizard-form" ref={formRef} onSubmit={(e) => e.preventDefault()}>
                {validationErrors.length > 0 && !isValidationBypassed && (
                    <div className="error-message-box">
                        <div className="error-box-header"><AlertIcon /> <p>Por favor, corrija os seguintes erros:</p></div>
                        <ul>
                            {validationErrors.slice(0, 5).map((error, i) => <li key={i}>{error.message}</li>)}
                            {validationErrors.length > 5 && <li>... e mais {validationErrors.length - 5} erro(s).</li>}
                        </ul>
                    </div>
                )}
                
                {renderStepContent()}
            </form>

            <div className="wizard-nav-sticky">
                <div className="admin-bypass-toggle">
                    <button 
                        type="button" 
                        className={`nav-button admin-btn ${isValidationBypassed ? 'active' : ''}`}
                        onClick={() => setIsBypassModalOpen(true)}
                        title="Habilitar modo de avanço rápido"
                    >
                        <LockIcon />
                        {isValidationBypassed ? 'Modo Admin Ativo' : ''}
                    </button>
                </div>
                <div className="main-nav-buttons">
                    <button className="nav-button secondary" onClick={handlePrev} disabled={currentStep === 0}>
                        Anterior
                    </button>
                    {currentStep < steps.length - 1 && (
                        <button className="nav-button" onClick={handleNext}>
                            {isValidationBypassed ? 'Forçar Próximo' : 'Próximo'}
                        </button>
                    )}
                    {currentStep === steps.length - 1 && (
                         <button className="submit-btn" onClick={handleSubmit}>
                            {isValidationBypassed ? 'Forçar Envio' : 'Enviar Requisição'}
                        </button>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isBypassModalOpen}
                onClose={() => setIsBypassModalOpen(false)}
                title="Habilitar Modo de Avanço Rápido"
                footer={
                    <>
                        <button className="nav-button secondary" onClick={() => setIsBypassModalOpen(false)}>Cancelar</button>
                        <button className="submit-btn" onClick={handleBypassSubmit}>Confirmar</button>
                    </>
                }
            >
                <p>Digite a senha para desabilitar a validação obrigatória dos campos e permitir o avanço entre as etapas.</p>
                <div className="form-field" style={{marginTop: '1rem'}}>
                    <label>Senha de Administrador</label>
                    <input 
                        type="password" 
                        value={bypassPassword}
                        onChange={(e) => {
                            setBypassPassword(e.target.value);
                            setBypassError('');
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handleBypassSubmit()}
                    />
                    {bypassError && <p className="error-message" style={{marginTop: '0.5rem'}}>{bypassError}</p>}
                </div>
            </Modal>
        </div>
    );
};

// --- Authentication Component ---
const AuthPage = ({ users, setUsers, onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (isRegistering) {
            // Registration
            if (!name || !email || !password) {
                setError('Por favor, preencha todos os campos.');
                return;
            }
            if (!email.includes('@sipal.com.br')) {
                setError('Use um e-mail corporativo válido da SIPAL.');
                return;
            }
            // FIX: Add Array.isArray check to safely call .some() on users array from props.
            const emailExists = Array.isArray(users) && users.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                setError('Este e-mail já está cadastrado.');
                return;
            }
            
            // Add user and login
            const newUser = { name, email, password };
            // FIX: Ensure previous state is an array before spreading it.
            setUsers(prev => [...(Array.isArray(prev) ? prev : []), newUser]);
            onLoginSuccess({ name, email });

        } else {
            // Login
            if (!email || !password) {
                setError('Por favor, preencha todos os campos.');
                return;
            }
            // FIX: Add Array.isArray check to safely call .find() on users array from props.
            const user = Array.isArray(users) && users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (user && user.password === password) {
                onLoginSuccess({ name: user.name, email: user.email });
            } else {
                setError('E-mail ou senha inválidos.');
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo"><SipalLogo /></div>
                <h2>{isRegistering ? 'Cadastro no Portal CAB' : 'Acesso ao Portal CAB'}</h2>
                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <p className="auth-error">{error}</p>}
                    {isRegistering && (
                        <div className="form-field">
                            <label>Nome Completo</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
                        </div>
                    )}
                    <div className="form-field">
                        <label>E-mail Corporativo</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.nome@sipal.com.br" />
                    </div>
                    <div className="form-field">
                        <label>Senha</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="submit-btn auth-btn">{isRegistering ? 'Cadastrar' : 'Entrar'}</button>
                </form>
                <div className="auth-toggle">
                    <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}>
                        {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface Request {
    id: string;
    title: string;
    leader: string;
    classification: string;
    status: string;
    finalStatus: string | null;
    formData: typeof initialFormData;
    aiAnalysis: string;
    aiAnalysisStatus: 'not_generated' | 'loading' | 'generated' | 'error';
    solicitanteEmail?: string;
}

const App = () => {
    const USERS_STORAGE_KEY = 'cab-users';

    const [user, setUser] = useState(null);
    const [users, setUsers] = useState(() => {
        try {
            const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
            if (savedUsers) {
                const parsed = JSON.parse(savedUsers);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to load users from local storage", e);
        }
        return [];
    });
    
    useEffect(() => {
        try {
            // FIX: Ensure users state is an array before saving to localStorage.
            if (Array.isArray(users)) {
                localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            }
        } catch (e) {
            console.error("Failed to save users to local storage", e);
        }
    }, [users]);

    const [activeTab, setActiveTab] = useState('home');
    const [ai, setAi] = useState(null);
    const [isAnalysisUnlocked, setIsAnalysisUnlocked] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    // The value from localStorage could be invalid JSON or not an array. This logic safely parses the data, ensures it's an array, and provides a fallback to prevent runtime errors.
    const [requests, setRequests] = useState<Request[]>(() => {
        try {
            const savedRequests = localStorage.getItem('cab-requests');
            if (savedRequests) {
                const parsed = JSON.parse(savedRequests);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to load requests from local storage", e);
        }
        return [];
    });

    const kanbanStatuses = {
        Enviado: 'Enviado',
        InDiscussion: 'Em Discussão',
        Evaluation: 'Em Avaliação',
        Approval: 'Em Aprovação',
        Implementation: 'Em Implantação',
        Finalizados: 'Finalizados',
    };
    
    useEffect(() => {
        try {
             // FIX: Ensure requests state is an array before saving to localStorage.
            if (Array.isArray(requests)) {
                localStorage.setItem('cab-requests', JSON.stringify(requests));
            }
        } catch (e) {
            console.error("Failed to save requests to local storage", e);
        }
    }, [requests]);

    useEffect(() => {
        if (process.env.API_KEY) {
            try {
                // FIX: Initialize GoogleGenAI with a named apiKey parameter according to the new API guidelines.
                const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
                setAi(genAI);
            } catch (error) {
                console.error("Error initializing GoogleGenAI:", error);
            }
        } else {
            console.warn("API_KEY environment variable not set.");
        }
    }, []);

    const handleLogout = () => {
        setUser(null);
        setIsAnalysisUnlocked(false);
    };

    const handleTabClick = (tab) => {
        if (tab === 'analysis' && !isAnalysisUnlocked) {
            setPasswordError('');
            setPassword('');
            setIsPasswordModalOpen(true);
        } else {
            setActiveTab(tab);
        }
    };

    const handlePasswordSubmit = () => {
        if (password === 'PMO@2025') {
            setIsAnalysisUnlocked(true);
            setIsPasswordModalOpen(false);
            setActiveTab('analysis');
            setPassword('');
            setPasswordError('');
        } else {
            setPasswordError('Senha incorreta.');
        }
    };

    const addRequest = (formData: typeof initialFormData, currentUser: {name: string, email: string}) => {
        const newRequest: Request = {
            // FIX: Ensure `requests` is an array before accessing its length property to prevent runtime errors.
            id: `CAB${String((Array.isArray(requests) ? requests.length : 0) + 1).padStart(3, '0')}`,
            title: formData.informacoesGerais.motivoMudanca.substring(0, 50) + '...',
            leader: formData.informacoesGerais.liderMudanca,
            classification: formData.informacoesGerais.classificacao,
            status: 'Enviado', // Initial status
            finalStatus: null,
            formData: formData,
            aiAnalysis: '',
            aiAnalysisStatus: 'not_generated',
            solicitanteEmail: currentUser.email,
        };
        // FIX: Ensure previous state is an array before spreading it to prevent runtime errors.
        setRequests(prev => [...(Array.isArray(prev) ? prev : []), newRequest]);
        alert(`Requisição ${newRequest.id} enviada com sucesso!`);
        setActiveTab('home');
    };
    
     useEffect(() => {
        const handleSharedUrl = () => {
            if (window.location.hash.startsWith('#share=')) {
                try {
                    const encodedData = window.location.hash.substring(7);
                    const sharedRequest = JSON.parse(decodeURIComponent(encodedData));
                    
                    setRequests(prevRequests => {
                        const currentRequests = Array.isArray(prevRequests) ? prevRequests : [];
                        const existingIndex = currentRequests.findIndex(r => r.id === sharedRequest.id);
                        if (existingIndex > -1) {
                            const updatedRequests = [...currentRequests];
                            updatedRequests[existingIndex] = { ...updatedRequests[existingIndex], ...sharedRequest };
                            return updatedRequests;
                        } else {
                            return [...currentRequests, sharedRequest];
                        }
                    });

                    setActiveTab('analysis');
                    // Use timeout to ensure the component is rendered before scrolling
                    setTimeout(() => {
                         const card = document.getElementById(`request-card-${sharedRequest.id}`);
                         if (card) {
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            card.classList.add('highlight-card');
                            setTimeout(() => card.classList.remove('highlight-card'), 2000);
                         }
                    }, 500);
                    
                    // Clean the hash
                    history.pushState("", document.title, window.location.pathname + window.location.search);

                } catch (e) {
                    console.error("Failed to parse shared request data:", e);
                    alert("Não foi possível carregar a requisição compartilhada.");
                }
            }
        };
        
        handleSharedUrl();
        window.addEventListener('hashchange', handleSharedUrl);
        return () => window.removeEventListener('hashchange', handleSharedUrl);
    }, []);

    if (!user) {
        return <AuthPage users={users} setUsers={setUsers} onLoginSuccess={setUser} />
    }
    
    return (
        <>
            <AppHeader user={user} onLogout={handleLogout} />
            <Tabs activeTab={activeTab} setActiveTab={handleTabClick} />
            <main className="container">
                {activeTab === 'home' && <HomePage requests={requests} setActiveTab={setActiveTab} kanbanStatuses={kanbanStatuses} />}
                {activeTab === 'analysis' && isAnalysisUnlocked && <AnalysisPage requests={requests} />}
                {activeTab === 'newRequest' && <NewRequestPage addRequest={addRequest} currentUser={user} />}
            </main>

            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                title="Acesso Restrito ao Controle"
                footer={
                    <>
                        <button className="nav-button secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</button>
                        <button className="submit-btn" onClick={handlePasswordSubmit}>Confirmar</button>
                    </>
                }
            >
                <p>Esta seção é protegida. Por favor, insira a senha para continuar.</p>
                <div className="form-field" style={{marginTop: '1rem'}}>
                    <label>Senha de Acesso</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError('');
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                    {passwordError && <p className="error-message" style={{marginTop: '0.5rem'}}>{passwordError}</p>}
                </div>
            </Modal>
        </>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
