// Substitua pela URL gerada no Deploy do seu Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwC6fvMyPydxzkitjrkf7ejZDQtpQmBt60qTDwgkAkjYBooogQMAGPoQZS3C9ukTMcbMg/exec'; 

let appData = [];
let currentAction = 'create'; // 'create' or 'update'

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
    await loadData();
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
            renderTable();
            tableCard.style.display = 'block';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Erro ao carregar dados: ' + error.message, true);
    } finally {
        loader.style.display = 'none';
    }
}

// Formatador de Moeda
function formatCurrency(value) {
    if(!value && value !== 0) return '-';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Renderizar Tabela
function renderTable() {
    tableBody.innerHTML = '';
    
    appData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Ações
        const tdActions = document.createElement('td');
        tdActions.className = 'actions-cell';
        tdActions.innerHTML = `
            <button class="btn-icon edit" onclick="openModal('update', ${row._rowId})" title="Editar">
                <i class="ri-pencil-line"></i>
            </button>
            <button class="btn-icon delete" onclick="deleteData(${row._rowId})" title="Excluir">
                <i class="ri-delete-bin-line"></i>
            </button>
        `;
        
        // Dados
        const tdAno = document.createElement('td');
        tdAno.textContent = row['Ano Lançamento'] || '-';
        
        const tdGov = document.createElement('td');
        tdGov.textContent = row['Ação Governo'] || '-';
        
        const tdPo = document.createElement('td');
        tdPo.textContent = row['PO_parte1'] || '-';
        
        const tdInicial = document.createElement('td');
        tdInicial.textContent = formatCurrency(row['DOTACAO INICIAL']);
        
        const tdAtualizada = document.createElement('td');
        tdAtualizada.textContent = formatCurrency(row['DOTACAO ATUALIZADA']);
        
        tr.appendChild(tdActions);
        tr.appendChild(tdAno);
        tr.appendChild(tdGov);
        tr.appendChild(tdPo);
        tr.appendChild(tdInicial);
        tr.appendChild(tdAtualizada);
        
        tableBody.appendChild(tr);
    });
}

// Abrir Modal
function openModal(action, rowId = null) {
    currentAction = action;
    dataForm.reset();
    
    if (action === 'create') {
        modalTitle.textContent = 'Nova Ação';
        document.getElementById('_rowId').value = '';
    } else {
        modalTitle.textContent = 'Editar Ação';
        const rowData = appData.find(r => r._rowId === rowId);
        if (rowData) {
            document.getElementById('_rowId').value = rowData._rowId;
            document.getElementById('Ano_Lancamento').value = rowData['Ano Lançamento'];
            document.getElementById('Acao_Governo').value = rowData['Ação Governo'];
            document.getElementById('Descricao_Acao').value = rowData['Descrição Ação'];
            document.getElementById('Plano_Orcamentario').value = rowData['Plano Orçamentário'];
            document.getElementById('PO_parte1').value = rowData['PO_parte1'];
            document.getElementById('Fonte_SOF').value = rowData['Fonte SOF'];
            document.getElementById('PROJETO_INICIAL').value = rowData['PROJETO INICIAL DA LOA - FIXACAO DESPESA'];
            document.getElementById('DOTACAO_INICIAL').value = rowData['DOTACAO INICIAL'];
            document.getElementById('DOTACAO_ATUALIZADA').value = rowData['DOTACAO ATUALIZADA'];
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
    if (!confirm('Tem certeza que deseja excluir esta linha? Esta ação não pode ser desfeita.')) {
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

// Iniciar a aplicação
window.onload = init;
