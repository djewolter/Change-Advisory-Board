import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    initialFormData, steps, checklistItems, checklistItems as checklistItemsStandard, checklistSAPItems, WIZARD_STORAGE_KEY,
    servicosData, sistemasAfetadosData, frentesSAPData, espacosInfraData, filiaisSipalData, activityTemplate, contactTemplate, 
    transportTemplate, testTemplate, communicationTemplate, 
    riskTemplate, securityProfileTemplate,
    empresasSipal, etapasMudanca, Anexo, gestoresSAP, coordenadoresSAP
} from '../../constants/app-constants';
import { generateAndUploadPdf, newId, generateTimeSlots } from '../../utils/app-utils';
import { 
    MultiSelect, WizardProgressBar, Tooltip, Modal
} from '../ui/AppUI';
import { 
    TrashIcon, ExpandIcon, CalendarIcon, CheckIcon, UploadIcon, AlertIcon, DownloadIcon, HelpIcon
} from '../icons/AppIcons';

const OCCUPIED_SLOTS_KEY = 'cab-occupied-slots';

const CategoryHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="category-header-group">
        <h3 className="category-title">{title}</h3>
        {subtitle && <p className="category-subtitle">{subtitle}</p>}
    </div>
);

const HighlightBox = ({ title, subtitle, children, color }: { title: string; subtitle: string; children?: React.ReactNode, color?: string }) => (
    <div style={{ 
        border: `1px solid ${color || 'var(--sipal-gray)'}`, 
        borderRadius: '8px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        backgroundColor: 'rgb(45, 48, 61)',
        transition: 'border-color 0.3s ease'
    }}>
        <h4 style={{ color: '#ffffff', margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700' }}>{title}</h4>
        <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '1rem' }}>{children ? null : subtitle}</p>
        {children}
    </div>
);

