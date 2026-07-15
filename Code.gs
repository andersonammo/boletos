/* Configure antes de publicar. A planilha deve ter as abas CLIENTES, BOLETOS e LOG. */
const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';
const API_TOKEN = 'troque-por-um-token-longo-e-secreto';
const HEADERS = {
  CLIENTES: ['ID','Nome','CPF_CNPJ','Telefone','Email','Endereco','Cidade','Estado','CEP','DataCadastro'],
  BOLETOS: ['ID_Boleto','ID_Cliente','NomeCliente','Valor','Vencimento','DataEmissao','Status','LinhaDigitavel','NossoNumero','Observacoes','UsuarioCriacao'],
  LOG: ['DataHora','Usuario','Acao','Detalhes']
};

function doGet(e) { return handle_(e.parameter || {}); }
function doPost(e) {
  let p = e.parameter || {};
  try { if (e.postData && e.postData.contents) p = Object.assign(p, JSON.parse(e.postData.contents)); } catch (_) {}
  return handle_(p);
}
function handle_(p) {
  try {
    if (p.token !== API_TOKEN) throw new Error('Não autorizado');
    const action = clean_(p.action);
    const routes = { listClientes: listClientes_, createCliente: createCliente_, updateCliente: updateCliente_, deleteCliente: deleteCliente_, listBoletos: listBoletos_, createBoleto: createBoleto_, updateStatus: updateStatus_, dashboard: dashboard_ };
    if (!routes[action]) throw new Error('Ação inválida');
    return json_({ ok:true, data:routes[action](p) });
  } catch (err) { return json_({ ok:false, error:err.message }); }
}
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(name) { const s=ss_().getSheetByName(name); if(!s) throw new Error('Aba '+name+' não encontrada'); return s; }
function values_(name) { const s=sheet_(name), v=s.getDataRange().getValues(); return v.length ? v : [HEADERS[name]]; }
function objects_(name) { const v=values_(name), h=v[0]; return v.slice(1).filter(r=>r[0]!== '').map(r=>h.reduce((o,k,i)=>(o[k]=r[i],o),{})); }
function clean_(v){ return String(v==null?'':v).replace(/[<>]/g,'').trim(); }
function required_(p, keys){ keys.forEach(k=>{if(!clean_(p[k])) throw new Error('Campo obrigatório: '+k);}); }
function id_(prefix){ return prefix+'-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*9000+1000); }
function log_(user, action, details){ sheet_('LOG').appendRow([new Date(),clean_(user)||'Sistema',action,details]); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function listClientes_(p) { const q=clean_(p.q).toLowerCase(); return objects_('CLIENTES').filter(x=>!q || [x.Nome,x.CPF_CNPJ,x.Email].join(' ').toLowerCase().includes(q)); }
function createCliente_(p) { required_(p,['nome','cpfCnpj']); const id=id_('CLI'); sheet_('CLIENTES').appendRow([id,clean_(p.nome),clean_(p.cpfCnpj),clean_(p.telefone),clean_(p.email),clean_(p.endereco),clean_(p.cidade),clean_(p.estado),clean_(p.cep),new Date()]); log_(p.usuario,'CRIAR_CLIENTE',id); return {ID:id}; }
function updateCliente_(p) { required_(p,['id','nome','cpfCnpj']); const s=sheet_('CLIENTES'), rows=objects_('CLIENTES'), i=rows.findIndex(x=>x.ID===p.id); if(i<0) throw new Error('Cliente não encontrado'); s.getRange(i+2,2,1,8).setValues([[clean_(p.nome),clean_(p.cpfCnpj),clean_(p.telefone),clean_(p.email),clean_(p.endereco),clean_(p.cidade),clean_(p.estado),clean_(p.cep)]]); log_(p.usuario,'EDITAR_CLIENTE',p.id); return {ID:p.id}; }
function deleteCliente_(p) { const s=sheet_('CLIENTES'), i=objects_('CLIENTES').findIndex(x=>x.ID===p.id); if(i<0) throw new Error('Cliente não encontrado'); s.deleteRow(i+2); log_(p.usuario,'EXCLUIR_CLIENTE',p.id); return {ID:p.id}; }
function nosso_(id){ return ('00000000000'+id.replace(/\D/g,'').slice(-11)).slice(-11); }
function linha_(id, value){ const n=(id.replace(/\D/g,'')+'000000000000000').slice(-15), cents=Math.round(Number(value)*100).toString().padStart(10,'0'); return '00190.00009 '+n.slice(0,5)+'.'+n.slice(5,11)+' '+n.slice(11,15)+'0.00000 1 '+cents+'00000'; }
function createBoleto_(p) { required_(p,['idCliente','valor','vencimento']); const client=objects_('CLIENTES').find(x=>x.ID===p.idCliente); if(!client) throw new Error('Cliente não encontrado'); const value=Number(p.valor); if(!(value>0)) throw new Error('Valor inválido'); const id=id_('BOL'), line=linha_(id,value), nosso=nosso_(id); sheet_('BOLETOS').appendRow([id,client.ID,client.Nome,value,new Date(p.vencimento+'T12:00:00'),new Date(),'Pendente',line,nosso,clean_(p.observacoes),clean_(p.usuario)||'Admin']); log_(p.usuario,'EMITIR_BOLETO',id); return {ID_Boleto:id,LinhaDigitavel:line,NossoNumero:nosso}; }
function listBoletos_(p) { const q=clean_(p.q).toLowerCase(), status=clean_(p.status), start=clean_(p.inicio), end=clean_(p.fim); return objects_('BOLETOS').filter(x=>{ const due=fmt_(x.Vencimento,'yyyy-MM-dd'); return (!q||[x.ID_Boleto,x.NomeCliente].join(' ').toLowerCase().includes(q))&&(!status||x.Status===status)&&(!start||due>=start)&&(!end||due<=end); }).sort((a,b)=>new Date(a.Vencimento)-new Date(b.Vencimento)); }
function updateStatus_(p) { required_(p,['id','status']); if(['Pendente','Pago','Cancelado','Vencido'].indexOf(p.status)<0) throw new Error('Status inválido'); const s=sheet_('BOLETOS'), i=objects_('BOLETOS').findIndex(x=>x.ID_Boleto===p.id); if(i<0) throw new Error('Boleto não encontrado'); s.getRange(i+2,7).setValue(p.status); log_(p.usuario,'ALTERAR_STATUS',p.id+' → '+p.status); return {ID_Boleto:p.id,Status:p.status}; }
function dashboard_(){ const b=objects_('BOLETOS'); const val=x=>Number(x.Valor)||0; return {total:b.length,pendentes:b.filter(x=>x.Status==='Pendente').length,pagos:b.filter(x=>x.Status==='Pago').length,aberto:b.filter(x=>x.Status==='Pendente'||x.Status==='Vencido').reduce((s,x)=>s+val(x),0),recebido:b.filter(x=>x.Status==='Pago').reduce((s,x)=>s+val(x),0),mensal:b.reduce((o,x)=>{const k=fmt_(x.DataEmissao,'yyyy-MM');o[k]=(o[k]||0)+1;return o;},{})}; }
function fmt_(d,f){ return d ? Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),f) : ''; }

// Execute uma vez para criar cabeçalhos automaticamente.
function setup(){ Object.keys(HEADERS).forEach(n=>{let s=ss_().getSheetByName(n);if(!s)s=ss_().insertSheet(n);if(s.getLastRow()===0)s.appendRow(HEADERS[n]);}); }
