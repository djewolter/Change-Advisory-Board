
import jsPDF from 'jspdf';
import { steps, sipalBlue, sipalTeal } from '../constants/app-constants';

export const generateTimeSlots = () => {
    const slots = [];
    for(let h=8; h<18; h++) {
        for(let m=0; m<60; m+=20) {
            const sh = String(h).padStart(2,'0');
            const sm = String(m).padStart(2,'0');
            let eh = h; let em = m + 20;
            if(em >= 60) { eh++; em -= 60; }
            const seh = String(eh).padStart(2,'0');
            const sem = String(em).padStart(2,'0');
            slots.push(`${sh}:${sm} - ${seh}:${sem}`);
        }
    }
    return slots;
};

export const generateAndUploadPdf = async (formData: any, requestId: string | null = null) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 0, rowStartY = 0, nextRowY = 0;
    let pageCount = 1;

    const areaAfetada = formData.informacoesGerais.areaAfetada || 'Sistemas';
    const isSAPArea = areaAfetada === 'SAP';
    const isInfra = areaAfetada === 'Infra';
    const isSAPSystemAffected = formData.informacoesGerais.sistemasAfetados?.includes('SAP');
    const showSAPChecklist = isSAPArea || isSAPSystemAffected;

    const drawPageHeader = (isFirstPage: boolean) => {
        doc.setFillColor(1, 33, 105); // Sipal Blue
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('SIPAL CAB', margin, 12);
        
        doc.setFontSize(9);
        doc.text(`RELATÓRIO DE MUDANÇA ${areaAfetada.toUpperCase()}`, margin, 20);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const protocolText = `PROTOCOLO: ${requestId || 'PENDENTE'}`;
        doc.text(protocolText, pageWidth - margin, 12, { align: 'right' });
        doc.text(`PÁGINA: ${pageCount}`, pageWidth - margin, 20, { align: 'right' });
        
        y = 35; 
        nextRowY = y;
        doc.setTextColor(0, 0, 0);
    };

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 15) {
            pageCount++;
            doc.addPage(); 
            drawPageHeader(false);
            return true;
        }
        return false;
    };

    const drawSectionTitle = (title: string) => {
        y = Math.max(y, nextRowY); 
        checkPageBreak(15);
        y += 5; 
        doc.setFont('helvetica', 'bold'); 
        doc.setFontSize(12);
        doc.setTextColor(1, 33, 105); 
        doc.text(title.toUpperCase(), margin, y);
        y += 1.5; 
        doc.setDrawColor(0, 132, 121); // Sipal Teal
        doc.setLineWidth(0.6);
        doc.line(margin, y, margin + 25, y);
        y += 8; 
        nextRowY = y; 
        doc.setTextColor(0, 0, 0);
    };

    const drawField = (label: string, value: any, col: 1 | 2 = 1, isFullWidth: boolean = false, linkUrl?: string) => {
        const safeValue = Array.isArray(value) ? value.join(', ') : String(value || '-').trim();
        const colWidth = isFullWidth ? contentWidth : (contentWidth / 2) - 4;
        const startX = col === 1 ? margin : margin + (contentWidth / 2) + 2;
        
        if (col === 1 || isFullWidth) { 
            y = Math.max(y, nextRowY); 
            rowStartY = y; 
        } else { 
            y = rowStartY; 
        }
        
        doc.setFontSize(8.5);
        const splitValue = doc.splitTextToSize(safeValue, colWidth);
        const fieldHeight = 4 + (splitValue.length * 4) + 2;
        
        if (checkPageBreak(fieldHeight)) {
            rowStartY = y;
        }
        
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(50, 50, 50);
        doc.text(`${label}:`, startX, y);
        
        y += 4;
        doc.setFont('helvetica', 'normal'); 
        
        const effectiveUrl = linkUrl || (safeValue.startsWith('http') || safeValue.startsWith('data:') ? safeValue : null);
        
        if (effectiveUrl) {
            doc.setTextColor(0, 0, 255); // Blue color for links
            
            splitValue.forEach((line: string, idx: number) => {
                const lineY = y + (idx * 4);
                const lineWidth = doc.getTextWidth(line);
                doc.text(line, startX, lineY);
                doc.setDrawColor(0, 0, 255);
                doc.setLineWidth(0.1);
                doc.line(startX, lineY + 0.5, startX + lineWidth, lineY + 0.5);
                doc.link(startX, lineY - 3, lineWidth, 4, { url: effectiveUrl });
            });
        } else {
            // Destaque para Sim/Não em campos gerais
            if (safeValue === 'Sim') {
                doc.setTextColor(40, 167, 69); // Verde
            } else if (safeValue === 'Não') {
                doc.setTextColor(220, 53, 69); // Vermelho
            } else {
                doc.setTextColor(0, 0, 0);
            }
            doc.text(splitValue, startX, y);
        }
        
        const currentFieldBottom = y + (splitValue.length * 4);
        nextRowY = Math.max(nextRowY, currentFieldBottom + 2);
        
        if (isFullWidth) y = nextRowY;
    };

    drawPageHeader(true);

    if (isInfra) {
        const infra = formData.infra;
        drawSectionTitle('1. Informações Gerais');
        drawField('Espaço', infra.espaco, 1);
        drawField('Tipo do ticket', infra.tipoTicket, 2);
        drawField('Status', infra.status, 1);
        drawField('Resumo', infra.resumo, 2);
        drawField('Sistemas afetados', infra.sistemaAfetado, 1, true);
        drawField('Versão', infra.versao, 1);

        drawSectionTitle('2. Detalhes da Mudança');
        drawField('Descrição Detalhada', infra.descricao, 1, true);
        drawField('Justificativa', infra.justificativa, 1, true);
        drawField('Responsável', infra.responsavel, 1);
        drawField('Origem', infra.origem, 2);
        drawField('Solicitação', infra.solicitacao, 1);
        drawField('Filial', infra.filial, 1, true);

        drawSectionTitle('3. Planejamento e Execução');
        drawField('Data Início', infra.dataInicio, 1);
        drawField('Data Fim', infra.dataFim, 2);
        drawField('Indisponibilidade (minutos)', infra.indisponibilidadeMin, 1);
        drawField('Tickets Vinculados', infra.ticketsVinculados, 2);

        drawSectionTitle('4. Ativos e Recursos');
        drawField('Modelo do Computador', infra.modeloComputador, 1);
        drawField('Número de Série', infra.numeroSerie, 2);
        
        if (formData.anexos && formData.anexos.length > 0) {
            drawSectionTitle('5. Anexos');
            formData.anexos.forEach((a: any, aIdx: number) => {
                drawField(`Arquivo Anexado #${aIdx + 1}`, `• Clique para baixar: ${a.name}`, 1, true, a.url);
            });
        }
    } else {
        drawSectionTitle('1. Informações Gerais');
        const ig = formData.informacoesGerais;
        drawField('Líder da Mudança', ig.liderMudanca, 1);
        drawField('Solicitante', ig.solicitante, 2);
        drawField('Data da Mudança', ig.dataMudanca, 1);
        drawField('Classificação', ig.classificacao, 2);
        drawField('Tipo de Request', ig.tipoRequestGeral, 1);
        drawField('Risco Geral', ig.riscoGeral, 2);
        drawField('Indisponibilidade', ig.indisponibilidade, 1);
        drawField('Sistemas Afetados', ig.sistemasAfetados, 1, true);
        
        if (showSAPChecklist) {
            drawField('Mudança SAP', 'Sim', 1);
            drawField('Frentes SAP', ig.frentesSAP, 1, true);
        }
        
        drawField('Motivo da Mudança', ig.motivoMudanca, 1, true);
        drawField('Impacto de Não Realizar', ig.impactoNaoRealizar, 1, true);

        let sectionNum = 2;

        const hasImplantacao = formData.planoImplantacao && formData.planoImplantacao.length > 0;
        const hasTransporte = formData.mapaTransporte && formData.mapaTransporte.length > 0;

        if (hasImplantacao || hasTransporte) {
            if (hasImplantacao && hasTransporte) {
                drawSectionTitle(`2.1. Plano de Implantação`);
                formData.planoImplantacao.forEach((p: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2; 
                    checkPageBreak(25);
                    doc.setFillColor(245, 247, 250); 
                    doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                    doc.text(`ATIVIDADE #${i+1}: ${p.nomeAtividade || 'SEM NOME'}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('Etapa', p.etapa, 1);
                    drawField('Status', p.status, 2);
                    drawField('Data Planejada', p.dataPlanejada, 1);
                    drawField('Hora Planejada', p.horaPlanejada, 2);
                    drawField('Responsável Execução', p.responsavel, 1);
                    drawField('Departamento', p.departamento, 2);
                    drawField('Item de Configuração', p.itemConfiguracao, 1);
                    drawField('Tempo Estimado', p.tempoExecucao, 2);
                    drawField('Descrição da Atividade', p.descricao, 1, true);
                    y = nextRowY + 3;
                });

                drawSectionTitle(`2.2. Mapa de Transporte`);
                formData.mapaTransporte.forEach((t: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2;
                    checkPageBreak(30);
                    doc.setFillColor(245, 247, 250);
                    doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(1, 33, 105);
                    doc.text(`REQUEST #${i+1}: ${t.requestId || 'SEM ID'}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('ID Request', t.requestId, 1);
                    drawField('Sequenciamento', t.sequencing, 2);
                    drawField('Tipo Request', t.requestType, 1, true);
                    drawField('Descrição Técnica', t.technicalDescription, 1, true);
                    y = nextRowY + 3;
                });
            } else if (hasImplantacao) {
                drawSectionTitle(`2. Plano de Implantação`);
                formData.planoImplantacao.forEach((p: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2; 
                    checkPageBreak(25);
                    doc.setFillColor(245, 247, 250); 
                    doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                    doc.text(`ATIVIDADE #${i+1}: ${p.nomeAtividade || 'SEM NOME'}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('Etapa', p.etapa, 1);
                    drawField('Status', p.status, 2);
                    drawField('Data Planejada', p.dataPlanejada, 1);
                    drawField('Hora Planejada', p.horaPlanejada, 2);
                    drawField('Responsável Execução', p.responsavel, 1);
                    drawField('Departamento', p.departamento, 2);
                    drawField('Item de Configuração', p.itemConfiguracao, 1);
                    drawField('Tempo Estimado', p.tempoExecucao, 2);
                    drawField('Descrição da Atividade', p.descricao, 1, true);
                    y = nextRowY + 3;
                });
            } else if (hasTransporte) {
                drawSectionTitle(`2. Mapa de Transporte`);
                formData.mapaTransporte.forEach((t: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2;
                    checkPageBreak(30);
                    doc.setFillColor(245, 247, 250);
                    doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(1, 33, 105);
                    doc.text(`REQUEST #${i+1}: ${t.requestId || 'SEM ID'}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('ID Request', t.requestId, 1);
                    drawField('Sequenciamento', t.sequencing, 2);
                    drawField('Tipo Request', t.requestType, 1, true);
                    drawField('Descrição Técnica', t.technicalDescription, 1, true);
                    y = nextRowY + 3;
                });
            }
            sectionNum = 3;
        }

        if (formData.cadernoTestes && formData.cadernoTestes.length > 0) {
            drawSectionTitle(`${sectionNum}. Caderno de Testes`);
            formData.cadernoTestes.forEach((t: any, i: number) => {
                y = Math.max(y, nextRowY) + 2; checkPageBreak(20);
                doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                doc.text(`CADERNO #${i+1}`, margin + 2, y);
                y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                if (t.linkGoSipal) drawField('Link do GO-Sipal', t.linkGoSipal, 1, true, t.linkGoSipal);
                if (t.anexosPmo && t.anexosPmo.length > 0) {
                    y = Math.max(y, nextRowY) + 2;
                    checkPageBreak(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8.5);
                    doc.setTextColor(50, 50, 50);
                    doc.text('Anexos Interativos (Padrão PMO):', margin, y);
                    y += 5;
                    t.anexosPmo.forEach((anexo: any) => {
                        const linkText = `• Clique para baixar: ${anexo.name}`;
                        const splitLinkText = doc.splitTextToSize(linkText, contentWidth - 10);
                        const neededH = splitLinkText.length * 5;
                        if (checkPageBreak(neededH)) y = 35;
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0, 0, 255);
                        splitLinkText.forEach((line: string, lIdx: number) => {
                            const lineY = y + (lIdx * 4);
                            const tWidth = doc.getTextWidth(line);
                            doc.text(line, margin + 5, lineY);
                            doc.setDrawColor(0, 0, 255);
                            doc.setLineWidth(0.1);
                            doc.line(margin + 5, lineY + 0.5, margin + 5 + tWidth, lineY + 0.5);
                            if (anexo.url) doc.link(margin + 5, lineY - 3, tWidth, 4, { url: anexo.url });
                        });
                        y += neededH;
                    });
                    nextRowY = y;
                }
                y = nextRowY + 3;
            });
            sectionNum++;
        }

        if (formData.planoRetorno && formData.planoRetorno.length > 0) {
            drawSectionTitle(`${sectionNum}. Plano de Retorno (Rollback)`);
            formData.planoRetorno.forEach((p: any, i: number) => {
                y = Math.max(y, nextRowY) + 2; checkPageBreak(25);
                doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                doc.text(`ATIVIDADE DE ROLLBACK #${i+1}`, margin + 2, y);
                y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                drawField('Data Planejada', p.dataPlanejada, 1);
                drawField('Hora Planejada', p.horaPlanejada, 2);
                drawField('Predecessora', p.predecessora, 1);
                drawField('Responsável', p.responsavel, 2);
                drawField('Descrição Técnica', p.descricao, 1, true);
                y = nextRowY + 3;
            });
            sectionNum++;
        }

        if (formData.planoComunicacao) {
            drawSectionTitle(`${sectionNum}. Plano de Comunicação`);
            const pcCheck = formData.comunicacaoChecklist;
            drawField('Envolvidos validaram?', pcCheck.partesEnvolvidasValidaram, 1);
            drawField('Acompanhamento comunicado?', pcCheck.processoAcompanhamentoComunicado, 2);
            drawField('Comunicação de retorno?', pcCheck.comunicacaoEventoRetorno, 1);
            drawField('Passo a passo disponível?', pcCheck.passoAPassoAplicacao, 2);
            
            if (formData.planoComunicacao.length > 0) {
                formData.planoComunicacao.forEach((item: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2; checkPageBreak(20);
                    doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                    doc.text(`ITEM DE COMUNICAÇÃO #${i+1}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('Data', item.data, 1);
                    drawField('Hora', item.hora, 2);
                    drawField('Meio', item.meio, 1);
                    drawField('Status', item.status, 2);
                    drawField('Atividade/Público', item.atividadePublico, 1, true);
                    drawField('Responsável', item.responsavel, 1);
                    drawField('Escalonamento', item.contatoEscalonamento, 2);
                    drawField('Observação', item.observacao, 1, true);
                });
            }
            sectionNum++;
        }

        if (formData.planoRiscos) {
            drawSectionTitle(`${sectionNum}. Risco de Mudança`);
            const prCheck = formData.riscosGerais;
            drawField('Riscos claros no plano?', prCheck.planoImplantacaoRiscoClaro, 1);
            drawField('Stakeholders consultados?', prCheck.stakeholdersConsultados, 2);

            if (formData.planoRiscos.length > 0) {
                formData.planoRiscos.forEach((item: any, i: number) => {
                    y = Math.max(y, nextRowY) + 2; checkPageBreak(20);
                    doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, contentWidth, 6, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                    doc.text(`DETALHAMENTO DO RISCO #${i+1}`, margin + 2, y);
                    y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                    drawField('Tipo', item.tipoRisco, 1);
                    drawField('Impacto', item.impacto, 2);
                    drawField('Estratégia', item.estrategia, 1);
                    drawField('Risco', item.risco, 1, true);
                    drawField('Ação', item.acao, 1, true);
                    drawField('Mitigação', item.mitigacao, 1, true);
                });
            }
            sectionNum++;
        }

        if (formData.segurancaAcessos?.perfis?.length > 0) {
            drawSectionTitle(`${sectionNum}. Segurança e Acessos`);
            formData.segurancaAcessos.perfis.forEach((item: any, i: number) => {
                y = Math.max(y, nextRowY) + 2; checkPageBreak(20);
                doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(1, 33, 105);
                doc.text(`PERFIL DE ACESSO #${i+1}`, margin + 2, y);
                y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                drawField('Nível', item.nivelAcesso, 1);
                drawField('Ambiente', item.ambiente, 2);
                drawField('Plataforma', item.plataforma, 1);
                drawField('Login de acesso', item.loginAcesso, 2);
                drawField('Usuários', item.usuarios, 1);
                drawField('Item Config.', item.itemConfig, 2);
                drawField('Área Negócio', item.areaNegocio, 1, true);
                drawField('Grupos', item.gruposAcesso, 1, true);
                drawField('Justificativa', item.justificativa, 1, true);
            });
            sectionNum++;
        }

        if (formData.contatos && formData.contatos.length > 0) {
            drawSectionTitle(`${sectionNum}. Matriz de Contatos`);
            formData.contatos.forEach((c: any, i: number) => {
                y = Math.max(y, nextRowY) + 2;
                checkPageBreak(20); 
                doc.setFillColor(245, 247, 250);
                doc.rect(margin, y - 4, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(1, 33, 105);
                doc.text(`CONTATO #${i+1}: ${c.nome || 'SEM NOME'}`, margin + 2, y);
                y += 6; nextRowY = y; doc.setTextColor(0, 0, 0);
                drawField('Nome', c.nome, 1);
                drawField('Cargo', c.cargo, 2);
                drawField('E-mail', c.email, 1);
                drawField('Telefones', c.telefones, 2);
                drawField('Local Atuação', c.localAtuacao, 1);
                drawField('Área', c.area, 2);
                drawField('Líder Imediato', c.liderImediato, 1);
                drawField('E-mail Líder', c.emailLider, 2);
                drawField('Gestor da Área', c.gestorArea, 1);
                drawField('Comunicação Envolvida', c.comunEnvolvida, 1, true);
                y = nextRowY + 3;
            });
            sectionNum++;
        }

        if (showSAPChecklist) {
            drawSectionTitle(`${sectionNum}.1. Checklist de Governança Geral`);
            formData.checklist.forEach((item: any) => {
                y = Math.max(y, nextRowY);
                const splitQ = doc.splitTextToSize(`• ${item.question}`, contentWidth);
                checkPageBreak((splitQ.length * 5) + 12);
                doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
                doc.text(splitQ, margin, y);
                y += (splitQ.length * 4.5);
                doc.setFont('helvetica', 'bold');
                
                // Destaque colorido para Sim/Não no Checklist
                if (item.answer === 'Sim') doc.setTextColor(40, 167, 69);
                else if (item.answer === 'Não') doc.setTextColor(220, 53, 69);
                else doc.setTextColor(0, 0, 0);
                
                doc.text(`RESPOSTA: ${String(item.answer || 'NÃO PREENCHIDO').toUpperCase()}`, margin + 5, y);
                doc.setTextColor(0, 0, 0);
                y += 5;
                if (item.justification) {
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                    const splitJ = doc.splitTextToSize(`Justificativa: ${item.justification}`, contentWidth - 10);
                    doc.text(splitJ, margin + 5, y);
                    y += (splitJ.length * 4.5);
                }
                y += 2; nextRowY = y;
            });

            drawSectionTitle(`${sectionNum}.2. Checklist de Governança SAP`);
            formData.checklistSAP.forEach((item: any) => {
                y = Math.max(y, nextRowY);
                const splitQ = doc.splitTextToSize(`• ${item.question}`, contentWidth);
                checkPageBreak((splitQ.length * 5) + 12);
                doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
                doc.text(splitQ, margin, y);
                y += (splitQ.length * 4.5);
                doc.setFont('helvetica', 'bold');
                
                // Destaque colorido para Sim/Não no Checklist
                if (item.answer === 'Sim') doc.setTextColor(40, 167, 69);
                else if (item.answer === 'Não') doc.setTextColor(220, 53, 69);
                else doc.setTextColor(0, 0, 0);
                
                doc.text(`RESPOSTA: ${String(item.answer || 'NÃO PREENCHIDO').toUpperCase()}`, margin + 5, y);
                doc.setTextColor(0, 0, 0);
                y += 5;
                if (item.justification) {
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                    const splitJ = doc.splitTextToSize(`Justificativa: ${item.justification}`, contentWidth - 10);
                    doc.text(splitJ, margin + 5, y);
                    y += (splitJ.length * 4.5);
                }
                y += 2; nextRowY = y;
            });
        } else {
            drawSectionTitle(`${sectionNum}. Checklist de Governança Geral`);
            formData.checklist.forEach((item: any) => {
                y = Math.max(y, nextRowY);
                const splitQ = doc.splitTextToSize(`• ${item.question}`, contentWidth);
                checkPageBreak((splitQ.length * 5) + 12);
                doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
                doc.text(splitQ, margin, y);
                y += (splitQ.length * 4.5);
                doc.setFont('helvetica', 'bold');
                
                // Destaque colorido para Sim/Não no Checklist
                if (item.answer === 'Sim') doc.setTextColor(40, 167, 69);
                else if (item.answer === 'Não') doc.setTextColor(220, 53, 69);
                else doc.setTextColor(0, 0, 0);
                
                doc.text(`RESPOSTA: ${String(item.answer || 'NÃO PREENCHIDO').toUpperCase()}`, margin + 5, y);
                doc.setTextColor(0, 0, 0);
                y += 5;
                if (item.justification) {
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                    const splitJ = doc.splitTextToSize(`Justificativa: ${item.justification}`, contentWidth - 10);
                    doc.text(splitJ, margin + 5, y);
                    y += (splitJ.length * 4.5);
                }
                y += 2; nextRowY = y;
            });
        }
        sectionNum++;

        if (formData.anexos && formData.anexos.length > 0) {
            drawSectionTitle(`${sectionNum}. Anexos`);
            formData.anexos.forEach((a: any, aIdx: number) => {
                drawField(`Arquivo Anexado #${aIdx + 1}`, `• Clique para baixar: ${a.name}`, 1, true, a.url);
            });
        }
    }

    const zStr = (formData.informacoesGerais.liderMudanca || 'SEM_LIDER').trim().replace(/[\s.]+/g, '_');
    
    // Usar o requestId se ele já estiver no formato estruturado para garantir que o nome do PDF coincida com a interface
    let finalFileName = '';
    if (requestId && requestId.startsWith('CAB-')) {
        finalFileName = `${requestId}_${zStr}.pdf`;
    } else {
        const areaCode = areaAfetada === 'Sistemas' ? 'STM' : (areaAfetada === 'Infra' ? 'INF' : areaAfetada.toUpperCase().substring(0, 3));
        const rawClass = isInfra ? formData.infra.tipoMudanca : formData.informacoesGerais.classificacao;
        const wMap: Record<string, string> = { 'Planejada': 'PLN', 'Programada': 'PRG', 'Emergencial': 'EMG', 'Padrão': 'PRD' };
        const wCode = wMap[rawClass] || 'PRD';
        const today = new Date();
        const yStr = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const xStr = Math.floor(1000 + Math.random() * 9000).toString();
        finalFileName = `CAB-${wCode}-${areaCode}-${yStr}-${xStr}_${zStr}.pdf`;
    }

    doc.save(finalFileName);
    return { success: true, message: 'PDF gerado com sucesso.' };
};

export const newId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
