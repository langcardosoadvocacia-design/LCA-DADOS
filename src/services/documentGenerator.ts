import { formatCurrency } from '../utils/format';

interface DocumentData {
  nome: string;
  documento: string;
  rg?: string;
  estado_civil?: string;
  profissao?: string;
  endereco: string;
  numero: string;
  complemento?: string;
  cidade: string;
  uf: string;
  cep: string;
  email?: string;
  contato?: string;
}

interface ContractData {
  numero: string;
  valor_total: number;
  parcelas: number;
  finalidade?: string;
  prazo?: string;
}

export const generateProcuracaoHTML = (cliente: DocumentData, contrato?: ContractData) => {
  const finalidade = contrato?.finalidade || '[FINALIDADE]';
  const prazo = contrato?.prazo || 'O presente mandato terá validade por tempo indeterminado.';
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Procuração - ${cliente.nome}</title>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; margin: 0; padding: 0; background: #fff; font-size: 12pt; }
          .container { max-width: 100%; margin: auto; }
          h1 { text-align: center; text-transform: uppercase; font-size: 14pt; margin: 2rem 0; font-weight: bold; }
          p { margin-bottom: 1.25rem; text-align: justify; }
          .footer { margin-top: 3rem; text-align: left; }
          .signature-area { margin-top: 5rem; display: flex; flex-direction: column; align-items: center; }
          .signature-line { width: 400px; border-top: 1px solid #000; margin-bottom: 0.5rem; }
          .signature-name { font-weight: bold; text-transform: uppercase; }
          .logo-container { text-align: right; margin-bottom: 2rem; }
          .logo-container img { height: 70px; }
          .no-print { position: fixed; bottom: 30px; right: 30px; z-index: 1000; }
          .btn-print { 
            padding: 12px 24px; 
            background: #1e293b; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          @media print { .no-print { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>PROCURAÇÃO</h1>
          
          <p><strong>1. OUTORGANTE:</strong> <strong>${cliente.nome.toUpperCase()}</strong>, ${cliente.estado_civil || '[ESTADO CIVIL]'}, ${cliente.profissao || '[PROFISSÃO]'}, CPF ${cliente.documento}, RG ${cliente.rg || '[RG]'}, residente e domiciliado (a) em ${cliente.endereco}, ${cliente.numero}${cliente.complemento ? ', ' + cliente.complemento : ''}, ${cliente.cidade} - ${cliente.uf}, ${cliente.cep}, e-mail: ${cliente.email || '[E-MAIL]'}, telefone/whatsapp: ${cliente.contato || '[TELEFONE]'}.</p>
          
          <p><strong>2. OUTORGADOS:</strong> <strong>MATHEUS LANG CARDOSO</strong>, advogado, OAB/RS 124.685; na condição de proprietário do escritório <strong>LANG CARDOSO SOCIEDADE INDIVIDUAL DE ADVOCACIA</strong>, CNPJ 47.936.394/0001-58, OAB/RS 12.585, com escritório na Alameda Antofagasta, 44, sala 401, Edifício Antofagasta, Nossa Senhora das Dores, Santa Maria – RS, CEP: 97050-660, e-mail: langcardosoadvocacia@gmail.com, telefone de contato: (55) 3217-6378 - Recepção e/ou (55) 9 9986-5406 - Matheus.</p>
          
          <p><strong>3. PODERES:</strong> O Outorgante nomeia e constitui o Outorgado como seu advogado particular, conferindo-lhes os poderes da cláusula "ad judicia" e "ad extra", podendo atuar conjunta ou separadamente, para representá-lo em juízo ou fora dele, outorgando-lhe os poderes para foro em geral e apenas os poderes especiais para impetrar quaisquer recursos, habeas corpus, habeas data, mandados de segurança, revisão criminal, arguir exceções de suspeição, bem como substabelecer com ou sem reserva os poderes conferidos pelo presente mandato. Todavia, não comporta nenhum poder especial receber citação ou intimação ou concordar, acordar, confessar, discordar, transigir, firmar compromisso, reconhecer a procedência do pedido, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, executar e fazer cumprir decisões e títulos judiciais e extrajudiciais, receber valores e levantar alvarás judiciais extraídos em nome do outorgante, requerer falências e concordatas, imputar a terceiros, em nome dos outorgantes, fatos descritos como crimes, firmar compromisso e declarar hipossuficiência econômica, constituir preposto, nem atuar em processo administrativo de cobrança de custas e/ou sucumbência extrajudiciais ou judiciais.</p>
          
          <p><strong>4. FINALIDADE E PRAZO:</strong> ${finalidade}</p>
          
          <p><strong>5. PRAZO:</strong> ${prazo}</p>
          
          <p>Fica ciente e concorda que eventual renúncia poderá ser realizada pelo outorgado via telefone/whatsapp/e-mail da outorgante e/ou seu familiar.</p>
          
          <div class="footer">
            <p>Santa Maria, data da assinatura eletrônica.</p>
          </div>

          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-name">${cliente.nome.toUpperCase()}</div>
          </div>
        </div>

        <div class="no-print">
          <button onclick="window.print()" class="btn-print">🖨️ Imprimir Procuração</button>
        </div>
      </body>
    </html>
  `;
};


export const generateContratoHTML = (cliente: DocumentData, contrato: ContractData) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato de Honorários - ${cliente.nome}</title>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: 'Times New Roman', serif; line-height: 1.4; color: #000; margin: 0; padding: 0; background: #fff; font-size: 11pt; }
          .container { max-width: 100%; margin: auto; }
          header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
          .office-name { font-weight: bold; font-size: 1.25rem; text-transform: uppercase; margin: 0; }
          h1 { text-align: center; text-transform: uppercase; font-size: 1.2rem; margin: 1.5rem 0; font-weight: bold; }
          h2 { font-size: 11pt; text-transform: uppercase; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; border-left: 4px solid #000; padding-left: 10px; }
          p { margin-bottom: 0.75rem; text-align: justify; }
          .footer { margin-top: 3rem; text-align: center; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 5rem; }
          .signature-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
          .signature-line { width: 100%; border-top: 1px solid #000; margin-bottom: 0.5rem; }
          .signature-name { font-weight: bold; font-size: 0.9rem; text-transform: uppercase; }
          .logo-container { text-align: left; margin-bottom: 2rem; }
          .logo-container img { height: 70px; }
          .no-print { position: fixed; bottom: 30px; right: 30px; z-index: 1000; }
          .btn-print { 
            padding: 12px 24px; 
            background: #1e293b; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          @media print { .no-print { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h1>
          
          <h2>1. DAS PARTES</h2>
          <p><strong>CONTRATADA (Contratado):</strong> LANG CARDOSO SOCIEDADE INDIVIDUAL DE ADVOCACIA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 47.936.394/0001-58, com sede na Alameda Antofagasta, 44, sala 401, Santa Maria – RS.</p>
          <p><strong>CONTRATANTE:</strong> <strong>${cliente.nome.toUpperCase()}</strong>, ${cliente.estado_civil || '[ESTADO CIVIL]'}, ${cliente.profissao || '[PROFISSÃO]'}, inscrito no CPF sob o nº ${cliente.documento}, RG nº ${cliente.rg || '[RG]'}, residente e domiciliado em ${cliente.endereco}, nº ${cliente.numero}, ${cliente.complemento ? cliente.complemento + ', ' : ''}${cliente.cidade}/${cliente.uf}.</p>

          <h2>2. DO OBJETO</h2>
          <p>O presente contrato tem como objeto a prestação de serviços técnicos-jurídicos pela CONTRATADA no sentido de atuar em defesa dos interesses do CONTRATANTE na seguinte finalidade: <strong>${contrato.finalidade || 'Defesa dos interesses em demanda jurídica específica'}</strong>.</p>
          <p>O serviço contratado compreende o acompanhamento do processo em todas as instâncias judiciais ordinárias.</p>

          <h2>3. DOS HONORÁRIOS</h2>
          <p>Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA, a título de honorários advocatícios, o valor total de <strong>${formatCurrency(contrato.valor_total)}</strong>.</p>
          <p>O pagamento será realizado da seguinte forma: ${contrato.prazo || `em ${contrato.parcelas} parcela(s) mensais e sucessivas.`}</p>

          <h2>4. DAS OBRIGAÇÕES</h2>
          <p>A CONTRATADA compromete-se a zelar pelos interesses do CONTRATANTE, utilizando-se de todos os meios de prova em direito admitidos. O CONTRATANTE obriga-se a fornecer todos os documentos e informações necessários para o bom andamento da causa, bem como ao pagamento das custas processuais.</p>

          <h2>5. DO FORO</h2>
          <p>Para dirimir quaisquer dúvidas oriundas deste contrato, as partes elegem o foro da comarca de Santa Maria/RS.</p>

          <div class="footer">
            <p>Santa Maria - RS, data da assinatura eletrônica.</p>
          </div>

          <h2>3. DOS HONORÁRIOS</h2>
          <p>Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA, a título de honorários advocatícios, o valor total de <strong>${formatCurrency(contrato.valor_total)}</strong>.</p>
          <p>O pagamento será realizado da seguinte forma: ${contrato.prazo || `em ${contrato.parcelas} parcela(s) mensais e sucessivas.`}</p>

          <h2>4. DAS OBRIGAÇÕES</h2>
          <p>A CONTRATADA compromete-se a zelar pelos interesses do CONTRATANTE, utilizando-se de todos os meios de prova em direito admitidos. O CONTRATANTE obriga-se a fornecer todos os documentos e informações necessários para o bom andamento da causa.</p>

          <h2>5. DO FORO</h2>
          <p>Para dirimir quaisquer dúvidas oriundas deste contrato, as partes elegem o foro da comarca de Santa Maria/RS, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

          <div class="footer">
            <p>Santa Maria - RS, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
          </div>

          <div class="signature-grid">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-name">LANG CARDOSO SOCIEDADE</div>
              <div style="font-size: 0.8rem;">CONTRATADA</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-name">${cliente.nome.toUpperCase()}</div>
              <div style="font-size: 0.8rem;">CONTRATANTE</div>
            </div>
          </div>
        </div>

        <div class="no-print">
          <button onclick="window.print()" class="btn-print">🖨️ Imprimir Contrato</button>
        </div>
      </body>
    </html>
  `;
};
