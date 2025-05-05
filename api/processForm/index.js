// api/processForm/index.js
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const { DefaultAzureCredential } = require('@azure/identity');

module.exports = async function (context, req) {
  // 1) pull the submitted JSON
  const formObject = req.body || {};

  // 2) extract name, seniority, dynamic prefs just like in your .gs
  const name = formObject.name || '';
  const seniority = formObject.seniority || '';
  const preferences = Object.keys(formObject)
    .filter(k => k.startsWith('preference'))
    .sort((a, b) => parseInt(a.replace('preference','')) - parseInt(b.replace('preference','')))
    .map(k => formObject[k]);

  // 3) authenticate to Microsoft Graph (via Managed Identity or AAD app creds)
  const cred = new DefaultAzureCredential();
  const tok  = await cred.getToken('https://graph.microsoft.com/.default');
  const client = Client.init({
    authProvider: done => done(null, tok.token)
  });

  // 4) append a row into your Excel table (replace with your file‑ID & table name)
  await client
    .api(`/me/drive/items/${process.env.EXCEL_FILE_ITEM_ID}` +
         `/workbook/worksheets('Responses')/tables('Table1')/rows/add`)
    .post({ values: [[ name, seniority, ...preferences ]] });

  // 5) return the same confirmation message
  context.res = {
    status: 200,
    body: "Your preferences have been recorded!"
  };
};
