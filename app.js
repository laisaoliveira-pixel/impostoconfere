// Configuração do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Variáveis de estado
let fileBase = null;
let fileIrrf = null;
let fileResumo = null;
let fileFgtsPdf = null;
let fileFgtsCsv = null;

// Elementos do DOM
const dropzoneBase = document.getElementById('dropzone-base');
const dropzoneIrrf = document.getElementById('dropzone-irrf');
const dropzoneResumo = document.getElementById('dropzone-resumo');
const dropzoneFgtsPdf = document.getElementById('dropzone-fgts-pdf');
const dropzoneFgtsCsv = document.getElementById('dropzone-fgts-csv');

const inputBase = document.getElementById('file-base');
const inputIrrf = document.getElementById('file-irrf');
const inputResumo = document.getElementById('file-resumo');
const inputFgtsPdf = document.getElementById('file-fgts-pdf');
const inputFgtsCsv = document.getElementById('file-fgts-csv');

const filenameBase = document.getElementById('filename-base');
const filenameIrrf = document.getElementById('filename-irrf');
const filenameResumo = document.getElementById('filename-resumo');
const filenameFgtsPdf = document.getElementById('filename-fgts-pdf');
const filenameFgtsCsv = document.getElementById('filename-fgts-csv');
const btnCompare = document.getElementById('btn-compare');
const loader = document.getElementById('loader');
const resultsSection = document.getElementById('results-section');

// Event Listeners genéricos para Dropzones
function setupDropzone(dropzone, input, type) {
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0], type);
        }
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0], type);
        }
    });
}

setupDropzone(dropzoneBase, inputBase, 'base');
setupDropzone(dropzoneIrrf, inputIrrf, 'irrf');
setupDropzone(dropzoneResumo, inputResumo, 'resumo');
setupDropzone(dropzoneFgtsPdf, inputFgtsPdf, 'fgtspdf');
setupDropzone(dropzoneFgtsCsv, inputFgtsCsv, 'fgtscsv');

// Botão Comparar
btnCompare.addEventListener('click', runComparison);

function handleFileSelect(file, type) {
    if (type === 'fgtscsv') {
        // Aceita .csv ou tipos de arquivo do excel
        if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('excel')) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }
    } else {
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione um arquivo PDF.');
            return;
        }
    }

    if (type === 'base') {
        fileBase = file;
        filenameBase.textContent = file.name;
        dropzoneBase.classList.add('has-file');
    } else if (type === 'irrf') {
        fileIrrf = file;
        filenameIrrf.textContent = file.name;
        dropzoneIrrf.classList.add('has-file');
    } else if (type === 'resumo') {
        fileResumo = file;
        filenameResumo.textContent = file.name;
        dropzoneResumo.classList.add('has-file');
    } else if (type === 'fgtspdf') {
        fileFgtsPdf = file;
        filenameFgtsPdf.textContent = file.name;
        dropzoneFgtsPdf.classList.add('has-file');
    } else if (type === 'fgtscsv') {
        fileFgtsCsv = file;
        filenameFgtsCsv.textContent = file.name;
        dropzoneFgtsCsv.classList.add('has-file');
    }

    checkReady();
}

function checkReady() {
    // Agora requer os 5 arquivos para a conferência completa
    if (fileBase && fileIrrf && fileResumo && fileFgtsPdf && fileFgtsCsv) {
        btnCompare.disabled = false;
    } else {
        btnCompare.disabled = true;
    }
}

// Funções Utilitárias
function parseBRL(valueStr) {
    if (!valueStr) return 0;
    return parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
}

function formatBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extractRegexValue(text, regex, group = 1) {
    const match = text.match(regex);
    return match && match[group] ? parseBRL(match[group]) : 0;
}

// Extração Base
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullTextItems = [];
    let pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items.map(item => item.str.trim()).filter(str => str !== '');
        pageTexts.push(items);
        fullTextItems = fullTextItems.concat(items);
    }

    return { fullTextItems, pageTexts, fullString: fullTextItems.join(' ') };
}

