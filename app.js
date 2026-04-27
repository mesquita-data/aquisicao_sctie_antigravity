// Substitua pela URL gerada no Deploy do seu Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwC6fvMyPydxzkitjrkf7ejZDQtpQmBt60qTDwgkAkjYBooogQMAGPoQZS3C9ukTMcbMg/exec'; 

let appData = [];
let filteredData = [];
let currentAction = 'create'; // 'create' or 'update'
let currentSortCol = null;
let currentSortDir = 'asc';
let currentPage = 1;
const rowsPerPage = 10;

// Choices.js instances
let choicesAno, choicesAcaoGov, choicesDescAcao;

// Elementos da UI
const tableCard = document.getElementById('tableCard');
const tableBody = document.getElementById('tableBody');
const loader = document.getElementById('loader');
const formModal = document.getElementById('formModal');
const dataForm = document.getElementById('dataForm');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');

// Função de inicialização
async function init() {
    if(API_URL === 'COLE_A_URL_DO_WEB_APP_AQUI') {
        showToast('Aviso: Configure a API_URL no arquivo app.js antes de prosseguir.', true);
        return;
    }
    initChoices();
    await loadData();
}

// Inicializar os selects múltiplos do Choices.js
function initChoices() {
    const config = { removeItemButton: true, searchEnabled: true, itemSelectText: '' };
    choicesAno = new Choices('#filterAno', config);
    choicesAcaoGov = new Choices('#filterAcaoGov', config);
    choicesDescAcao = new Choices('#filterDescAcao', config);

    document.getElementById('filterAno').addEventListener('change', applyFilters);
    document.getElementById('filterAcaoGov').addEventListener('change', applyFilters);
    document.getElementById('filterDescAcao').addEventListener('change', applyFilters);
}

// Mostra notificações na tela
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 4000);
}

// Carregar dados da Planilha
async function loadData() {
    try {
        loader.style.display = 'flex';
        tableCard.style.display = 'none';

        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.status === 'success') {
            appData = result.data;
            populateChoices();
            filteredData = [...appData];
            renderTable();
            tableCard.style.display = 'block';
            document.getElementById('tableHeaderInfo').style.display = 'flex';
            document.getElementById('kpiContainer').style.display = 'grid';
            document.getElementById('paginationContainer').style.display = 'flex';
            
            // Verifica qual aba está ativa e a exibe
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const tabIdMatch = activeTab.getAttribute('onclick').match(/'([^']+)'/);
                if (tabIdMatch) {
                    document.getElementById(tabIdMatch[1]).style.display = 'block';
                }
            } else {
                document.getElementById('view-geral').style.display = 'block';
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Erro ao carregar dados: ' + error.message, true);
    } finally {
        loader.style.display = 'none';
    }
}

// Popular as opções do dropdown com valores únicos
function populateChoices() {
    const anos = [...new Set(appData.map(r => r['Ano Lançamento']).filter(Boolean))].sort();
    const acoes = [...new Set(appData.map(r => r['Ação Governo']).filter(Boolean))].sort();
    const descAcoes = [...new Set(appData.map(r => r['Descrição da Ação']).filter(Boolean))].sort();

    choicesAno.setChoices(anos.map(a => ({ value: a.toString(), label: a.toString() })), 'value', 'label', true);
    choicesAcaoGov.setChoices(acoes.map(a => ({ value: a.toString(), label: a.toString() })), 'value', 'label', true);
    choicesDescAcao.setChoices(descAcoes.map(a => ({ value: a.toString(), label: a.toString() })), 'value', 'label', true);
}

// Formatador de Moeda
function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '-';
    
    let num = value;
    if (typeof value === 'string') {
        // Remove símbolos de moeda, espaços, etc. Mantém apenas dígitos, ponto, vírgula e sinal de menos
        let cleanStr = value.replace(/[^\d.,-]/g, '');
        
        // Verifica se é no formato brasileiro com vírgula para decimal
        if (cleanStr.includes(',')) {
            // Remove os pontos de milhar e troca a vírgula por ponto decimal
            cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
        }
        num = parseFloat(cleanStr);
    } else {
        num = Number(value);
    }
    
    if (isNaN(num)) return value;
    
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Atualizar KPIs
function updateKPIs() {
    let sumProjeto = 0;
    let sumDotacaoInicial = 0;
    let sumDotacaoAtualizada = 0;

    filteredData.forEach(row => {
        const parseValue = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            let num = val;
            if (typeof val === 'string') {
                let cleanStr = val.replace(/[^\d.,-]/g, '');
                if (cleanStr.includes(',')) {
                    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
                }
                num = parseFloat(cleanStr);
            }
            return isNaN(num) ? 0 : Number(num);
        };

        sumProjeto += parseValue(row['Projeto Inicial LOA']);
        sumDotacaoInicial += parseValue(row['Dotação Inicial']);
        sumDotacaoAtualizada += parseValue(row['Dotação Atualizada']);
    });

    document.getElementById('kpiProjetoInicial').textContent = formatCurrency(sumProjeto);
    document.getElementById('kpiDotacaoInicial').textContent = formatCurrency(sumDotacaoInicial);
    document.getElementById('kpiDotacaoAtualizada').textContent = formatCurrency(sumDotacaoAtualizada);
}

