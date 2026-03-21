/**
 * Serviço de Integração com a Evolution API
 * Responsável por gerenciar Instâncias (Conexões) de WhatsApp comerciais do escritório.
 */

// A URL e a API Key globais da Evolution API virão do banco de dados (configurações do escritório)
// ou das tabelas de instâncias para maior flexibilidade.

export interface EvolutionInstance {
  id: string;
  escritorio_id: string;
  nome_instancia: string;
  apikey_instancia: string | null;
  instance_id: string | null;
  status: 'connected' | 'disconnected' | 'connecting' | 'open' | 'close';
  webhook_url: string | null;
  config?: {
    server_url?: string;
    global_key?: string;
  };
}

export interface QrCodeResponse {
  qrcode: string; // url ou base64
  code: string;
}

/**
 * Ensures phone number is in E.164 format for WhatsApp.
 * Handles Brazil (55) prefix and common formatting errors.
 */
function formatE164(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  
  // If it doesn't start with 55 and has 10-11 digits, it's likely a Brazilian local number
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // WhatsApp suffix
  return cleaned.length > 11 ? `${cleaned}@g.us` : `${cleaned}@s.whatsapp.net`;
}

export const evolutionApi = {
  // 1. Criar e/ou Recuperar QR Code
  async connectInstance(nomeInstancia: string, globalUrl: string, globalApiKey: string): Promise<QrCodeResponse | null> {
    try {
      // Cria a instância na Evolution API
      const response = await fetch(`${globalUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey
        },
        body: JSON.stringify({
          instanceName: nomeInstancia,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao criar instância na Evolution API');
      }

      const data = await response.json();
      
      // A resposta da Evolution geralmente traz o qrcode em base64 se solicitado
      if (data.qrcode) {
        return {
          qrcode: data.qrcode.base64 || data.qrcode.url || data.qrcode, 
          code: data.qrcode.code || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Evolution API Connection Error:', error);
      throw error;
    }
  },

  // 2. Checar Status da Conexão (Long Polling ou Polling simples)
  async checkConnectionStatus(nomeInstancia: string, globalUrl: string, globalApiKey: string): Promise<string> {
    try {
      const response = await fetch(`${globalUrl}/instance/connectionState/${nomeInstancia}`, {
        method: 'GET',
        headers: {
          'apikey': globalApiKey
        }
      });

      if (!response.ok) return 'disconnected';
      const data = await response.json();
      
      return data.instance?.state || 'disconnected';
    } catch (error) {
      console.error('Status Check Error:', error);
      return 'disconnected';
    }
  },

  // 3. Desconectar e Remover Instância
  async logoutInstance(nomeInstancia: string, globalUrl: string, globalApiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${globalUrl}/instance/logout/${nomeInstancia}`, {
        method: 'DELETE',
        headers: {
          'apikey': globalApiKey
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Logout Check Error:', error);
      return false;
    }
  },

  // 4. Enviar Mensagem de Texto
  async sendText(nomeInstancia: string, telefoneContexto: string, texto: string, globalUrl: string, globalApiKey: string) {
    try {
      // Phase 20 Fix: Don't send if offline
      const status = await this.checkConnectionStatus(nomeInstancia, globalUrl, globalApiKey);
      if (status !== 'open' && status !== 'connected') {
        throw new Error('O WhatsApp da agência está desconectado ou em manutenção.');
      }

      const remoteJid = formatE164(telefoneContexto);
      if (!remoteJid) throw new Error('Telefone do destinatário inválido.');

      const response = await fetch(`${globalUrl}/message/sendText/${nomeInstancia}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey
        },
        body: JSON.stringify({
          number: remoteJid,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: texto }
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar texto na Evolution API');
      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem via Evolution:', error);
      throw error;
    }
  },

  // 5. Enviar Mídia (Imagem, Audio, Documento)
  async sendMedia(nomeInstancia: string, telefoneContexto: string, urlArquivo: string, tipoMidia: 'image' | 'audio' | 'document' | 'video', globalUrl: string, globalApiKey: string) {
    try {
      const status = await this.checkConnectionStatus(nomeInstancia, globalUrl, globalApiKey);
      if (status !== 'open' && status !== 'connected') {
        throw new Error('O WhatsApp da agência está desconectado ou em manutenção.');
      }

      const remoteJid = formatE164(telefoneContexto);
      if (!remoteJid) throw new Error('Telefone do destinatário inválido.');

      const response = await fetch(`${globalUrl}/message/sendMedia/${nomeInstancia}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey
        },
        body: JSON.stringify({
          number: remoteJid,
          options: { delay: 1500, presence: tipoMidia === 'audio' ? 'recording' : 'composing' },
          mediaMessage: {
            mediatype: tipoMidia,
            fileName: 'arquivo',
            media: urlArquivo // Evolution aceita URL pública base64
          }
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar mídia na Evolution API');
      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mídia via Evolution:', error);
      throw error;
    }
  }
};
