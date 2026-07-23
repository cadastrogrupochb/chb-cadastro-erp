// Função serverless do Netlify: recebe os dados do formulário (destinatário, assunto,
// corpo em HTML já formatado, e o PDF em base64) e usa a API do Resend para enviar
// o e-mail de verdade, com o PDF assinado anexado.
//
// A chave da API (RESEND_API_KEY) fica guardada com segurança nas variáveis de
// ambiente do Netlify - nunca no código do site, para não vazar publicamente.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  try {
    const { destinatario, assunto, htmlBody, pdfBase64, pdfNome } = JSON.parse(event.body || '{}');

    if (!destinatario || !assunto || !htmlBody) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos para o envio do e-mail.' }) };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const remetente = process.env.RESEND_REMETENTE || 'GRUPO CHB <onboarding@resend.dev>';
    // Nota: com o remetente de teste do Resend, e-mails só chegam à sua própria caixa cadastrada
    // no Resend, até você verificar um domínio próprio (ver instruções no chat).

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY não configurada no Netlify.' }) };
    }

    const payload = {
      from: remetente,
      to: [destinatario],
      subject: assunto,
      html: htmlBody
    };

    if (pdfBase64) {
      payload.attachments = [
        {
          filename: pdfNome || 'Cadastro_CHB.pdf',
          content: pdfBase64
        }
      ];
    }

    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const dadosResposta = await resposta.json();

    if (!resposta.ok) {
      return { statusCode: resposta.status, body: JSON.stringify({ success: false, error: dadosResposta }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: dadosResposta }) };
  } catch (erro) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: erro.message }) };
  }
};