// Renderizar Tabela
function renderTable() {
    tableBody.innerHTML = '';
    
    // Atualiza contador
    const counter = document.getElementById('recordCounter');
    if (counter) {
        counter.textContent = `${filteredData.length} de ${appData.length} linhas`;
    }
    
    updateKPIs();
    
    // Paginação
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    updatePaginationUI(totalPages);
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    paginatedData.forEach(row => {
        // Linha Principal
        const tr = document.createElement('tr');
        tr.className = 'main-row';
        tr.id = `row-${row._rowId}`;
        
        // Botão de expandir
        const tdExpand = document.createElement('td');
        tdExpand.innerHTML = `
            <button class="btn-icon expand" onclick="toggleDetails(${row._rowId})" title="Ver Detalhes">
                <i class="ri-arrow-right-s-line" id="expand-icon-${row._rowId}"></i>
            </button>
        `;
        
        // Ações
        const tdActions = document.createElement('td');
        tdActions.className = 'actions-cell';
        tdActions.innerHTML = `
            <button class="btn-icon edit" onclick="openModal('update', ${row._rowId})" title="Editar">
                <i class="ri-pencil-line"></i>
            </button>
            <button class="btn-icon clone" onclick="openModal('clone', ${row._rowId})" title="Clonar">
                <i class="ri-file-copy-line"></i>
            </button>
            <button class="btn-icon delete" onclick="deleteData(${row._rowId})" title="Excluir">
                <i class="ri-delete-bin-line"></i>
            </button>
        `;
        
        // Dados Principais
        const tdAno = document.createElement('td');
        tdAno.textContent = row['Ano Lançamento'] || '-';
        
        const tdPlanoOrc = document.createElement('td');
        tdPlanoOrc.textContent = row['Plano Orçamentário'] || '-';
        
        const tdProjInicial = document.createElement('td');
        tdProjInicial.textContent = formatCurrency(row['Projeto Inicial LOA']);
        
        const tdInicial = document.createElement('td');
        tdInicial.textContent = formatCurrency(row['Dotação Inicial']);
        
        const tdAtualizada = document.createElement('td');
        tdAtualizada.textContent = formatCurrency(row['Dotação Atualizada']);
        
        tr.appendChild(tdExpand);
        tr.appendChild(tdActions);
        tr.appendChild(tdAno);
        tr.appendChild(tdPlanoOrc);
        tr.appendChild(tdProjInicial);
        tr.appendChild(tdInicial);
        tr.appendChild(tdAtualizada);
        
        tableBody.appendChild(tr);

        // Sublinha de Detalhes
        const trDetails = document.createElement('tr');
        trDetails.className = 'details-row';
        trDetails.id = `details-${row._rowId}`;
        trDetails.style.display = 'none';
        
        const tdDetails = document.createElement('td');
        tdDetails.colSpan = 7; // Expandir por todas as colunas
        tdDetails.innerHTML = `
            <div class="details-content">
                <div><strong>Descrição da Ação:</strong> ${row['Descrição da Ação'] || '-'}</div>
                <div><strong>Descrição PO:</strong> ${row['Descrição PO'] || '-'}</div>
            </div>
        `;
        trDetails.appendChild(tdDetails);
        tableBody.appendChild(trDetails);
    });
}

// Alternar Visibilidade da Sublinha
function toggleDetails(rowId) {
    const detailsRow = document.getElementById(`details-${rowId}`);
    const icon = document.getElementById(`expand-icon-${rowId}`);
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        icon.className = 'ri-arrow-down-s-line';
        document.getElementById(`row-${rowId}`).classList.add('expanded');
    } else {
        detailsRow.style.display = 'none';
        icon.className = 'ri-arrow-right-s-line';
        document.getElementById(`row-${rowId}`).classList.remove('expanded');
    }
}

// Filtros
function applyFilters() {
    // Array vazio significa que nada foi selecionado (mostrar tudo)
    const selAno = choicesAno.getValue(true) || [];
    const selAcaoGov = choicesAcaoGov.getValue(true) || [];
    const selDescAcao = choicesDescAcao.getValue(true) || [];

    filteredData = appData.filter(row => {
        const ano = (row['Ano Lançamento'] || '').toString();
        const acaoGov = (row['Ação Governo'] || '').toString();
        const descAcao = (row['Descrição da Ação'] || '').toString();

        const matchAno = selAno.length === 0 || selAno.includes(ano);
        const matchAcaoGov = selAcaoGov.length === 0 || selAcaoGov.includes(acaoGov);
        const matchDescAcao = selDescAcao.length === 0 || selDescAcao.includes(descAcao);

        return matchAno && matchAcaoGov && matchDescAcao;
    });

    currentPage = 1; // Resetar para página 1 ao aplicar filtros
    applySort();
    renderTable();
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    renderTable();
}

