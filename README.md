# Boletos Internos

## Configuração rápida

1. Crie uma planilha Google chamada **Boletos Internos**. Copie o ID entre `/d/` e `/edit` da URL.
2. Abra **Extensões → Apps Script**, crie o arquivo `Code.gs`, cole o conteúdo deste pacote e preencha `SPREADSHEET_ID` e `API_TOKEN`.
3. No editor, execute `setup` uma vez e autorize. Isso cria `CLIENTES`, `BOLETOS` e `LOG` com os cabeçalhos corretos.
4. Em **Implantar → Nova implantação → App da Web**, execute como você e defina o acesso conforme a política interna (por exemplo, qualquer pessoa da organização). Copie a URL `/exec`.
5. Em `app.js`, preencha `CONFIG.apiUrl` com essa URL e use o mesmo `CONFIG.token` de `Code.gs`. Publique os arquivos HTML/CSS/JS em um host estático.

## Dados de exemplo

Na aba CLIENTES, após o cabeçalho: `CLI-001 | Empresa Exemplo Ltda | 12.345.678/0001-90 | 11999999999 | financeiro@exemplo.com | Rua Central, 100 | São Paulo | SP | 01000-000 | 2026-07-15`.

## Observações de segurança

O token é uma barreira simples, adequada a uso interno. Apps Script Web Apps não expõem de forma confiável headers customizados ao `doGet/doPost`; portanto o frontend o envia no corpo/query, sempre via HTTPS. Para informações financeiras reais, restrinja o acesso da implantação à organização, não armazene o token em repositório público e implemente autenticação corporativa/proxy. A linha digitável é **simulada** e este documento não registra nem liquida boleto bancário. Para boleto real, integre uma instituição financeira/PSP autorizado.
