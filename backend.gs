// Código a ser colado no Google Apps Script (script.google.com)
// Certifique-se de substituir o ID_DA_PLANILHA pelo ID real do seu Google Sheets

const SHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI'; // Ex: 1BxiMvs0XRYFgPnUKzbpCE...
const SHEET_NAME = 'LOA_AÇÕES_SCTIE'; // Nome da aba exata

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

// Configura CORS e formatação da resposta
function buildResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

// Trata requisições GET (Ler dados)
function doGet(e) {
  try {
    const sheet = getSheet();
    if (!sheet) throw new Error("Planilha não encontrada. Verifique o ID e o nome da aba.");
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map((row, index) => {
      let obj = { _rowId: index + 2 }; // +2 pois array é 0-index e tem cabeçalho na linha 1
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      return obj;
    });
    
    return buildResponse({ status: 'success', data: result });
  } catch (error) {
    return buildResponse({ status: 'error', message: error.toString() });
  }
}

// Trata requisições POST (Inserir, Editar, Excluir)
function doPost(e) {
  try {
    // Para evitar problemas de CORS, o front-end envia como text/plain
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; // 'create', 'update', 'delete'
    const data = payload.data;
    
    const sheet = getSheet();
    const headers = sheet.getDataRange().getValues()[0];
    
    if (action === 'create') {
      const newRow = headers.map(header => data[header] !== undefined ? data[header] : '');
      sheet.appendRow(newRow);
      return buildResponse({ status: 'success', message: 'Linha criada com sucesso!' });
    } 
    
    else if (action === 'update') {
      const rowId = parseInt(payload.rowId);
      if (!rowId || rowId < 2) throw new Error("ID de linha inválido para edição.");
      
      const updateValues = [headers.map(header => data[header] !== undefined ? data[header] : '')];
      sheet.getRange(rowId, 1, 1, headers.length).setValues(updateValues);
      return buildResponse({ status: 'success', message: 'Linha atualizada com sucesso!' });
    }
    
    else if (action === 'delete') {
      const rowId = parseInt(payload.rowId);
      if (!rowId || rowId < 2) throw new Error("ID de linha inválido para exclusão.");
      
      sheet.deleteRow(rowId);
      return buildResponse({ status: 'success', message: 'Linha excluída com sucesso!' });
    }
    
    else {
      throw new Error("Ação não reconhecida: " + action);
    }
    
  } catch (error) {
    return buildResponse({ status: 'error', message: error.toString() });
  }
}
