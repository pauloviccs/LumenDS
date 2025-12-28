# LumenDS — Build v0.1.2

## Visão Geral

LumenDS é uma solução de **Digital Signage** multiplataforma projetada para exibir playlists de mídia (vídeos e imagens) em Smart TVs, desktops e navegadores. O sistema opera com uma arquitetura de controle centralizado, onde um **Dashboard** (Electron/Web) gerencia uma frota de **Players** (Navegador/SmartTV) conectados via Supabase.

A versão **v0.1.2** foca na estabilização do núcleo, correção da lógica de pareamento e, principalmente, na mitigação de problemas críticos de consumo de dados (Egress).

## Tecnologias Utilizadas

### Frontend (Monorepo)
-   **Dashboard (`apps/dashboard`)**:
    -   React 19 + Vite (SPA)
    -   Electron 39 (Wrapper para Desktop)
    -   TailwindCSS v4 (Estilização)
    -   Framer Motion (Animações)
    -   Lucide React (Ícones)
    -   **Funcionalidades Específicas**: Acesso ao FileSystem local (via IPC Electron) para upload de arquivos.

-   **Player (`apps/player`)**:
    -   React 19 + Vite
    -   Vanilla CSS (Foco em performance em TVs antigas)
    -   Service Worker Cache API (Tentativa de offline)
    -   Polyfills (UUID/Crypto) para compatibilidade com WebOS antigo/Tizen.

### Backend (Supabase)
-   **Database**: PostgreSQL
-   **Auth**: Gerenciamento de usuários
-   **Realtime**: Sincronização de telas e comandos via `postgres_changes`
-   **Storage**: Bucket `campaign-assets` para vídeos e imagens
-   **RPC**: Funções SQL (`ping_screen`) para heartbeat eficiente

## Arquitetura Atual

O fluxo de dados opera no modelo **Push-Pull Híbrido**:
1.  **Dashboard (Push/Manage)**: Usuário faz upload de arquivos e cria playlists. Associa playlist a uma tela.
2.  **Supabase (Broker)**: Armazena estado (`screens`), ativos (`storage`) e notifica mudanças via Realtime.
3.  **Player (Pull/Listen)**:
    -   Faz polling a cada **30s** para registrar status "Online".
    -   Ouve mudanças na tabela `screens` (filtrado por seu ID) para receber novos comandos ou playlists instantaneamente.
    -   Faz cache local de ativos para minimizar downloads.

## Funcionalidades Completas
-   [x] **Autenticação**: Login/Cadastro via Email.
-   [x] **Gerenciamento de Telas**: Listagem, Pareamento via código, Exclusão.
-   [x] **Playlists**: CRUD completo, Edição de itens, Atribuição a telas.
-   [x] **Gestão de Mídia Local**: Navegador de arquivos local (Electron), criação de pastas, upload para nuvem.
-   [x] **Player Básico**: Toca vídeos e imagens em loop infinito.
-   [x] **Mecanismo de Cache**: `PlaylistCacheManager` baixa ativos para uso offline.

## Funcionalidades Parciais
-   **Offline Mode**: Implementado mas tecnicamente prejudicado por headers incorretos (Corrigido na v0.1.2).
-   **GitHub Auth**: Configurado mas redirecionamento em Electron requer ajustes de Deep Linking.
-   **Configurações**: Interface existe, mas é apenas leitura.

## Funcionalidades Planejadas (Não Implementadas)
-   **Agendamento**: Definir horários para playlists tocarem (ex: "Menu Almoço" vs "Menu Jantar").
-   **Comandos Remotos**: Reiniciar Player, Tirar Screenshot, Limpar Cache remotamente.
-   **Hierarquia de Grupos**: Organizar telas em grupos (ex: "Loja X", "Loja Y").
-   **Apps/Widgets**: Clima, Notícias, Relógio sobreposto ao vídeo.