async function processResumoDebitos(file) {
    const data = await extractTextFromPDF(file);
    const fullText = data.fullString;

    const colabValue = extractRegexValue(fullText, /1082-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const empValue = extractRegexValue(fullText, /1099-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const patColabValue = extractRegexValue(fullText, /1138-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const patEmpValue = extractRegexValue(fullText, /1138-04.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const ratValue = extractRegexValue(fullText, /1646-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    
    // Terceiros (Soma)
    const t1 = extractRegexValue(fullText, /1170-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const t2 = extractRegexValue(fullText, /1176-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const t3 = extractRegexValue(fullText, /1191-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const t4 = extractRegexValue(fullText, /1196-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const t5 = extractRegexValue(fullText, /1200-01.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);
    const tercValue = t1 + t2 + t3 + t4 + t5;

    const irrfValue = extractRegexValue(fullText, /0561-07.*?(\d{2}\/\d{4})\s+([\d\.]+,\d{2})/, 2);

    return { colabValue, empValue, patColabValue, patEmpValue, ratValue, tercValue, irrfValue };
}

async function processBaseINSS(file) {
    const data = await extractTextFromPDF(file);
    
    let totalColab = 0;
    let totalEmp = 0;
    let totalPatColab = 0;
    let totalPatEmp = 0;
    let totalRat = 0;
    let totalTerc = 0;

    for (const items of data.pageTexts) {
        const pageStr = items.join(' ');
        
        // 1. Segurados (Colaboradores / Empregadores Originais 1082/1099)
        const regexSegurados = /Segurados\s+([\d\.,\s]+?)\s+Terceiros/i;
        const matchSeg = pageStr.match(regexSegurados);
        if (matchSeg && matchSeg[1]) {
            const values = matchSeg[1].split(/\s+/).filter(v => /^[\d\.]+,\d{2}$/.test(v));
            if (values.length >= 3) {
                totalColab += parseBRL(values[0]);
                totalEmp += parseBRL(values[1]);
            } else if (values.length === 2) {
                totalColab += parseBRL(values[0]);
            }
        }

        // 2. Compensação -> RAT, Patronal Emp, Patronal Colab (20%)
        const regexComp = /Compensa..o\s+([\d\.,\s]+?)\s+Aut.nomos/i;
        const matchComp = pageStr.match(regexComp);
        if (matchComp && matchComp[1]) {
            const values = matchComp[1].split(/\s+/).filter(v => /^[\d\.]+,\d{2}$/.test(v));
            if (values.length >= 3) {
                totalRat += parseBRL(values[0]);
                totalPatEmp += parseBRL(values[1]);
                totalPatColab += parseBRL(values[2]);
            } else if (values.length === 2) {
                totalRat += parseBRL(values[0]);
                totalPatColab += parseBRL(values[1]); // Empregadores = 0
            }
        }

        // 3. Terceiros
        const regexTerc = /Terceiros\s+[\d\.,]+\s+[\d\.,]+%\s+([\d\.,]+)/i;
        const matchTerc = pageStr.match(regexTerc);
        if (matchTerc && matchTerc[1]) {
            totalTerc += parseBRL(matchTerc[1]);
        }
    }

    return { totalColab, totalEmp, totalPatColab, totalPatEmp, totalRat, totalTerc };
}

async function processBaseIRRF(file) {
    const data = await extractTextFromPDF(file);
    const fullText = data.fullString;

    // Busca o último valor de IRRF informado (antes de "Base Valor")
    const regexIRRF = /([\d\.]+,\d{2})\s+Base\s+Valor/g;
    let match;
    let lastValue = 0;
    while ((match = regexIRRF.exec(fullText)) !== null) {
        lastValue = parseBRL(match[1]);
    }

    return { totalIRRF: lastValue };
}

async function processFGTS(filePdf, fileCsv) {
    // Parse CSV
    const decoder = new TextDecoder('windows-1252'); // Para caracteres especiais do Excel
    const csvString = decoder.decode(await fileCsv.arrayBuffer());
    
    const lines = csvString.split(/\r?\n/);
    if(lines.length < 2) return { totalPdf: 0, totalCsv: 0, divergencias: [] };
    
    const headers = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').trim());
    const cpfIdx = headers.indexOf('CPF');
    const nameIdx = headers.indexOf('Nome Trabalhador');
    const valueIdx = headers.indexOf('Valor FGTS na Guia');
    
    const csvRecords = new Map();
    let totalCsv = 0;
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split('";"').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length > valueIdx) {
            const val = parseBRL(cols[valueIdx]);
            const cpfRaw = cols[cpfIdx];
            const cpfClean = cpfRaw.replace(/[^\d]/g, '');
            if (cpfClean) {
                csvRecords.set(cpfClean, {
                    cpfRaw: cpfRaw,
                    name: cols[nameIdx] || 'Sem Nome',
                    value: val
                });
                totalCsv += val;
            }
        }
    }
    
    // Parse PDF
    const dataPdf = await extractTextFromPDF(filePdf);
    const items = dataPdf.fullTextItems;
    
    const pdfRecords = new Map();
    let totalPdf = 0;
    
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    
    for (let i = 0; i < items.length; i++) {
        if (cpfRegex.test(items[i])) {
            const cpfRaw = items[i];
            const cpfClean = cpfRaw.replace(/[^\d]/g, '');
            
            // Busca os valores andando para trás no array
            let idxValor = -1;
            for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
                if (items[j] === 'Valor' && items[j-1] === 'Base') {
                    idxValor = j;
                    break;
                }
            }
            
            let valPdf = 0;
            if (idxValor !== -1) {
                valPdf = parseBRL(items[idxValor - 2]);
            }
            
            // Adiciona ou soma (caso o CPF apareça mais de uma vez)
            if (pdfRecords.has(cpfClean)) {
                const rec = pdfRecords.get(cpfClean);
                rec.valPdf += valPdf;
            } else {
                pdfRecords.set(cpfClean, { cpfRaw, valPdf });
            }
            
            totalPdf += valPdf;
        }
    }
    
    const divergencias = [];
    const cpfsVerificados = new Set();
    
    // 1. Verifica CSV -> PDF
    for (const [cpfClean, csvRec] of csvRecords.entries()) {
        cpfsVerificados.add(cpfClean);
        const pdfRec = pdfRecords.get(cpfClean);
        const valPdf = pdfRec ? pdfRec.valPdf : 0;
        const valCsv = csvRec.value;
        const diff = valPdf - valCsv;
        
        if (Math.abs(diff) >= 0.01) {
            divergencias.push({
                cpf: csvRec.cpfRaw,
                name: csvRec.name,
                valPdf: valPdf,
                valCsv: valCsv,
                diff: diff,
                msg: pdfRec ? '' : 'Falta no PDF'
            });
        }
    }
    
    // 2. Verifica PDF -> CSV (Aqueles que não estavam no CSV)
    for (const [cpfClean, pdfRec] of pdfRecords.entries()) {
        if (!cpfsVerificados.has(cpfClean)) {
            const valPdf = pdfRec.valPdf;
            const valCsv = 0;
            const diff = valPdf - valCsv;
            
            if (Math.abs(diff) >= 0.01) {
                divergencias.push({
                    cpf: pdfRec.cpfRaw,
                    name: 'Não consta no CSV',
                    valPdf: valPdf,
                    valCsv: valCsv,
                    diff: diff,
                    msg: 'Falta no CSV'
                });
            }
        }
    }
    
    return { totalPdf, totalCsv, divergencias };
}

async function runComparison() {
    btnCompare.style.display = 'none';
    loader.classList.add('active');
    resultsSection.classList.add('hidden');

    try {
        const [resumoData, baseData, irrfData, fgtsData] = await Promise.all([
            processResumoDebitos(fileResumo),
            processBaseINSS(fileBase),
            processBaseIRRF(fileIrrf),
            processFGTS(fileFgtsPdf, fileFgtsCsv)
        ]);

        updateUI(baseData, resumoData, irrfData, fgtsData);
    } catch (error) {
        console.error(error);
        alert('Ocorreu um erro ao processar os PDFs. Verifique o console para mais detalhes.');
    } finally {
        btnCompare.style.display = 'block';
        loader.classList.remove('active');
    }
}

function renderStatus(elementId, valBase, valRes) {
    const statusEl = document.getElementById(elementId);
    const diff = valBase - valRes;
    
    if (Math.abs(diff) < 0.01) {
        statusEl.className = 'status success';
        statusEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Valores Batem';
    } else {
        statusEl.className = 'status error';
        statusEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Diferença: ${formatBRL(diff)}`;
    }
}

function updateUI(baseData, resumoData, irrfData, fgtsData) {
    // 1082-01
    document.getElementById('val-base-colab').textContent = formatBRL(baseData.totalColab);
    document.getElementById('val-res-colab').textContent = formatBRL(resumoData.colabValue);
    renderStatus('status-colab', baseData.totalColab, resumoData.colabValue);

    // 1099-01
    document.getElementById('val-base-emp').textContent = formatBRL(baseData.totalEmp);
    document.getElementById('val-res-emp').textContent = formatBRL(resumoData.empValue);
    renderStatus('status-emp', baseData.totalEmp, resumoData.empValue);

    // 1138-01
    document.getElementById('val-base-pat-colab').textContent = formatBRL(baseData.totalPatColab);
    document.getElementById('val-res-pat-colab').textContent = formatBRL(resumoData.patColabValue);
    renderStatus('status-pat-colab', baseData.totalPatColab, resumoData.patColabValue);

    // 1138-04
    document.getElementById('val-base-pat-emp').textContent = formatBRL(baseData.totalPatEmp);
    document.getElementById('val-res-pat-emp').textContent = formatBRL(resumoData.patEmpValue);
    renderStatus('status-pat-emp', baseData.totalPatEmp, resumoData.patEmpValue);

    // 1646-01
    document.getElementById('val-base-rat').textContent = formatBRL(baseData.totalRat);
    document.getElementById('val-res-rat').textContent = formatBRL(resumoData.ratValue);
    renderStatus('status-rat', baseData.totalRat, resumoData.ratValue);

    // Terceiros
    document.getElementById('val-base-terc').textContent = formatBRL(baseData.totalTerc);
    document.getElementById('val-res-terc').textContent = formatBRL(resumoData.tercValue);
    renderStatus('status-terc', baseData.totalTerc, resumoData.tercValue);

    // IRRF
    document.getElementById('val-base-irrf').textContent = formatBRL(irrfData.totalIRRF);
    document.getElementById('val-res-irrf').textContent = formatBRL(resumoData.irrfValue);
    renderStatus('status-irrf', irrfData.totalIRRF, resumoData.irrfValue);

    // FGTS
    document.getElementById('val-base-fgts').textContent = formatBRL(fgtsData.totalPdf);
    document.getElementById('val-csv-fgts').textContent = formatBRL(fgtsData.totalCsv);
    renderStatus('status-fgts', fgtsData.totalPdf, fgtsData.totalCsv);
    
    const divSection = document.getElementById('fgts-divergencias');
    const divList = document.getElementById('fgts-divergencias-list');
    divList.innerHTML = '';
    
    if (fgtsData.divergencias.length > 0) {
        divSection.style.display = 'block';
        fgtsData.divergencias.forEach(d => {
            const li = document.createElement('li');
            li.style.marginBottom = '0.75rem';
            const msgHtml = d.msg ? `<strong style="color:#fbbf24;">[${d.msg}]</strong> ` : '';
            li.innerHTML = `<strong>${d.name}</strong> (CPF: ${d.cpf}) <br>
            <span style="color:#94a3b8;">${msgHtml}PDF: ${formatBRL(d.valPdf)} | CSV: ${formatBRL(d.valCsv)} | Diferença: <strong style="color:#f87171;">${formatBRL(d.diff)}</strong></span>`;
            divList.appendChild(li);
        });
    } else {
        divSection.style.display = 'none';
    }

    resultsSection.classList.remove('hidden');
}
