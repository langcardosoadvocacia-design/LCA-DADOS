/**
 * apiService.ts
 *
 * Service Wrapper genérico para o Dashboard LCA DADOS.
 * Utiliza a API nativa `fetch` para realizar requisições genéricas
 * fortemente tipadas, incluindo tratamento de erros centralizado
 * e headers de autenticação automáticos.
 */

// Tipagem base de resposta padronizada (Adapte para o formato da sua API)
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: boolean;
}

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class LcaDadosApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Obtém o token de autenticação (ex: localStorage, zustand, redux)
   */
  private getAuthToken(): string | null {
    // Exemplo: return localStorage.getItem('lca_token');
    return null;
  }

  /**
   * Prepara os Headers padrão que vão ser enviados em toda requisição
   */
  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { ...headers, ...customHeaders };
  }

  /**
   * Tratamento centralizado de Request/Response
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers),
      });

      // Em requisições "204 No Content", não tentamos fazer o parse do JSON
      if (response.status === 204) {
        return {} as T;
      }

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Interceptador para tratar 401 Unauthorized (Ex: logout automático)
        if (response.status === 401) {
          console.warn('[LCA DADOS] Sessão expirada ou não autorizada.');
          // window.location.href = '/login';
        }
        
        throw new ApiError(
          response.status, 
          responseData?.message || response.statusText || 'Erro na requisição da API Lca Dados', 
          responseData
        );
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error('[LCA DADOS - Erro de Rede / Falha Crítica]:', error);
      throw new Error('Falha de conexão com os servidores LCA DADOS.');
    }
  }

  // ==========================================
  // Métodos HTTP Restful
  // ==========================================

  public async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public async post<T, B = unknown>(endpoint: string, body: B, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(body), 
      headers 
    });
  }

  public async put<T, B = unknown>(endpoint: string, body: B, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(body), 
      headers 
    });
  }

  public async patch<T, B = unknown>(endpoint: string, body: B, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'PATCH', 
      body: JSON.stringify(body), 
      headers 
    });
  }

  public async delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Exportando a instância global do Serviço do Dashboard
const apiBaseUrl = process.env.NEXT_PUBLIC_LCA_API_URL || process.env.VITE_LCA_API_URL || 'https://api.lca-dados.com.br/v1';
export const api = new LcaDadosApiService(apiBaseUrl);

export default api;