## Problemas Conhecidos
-   **Player em Localhost**: O Player assume que ativos locais estão em `localhost:11222`, o que cria uma dependência de um servidor de assets estático rodando localmente, não ideal para produção em TVs reais.
-   **Compatibilidade de Vídeo**: Algumas TVs antigas (WebOS 4.0-) podem engasgar com codecs modernos. Não há transcodificação automática no upload.

## [IMPORTANTE] Problema Crítico: Supabase Egress

Identificamos e resolvemos um vazamento massivo de transferência de dados (Egress):

### Causa Raiz
1.  **Cache Killing**: O arquivo `index.html` do Player continha `<meta http-equiv="Cache-Control" content="no-store" />`. Isso obrigava a TV a **baixar o vídeo inteiro (ex: 50MB)** a cada loop ou recarregamento, ignorando o cache local já baixado pelo `PlaylistCacheManager`.
2.  **Feedback Loop de Realtime**:
    -   Player enviava "ping" a cada 5 segundos.
    -   O Dashboard ouvia **qualquer** mudança na tabela `screens`.
    -   A cada 5s, o Dashboard recebia o evento e disparava um `SELECT * FROM screens` completo.
    -   Com 10 telas, isso gerava 120 requisições de leitura por minuto **por dashboard aberto**.

## Soluções Aplicadas (v0.1.2)

1.  **Correção de Headers (`apps/player/index.html`)**:
    -   Removidas as meta tags `no-cache` e `no-store`. Agora o navegador respeita o cache de disco (304 Not Modified).

2.  **Relaxamento de Polling (`apps/player/src/boot.jsx`)**:
    -   Intervalo de "Ping" aumentado de **5s para 30s**. Redução de 83% em escritas de Log/Heartbeat.

3.  **Debounce no Dashboard (`apps/dashboard/src/views/ScreensView.jsx`)**:
    -   Implementado debounce de **2.0 segundos** na escuta do Realtime.
    -   Mesmo que 50 telas enviem pings simultâneos, o Dashboard fará apenas **uma** requisição de atualização de lista.

## Melhorias Futuras

### Curto Prazo (Próxima Sprint)
-   Implementar paginação na listagem de telas do Dashboard (evitar carregar 1000 telas de uma vez).
-   Adicionar feedback visual no Dashboard quando uma tela perde conexão (já que o ping agora é 30s).

### Médio Prazo
-   Criar coluna `hash_playlist` na tabela `screens`. O Player só baixa a playlist se o Hash mudar, economizando leituras de banco.
-   Implementar servidor de proxy para imagens/vídeos (CDN) para reduzir custo direto do Supabase Storage.

### Longo Prazo
-   Migrar heartbeat para arquitetura WebSocket "puro" (Edge Functions) em vez de escrita em banco.
-   Transcodificação de vídeos no upload (FFmpeg na Edge/Server) para garantir compatibilidade com TVs legadas.

## Validação Pós-Correção de Egress (Atualizado)

Após auditoria técnica realizada em 2025-12-28, confirmamos:

1.  **Remoção de Headers**: Confirmada (`index.html`).
2.  **Polling**: Confirmado em 30s (`boot.jsx`).
3.  **Proteção Adicional**: O Dashboard passou a ignorar updates que contém apenas `last_ping`. Isso significa que o tráfego de leitura do Dashboard cairá para **quase zero** em idle, mesmo com 1000 telas conectadas enviando pings.
4.  **Paginação**: `fetchScreens` agora tem limite de 50 itens para proteger a UI contra cargas massivas.

O sistema está considerado **ESTÁVEL** e seguro para deploy no quesito consumo de dados.

## Instruções de Build (Manual)

### Dashboard (Windows/Electron)
O dashboard é um app Electron. Para gerar o instalador `.exe`:

```bash
cd apps/dashboard
npm install
npm run build
```
*O instalador estará em `apps/dashboard/release/`.*

### Player (Web/TV)
O player é uma aplicação web estática. Para gerar os arquivos para hospedagem (Vercel/Surge/Netlify):

```bash
cd apps/player
npm install
npm run build
```
*Os arquivos estáticos estarão em `apps/player/dist/`.*