export const NewRequestPage = ({ addRequest, currentUser, onSaveDraft, onAutoSaveDraft }: any) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});
    const [validationErrors, setValidationErrors] = useState<any[]>([]);
    const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
    const [submittedRequestId, setSubmittedRequestId] = useState(null);
    const [mailtoLink, setMailtoLink] = useState('');
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const [uploadStatus, setUploadStatus] = useState<{success: boolean, message: string} | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdminUser = useMemo(() => currentUser?.email?.toLowerCase() === 'eduardo.ziemniczak@sipal.com.br', [currentUser]);
    
    // Chave de armazenamento específica para o usuário logado
    const userWizardKey = useMemo(() => `${WIZARD_STORAGE_KEY}_${currentUser?.email}`, [currentUser?.email]);

    const [formData, setFormData] = useState<any>(() => {
        const saved = localStorage.getItem(userWizardKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            const data = parsed.formData || parsed;
            if (currentUser?.name) data.informacoesGerais.liderMudanca = currentUser.name;
            return data;
        }
        const data = JSON.parse(JSON.stringify(initialFormData));
        
        data.planoImplantacao = [{ ...activityTemplate, id: newId() }];
        data.mapaTransporte = [];
        data.planoRetorno = [{ ...activityTemplate, id: newId(), status: 'Não iniciado', tipo: 'Manual' }];
        data.planoComunicacao = [{ ...communicationTemplate, id: newId() }];
        data.planoRiscos = [{ ...riskTemplate, id: newId() }];
        data.cadernoTestes = [{ ...testTemplate, id: newId() }];
        data.segurancaAcessos.perfis = [{ ...securityProfileTemplate, id: newId() }];
        data.contatos = [{ ...contactTemplate, id: newId() }];

        if (currentUser?.name) {
            data.informacoesGerais.liderMudanca = currentUser.name;
            data.informacoesGerais.solicitante = currentUser.name;
        }
        return data;
    });

    const isSapAffected = useMemo(() => {
        return formData.informacoesGerais.areaAfetada === 'SAP' || (formData.informacoesGerais.sistemasAfetados && formData.informacoesGerais.sistemasAfetados.includes('SAP'));
    }, [formData.informacoesGerais.areaAfetada, formData.informacoesGerais.sistemasAfetados]);

    const showTransportMap = useMemo(() => {
        const hasSystems = formData.informacoesGerais.sistemasAfetados && formData.informacoesGerais.sistemasAfetados.length > 0;
        return isSapAffected || hasSystems;
    }, [isSapAffected, formData.informacoesGerais.sistemasAfetados]);

    const themeColor = useMemo(() => {
        const area = formData.informacoesGerais.areaAfetada;
        if (area === 'SAP') return '#b03a2e'; 
        if (area === 'Infra') return '#2e86c1'; 
        return 'rgb(28, 129, 140)'; 
    }, [formData.informacoesGerais.areaAfetada]);

    const visibleStepIndexes = useMemo(() => {
        const area = formData.informacoesGerais.areaAfetada;
        if (area === 'SAP') {
            return [0, 1, 8, 10, 11, 12];
        } else if (area === 'Infra') {
            return [0, 13, 14, 15, 11, 12];
        } else {
            return [0, 1, 3, 4, 5, 6, 7, 8, 9, 11, 12];
        }
    }, [formData.informacoesGerais.areaAfetada]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (formData.informacoesGerais.motivoMudanca.trim()) {
                const draftId = onAutoSaveDraft(formData, currentDraftId);
                setCurrentDraftId(draftId);
                setAutoSaveStatus('Rascunho salvo automaticamente!');
                setTimeout(() => setAutoSaveStatus(''), 5000);
            }
        }, 120000);
        return () => clearInterval(timer);
    }, [formData, currentDraftId, onAutoSaveDraft]);

    useEffect(() => {
        localStorage.setItem(userWizardKey, JSON.stringify({ formData, draftId: currentDraftId }));
    }, [formData, currentDraftId, userWizardKey]);

    const handleAutoFill = () => {
        if (!isAdminUser) return;
        
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toTimeString().slice(0, 5);
        
        const testData = {
            ...formData,
            informacoesGerais: {
                ...formData.informacoesGerais,
                solicitante: 'Eduardo Administrador (Teste)',
                dataMudanca: today,
                motivoMudanca: 'Preenchimento automático para validação de fluxos do sistema CAB SIPAL.',
                impactoNaoRealizar: 'Impacto de teste: Indisponibilidade de homologação caso o fluxo não seja testado.',
                sistemasAfetados: ['SAP', 'BI', 'Active Directory'],
                frentesSAP: ['Controladoria - CO', 'Fiscal'],
                indisponibilidade: 'Não',
                classificacao: 'Planejada',
                tipoRequestGeral: ['CONFIG'],
                confirmacaoSemCodigo: 'Não'
            },
            planoImplantacao: [{
                ...activityTemplate,
                id: newId(),
                nomeAtividade: 'Atividade Teste 01',
                etapa: 'Implantação',
                status: 'Pendente',
                dataPlanejada: today,
                horaPlanejada: nowTime,
                responsavel: 'Eduardo Admin',
                departamento: 'Governança TI',
                itemConfiguracao: 'PROD_SRV_01',
                tempoExecucao: '00:30',
                descricao: 'Execução de script SQL de limpeza.'
            }],
            mapaTransporte: [{
                ...transportTemplate,
                id: newId(),
                requestId: 'S71K900555',
                sequencing: '1',
                objective: 'Transporte de teste automático',
                technicalDescription: 'Objetos Z_TEST para verificação de layout.',
                creationDate: today,
                creationResp: 'Admin',
                requester: 'Eduardo',
                goSipal: 'GO-8677',
                testLink: 'http://sipal.com.br/evidencia'
            }],
            planoRetorno: [{
                ...activityTemplate,
                id: newId(),
                status: 'Não iniciado',
                tipo: 'Manual',
                dataPlanejada: today,
                horaPlanejada: nowTime,
                descricao: 'Rollback manual via restore de snapshot.',
                responsavel: 'Suporte N3'
            }],
            cadernoTestes: [{
                ...testTemplate,
                id: newId(),
                linkGoSipal: 'http://go.sipal.com.br/teste-automatico'
            }],
            planoComunicacao: [{
                ...communicationTemplate,
                id: newId(),
                data: today,
                hora: nowTime,
                status: 'Enviado',
                meio: 'E-mail',
                atividadePublico: 'Aviso de Mudança - Teste',
                responsavel: 'Admin'
            }],
            riscosGerais: {
                planoImplantacaoRiscoClaro: 'Sim',
                stakeholdersConsultados: 'Sim'
            },
            comunicacaoChecklist: {
                partesEnvolvidasValidaram: 'Sim',
                processoAcompanhamentoComunicado: 'Sim',
                comunicacaoEventoRetorno: 'Sim',
                passoAPassoAplicacao: 'Sim'
            },
            planoRiscos: [{
                ...riskTemplate,
                id: newId(),
                risco: 'Risco de timeout de rede',
                acao: 'Monitorar latência',
                mitigacao: 'Redirecionar tráfego para fibra secundária.'
            }],
            contatos: [{
                ...contactTemplate,
                id: newId(),
                nome: 'Eduardo Ziemniczak',
                cargo: 'Admin',
                email: 'eduardo.ziemniczak@sipal.com.br',
                telefones: '(41) 99999-9999',
                area: 'TI',
                gestorArea: 'Fabio Lovato'
            }],
            checklist: formData.checklist.map((item: any) => ({ ...item, answer: 'Sim' })),
            checklistSAP: formData.checklistSAP.map((item: any) => ({ ...item, answer: 'Sim' })),
            infra: {
                ...formData.infra,
                espaco: 'Gestão de Mudanças (GMUD)',
                tipoTicket: 'Mudança',
                resumo: 'TESTE AUTOMÁTICO - UPGRADE SERVIDOR',
                sistemaAfetado: ['Servidores'],
                descricao: 'Descrição técnica para teste de infraestrutura.',
                justificativa: 'Melhoria de performance.',
                responsavel: 'Eduardo Admin',
                dataInicio: `${today}T08:00`,
                dataFim: `${today}T12:00`,
                modeloComputador: 'Dell R740',
                numeroSerie: 'SN123456789'
            }
        };

        setFormData(testData);
        setValidationErrors([]);
    };

    const isFieldEmpty = (val: any) => !val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);

    const getInputClass = (val: any, isRequired: boolean = true) => {
        if (isAdminUser) return '';
        return (isRequired && showValidation && isFieldEmpty(val)) ? 'validation-error-field' : '';
    };

    const validateStep = (idx: number, fullCheck: boolean = false) => {
        if (isAdminUser) return [];

        const errors: any[] = [];
        const { informacoesGerais, infra, planoImplantacao, mapaTransporte, checklist, checklistSAP, cadernoTestes, planoRetorno, planoComunicacao, planoRiscos, segurancaAcessos, contatos, comunicacaoChecklist, riscosGerais } = formData;
        const currentArea = informacoesGerais.areaAfetada;

        const validateSpecificStep = (sIdx: number) => {
            if (sIdx === 0) {
                if (isFieldEmpty(informacoesGerais.dataMudanca)) {
                    errors.push({ message: 'Selecione a "Data da Mudança".' });
                } else {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const [y, m, d] = informacoesGerais.dataMudanca.split('-').map(Number);
                    const selectedDate = new Date(y, m - 1, d);

                    if (selectedDate < today) {
                        errors.push({ message: 'A "Data da Mudança" não pode ser anterior ao dia de hoje.' });
                    } else if (informacoesGerais.classificacao === 'Planejada') {
                        if (selectedDate.getDay() !== 3) {
                            errors.push({ message: 'Para mudanças Planejadas, selecione apenas uma quarta-feira futura.' });
                        }
                    } else if (informacoesGerais.classificacao === 'Programada') {
                        const diffTime = selectedDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 7) {
                            errors.push({ message: 'Para mudanças Programadas, a data deve tel no mínimo 1 semana de antecedência (7 dias).' });
                        }
                    }
                }

                if (isFieldEmpty(informacoesGerais.solicitante)) errors.push({ message: 'O campo "Solicitante" é obrigatório.' });
                if (isFieldEmpty(informacoesGerais.liderMudanca)) errors.push({ message: 'O campo "Líder da Mudança" é obrigatório.' });
                if (currentArea === 'Infra') {
                    if (isFieldEmpty(infra.espaco)) errors.push({ message: 'O campo "Espaço" é obrigatório.' });
                    if (isFieldEmpty(infra.tipoTicket)) errors.push({ message: 'O campo "Tipo do Ticket" é obrigatório.' });
                    if (isFieldEmpty(infra.resumo)) errors.push({ message: 'O campo "Resumo" é obrigatório.' });
                    if (isFieldEmpty(infra.sistemaAfetado)) errors.push({ message: 'Selecione ao menos um "Sistema Afetado".' });
                } else {
                    if (isFieldEmpty(informacoesGerais.sistemasAfetados)) errors.push({ message: 'Selecione ao menos um "Sistema Afetado".' });
                    if (isFieldEmpty(informacoesGerais.motivoMudanca)) errors.push({ message: 'O campo "Motivo da Mudança" é obrigatório.' });
                    if (isFieldEmpty(informacoesGerais.impactoNaoRealizar)) errors.push({ message: 'O campo "Impacto de Não Realizar" é obrigatório.' });
                    if (isFieldEmpty(informacoesGerais.tipoRequestGeral)) errors.push({ message: 'O campo "Tipo de Request" é obrigatório.' });
                    
                    if (isSapAffected) {
                        if (isFieldEmpty(informacoesGerais.frentesSAP)) {
                            errors.push({ message: 'Selecione ao menos uma "Frente SAP".' });
                        }
                        if (isFieldEmpty(informacoesGerais.indisponibilidade)) {
                            errors.push({ message: 'A resposta sobre indisponibilidade é obrigatória para mudanças SAP.' });
                        }
                    }
                }
            }
            if (sIdx === 1) {
                if (planoImplantacao.length === 0) {
                    errors.push({ message: 'Plano de Implantação: Adicione ao menos uma atividade.' });
                } else {
                    planoImplantacao.forEach((p: any, i: number) => {
                        if (isFieldEmpty(p.nomeAtividade)) errors.push({ message: `Implantação #${i+1}: Nome é obrigatório.` });
                        if (isFieldEmpty(p.etapa)) errors.push({ message: `Implantação #${i+1}: Etapa é obrigatória.` });
                        if (isFieldEmpty(p.status)) errors.push({ message: `Implantação #${i+1}: Status é obrigatório.` });
                        if (isFieldEmpty(p.dataPlanejada)) errors.push({ message: `Implantação #${i+1}: Data Planejada é obrigatória.` });
                        if (isFieldEmpty(p.horaPlanejada)) errors.push({ message: `Implantação #${i+1}: Hora Planejada é obrigatória.` });
                        if (isFieldEmpty(p.responsavel)) errors.push({ message: `Implantação #${i+1}: Responsável é obrigatório.` });
                        if (isFieldEmpty(p.departamento)) errors.push({ message: `Implantação #${i+1}: Departamento é obrigatório.` });
                        if (isFieldEmpty(p.itemConfiguracao)) errors.push({ message: `Implantação #${i+1}: Item de Configuração é obrigatório.` });
                        if (isFieldEmpty(p.tempoExecucao)) errors.push({ message: `Implantação #${i+1}: Tempo de Execução é obrigatório.` });
                        if (isFieldEmpty(p.descricao)) errors.push({ message: `Implantação #${i+1}: Descrição é obrigatória.` });
                    });
                }
                
                if (showTransportMap) {
                    mapaTransporte.forEach((t: any, i: number) => {
                        if (isFieldEmpty(t.requestId)) errors.push({ message: `Mapa Transporte #${i+1}: ID da Request é obrigatório.` });
                        if (isFieldEmpty(t.technicalDescription)) errors.push({ message: `Mapa Transporte #${i+1}: Descrição Técnica é obrigatória.` });
                    });
                }
            }
            if (sIdx === 4) {
                if (planoRetorno.length === 0) {
                    errors.push({ message: 'Plano de Retorno: Adicione ao menos uma atividade.' });
                } else {
                    planoRetorno.forEach((p: any, i: number) => {
                        if (isFieldEmpty(p.dataPlanejada)) errors.push({ message: `Rollback #${i+1}: Data Planejada é obrigatória.` });
                        if (isFieldEmpty(p.horaPlanejada)) errors.push({ message: `Rollback #${i+1}: Hora Planejada é obrigatória.` });
                        if (isFieldEmpty(p.descricao)) errors.push({ message: `Rollback #${i+1}: Descrição é obrigatória.` });
                        if (isFieldEmpty(p.responsavel)) errors.push({ message: `Rollback #${i+1}: Responsável é obrigatório.` });
                    });
                }
            }
            if (sIdx === 5) {
                if (isFieldEmpty(comunicacaoChecklist.partesEnvolvidasValidaram)) errors.push({ message: 'Comunicação: Responda se as partes validaram.' });
                if (isFieldEmpty(comunicacaoChecklist.processoAcompanhamentoComunicado)) errors.push({ message: 'Comunicação: Responda se o acompanhamento foi comunicado.' });
                if (isFieldEmpty(comunicacaoChecklist.comunicacaoEventoRetorno)) errors.push({ message: 'Comunicação: Responda se o evento de retorno foi contemplado.' });
                if (isFieldEmpty(comunicacaoChecklist.passoAPassoAplicacao)) errors.push({ message: 'Comunicação: Responda se o passo a passo existe.' });

                if (planoComunicacao.length === 0) {
                    errors.push({ message: 'Detalhamento da Comunicação: Adicione ao menos um item.' });
                } else {
                    planoComunicacao.forEach((p: any, i: number) => {
                        if (isFieldEmpty(p.data)) errors.push({ message: `Comunicação #${i+1}: Data é obrigatória.` });
                        if (isFieldEmpty(p.hora)) errors.push({ message: `Comunicação #${i+1}: Hora é obrigatória.` });
                        if (isFieldEmpty(p.status)) errors.push({ message: `Comunicação #${i+1}: Status é obrigatório.` });
                        if (isFieldEmpty(p.meio)) errors.push({ message: `Comunicação #${i+1}: Meio é obrigatório.` });
                        if (isFieldEmpty(p.atividadePublico)) errors.push({ message: `Comunicação #${i+1}: Atividade/Público é obrigatório.` });
                        if (isFieldEmpty(p.responsavel)) errors.push({ message: `Comunicação #${i+1}: Responsável é obrigatório.` });
                        if (isFieldEmpty(p.contatoEscalonamento)) errors.push({ message: `Comunicação #${i+1}: Contato Escalonamento é obrigatório.` });
                    });
                }
            }
            if (sIdx === 6) {
                if (isFieldEmpty(riscosGerais.planoImplantacaoRiscoClaro)) errors.push({ message: 'Riscos: Responda se o plano está claro sobre riscos.' });
                if (isFieldEmpty(riscosGerais.stakeholdersConsultados)) errors.push({ message: 'Riscos: Responda se os stakeholders foram consultados.' });

                if (planoRiscos.length === 0) {
                    errors.push({ message: 'Detalhamento dos Riscos: Adicione ao menos um risco.' });
                } else {
                    planoRiscos.forEach((p: any, i: number) => {
                        if (isFieldEmpty(p.tipoRisco)) errors.push({ message: `Risco #${i+1}: Tipo é obrigatório.` });
                        if (isFieldEmpty(p.risco)) errors.push({ message: `Risco #${i+1}: Descrição do Risco é obrigatória.` });
                        if (isFieldEmpty(p.estrategia)) errors.push({ message: `Risco #${i+1}: Estratégia é obrigatória.` });
                        if (isFieldEmpty(p.acao)) errors.push({ message: `Risco #${i+1}: Ação é obrigatória.` });
                        if (isFieldEmpty(p.impacto)) errors.push({ message: `Risco #${i+1}: Impacto é obrigatório.` });
                        if (isFieldEmpty(p.mitigacao)) errors.push({ message: `Risco #${i+1}: Mitigação é obrigatória.` });
                    });
                }
            }
            if (sIdx === 7) {
                if (segurancaAcessos.perfis.length === 0) {
                    errors.push({ message: 'Segurança e Acessos: Adicione ao menos um perfil.' });
                } else {
                    segurancaAcessos.perfis.forEach((p: any, i: number) => {
                        if (isFieldEmpty(p.nivelAcesso)) errors.push({ message: `Perfil #${i+1}: Nível é obrigatório.` });
                        if (isFieldEmpty(p.plataforma)) errors.push({ message: `Perfil #${i+1}: Plataforma é obrigatória.` });
                        if (isFieldEmpty(p.ambiente)) errors.push({ message: `Perfil #${i+1}: Ambiente é obrigatório.` });
                        if (isFieldEmpty(p.gruposAcesso)) errors.push({ message: `Perfil #${i+1}: Grupos de Acesso é obrigatório.` });
                        if (isFieldEmpty(p.itemConfig)) errors.push({ message: `Perfil #${i+1}: Item de Configuração é obrigatório.` });
                        if (isFieldEmpty(p.areaNegocio)) errors.push({ message: `Perfil #${i+1}: Área de Negócio é obrigatória.` });
                        if (isFieldEmpty(p.usuarios)) errors.push({ message: `Perfil #${i+1}: Usuários é obrigatório.` });
                        if (isFieldEmpty(p.loginAcesso)) errors.push({ message: `Perfil #${i+1}: Login é obrigatório.` });
                        if (isFieldEmpty(p.justificativa)) errors.push({ message: `Perfil #${i+1}: Justificativa é obrigatória.` });
                    });
                }
            }
            if (sIdx === 8) {
                if (contatos.length === 0) {
                    errors.push({ message: 'Matriz de Contatos: Adicione ao menos um contato.' });
                } else {
                    contatos.forEach((c: any, i: number) => {
                        if (isFieldEmpty(c.nome)) errors.push({ message: `Contato #${i+1}: Nome é obrigatório.` });
                        if (isFieldEmpty(c.cargo)) errors.push({ message: `Contato #${i+1}: Cargo é obrigatório.` });
                        if (isFieldEmpty(c.email)) errors.push({ message: `Contato #${i+1}: E-mail é obrigatório.` });
                        if (isFieldEmpty(c.telefones)) errors.push({ message: `Contato #${i+1}: Telefones é obrigatório.` });
                        if (isFieldEmpty(c.localAtuacao)) errors.push({ message: `Contato #${i+1}: Local é obrigatório.` });
                        if (isFieldEmpty(c.liderImediato)) errors.push({ message: `Contato #${i+1}: Líder Imediato é obrigatório.` });
                        if (isFieldEmpty(c.emailLider)) errors.push({ message: `Contato #${i+1}: E-mail do Líder é obrigatório.` });
                        if (isFieldEmpty(c.area)) errors.push({ message: `Contato #${i+1}: Área é obrigatória.` });
                        if (isFieldEmpty(c.gestorArea)) errors.push({ message: `Contato #${i+1}: Gestor da Área é obrigatório.` });
                    });
                }
            }
            if (sIdx === 9) {
                if (checklist.some((i: any) => !i.answer)) errors.push({ message: 'Checklist Geral: Responda todas as perguntas.' });
                if (isSapAffected && checklistSAP.some((i: any) => !i.answer)) errors.push({ message: 'Checklist SAP: Responda todas as perguntas.' });
            }
            if (sIdx === 10) {
                if (checklistSAP.some((i: any) => !i.answer)) errors.push({ message: 'Checklist SAP: Responda todas as perguntas.' });
            }
            if (sIdx === 13) {
                if (isFieldEmpty(infra.descricao)) errors.push({ message: 'Descrição Detalhada é obrigatória.' });
                if (isFieldEmpty(infra.justificativa)) errors.push({ message: 'Justificativa é obrigatória.' });
                if (isFieldEmpty(infra.responsavel)) errors.push({ message: 'Responsável é obrigatório.' });
            }
            if (sIdx === 14) {
                if (isFieldEmpty(infra.dataInicio)) {
                    errors.push({ message: 'Data Início é obrigatória.' });
                } else {
                    const selected = new Date(infra.dataInicio);
                    const now = new Date();
                    if (selected < now) errors.push({ message: 'A Data de Início não pode ser anterior ao dia de hoje.' });
                }
                if (isFieldEmpty(infra.dataFim)) errors.push({ message: 'Data Fim é obrigatória.' });
            }
            if (sIdx === 15) {
                if (isFieldEmpty(infra.modeloComputador)) errors.push({ message: 'Modelo do Computador é obrigatório.' });
                if (isFieldEmpty(infra.numeroSerie)) errors.push({ message: 'Número de Série é obrigatório.' });
            }
        };

        if (fullCheck) {
            visibleStepIndexes.forEach(stepIdx => {
                if (stepIdx !== 12 && stepIdx !== 11) validateSpecificStep(stepIdx);
            });
        } else {
            if (visibleStepIndexes.includes(idx)) validateSpecificStep(idx);
        }

        if (!fullCheck) {
            setCompletedSteps(prev => ({ ...prev, [idx]: errors.length === 0 }));
            setValidationErrors(errors);
        }
        return errors;
    };

    const handleNext = () => {
        setShowValidation(true);
        const errors = validateStep(currentStep);
        if (errors.length === 0) {
            setShowValidation(false);
            const curIdx = visibleStepIndexes.indexOf(currentStep);
            if (curIdx < visibleStepIndexes.length - 1) {
                setCurrentStep(visibleStepIndexes[curIdx + 1]);
                window.scrollTo(0, 0);
            }
        } else {
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        const curIdx = visibleStepIndexes.indexOf(currentStep);
        if (curIdx > 0) {
            setCurrentStep(visibleStepIndexes[curIdx - 1]);
            setValidationErrors([]);
            setShowValidation(false);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async () => {
        setShowValidation(true);
        const allErrors = validateStep(-1, true);
        if (allErrors.length > 0) {
            setValidationErrors(allErrors);
            window.scrollTo(0, 0);
            return;
        }

        const newIdGenerated = addRequest(formData, currentDraftId);
        setSubmittedRequestId(newIdGenerated);
        setUploadStatus(null);
        const result = await generateAndUploadPdf(formData, newIdGenerated);
        setUploadStatus(result);

        // Novo formato do assunto do e-mail: "categoria"- Nova RDM: "id do CAB" - "go-sipal"
        const area = formData.informacoesGerais.areaAfetada;
        const classification = area === 'Infra' ? formData.infra.tipoMudanca : formData.informacoesGerais.classificacao;
        const cat = classification.toUpperCase();
        
        // Busca a referência Go-Sipal nos mapas de transporte ou tickets de infra
        let goSipalRef = "";
        if (formData.mapaTransporte && formData.mapaTransporte.length > 0) {
            const firstWithGo = formData.mapaTransporte.find((t: any) => t.goSipal);
            goSipalRef = firstWithGo ? firstWithGo.goSipal : formData.mapaTransporte[0].goSipal || "";
        }
        if (!goSipalRef && formData.infra.ticketsVinculados) {
            goSipalRef = formData.infra.ticketsVinculados;
        }

        // Monta o assunto seguindo o modelo solicitado
        const subjectStr = `"${cat}" - Nova RDM: "${newIdGenerated}"${goSipalRef ? ` - "${goSipalRef}"` : ""}`;
        setMailtoLink(`mailto:cab@sipal.com.br?subject=${encodeURIComponent(subjectStr)}`);

        setCurrentStep(12);
        localStorage.removeItem(userWizardKey);
        window.scrollTo(0, 0);
    };

    const handleRequestTypeChange = (vals: string[]) => {
        setFormData((prev: any) => {
            const newInfo = { ...prev.informacoesGerais, tipoRequestGeral: vals };
            const isOnlyConfig = vals.length === 1 && vals[0] === 'CONFIG';
            if (isOnlyConfig) {
                newInfo.classificacao = 'Padrão';
            } else if (vals.length > 0) {
                if (prev.informacoesGerais.classificacao === 'Padrão') {
                    newInfo.classificacao = 'Planejada';
                }
            }
            return { ...prev, informacoesGerais: newInfo };
        });
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        const [section, field] = name.split('_');
        
        if (field === 'areaAfetada') {
            const sapVal = value === 'SAP' ? 'Sim' : 'Não';
            setFormData((prev: any) => ({ 
                ...prev, 
                informacoesGerais: { ...prev.informacoesGerais, areaAfetada: value, referenteSAP: sapVal } 
            }));
            setValidationErrors([]); 
            return;
        }

        if (field === 'classificacao') {
            setFormData((prev: any) => ({ ...prev, informacoesGerais: { ...prev.informacoesGerais, classificacao: value } }));
            return;
        }

        setFormData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const updateInfraField = (field: string, value: any) => {
        setFormData((prev: any) => {
            const newInfra = { ...prev.infra, [field]: value };
            if (field === 'espaco') {
                const tickets = espacosInfraData[value] || [];
                newInfra.tipoTicket = tickets.length > 0 ? tickets[0] : '';
            }
            return { ...prev, infra: newInfra };
        });
    };

    const updateChecklist = (section: string, idx: number, field: string, value: any) => {
        setFormData((prev: any) => {
            const newList = [...prev[section]];
            const items = section === 'checklist' ? checklistItemsStandard : checklistSAPItems;
            const targetQuestion = items[idx].question;
            const actualIdx = prev[section].findIndex((item:any) => item.question === targetQuestion);
            if (actualIdx !== -1) {
                newList[actualIdx] = { ...newList[actualIdx], [field]: value };
            }
            return { ...prev, [section]: newList };
        });
    };

    const addRow = (section: string, def: any) => {
        setFormData((prev: any) => {
            const parts = section.split('.');
            if (parts.length === 2) {
                return {
                    ...prev,
                    [parts[0]]: { 
                        ...prev[parts[0]], 
                        [parts[1]]: [...prev[parts[0]][parts[1]], { ...def, id: newId() }] 
                    }
                };
            }
            return { ...prev, [section]: [...prev[section], { ...def, id: newId() }] };
        });
    };

    const removeRow = (section: string, idx: number) => {
        setFormData((prev: any) => {
            const parts = section.split('.');
            if (parts.length === 2) {
                const newList = [...prev[parts[0]][parts[1]]];
                newList.splice(idx, 1);
                return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: newList } };
            }
            const newList = [...prev[section]];
            newList.splice(idx, 1);
            return { ...prev, [section]: newList };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const processed = await Promise.all(files.map((file: File) => new Promise<Anexo>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve({ name: file.name, size: file.size, type: file.type, url: ev.target?.result });
            reader.readAsDataURL(file);
        })));
        setFormData((prev: any) => ({ ...prev, anexos: [...prev.anexos, ...processed] }));
    };

    const renderTransportCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.mapaTransporte];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, mapaTransporte: newList };
            });
        };

        return (
            <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.requestId) || isFieldEmpty(item.technicalDescription)) ? 'validation-error-field' : ''}`}>
                <div className="implementation-card-header"> 
                    <h4>REQUEST #{idx + 1}: NOVA REQUEST</h4> 
                    <button onClick={() => removeRow('mapaTransporte', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="form-field">
                        <label>ID da Request *</label>
                        <input type="text" className={getInputClass(item.requestId)} value={item.requestId || ''} onChange={(e) => updateField('requestId', e.target.value)} placeholder="S71K900..." />
                    </div>
                    <div className="form-field"><label>Sequenciamento</label><input type="text" value={item.sequencing || ''} onChange={(e) => updateField('sequencing', e.target.value)} /></div>
                    <div className="form-field">
                        <label>Referência Go-Sipal</label>
                        <input type="text" value={item.goSipal || ''} onChange={(e) => updateField('goSipal', e.target.value)} placeholder="Ex: GO-8677" />
                    </div>
                    <div className="form-field">
                        <label>Tipo Request</label>
                        <select value={item.requestType || 'Workbench'} onChange={(e) => updateField('requestType', e.target.value)}>
                            <option value="Workbench">Workbench</option>
                            <option value="Customizing">Customizing</option>
                            <option value="Transport of Copies">Transport of Copies</option>
                        </select>
                    </div>
                    <div className="form-field full-width">
                        <label>Descrição Técnica *</label>
                        <textarea className={getInputClass(item.technicalDescription)} value={item.technicalDescription || ''} onChange={(e) => updateField('technicalDescription', e.target.value)} style={{ minHeight: '80px' }} />
                    </div>
                </div>
            </div>
        );
    };

    const renderActivityCard = (section: string, item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const parts = section.split('.');
                const newList = parts.length === 2 ? [...prev[parts[0]][parts[1]]] : [...prev[section]];
                newList[idx] = { ...newList[idx], [field]: value };
                return parts.length === 2 ? { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: newList } } : { ...prev, [section]: newList };
            });
        };

        const isImplantacao = section.includes('Implantacao');
        const isRetorno = section.includes('Retorno');

        if (isRetorno) {
            return (
                <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.dataPlanejada) || isFieldEmpty(item.horaPlanejada) || isFieldEmpty(item.descricao) || isFieldEmpty(item.responsavel)) ? 'validation-error-section' : ''}`}>
                    <div className="implementation-card-header"> 
                        <h4>Atividade #{idx + 1}</h4> 
                        <button onClick={() => removeRow(section, idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                    </div>
                    <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="form-field">
                            <label>Data Planejada *</label>
                            <input type="date" max="9999-12-31" className={getInputClass(item.dataPlanejada)} value={item.dataPlanejada || ''} onChange={(e) => updateField('dataPlanejada', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Hora Planejada *</label>
                            <input type="time" className={getInputClass(item.horaPlanejada)} value={item.horaPlanejada || ''} onChange={(e) => updateField('horaPlanejada', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Responsável *</label>
                            <input type="text" className={getInputClass(item.responsavel)} value={item.responsavel || ''} onChange={(e) => updateField('responsavel', e.target.value)} />
                        </div>
                        <div className="form-field full-width">
                            <label>Descrição *</label>
                            <textarea className={getInputClass(item.descricao)} value={item.descricao || ''} onChange={(e) => updateField('descricao', e.target.value)} style={{ minHeight: '80px' }} />
                        </div>
                        <div className="form-field">
                            <label>Predecessora</label>
                            <input type="text" value={item.predecessora || ''} onChange={(e) => updateField('predecessora', e.target.value)} />
                        </div>
                    </div>
                </div>
            );
        }

        if (isImplantacao) {
            return (
                <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.nomeAtividade) || isFieldEmpty(item.etapa) || isFieldEmpty(item.status) || isFieldEmpty(item.dataPlanejada) || isFieldEmpty(item.horaPlanejada) || isFieldEmpty(item.responsavel) || isFieldEmpty(item.departamento) || isFieldEmpty(item.itemConfiguracao) || isFieldEmpty(item.tempoExecucao) || isFieldEmpty(item.descricao)) ? 'validation-error-section' : ''}`}>
                    <div className="implementation-card-header"> 
                        <h4>ATIVIDADE #{idx + 1}: {item.nomeAtividade || 'SEM NOME'}</h4> 
                        <button onClick={() => removeRow(section, idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                    </div>
                    <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="form-field full-width">
                            <label>Nome da Atividade *</label>
                            <input type="text" className={getInputClass(item.nomeAtividade)} value={item.nomeAtividade || ''} onChange={(e) => updateField('nomeAtividade', e.target.value)} />
                        </div>
                        
                        <div className="form-field">
                            <label>Etapa *</label>
                            <select className={getInputClass(item.etapa)} value={item.etapa || 'Pré Implantação'} onChange={(e) => updateField('etapa', e.target.value)}>
                                {etapasMudanca.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Status *</label>
                            <input type="text" className={getInputClass(item.status)} value={item.status || ''} onChange={(e) => updateField('status', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Data Planejada *</label>
                            <input type="date" max="9999-12-31" className={getInputClass(item.dataPlanejada)} value={item.dataPlanejada || ''} onChange={(e) => updateField('dataPlanejada', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Hora Planejada *</label>
                            <input type="time" className={getInputClass(item.horaPlanejada)} value={item.horaPlanejada || ''} onChange={(e) => updateField('horaPlanejada', e.target.value)} />
                        </div>
                        <div className="form-field full-width">
                            <label>Descrição *</label>
                            <textarea className={getInputClass(item.descricao)} value={item.descricao || ''} onChange={(e) => updateField('descricao', e.target.value)} style={{ minHeight: '80px' }} />
                        </div>
                        <div className="form-field">
                            <label>Responsável *</label>
                            <input type="text" className={getInputClass(item.responsavel)} value={item.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Departamento *</label>
                            <input type="text" className={getInputClass(item.departamento)} value={item.departamento || ''} onChange={(e) => updateField('departamento', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Item de Configuração *</label>
                            <input type="text" className={getInputClass(item.itemConfiguracao)} value={item.itemConfiguracao || ''} onChange={(e) => updateField('itemConfiguracao', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>Tempo de Execução *</label>
                            <input type="text" className={getInputClass(item.tempoExecucao)} value={item.tempoExecucao || ''} onChange={(e) => updateField('tempoExecucao', e.target.value)} placeholder="Ex: 01:15" />
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderTestCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.cadernoTestes];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, cadernoTestes: newList };
            });
        };

        const handlePmoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files) return;
            const files = Array.from(e.target.files);
            const processed = await Promise.all(files.map((file: File) => new Promise<Anexo>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve({ name: file.name, size: file.size, type: file.type, url: ev.target?.result });
                reader.readAsDataURL(file);
            })));
            updateField('anexosPmo', [...(item.anexosPmo || []), ...processed]);
        };

        return (
            <div key={item.id} className="implementation-card">
                <div className="implementation-card-header"> 
                    <h4>Caderno de Testes #{idx + 1}</h4> 
                    <button onClick={() => removeRow('cadernoTestes', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem' }}>
                    <div className="form-field full-width">
                        <label>Link do GO-Sipal</label>
                        <input 
                            type="text" 
                            className={getInputClass(item.linkGoSipal, false)} 
                            value={item.linkGoSipal || ''} 
                            onChange={(e) => updateField('linkGoSipal', e.target.value)} 
                            placeholder="Insira o link aqui..." 
                        />
                    </div>
                    <div className="form-field full-width">
                        <label>Anexo do caderno de teste padrão PMO</label>
                        <div className="upload-container" style={{ margin: '0', justifyContent: 'flex-start' }}>
                            <input 
                                type="file" 
                                id={`pmo-upload-${idx}`} 
                                style={{ display: 'none' }} 
                                multiple 
                                onChange={handlePmoFileChange} 
                            />
                            <label htmlFor={`pmo-upload-${idx}`} className="upload-box" style={{ padding: '1.5rem', maxWidth: '100%', gap: '1rem' }}>
                                <UploadIcon />
                                <p style={{ fontSize: '0.9rem' }}>Clique para anexar o caderno padrão PMO</p>
                            </label>
                        </div>
                        {item.anexosPmo && item.anexosPmo.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#ffffff' }}>Arquivos anexados:</p>
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {item.anexosPmo.map((file: any, fIdx: number) => (
                                        <li key={fIdx} style={{ fontSize: '0.8rem', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                            <DownloadIcon /> <span>{file.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderCommunicationCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.planoComunicacao];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, planoComunicacao: newList };
            });
        };

        return (
            <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.data) || isFieldEmpty(item.hora) || isFieldEmpty(item.status) || isFieldEmpty(item.meio) || isFieldEmpty(item.atividadePublico) || isFieldEmpty(item.responsavel) || isFieldEmpty(item.contatoEscalonamento)) ? 'validation-error-section' : ''}`}>
                <div className="implementation-card-header"> 
                    <h4>Item #{idx + 1}</h4> 
                    <button onClick={() => removeRow('planoComunicacao', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-field">
                        <label>Data *</label>
                        <input type="date" max="9999-12-31" className={getInputClass(item.data)} value={item.data || ''} onChange={(e) => updateField('data', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Hora *</label>
                        <input type="time" className={getInputClass(item.hora)} value={item.hora || ''} onChange={(e) => updateField('hora', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Status *</label>
                        <input type="text" className={getInputClass(item.status)} value={item.status || ''} onChange={(e) => updateField('status', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Meio *</label>
                        <select className={getInputClass(item.meio)} value={item.meio || 'E-mail'} onChange={(e) => updateField('meio', e.target.value)}>
                            <option value="E-mail">E-mail</option>
                            <option value="Teams">Teams</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Telefone">Telefone</option>
                        </select>
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 2' }}></div>
                    <div className="form-field full-width">
                        <label>Atividade/Público *</label>
                        <input type="text" className={getInputClass(item.atividadePublico)} value={item.atividadePublico || ''} onChange={(e) => updateField('atividadePublico', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Responsável *</label>
                        <input type="text" className={getInputClass(item.responsavel)} value={item.responsavel || ''} onChange={(e) => updateField('responsavel', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Contato Escalonamento *</label>
                        <input type="text" className={getInputClass(item.contatoEscalonamento)} value={item.contatoEscalonamento || ''} onChange={(e) => updateField('contatoEscalonamento', e.target.value)} />
                    </div>
                    <div className="form-field"></div>
                    <div className="form-field full-width">
                        <label>Observação</label>
                        <textarea value={item.observacao || ''} onChange={(e) => updateField('observacao', e.target.value)} style={{ minHeight: '80px' }} />
                    </div>
                </div>
            </div>
        );
    };

    const renderRiskCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.planoRiscos];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, planoRiscos: newList };
            });
        };

        return (
            <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.tipoRisco) || isFieldEmpty(item.risco) || isFieldEmpty(item.estrategia) || isFieldEmpty(item.acao) || isFieldEmpty(item.impacto) || isFieldEmpty(item.mitigacao)) ? 'validation-error-section' : ''}`}>
                <div className="implementation-card-header"> 
                    <h4>Risco #{idx + 1}</h4> 
                    <button onClick={() => removeRow('planoRiscos', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem' }}>
                    <div className="form-field">
                        <label>Tipo Risco *</label>
                        <select className={getInputClass(item.tipoRisco)} value={item.tipoRisco || 'Técnico'} onChange={(e) => updateField('tipoRisco', e.target.value)}>
                            <option value="Técnico">Técnico</option>
                            <option value="Operacional">Operacional</option>
                            <option value="Negócio">Negócio</option>
                            <option value="Segurança">Segurança</option>
                        </select>
                    </div>
                    <div className="form-field full-width">
                        <label>Risco *</label>
                        <input type="text" className={getInputClass(item.risco)} value={item.risco || ''} onChange={(e) => updateField('risco', e.target.value)} />
                    </div>
                    <div className="form-field full-width">
                        <label>Estratégia *</label>
                        <select className={getInputClass(item.estrategia)} value={item.estrategia || 'Mitigar'} onChange={(e) => updateField('estrategia', e.target.value)}>
                            <option value="Mitigar">Mitigar</option>
                            <option value="Aceitar">Aceitar</option>
                            <option value="Transferir">Transferir</option>
                            <option value="Evitar">Evitar</option>
                        </select>
                    </div>
                    <div className="form-field full-width">
                        <label>Ação *</label>
                        <textarea className={getInputClass(item.acao)} value={item.acao || ''} onChange={(e) => updateField('acao', e.target.value)} style={{ minHeight: '80px' }} />
                    </div>
                    <div className="form-field full-width">
                        <label>Impacto *</label>
                        <select className={getInputClass(item.impacto)} value={item.impacto || 'Médio'} onChange={(e) => updateField('impacto', e.target.value)}>
                            <option value="Baixo">Baixo</option>
                            <option value="Médio">Médio</option>
                            <option value="Alto">Alto</option>
                            <option value="Crítico">Crítico</option>
                        </select>
                    </div>
                    <div className="form-field full-width">
                        <label>Mitigação *</label>
                        <textarea className={getInputClass(item.mitigacao)} value={item.mitigacao || ''} onChange={(e) => updateField('mitigacao', e.target.value)} style={{ minHeight: '80px' }} />
                    </div>
                </div>
            </div>
        );
    };

    const renderSecurityProfileCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.segurancaAcessos.perfis];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, segurancaAcessos: { ...prev.segurancaAcessos, perfis: newList } };
            });
        };

        return (
            <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.nivelAcesso) || isFieldEmpty(item.plataforma) || isFieldEmpty(item.ambiente) || isFieldEmpty(item.gruposAcesso) || isFieldEmpty(item.itemConfig) || isFieldEmpty(item.areaNegocio) || isFieldEmpty(item.usuarios) || isFieldEmpty(item.loginAcesso) || isFieldEmpty(item.justificativa)) ? 'validation-error-section' : ''}`}>
                <div className="implementation-card-header"> 
                    <h4>Perfil #{idx + 1}</h4> 
                    <button onClick={() => removeRow('segurancaAcessos.perfis', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-field">
                        <label>Nível de acesso *</label>
                        <select className={getInputClass(item.nivelAcesso)} value={item.nivelAcesso || 'Usuário'} onChange={(e) => updateField('nivelAcesso', e.target.value)}>
                            <option value="Usuário">Usuário</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Suporte">Suporte</option>
                            <option value="Auditoria">Auditoria</option>
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Plataforma *</label>
                        <input type="text" className={getInputClass(item.plataforma)} value={item.plataforma || ''} onChange={(e) => updateField('plataforma', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Ambiente *</label>
                        <select className={getInputClass(item.ambiente)} value={item.ambiente || 'Produção'} onChange={(e) => updateField('ambiente', e.target.value)}>
                            <option value="Produção">Produção</option>
                            <option value="Homologação">Homologação</option>
                            <option value="Desenvolvimento">Desenvolvimento</option>
                            <option value="QA">QA</option>
                        </select>
                    </div>
                    <div className="form-field full-width">
                        <label>Grupos de acesso *</label>
                        <input type="text" className={getInputClass(item.gruposAcesso)} value={item.gruposAcesso || ''} onChange={(e) => updateField('gruposAcesso', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Item de Configuração *</label>
                        <input type="text" className={getInputClass(item.itemConfig)} value={item.itemConfig || ''} onChange={(e) => updateField('itemConfig', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Area de Negócio *</label>
                        <input type="text" className={getInputClass(item.areaNegocio)} value={item.areaNegocio || ''} onChange={(e) => updateField('areaNegocio', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Usuários *</label>
                        <input type="text" className={getInputClass(item.usuarios)} value={item.usuarios || ''} onChange={(e) => updateField('usuarios', e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Login de acesso *</label>
                        <input type="text" className={getInputClass(item.loginAcesso)} value={item.loginAcesso || ''} onChange={(e) => updateField('loginAcesso', e.target.value)} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 2' }}></div>
                    <div className="form-field full-width">
                        <label>Justificativa *</label>
                        <input type="text" className={getInputClass(item.justificativa)} value={item.justificativa || ''} onChange={(e) => updateField('justificativa', e.target.value)} />
                    </div>
                </div>
            </div>
        );
    };

    const renderContactCard = (item: any, idx: number) => {
        const updateField = (field: string, value: any) => {
            setFormData((prev: any) => {
                const newList = [...prev.contatos];
                newList[idx] = { ...newList[idx], [field]: value };
                return { ...prev, contatos: newList };
            });
        };

        const isAreaSAP = formData.informacoesGerais.areaAfetada === 'SAP';

        return (
            <div key={item.id} className={`implementation-card ${!isAdminUser && showValidation && (isFieldEmpty(item.nome) || isFieldEmpty(item.cargo) || isFieldEmpty(item.email) || isFieldEmpty(item.telefones) || isFieldEmpty(item.localAtuacao) || isFieldEmpty(item.liderImediato) || isFieldEmpty(item.emailLider) || isFieldEmpty(item.area) || isFieldEmpty(item.gestorArea)) ? 'validation-error-section' : ''}`}>
                <div className="implementation-card-header"> 
                    <h4 style={{ color: '#ffffff' }}>Contato #{idx + 1}: {item.nome || 'Novo Contato'}</h4> 
                    <button onClick={() => removeRow('contatos', idx)} className="remove-row-btn" style={{ marginLeft: 'auto' }}> <TrashIcon /> </button> 
                </div>
                <div className="form-grid" style={{ padding: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-field"><label>Nome *</label><input type="text" className={getInputClass(item.nome)} value={item.nome || ''} onChange={(e) => updateField('nome', e.target.value)} /></div>
                    <div className="form-field"><label>Cargo *</label><input type="text" className={getInputClass(item.cargo)} value={item.cargo || ''} onChange={(e) => updateField('cargo', e.target.value)} /></div>
                    <div className="form-field"><label>E-mail *</label><input type="email" className={getInputClass(item.email)} value={item.email || ''} onChange={(e) => updateField('email', e.target.value)} /></div>
                    <div className="form-field"><label>Telefones *</label><input type="text" className={getInputClass(item.telefones)} value={item.telefones || ''} onChange={(e) => updateField('telefones', e.target.value)} /></div>
                    <div className="form-field"><label>Local Atuação *</label><input type="text" className={getInputClass(item.localAtuacao)} value={item.localAtuacao || ''} onChange={(e) => updateField('localAtuacao', e.target.value)} /></div>
                    <div className="form-field"><label>Líder Imediato *</label><input type="text" className={getInputClass(item.liderImediato)} value={item.liderImediato || ''} onChange={(e) => updateField('liderImediato', e.target.value)} /></div>
                    <div className="form-field"><label>E-mail Líder *</label><input type="email" className={getInputClass(item.emailLider)} value={item.emailLider || ''} onChange={(e) => updateField('emailLider', e.target.value)} /></div>
                    <div className="form-field"><label>Área *</label><input type="text" className={getInputClass(item.area)} value={item.area || ''} onChange={(e) => updateField('area', e.target.value)} /></div>
                    <div className="form-field"><label>Gestor da Área *</label><input type="text" className={getInputClass(item.gestorArea)} value={item.gestorArea || ''} onChange={(e) => updateField('gestorArea', e.target.value)} /></div>
                    
                    {isAreaSAP && (
                        <>
                            <div className="form-field">
                                <label>Gestor responsável (SAP)</label>
                                <select value={item.gestorResponsavel || ''} onChange={(e) => updateField('gestorResponsavel', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {gestoresSAP.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Coordenador responsável (SAP)</label>
                                <select value={item.coordenadorResponsavel || ''} onChange={(e) => updateField('coordenadorResponsavel', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {coordenadoresSAP.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    <div className="form-field full-width"><label>Comunicação Envolvida</label><textarea value={item.comunEnvolvida || ''} onChange={(e) => updateField('comunEnvolvida', e.target.value)} style={{ minHeight: '60px' }} /></div>
                </div>
            </div>
        );
    };

    const renderChecklistSection = (sectionName: string, itemsList: any[]) => {
        const grouped = itemsList.reduce((acc:any, item) => { (acc[item.scope] = acc[item.scope] || []).push(item); return acc; }, {});
        return (
            <div className="accordion">
                {Object.entries(grouped).map(([scope, items]: [string, any]) => (
                    <div key={scope} className="accordion-item">
                        <button className="accordion-header" onClick={() => setExpandedScopes(prev => ({ ...prev, [scope]: !prev[scope] }))}>
                            <div className="accordion-title-wrapper"> <span>{scope}</span> </div>
                            <ExpandIcon isExpanded={!!expandedScopes[scope]} />
                        </button>
                        {expandedScopes[scope] && (
                            <div className="accordion-content">
                                {items.map((item: any) => {
                                    const actualGlobalIdx = itemsList.indexOf(item);
                                    const saved = formData[sectionName].find((f: any) => f.question === item.question) || { answer: '', justification: '' };
                                    return (
                                        <div key={item.question} className={`checklist-question-container ${!isAdminUser && showValidation && !saved.answer ? 'validation-error-section' : ''}`}>
                                            <div className="checklist-question-text">{item.question}</div>
                                            <div className="checklist-answer-buttons">
                                                {['Sim', 'Não', 'N/A'].map(opt => (
                                                    <button key={opt} className={`checklist-answer-btn ${opt === 'Sim' ? 'sim' : opt === 'Não' ? 'nao' : 'na'} ${saved.answer === opt ? 'selected' : ''}`} onClick={() => updateChecklist(sectionName, actualGlobalIdx, 'answer', opt)}>
                                                        {saved.answer === opt && <CheckIcon />} <span>{opt}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {saved.answer === 'Não' && (
                                                <div className="form-field" style={{ marginTop: '1.25rem' }}>
                                                    <label>Justificativa obrigatória:</label>
                                                    <textarea className={getInputClass(saved.justification)} value={saved.justification || ''} onChange={(e) => updateChecklist(sectionName, actualGlobalIdx, 'justification', e.target.value)} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const updateChecklistComunicacao = (field: string, val: string) => {
        setFormData((p: any) => ({
            ...p,
            comunicacaoChecklist: { ...p.comunicacaoChecklist, [field]: val }
        }));
    };

    const updateChecklistRisco = (field: string, val: string) => {
        setFormData((p: any) => ({
            ...p,
            riscosGerais: { ...p.riscosGerais, [field]: val }
        }));
    };

    const requestTypeOptions = useMemo(() => {
        return ['WorkFlow', 'REPORT', 'iNTERFACE', 'CONVERSION', 'ENHANCMENT', 'FORMS', 'CONFIG'];
    }, []);

    const isGuidelineViolation = false;

    const isOnlyConfig = useMemo(() => {
        const trg = formData.informacoesGerais.tipoRequestGeral;
        if (Array.isArray(trg)) return trg.length === 1 && trg[0] === 'CONFIG';
        return trg === 'CONFIG';
    }, [formData.informacoesGerais.tipoRequestGeral]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const nowLocalStr = useMemo(() => new Date().toISOString().slice(0, 16), []);

    return (
        <div className="card" style={{ '--dynamic-color': themeColor } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Nova Requisição de Mudança</h2>
                {isAdminUser && (
                    <button 
                        onClick={handleAutoFill}
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            color: '#ffffff', 
                            border: '1px solid var(--progress-blue)', 
                            borderRadius: '4px',
                            padding: '6px 14px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 0 10px rgba(5, 175, 242, 0.2)'
                        }}
                        title="Preencher todos os campos com dados genéricos"
                    >
                        [MODO TESTE: PREENCHER]
                    </button>
                )}
            </div>
            <WizardProgressBar currentStep={currentStep} formData={formData} completedSteps={completedSteps} onStepClick={(step: number) => { if (visibleStepIndexes.includes(step) && step <= currentStep) setCurrentStep(step); }} />
            
            {!isAdminUser && validationErrors.length > 0 && (
                <div className="error-message-box">
                    <div className="error-box-header"><AlertIcon /> Pendências Encontradas:</div>
                    <ul>{validationErrors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
                    <p style={{ fontSize: '0.85rem', marginTop: '10px', opacity: 0.8 }}>* Para a área <strong>{formData.informacoesGerais.areaAfetada}</strong>, todas as categorias e campos destacados são obrigatórios para a finalização.</p>
                </div>
            )}

            <div className="step-container">
                {currentStep === 0 && (
                    <div className="step-content">
                        <CategoryHeader title="Informações Gerais" />
                        <HighlightBox title="Área Afetada" subtitle="Selecione a frente afetada para esta mudança." color={themeColor}>
                            <div className="radio-group">
                                {['Sistemas', 'Infra'].map(area => (
                                    <label key={area} className="radio-label">
                                        <input type="radio" name="informacoesGerais_areaAfetada" value={area} checked={formData.informacoesGerais.areaAfetada === area} onChange={handleChange} /> {area}
                                    </label>
                                ))}
                            </div>
                        </HighlightBox>
                        
                        {formData.informacoesGerais.areaAfetada === 'Infra' ? (
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Solicitante *</label>
                                    <input type="text" name="informacoesGerais_solicitante" className={getInputClass(formData.informacoesGerais.solicitante)} value={formData.informacoesGerais.solicitante} onChange={handleChange} />
                                </div>
                                <div className="form-field">
                                    <label>Data da Mudança *</label>
                                    <input 
                                        type="date" 
                                        name="informacoesGerais_dataMudanca" 
                                        className={getInputClass(formData.informacoesGerais.dataMudanca)} 
                                        value={formData.informacoesGerais.dataMudanca} 
                                        onChange={handleChange} 
                                        min={todayStr}
                                        max="9999-12-31"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Líder da Mudança *</label>
                                    <input type="text" name="informacoesGerais_liderMudanca" className="read-only-field" value={formData.informacoesGerais.liderMudanca} readOnly />
                                </div>
                                <div className="form-field">
                                    <label>Espaço *</label>
                                    <select className={getInputClass(formData.infra.espaco)} value={formData.infra.espaco} onChange={(e) => updateInfraField('espaco', e.target.value)}>
                                        <option value="">Selecione um espaço...</option>
                                        {Object.keys(espacosInfraData).map(esp => (
                                            <option key={esp} value={esp}>{esp}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Tipo do Ticket *</label>
                                    <select className={getInputClass(formData.infra.tipoTicket)} value={formData.infra.tipoTicket} onChange={(e) => updateInfraField('tipoTicket', e.target.value)} disabled={!formData.infra.espaco}>
                                        <option value="">Selecione um tipo...</option>
                                        {(espacosInfraData[formData.infra.espaco] || []).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Status</label>
                                    <input type="text" value={formData.infra.status} onChange={(e) => updateInfraField('status', e.target.value)} />
                                </div>
                                <div className="form-field full-width">
                                    <label>Resumo (Título) *</label>
                                    <input type="text" className={getInputClass(formData.infra.resumo)} value={formData.infra.resumo} onChange={(e) => updateInfraField('resumo', e.target.value)} />
                                </div>
                                <div className="form-field full-width">
                                    <label>Sistema Afetado *</label>
                                    <MultiSelect className={getInputClass(formData.infra.sistemaAfetado)} optionsData={sistemasAfetadosData} selected={formData.infra.sistemaAfetado} onChange={(val: any) => updateInfraField('sistemaAfetado', val)} placeholder="Selecione os sistemas..." />
                                </div>
                                <div className="form-field">
                                    <label>Versão</label>
                                    <input type="text" value={formData.infra.versao} onChange={(e) => updateInfraField('versao', e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Solicitante *</label>
                                    <input type="text" name="informacoesGerais_solicitante" className={getInputClass(formData.informacoesGerais.solicitante)} value={formData.informacoesGerais.solicitante} onChange={handleChange} />
                                </div>
                                <div className="form-field">
                                    <label>Data da Mudança *</label>
                                    <input 
                                        type="date" 
                                        name="informacoesGerais_dataMudanca" 
                                        className={getInputClass(formData.informacoesGerais.dataMudanca)} 
                                        value={formData.informacoesGerais.dataMudanca} 
                                        onChange={handleChange} 
                                        min={todayStr}
                                        max="9999-12-31"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Líder da Mudança *</label>
                                    <input type="text" name="informacoesGerais_liderMudanca" className="read-only-field" value={formData.informacoesGerais.liderMudanca} readOnly />
                                </div>
                                
                                <div className="form-field full-width">
                                    <label>Motivo da Mudança *</label>
                                    <textarea name="informacoesGerais_motivoMudanca" className={getInputClass(formData.informacoesGerais.motivoMudanca)} value={formData.informacoesGerais.motivoMudanca} onChange={handleChange} style={{ minHeight: '80px' }}></textarea>
                                </div>
                                <div className="form-field full-width">
                                    <label>Impacto de Não Realizar *</label>
                                    <textarea name="informacoesGerais_impactoNaoRealizar" className={getInputClass(formData.informacoesGerais.impactoNaoRealizar)} value={formData.informacoesGerais.impactoNaoRealizar} onChange={handleChange} style={{ minHeight: '80px' }}></textarea>
                                </div>

                                <div className={`form-field ${!isSapAffected ? 'full-width' : ''}`}>
                                    <label>Sistemas Afetados *</label>
                                    <MultiSelect className={getInputClass(formData.informacoesGerais.sistemasAfetados)} optionsData={sistemasAfetadosData} selected={formData.informacoesGerais.sistemasAfetados} onChange={(val:any) => setFormData((p:any)=>({...p, informacoesGerais: {...p.informacoesGerais, sistemasAfetados: val}}))} placeholder="Selecione os sistemas..." />
                                </div>
                                
                                {isSapAffected && (
                                    <>
                                        <div className="form-field">
                                            <label>Frentes SAP *</label>
                                            <MultiSelect className={getInputClass(formData.informacoesGerais.frentesSAP)} optionsData={frentesSAPData} selected={formData.informacoesGerais.frentesSAP} onChange={(val: any) => setFormData((p: any) => ({ ...p, informacoesGerais: { ...p.informacoesGerais, frentesSAP: val } }))} placeholder="Selecione as frentes SAP..." />
                                        </div>
                                        <div className="form-field">
                                            <label>Haverá indisponibilidade? *</label>
                                            <div className="radio-group" style={{ padding: '0.5rem 0' }}>
                                                {['Sim', 'Não'].map(opt => (
                                                    <label key={opt} className="radio-label">
                                                        <input 
                                                            type="radio" 
                                                            name="informacoesGerais_indisponibilidade" 
                                                            value={opt} 
                                                            checked={formData.informacoesGerais.indisponibilidade === opt} 
                                                            onChange={handleChange} 
                                                        /> {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                <div className="form-field">
                                    <label>Classificação *</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <select 
                                            name="informacoesGerais_classificacao" 
                                            value={isOnlyConfig ? "N/A" : formData.informacoesGerais.classificacao} 
                                            onChange={handleChange} 
                                            className={getInputClass(formData.informacoesGerais.classificacao)}
                                            disabled={isOnlyConfig}
                                        >
                                            {isOnlyConfig ? (
                                                <option value="N/A">N/A</option>
                                            ) : (
                                                <>
                                                    <option value="Planejada">Planejada</option>
                                                    <option value="Programada">Programada</option>
                                                    <option value="Emergencial">Emergencial</option>
                                                </>
                                            )}
                                        </select>
                                        {isOnlyConfig && (
                                            <div className="standard-request-success">
                                                <CheckIcon /> Solicitação registrada como Padrão.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Tipo de Request *</label>
                                    {formData.informacoesGerais.classificacao === 'Padrão' ? (
                                        <select 
                                            name="informacoesGerais_tipoRequestGeral" 
                                            value={Array.isArray(formData.informacoesGerais.tipoRequestGeral) ? formData.informacoesGerais.tipoRequestGeral[0] || '' : formData.informacoesGerais.tipoRequestGeral} 
                                            onChange={(e) => handleRequestTypeChange([e.target.value])} 
                                            className={getInputClass(formData.informacoesGerais.tipoRequestGeral)}
                                        >
                                            <option value="">Selecione...</option>
                                            {requestTypeOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <MultiSelect 
                                            className={getInputClass(formData.informacoesGerais.tipoRequestGeral)} 
                                            optionsData={{ 'Tipos de Request': requestTypeOptions }} 
                                            selected={Array.isArray(formData.informacoesGerais.tipoRequestGeral) ? formData.informacoesGerais.tipoRequestGeral : [formData.informacoesGerais.tipoRequestGeral].filter(Boolean)} 
                                            onChange={handleRequestTypeChange} 
                                            placeholder="Selecione os tipos..." 
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {currentStep === 1 && (
                    <div className="step-content">
                        <CategoryHeader title="Plano de Implantação (Geral)" />
                        <div className="implementation-plan-list">
                            {formData.planoImplantacao.map((item:any, idx:number) => renderActivityCard('planoImplantacao', item, idx))}
                            <button onClick={() => addRow('planoImplantacao', activityTemplate)} className="add-row-btn">+ Adicionar Atividade</button>
                        </div>
                        
                        {showTransportMap && (
                            <div style={{ marginTop: '3rem' }}>
                                <CategoryHeader title="Mapa de Transporte" />
                                <div className="implementation-plan-list">
                                    {formData.mapaTransporte.map((item: any, idx: number) => renderTransportCard(item, idx))}
                                    <button onClick={() => addRow('mapaTransporte', transportTemplate)} className="add-row-btn">+ Adicionar Request</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {currentStep === 3 && <div className="step-content"><CategoryHeader title="Caderno de Testes" /><div className="implementation-plan-list">{formData.cadernoTestes.map((item: any, idx: number) => renderTestCard(item, idx))}<button onClick={() => addRow('cadernoTestes', testTemplate)} className="add-row-btn">+ Adicionar Caderno</button></div></div>}
                {currentStep === 4 && <div className="step-content"><CategoryHeader title="Plano de Retorno" /><div className="implementation-plan-list">{formData.planoRetorno.map((item: any, idx: number) => renderActivityCard('planoRetorno', item, idx))}<button onClick={() => addRow('planoRetorno', { ...activityTemplate, status: 'Não iniciado', tipo: 'Manual' })} className="add-row-btn">+ Adicionar Atividade</button></div></div>}
                {currentStep === 5 && (
                    <div className="step-content">
                        <CategoryHeader title="Plano de Comunicação" />
                        <div className={`form-grid ${!isAdminUser && showValidation && (isFieldEmpty(formData.comunicacaoChecklist.partesEnvolvidasValidaram) || isFieldEmpty(formData.comunicacaoChecklist.processoAcompanhamentoComunicado) || isFieldEmpty(formData.comunicacaoChecklist.comunicacaoEventoRetorno) || isFieldEmpty(formData.comunicacaoChecklist.passoAPassoAplicacao)) ? 'validation-error-section' : ''}`} style={{ marginBottom: '3rem', backgroundColor: 'rgb(45, 48, 61)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--sipal-gray)' }}>
                            {[
                                { label: 'Partes envolvidas validaram o plano? *', field: 'partesEnvolvidasValidaram' },
                                { label: 'Processo de acompanhamento comunicado? *', field: 'processoAcompanhamentoComunicado' },
                                { label: 'Comunicação de retorno contemplada? *', field: 'comunicacaoEventoRetorno' },
                                { label: 'Passo a passo para aplicação existe? *', field: 'passoAPassoAplicacao' }
                            ].map(q => (
                                <div key={q.field} className="form-field">
                                    <label>{q.label}</label>
                                    <div className="radio-group" style={{ gap: '1rem' }}>
                                        {['Sim', 'Não'].map(opt => (
                                            <label key={opt} className="radio-label">
                                                <input type="radio" checked={formData.comunicacaoChecklist[q.field] === opt} onChange={() => updateChecklistComunicacao(q.field, opt)} /> {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <CategoryHeader title="Detalhamento da Comunicação" />
                        <div className="implementation-plan-list">
                            {formData.planoComunicacao.map((item: any, idx: number) => renderCommunicationCard(item, idx))}
                            <button onClick={() => addRow('planoComunicacao', communicationTemplate)} className="add-row-btn">+ Adicionar Comunicação</button>
                        </div>
                    </div>
                )}
                {currentStep === 6 && (
                    <div className="step-content">
                        <CategoryHeader title="Risco de Mudança" />
                        <div className={`form-grid ${!isAdminUser && showValidation && (isFieldEmpty(formData.riscosGerais.planoImplantacaoRiscoClaro) || isFieldEmpty(formData.riscosGerais.stakeholdersConsultados)) ? 'validation-error-section' : ''}`} style={{ marginBottom: '3rem', backgroundColor: 'rgb(45, 48, 61)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--sipal-gray)' }}>
                            {[
                                { label: 'Plano de implantação claro sobre riscos/gatilhos? *', field: 'planoImplantacaoRiscoClaro' },
                                { label: 'Stakeholders consultados sobre riscos? *', field: 'stakeholdersConsultados' }
                            ].map(q => (
                                <div key={q.field} className="form-field">
                                    <label>{q.label}</label>
                                    <div className="radio-group" style={{ gap: '1rem' }}>
                                        {['Sim', 'Não'].map(opt => (
                                            <label key={opt} className="radio-label">
                                                <input type="radio" checked={formData.riscosGerais[q.field] === opt} onChange={() => updateChecklistRisco(q.field, opt)} /> {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <CategoryHeader title="Detalhamento dos Riscos" />
                        <div className="implementation-plan-list">
                            {formData.planoRiscos.map((item: any, idx: number) => renderRiskCard(item, idx))}
                            <button onClick={() => addRow('planoRiscos', riskTemplate)} className="add-row-btn">+ Adicionar Risco</button>
                        </div>
                    </div>
                )}
                {currentStep === 7 && (
                    <div className="step-content">
                        <CategoryHeader title="Segurança e Acessos" />
                        <div className="implementation-plan-list">
                            {formData.segurancaAcessos.perfis.map((item: any, idx: number) => renderSecurityProfileCard(item, idx))}
                            <button onClick={() => addRow('segurancaAcessos.perfis', securityProfileTemplate)} className="add-row-btn">+ Adicionar Perfil</button>
                        </div>
                    </div>
                )}
                {currentStep === 13 && (
                    <div className="step-content">
                        <CategoryHeader title="Detalhes da Mudança (Infra)" />
                        <div className="form-grid">
                            <div className="form-field full-width"><label>Descrição Detalhada *</label><textarea className={getInputClass(formData.infra.descricao)} value={formData.infra.descricao} onChange={(e) => updateInfraField('descricao', e.target.value)} style={{ minHeight: '120px' }}></textarea></div>
                            <div className="form-field full-width"><label>Justificativa *</label><textarea className={getInputClass(formData.infra.justificativa)} value={formData.infra.justificativa} onChange={(e) => updateInfraField('justificativa', e.target.value)} style={{ minHeight: '100px' }}></textarea></div>
                            <div className="form-field"><label>Responsável *</label><input type="text" className={getInputClass(formData.infra.responsavel)} value={formData.infra.responsavel} onChange={(e) => updateInfraField('responsavel', e.target.value)} /></div>
                            <div className="form-field"><label>Origem</label><select value={formData.infra.origem} onChange={(e) => updateInfraField('origem', e.target.value)}><option value="Portal do cliente">Portal do cliente</option><option value="E-mail">E-mail</option><option value="Telefone">Telefone</option></select></div>
                            <div className="form-field"><label>Solicitação</label><select value={formData.infra.solicitacao} onChange={(e) => updateInfraField('solicitacao', e.target.value)}><option value="">Selecione...</option><option value="Bloqueio">Bloqueio</option><option value="liberação">liberação</option></select></div>
                            <div className="form-field full-width">
                                <label>Filial</label>
                                <MultiSelect className={getInputClass(formData.infra.filial, false)} optionsData={{ 'Filiais': filiaisSipalData }} selected={formData.infra.filial ? [formData.infra.filial] : []} onChange={(val: string[]) => updateInfraField('filial', val.length > 0 ? val[val.length - 1] : '')} placeholder="Pesquise ou selecione a filial..." />
                            </div>
                        </div>
                    </div>
                )}
                {currentStep === 14 && (
                    <div className="step-content">
                        <CategoryHeader title="Planejamento e Execução (Infra)" />
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Data Início *</label>
                                <input 
                                    type="datetime-local" 
                                    className={getInputClass(formData.infra.dataInicio)} 
                                    value={formData.infra.dataInicio} 
                                    onChange={(e) => updateInfraField('dataInicio', e.target.value)} 
                                    min={nowLocalStr}
                                    max="9999-12-31T23:59"
                                />
                            </div>
                            <div className="form-field">
                                <label>Data Fim *</label>
                                <input 
                                    type="datetime-local" 
                                    className={getInputClass(formData.infra.dataFim)} 
                                    value={formData.infra.dataFim} 
                                    onChange={(e) => updateInfraField('dataFim', e.target.value)} 
                                    max="9999-12-31T23:59"
                                />
                            </div>
                            <div className="form-field"><label>Indisponibilidade Estimada (minutos)</label><input type="number" value={formData.infra.indisponibilidadeMin} onChange={(e) => updateInfraField('indisponibilidadeMin', e.target.value)} min="0" /></div>
                            <div className="form-field"><label>Tickets Vinculados</label><input type="text" value={formData.infra.ticketsVinculados} onChange={(e) => updateInfraField('ticketsVinculados', e.target.value)} placeholder="SD-0000, SD-1111..." /></div>
                        </div>
                    </div>
                )}
                {currentStep === 15 && (
                    <div className="step-content">
                        <CategoryHeader title="Ativos e Recursos (Infra)" />
                        <div className="form-grid">
                            <div className="form-field"><label>Modelo do Computador *</label><input type="text" className={getInputClass(formData.infra.modeloComputador)} value={formData.infra.modeloComputador} onChange={(e) => updateInfraField('modeloComputador', e.target.value)} /></div>
                            <div className="form-field"><label>Número de Série *</label><input type="text" className={getInputClass(formData.infra.numeroSerie)} value={formData.infra.numeroSerie} onChange={(e) => updateInfraField('numeroSerie', e.target.value)} /></div>
                        </div>
                    </div>
                )}
                {currentStep === 8 && <div className="step-content"><CategoryHeader title="Contatos" /><div className="implementation-plan-list">{formData.contatos.map((item: any, idx: number) => renderContactCard(item, idx))}<button onClick={() => addRow('contatos', contactTemplate)} className="add-row-btn">+ Adicionar Contato</button></div></div>}
                {currentStep === 9 && (
                    <div className="step-content">
                        <CategoryHeader title="Checklist (Geral)" />
                        {renderChecklistSection('checklist', checklistItemsStandard)}
                        
                        {isSapAffected && (
                            <div style={{ marginTop: '3.5rem' }}>
                                <CategoryHeader title="Checklist SAP" />
                                {renderChecklistSection('checklistSAP', checklistSAPItems)}
                            </div>
                        )}
                    </div>
                )}
                {currentStep === 10 && <div className="step-content"><CategoryHeader title="Checklist SAP" />{renderChecklistSection('checklistSAP', checklistSAPItems)}</div>}
                {currentStep === 11 && (
                    <div className="step-content">
                        <CategoryHeader title="Anexos" />
                        <div className="upload-container">
                            <input type="file" multiple onChange={handleFileChange} id="file-upload" style={{display:'none'}} />
                            <label htmlFor="file-upload" className="upload-box"><UploadIcon /><p>Clique para anexar</p></label>
                        </div>
                    </div>
                )}
                {currentStep === 12 && submittedRequestId && (
                    <div className="step-content success-view" style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <h2 style={{ color: 'var(--dynamic-text-color)' }}>Mudança Enviada!</h2>
                        <p>Protocolo: <strong>{submittedRequestId}</strong></p>
                    </div>
                )}
            </div>
            {currentStep !== 12 && (
                <div className="wizard-nav-sticky">
                    <span style={{color: 'var(--dynamic-text-color)', fontWeight: '600', fontSize: '0.9rem'}}>{autoSaveStatus}</span>
                    <div className="main-nav-buttons">
                        <button type="button" className="nav-button secondary" onClick={() => onSaveDraft(formData, currentDraftId)}>Rascunho</button>
                        <button type="button" onClick={handleBack} className="nav-button secondary" disabled={visibleStepIndexes.indexOf(currentStep) === 0}>Voltar</button>
                        <button type="button" 
                            onClick={visibleStepIndexes.indexOf(currentStep) === visibleStepIndexes.length - 2 ? handleSubmit : handleNext} 
                            className="nav-button"
                            disabled={isGuidelineViolation}
                        >
                            {visibleStepIndexes.indexOf(currentStep) === visibleStepIndexes.length - 2 ? 'Finalizar' : 'Próximo'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};