function updatePaginationUI(totalPages) {
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('btnPrevPage').disabled = currentPage === 1;
    document.getElementById('btnNextPage').disabled = currentPage === totalPages;
}

function sortTable(column) {
    if (currentSortCol === column) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortCol = column;
        currentSortDir = 'asc';
    }
    applySort();
    renderTable();
}

function applySort() {
    if (!currentSortCol) return;
    
    filteredData.sort((a, b) => {
        let valA = a[currentSortCol];
        let valB = b[currentSortCol];

        if (valA == null) valA = '';
        if (valB == null) valB = '';

        // Tentar converter para número, considerando que as colunas de valor têm vírgulas
        let numA = parseFloat(valA.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
        let numB = parseFloat(valB.toString().replace(/[^\d,-]/g, '').replace(',', '.'));

        // Valida se a coluna deve ser tratada como número de forma estrita (apenas se as strings parecem dinheiro ou números)
        // Uma verificação simples: se for NaN, volta para string.
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return currentSortDir === 'asc' ? numA - numB : numB - numA;
        }

        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();

        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    updateSortIcons();
}

function updateSortIcons() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if(!icon) return;
        const col = th.getAttribute('data-col');
        
        if (col === currentSortCol) {
            icon.className = currentSortDir === 'asc' ? 'ri-sort-asc sort-icon active' : 'ri-sort-desc sort-icon active';
        } else {
            icon.className = 'ri-arrow-up-down-line sort-icon';
        }
    });
}

function clearFilters() {
    choicesAno.removeActiveItems();
    choicesAcaoGov.removeActiveItems();
    choicesDescAcao.removeActiveItems();
    // A própria remoção dispara o evento change que chama applyFilters()
}

// Abrir Modal
function openModal(action, rowId = null) {
    currentAction = action === 'clone' ? 'create' : action;
    dataForm.reset();
    
    if (action === 'create') {
        modalTitle.textContent = 'Nova Ação';
        document.getElementById('_rowId').value = '';
    } else {
        modalTitle.textContent = action === 'clone' ? 'Clonar Ação' : 'Editar Ação';
        const rowData = appData.find(r => r._rowId === rowId);
        if (rowData) {
            document.getElementById('_rowId').value = action === 'clone' ? '' : rowData._rowId;
            document.getElementById('Ano_Lancamento').value = rowData['Ano Lançamento'];
            document.getElementById('Acao_Governo').value = rowData['Ação Governo'];
            document.getElementById('Descricao_Acao').value = rowData['Descrição da Ação'] || '';
            document.getElementById('Plano_Orcamentario').value = rowData['Plano Orçamentário'] || '';
            document.getElementById('PO_parte1').value = rowData['PO_parte1'] || '';
            document.getElementById('Fonte_SOF').value = rowData['Fonte SOF'] || '';
            document.getElementById('PROJETO_INICIAL').value = rowData['Projeto Inicial LOA'] || '';
            document.getElementById('DOTACAO_INICIAL').value = rowData['Dotação Inicial'] || '';
            document.getElementById('DOTACAO_ATUALIZADA').value = rowData['Dotação Atualizada'] || '';
        }
    }
    
    formModal.classList.add('active');
}

// Fechar Modal
function closeModal() {
    formModal.classList.remove('active');
}

// Salvar (Create/Update)
async function saveData() {
    if (!dataForm.checkValidity()) {
        dataForm.reportValidity();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Salvando...';

    // Coletar dados do form
    const formData = new FormData(dataForm);
    const dataObj = {};
    for (let [key, value] of formData.entries()) {
        if(key !== '_rowId') {
            dataObj[key] = value;
        }
    }
    
    const rowId = formData.get('_rowId');
    
    const payload = {
        action: currentAction,
        rowId: rowId,
        data: dataObj
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast(result.message);
            closeModal();
            await loadData(); // Recarrega os dados atualizados
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Erro ao salvar: ' + error.message, true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salvar Dados';
    }
}

// Excluir
async function deleteData(rowId) {
    if (!confirm('Confirmar exclusão?')) {
        return;
    }

    try {
        loader.style.display = 'flex';
        tableCard.style.display = 'none';
        
        const payload = {
            action: 'delete',
            rowId: rowId
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast(result.message);
            await loadData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Erro ao excluir: ' + error.message, true);
        tableCard.style.display = 'block';
        loader.style.display = 'none';
    }
}

// Gerenciar Abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetBtn = event.currentTarget;
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // Só exibe se os dados já tiverem sido carregados (loader oculto)
    const loader = document.getElementById('loader');
    if (loader && loader.style.display === 'none') {
        document.getElementById(tabId).style.display = 'block';
    }
}

// Iniciar a aplicação
window.onload = init;
